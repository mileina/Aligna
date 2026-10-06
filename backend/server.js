const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { Country, State, City } = require('country-state-city');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const FRONTEND_ROOT = path.join(PROJECT_ROOT, 'frontend');
const ROOT = FRONTEND_ROOT;
const PORT = Number(process.env.PORT || 3000);
const MAX_LOCATION_RESULTS = 15;
const MAX_JOB_RESULTS = 12;
const PROVIDER_PAGE_SIZE = 20;
const FRANCE_TRAVAIL_SCOPE = 'api_offresdemploiv2 o2dsoffre';
const ALL_COUNTRIES = Country.getAllCountries().map((country) => ({
    name: country.name,
    isoCode: country.isoCode,
    phoneCode: country.phonecode
}));
const CITY_CACHE_BY_COUNTRY = new Map();
const STATE_NAME_CACHE_BY_COUNTRY = new Map();
const FRANCE_TRAVAIL_TOKEN_CACHE = {
    token: '',
    expiresAtMs: 0
};

const ENV_FILE_VALUES = loadEnv(path.join(PROJECT_ROOT, '.env'));

function loadEnv(envPath) {
    const parsed = {};
    if (!fs.existsSync(envPath)) return parsed;

    const content = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const separatorIndex = trimmed.indexOf('=');
        if (separatorIndex === -1) continue;

        const key = trimmed.slice(0, separatorIndex).trim();
        let value = trimmed.slice(separatorIndex + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }

        if (key) {
            parsed[key] = value;
            if (!process.env[key] || process.env[key].length === 0) {
                process.env[key] = value;
            }
        }
    }

    return parsed;
}

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(payload));
}

function guessContentType(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    return {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp'
    }[extension] || 'application/octet-stream';
}

function safeInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function normalizeText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeSearchToken(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
        .toLowerCase()
    .replace(/\s+/g, ' ')
        .trim();
}

function toPositiveInt(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
}

function searchCountries(query, limit = MAX_LOCATION_RESULTS) {
    const normalizedQuery = normalizeSearchToken(query);
    const safeLimit = Math.min(Math.max(1, limit), 50);
    const startsWith = [];
    const includes = [];

    for (const country of ALL_COUNTRIES) {
        const nameToken = normalizeSearchToken(country.name);
        const isoToken = normalizeSearchToken(country.isoCode);
        if (!normalizedQuery) {
            includes.push(country);
            continue;
        }

        if (nameToken.startsWith(normalizedQuery) || isoToken.startsWith(normalizedQuery)) {
            startsWith.push(country);
            continue;
        }

        if (nameToken.includes(normalizedQuery) || isoToken.includes(normalizedQuery)) {
            includes.push(country);
        }
    }

    return startsWith.concat(includes).slice(0, safeLimit);
}

function resolveCountryByInput(rawCountry) {
    const normalizedInput = normalizeSearchToken(rawCountry);
    if (!normalizedInput) return null;

    const exactByIso = ALL_COUNTRIES.find((country) => normalizeSearchToken(country.isoCode) === normalizedInput);
    if (exactByIso) return exactByIso;

    const exactByName = ALL_COUNTRIES.find((country) => normalizeSearchToken(country.name) === normalizedInput);
    if (exactByName) return exactByName;

    return searchCountries(rawCountry, 1)[0] || null;
}

function getCitiesForCountry(countryIsoCode) {
    const key = String(countryIsoCode || '').toUpperCase();
    if (!key) return [];
    if (CITY_CACHE_BY_COUNTRY.has(key)) {
        return CITY_CACHE_BY_COUNTRY.get(key);
    }

    let stateNames = STATE_NAME_CACHE_BY_COUNTRY.get(key);
    if (!stateNames) {
        stateNames = new Map();
        const stateItems = State.getStatesOfCountry(key) || [];
        for (const state of stateItems) {
            const code = normalizeText(state && state.isoCode ? state.isoCode : '');
            if (!code) continue;
            stateNames.set(code, normalizeText(state.name));
        }
        STATE_NAME_CACHE_BY_COUNTRY.set(key, stateNames);
    }

    const cityItems = City.getCitiesOfCountry(key) || [];
    const uniqueCities = [];
    const seen = new Set();

    for (const city of cityItems) {
        const name = normalizeText(city && city.name ? city.name : '');
        if (!name) continue;
        const stateCode = normalizeText(city && city.stateCode ? city.stateCode : '');
        const token = normalizeSearchToken(name);
        const dedupeKey = `${token}::${stateCode}`;
        if (!token || seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        uniqueCities.push({
            name,
            stateCode,
            stateName: stateNames.get(stateCode) || '',
            latitude: Number.parseFloat(city && city.latitude ? city.latitude : ''),
            longitude: Number.parseFloat(city && city.longitude ? city.longitude : '')
        });
    }

    uniqueCities.sort((a, b) => a.name.localeCompare(b.name));
    CITY_CACHE_BY_COUNTRY.set(key, uniqueCities);
    return uniqueCities;
}

function toRadians(value) {
    return (value * Math.PI) / 180;
}

function haversineKm(lat1, lon1, lat2, lon2) {
    if (![lat1, lon1, lat2, lon2].every((v) => Number.isFinite(v))) return Number.POSITIVE_INFINITY;

    const earthRadiusKm = 6371;
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
}

function rankCity(city, normalizedQuery) {
    const nameToken = normalizeSearchToken(city.name);
    if (nameToken === normalizedQuery) return 0;
    if (nameToken.startsWith(`${normalizedQuery}-`) || nameToken.startsWith(`${normalizedQuery} `)) return 1;
    if (nameToken.startsWith(normalizedQuery)) return 2;
    if (nameToken.includes(normalizedQuery)) return 3;
    return 4;
}

function getAnchorCity(cities, normalizedQuery) {
    if (!normalizedQuery || normalizedQuery.length < 3) return null;

    const exact = cities.find((city) => normalizeSearchToken(city.name) === normalizedQuery);
    return exact || null;
}

function searchCities(countryIsoCode, query, limit = MAX_LOCATION_RESULTS) {
    const cities = getCitiesForCountry(countryIsoCode);
    const normalizedQuery = normalizeSearchToken(query);
    const safeLimit = Math.min(Math.max(1, limit), 50);

    if (!normalizedQuery) {
        return cities.slice(0, safeLimit);
    }

    const matching = cities.filter((city) => {
        const token = normalizeSearchToken(city.name);
        return token.startsWith(normalizedQuery) || token.includes(normalizedQuery);
    });

    matching.sort((a, b) => {
        const rankDiff = rankCity(a, normalizedQuery) - rankCity(b, normalizedQuery);
        if (rankDiff !== 0) return rankDiff;
        return a.name.length - b.name.length || a.name.localeCompare(b.name);
    });

    const anchorCity = getAnchorCity(cities, normalizedQuery);
    if (!anchorCity) {
        return matching.slice(0, safeLimit);
    }

    const nearby = cities
        .filter((city) => city.name !== anchorCity.name)
        .map((city) => ({
            city,
            distanceKm: haversineKm(anchorCity.latitude, anchorCity.longitude, city.latitude, city.longitude)
        }))
        .filter(({ distanceKm }) => Number.isFinite(distanceKm) && distanceKm <= 80)
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .map(({ city }) => city);

    // When an anchor city is targeted (e.g. Paris), show nearby cities first for more precise local targeting.
    const prioritized = [anchorCity, ...nearby, ...matching];
    const result = [];
    const seen = new Set();
    for (const city of prioritized) {
        const key = `${normalizeSearchToken(city.name)}::${normalizeSearchToken(city.stateCode)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(city);
        if (result.length >= safeLimit) break;
    }

    return result;
}

async function searchCitiesOnline(countryIsoCode, query, limit = MAX_LOCATION_RESULTS) {
    const normalizedQuery = normalizeSearchToken(query);
    if (!normalizedQuery || normalizedQuery.length < 2) {
        return [];
    }

    const safeLimit = Math.min(Math.max(1, limit), 50);
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&countrycodes=${encodeURIComponent(String(countryIsoCode || '').toLowerCase())}&q=${encodeURIComponent(query)}&limit=${safeLimit}`;

    try {
        const response = await fetch(url, {
            headers: {
                'Accept-Language': 'fr',
                'User-Agent': 'ai-jobmatch-old/1.0 (city-autocomplete)'
            }
        });

        if (!response.ok) {
            return [];
        }

        const payload = await response.json();
        if (!Array.isArray(payload)) {
            return [];
        }

        const seen = new Set();
        const items = [];
        for (const entry of payload) {
            const address = entry && entry.address ? entry.address : {};
            const name = normalizeText(
                address.city
                || address.town
                || address.village
                || address.municipality
                || address.suburb
                || address.county
                || entry?.name
            );
            if (!name) continue;

            const stateName = normalizeText(address.state || address.region || '');
            const stateCode = normalizeText(address.state_code || '');
            const key = `${normalizeSearchToken(name)}::${normalizeSearchToken(stateName)}`;
            if (seen.has(key)) continue;
            seen.add(key);

            items.push({
                name,
                stateCode,
                stateName,
                latitude: Number.parseFloat(entry?.lat),
                longitude: Number.parseFloat(entry?.lon)
            });
        }

        return items.slice(0, safeLimit);
    } catch {
        return [];
    }
}

function mergeCityResults(primary, secondary, limit = MAX_LOCATION_RESULTS) {
    const safeLimit = Math.min(Math.max(1, limit), 50);
    const merged = [];
    const seen = new Set();

    for (const source of [primary, secondary]) {
        for (const city of source || []) {
            const key = `${normalizeSearchToken(city?.name)}::${normalizeSearchToken(city?.stateName || city?.stateCode || '')}`;
            if (!city?.name || seen.has(key)) continue;
            seen.add(key);
            merged.push(city);
            if (merged.length >= safeLimit) return merged;
        }
    }

    return merged;
}

function getApiKey() {
    return process.env.AI_API_KEY || process.env.OPENAI_API_KEY || ENV_FILE_VALUES.AI_API_KEY || ENV_FILE_VALUES.OPENAI_API_KEY;
}

function getAdzunaCredentials() {
    const appId = normalizeText(process.env.ADZUNA_APP_ID || ENV_FILE_VALUES.ADZUNA_APP_ID);
    const appKey = normalizeText(process.env.ADZUNA_APP_KEY || ENV_FILE_VALUES.ADZUNA_APP_KEY);
    if (!appId || !appKey) return null;
    return { appId, appKey };
}

function getFranceTravailCredentials() {
    const clientId = normalizeText(
        process.env.FRANCE_TRAVAIL_CLIENT_ID
        || process.env.POLE_EMPLOI_CLIENT_ID
        || ENV_FILE_VALUES.FRANCE_TRAVAIL_CLIENT_ID
        || ENV_FILE_VALUES.POLE_EMPLOI_CLIENT_ID
    );

    const clientSecret = normalizeText(
        process.env.FRANCE_TRAVAIL_CLIENT_SECRET
        || process.env.POLE_EMPLOI_CLIENT_SECRET
        || ENV_FILE_VALUES.FRANCE_TRAVAIL_CLIENT_SECRET
        || ENV_FILE_VALUES.POLE_EMPLOI_CLIENT_SECRET
    );

    if (!clientId || !clientSecret) return null;
    return { clientId, clientSecret };
}

function sanitizeSiteUrl(rawUrl) {
    const value = normalizeText(rawUrl);
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    return `https://${value}`;
}

function toSlugPart(value) {
    return normalizeSearchToken(value).replace(/\s+/g, '-').trim();
}

function toQueryParam(value) {
    return normalizeText(value);
}

function buildPreferredSearchUrl(siteUrl, preferences) {
    const role = toQueryParam(preferences?.targetRole || '');
    const city = toQueryParam(preferences?.city || '');

    try {
        const parsed = new URL(siteUrl);
        const host = parsed.hostname.toLowerCase();

        // Build a concrete search URL for Indeed when users provide only the base domain.
        if (host.includes('indeed.')) {
            const hasQuery = parsed.searchParams.has('q') || parsed.searchParams.has('l');
            const pathLooksLikeJobs = /\/jobs?/.test(parsed.pathname);
            if (!hasQuery || !pathLooksLikeJobs) {
                const url = new URL(`${parsed.protocol}//${parsed.host}/jobs`);
                if (role) url.searchParams.set('q', role);
                if (city) url.searchParams.set('l', city);
                return url.toString();
            }
        }

        if (host.includes('welcometothejungle.com') && role) {
            const hasQuery = parsed.searchParams.has('query');
            if (!hasQuery) {
                const url = new URL(`${parsed.protocol}//${parsed.host}/fr/jobs`);
                url.searchParams.set('query', role);
                return url.toString();
            }
        }

        if (host.includes('linkedin.com') && role) {
            const hasKeywords = parsed.searchParams.has('keywords');
            if (!hasKeywords) {
                const url = new URL(`${parsed.protocol}//${parsed.host}/jobs/search`);
                url.searchParams.set('keywords', role);
                if (city) url.searchParams.set('location', city);
                return url.toString();
            }
        }
    } catch {
        // If URL parsing fails, keep original URL.
    }

    return siteUrl;
}

function toJinaReaderUrl(siteUrl) {
    const withoutProtocol = String(siteUrl || '').replace(/^https?:\/\//i, '');
    return `https://r.jina.ai/http://${withoutProtocol}`;
}

function isIndeedHost(siteUrl) {
    try {
        const parsed = new URL(siteUrl);
        return parsed.hostname.toLowerCase().includes('indeed.');
    } catch {
        return false;
    }
}

function isCloudflareChallengeText(text) {
    const token = normalizeSearchToken(text || '');
    if (!token) return false;
    return token.includes('additional verification required')
        || token.includes('ray id')
        || token.includes('cloudflare errors')
        || token.includes('just a moment');
}

function decodeDuckduckgoRedirect(rawUrl) {
    const value = normalizeText(rawUrl);
    if (!value) return '';

    try {
        const parsed = new URL(value);
        if (!parsed.hostname.toLowerCase().includes('duckduckgo.com')) {
            return value;
        }

        const encoded = parsed.searchParams.get('uddg');
        if (!encoded) return value;
        return decodeURIComponent(encoded);
    } catch {
        return value;
    }
}

function cleanSearchResultTitle(title) {
    return normalizeText(String(title || '')
        .replace(/\s*[-|]\s*Indeed\s*$/i, '')
        .replace(/^emplois?\s*[:\-]?\s*/i, '')
    );
}

function stripMarkdownLinks(text) {
    return normalizeText(String(text || '')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/%[0-9A-Fa-f]{2,}[^\s]*/g, '')
        .replace(/&rut=[^\s\)]*/gi, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/\*+/g, '')
    );
}

function toIndeedViewJobUrl(resolvedUrl) {
    try {
        const parsed = new URL(resolvedUrl);
        const vjk = normalizeText(parsed.searchParams.get('vjk'));
        if (!vjk) return '';

        const host = parsed.hostname.toLowerCase().includes('indeed.')
            ? parsed.hostname
            : 'fr.indeed.com';

        const direct = new URL(`${parsed.protocol}//${host}/viewjob`);
        direct.searchParams.set('jk', vjk);
        return direct.toString();
    } catch {
        return '';
    }
}

function normalizeIndeedLocation(value, fallbackCity) {
    const text = normalizeText(value);
    if (!text) return normalizeText(fallbackCity) || 'France';

    const looksLikeDate = /\b(janvier|fevrier|février|mars|avril|mai|juin|juillet|aout|août|septembre|octobre|novembre|decembre|décembre)\b/i.test(text)
        || /\b20\d{2}\b/.test(text);
    if (looksLikeDate) {
        return normalizeText(fallbackCity) || 'France';
    }

    // Remove country suffixes from search page style titles for cleaner UI.
    return text
        .replace(/\s*\((75|77|78|91|92|93|94|95)\)\s*/gi, '')
    .replace(/[\(\)]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function buildIndeedFallbackSummary(snippet, role, city) {
    const clean = stripMarkdownLinks(snippet);
    if (clean) return clean;

    const safeRole = normalizeText(role || 'poste');
    const safeCity = normalizeText(city || 'France');
    return `Resultat Indeed pour ${safeRole} a ${safeCity}.`;
}

function toDisplayIndeedTitle(rawTitle, preferences) {
    const title = normalizeText(rawTitle);
    if (!title) {
        return `${normalizeText(preferences?.targetRole || 'Offres')} - ${normalizeText(preferences?.city || 'France')} (Indeed)`;
    }

    const genericPattern = /plus de\s+\d+\s+emplois|emplois?\s*\(|\bemplois?\b/i;
    if (!genericPattern.test(title)) {
        return title;
    }

    const role = normalizeText(preferences?.targetRole || 'Offres');
    const city = normalizeText(preferences?.city || preferences?.country || 'France');
    return `${role} - ${city} (Indeed)`;
}

function parseIndeedJobsFromLiteSearchText(searchText, preferences) {
    const lines = String(searchText || '').split(/\r?\n/).map((line) => normalizeText(line));
    const jobs = [];
    const seen = new Set();

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const match = line.match(/^\d+\.\[(.+?)\]\((.+?)\)$/);
        if (!match) continue;

        const rawTitle = cleanSearchResultTitle(match[1]);
        const resolvedUrl = decodeDuckduckgoRedirect(match[2]);
        if (!resolvedUrl || !/indeed\./i.test(resolvedUrl)) continue;

        const canonicalLine = lines[index + 2] || '';
        const canonicalUrl = /^([a-z0-9\.-]+\/[\S]+)$/i.test(canonicalLine)
            ? `https://${canonicalLine}`
            : '';
        const finalResolved = canonicalUrl && /indeed\./i.test(canonicalUrl) ? canonicalUrl : resolvedUrl;

        // Exclude generic homepage-like links; keep result pages with q-... or emplois markers.
        if (!/q-|emplois?|viewjob|jobs?/i.test(finalResolved)) continue;

        const directViewUrl = toIndeedViewJobUrl(finalResolved);
        const finalUrl = directViewUrl || finalResolved;
        const key = `${normalizeSearchToken(rawTitle)}::${normalizeSearchToken(finalUrl)}`;
        if (!rawTitle || seen.has(key)) continue;
        seen.add(key);

        const snippet = lines[index + 1] || '';
        const titleLocationMatch = rawTitle.match(/\(([^\)]+)\)/);
        const inferredLocation = titleLocationMatch ? titleLocationMatch[1] : '';

        jobs.push({
            title: toDisplayIndeedTitle(rawTitle, preferences),
            company: 'Indeed',
            location: normalizeIndeedLocation(inferredLocation, preferences?.city),
            salary: '',
            type: '',
            summary: buildIndeedFallbackSummary(snippet, preferences?.targetRole, preferences?.city),
            skills: [],
            matchScore: 0,
            url: finalUrl
        });

        if (jobs.length >= MAX_JOB_RESULTS) break;
    }

    return jobs;
}

function parseIndeedJobsFromSearchText(searchText, preferences) {
    const lines = String(searchText || '').split(/\r?\n/);
    const jobs = [];
    const seen = new Set();

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const match = line.match(/^## \[(.+?)\]\((.+?)\)$/);
        if (!match) continue;

        const title = cleanSearchResultTitle(match[1]);
        const redirectUrl = normalizeText(match[2]);
        const resolvedUrl = decodeDuckduckgoRedirect(redirectUrl);
        if (!resolvedUrl || !/indeed\./i.test(resolvedUrl)) continue;

        const directViewUrl = toIndeedViewJobUrl(resolvedUrl);
        const finalUrl = directViewUrl || resolvedUrl;
        const dedupeKey = `${normalizeSearchToken(title)}::${normalizeSearchToken(finalUrl)}`;
        if (!title || seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        const snippetLine = normalizeText(lines[index + 4] || lines[index + 3] || lines[index + 2] || '');
        const titleLocationMatch = title.match(/\(([^\)]+)\)/);
        const inferredLocation = titleLocationMatch ? titleLocationMatch[1] : '';

        jobs.push({
            title: toDisplayIndeedTitle(title, preferences),
            company: 'Indeed',
            location: normalizeIndeedLocation(inferredLocation, preferences?.city),
            salary: '',
            type: '',
            summary: buildIndeedFallbackSummary(snippetLine, preferences?.targetRole, preferences?.city),
            skills: [],
            matchScore: 0,
            url: finalUrl
        });

        if (jobs.length >= 8) break;
    }

    return jobs;
}

async function fetchIndeedJobsFallback(preferences) {
    const role = normalizeText(preferences?.targetRole || 'developpeur web');
    const city = normalizeText(preferences?.city || 'France');
    const queries = [
        `indeed ${role} ${city}`,
        `fr.indeed.com ${role} ${city} vjk`,
        `emplois indeed ${role} ${city}`,
        `indeed ${role} ile de france`,
        `indeed ${role} paris 75`
    ];

    const aggregated = [];
    const seen = new Set();

    for (const query of queries) {
        const searchUrls = [
            `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`,
            `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`
        ];
        try {
            for (const searchUrl of searchUrls) {
                const response = await fetch(toJinaReaderUrl(searchUrl), {
                    headers: {
                        'Accept': 'text/plain',
                        'User-Agent': 'ai-jobmatch-old/1.0 (indeed-fallback-search)'
                    }
                });

                if (!response.ok) continue;
                const searchText = await response.text();
                const items = searchUrl.includes('/lite/')
                    ? parseIndeedJobsFromLiteSearchText(searchText, preferences)
                    : parseIndeedJobsFromSearchText(searchText, preferences);

                for (const item of items) {
                    const key = `${normalizeSearchToken(item.title)}::${normalizeSearchToken(item.url)}`;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    aggregated.push(item);
                    if (aggregated.length >= MAX_JOB_RESULTS) return aggregated;
                }
            }
        } catch {
            // Try next query.
        }
    }

    return aggregated;
}

function buildScrollLikeSiteUrls(siteUrl) {
    const urls = [siteUrl];

    try {
        const parsed = new URL(siteUrl);
        const host = parsed.hostname.toLowerCase();

        // Simulate infinite scroll by collecting multiple search pages.
        if (host.includes('indeed.')) {
            const base = new URL(`${parsed.protocol}//${parsed.host}/jobs`);
            const q = parsed.searchParams.get('q') || '';
            const l = parsed.searchParams.get('l') || '';
            if (q) base.searchParams.set('q', q);
            if (l) base.searchParams.set('l', l);

            for (const start of [0, 10, 20, 30]) {
                const pageUrl = new URL(base.toString());
                pageUrl.searchParams.set('start', String(start));
                urls.push(pageUrl.toString());
            }
        }
    } catch {
        // Keep only the initial URL.
    }

    return Array.from(new Set(urls));
}

async function fetchSiteTextForJobs(siteUrl) {
    const pageUrls = buildScrollLikeSiteUrls(siteUrl);
    const chunks = [];

    for (const pageUrl of pageUrls) {
        try {
            const readerUrl = toJinaReaderUrl(pageUrl);
            const response = await fetch(readerUrl, {
                headers: {
                    'Accept': 'text/plain',
                    'User-Agent': 'ai-jobmatch-old/1.0 (job-matcher)'
                }
            });

            if (!response.ok) continue;
            const text = await response.text();
            const normalized = String(text || '').trim();
            if (normalized) {
                chunks.push(`\n\n--- PAGE ${chunks.length + 1}: ${pageUrl} ---\n${normalized}`);
            }
        } catch {
            // Ignore per-page failures and continue pagination.
        }
    }

    const combined = chunks.join('\n');
    if (!combined) {
        throw new Error('Unable to fetch job site content.');
    }

    return {
        text: combined.slice(0, 140000),
        inspectedPages: pageUrls.length
    };
}

async function analyzeJobMatchesWithOpenAI({ cvText, cvAnalysis, preferences, siteUrl, siteText, language }) {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('Missing AI_API_KEY in old/.env');
    }

    const configuredModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const modelCandidates = Array.from(new Set([configuredModel, 'gpt-4o-mini', 'gpt-4.1-mini']));

    const responseLanguage = String(language || '').toLowerCase().startsWith('fr') ? 'French' : 'English';
    const prompt = [
        'You are an expert recruiting copilot.',
        `Write output content in ${responseLanguage}.`,
        'Return only valid JSON with this shape:',
        '{"jobs":[{"title":"string","company":"string","location":"string","salary":"string","type":"string","summary":"string","skills":["string"],"matchScore":0-100,"url":"string"}],"searchSummary":"string"}',
        'Rules:',
        '- Read the provided site content and extract concrete job offers matching the candidate profile and preferences.',
        '- Use only offers explicitly present in the provided site content. Do not invent companies, salaries, or roles.',
        '- If no reliable offers are present in the content, return jobs as an empty array.',
        '- Keep up to 8 jobs maximum.',
        '- matchScore must estimate relevance to the candidate CV and preferences.',
        '- skills should contain 2 to 6 relevant technical skills for each job.',
        '- Use the provided site URL as fallback url when an offer URL is missing.',
        '',
        `Preferences: ${JSON.stringify(preferences)}`,
        `CV analysis: ${JSON.stringify(cvAnalysis || {})}`,
        'CV text excerpt:',
        String(cvText || '').slice(0, 8000),
        '',
        `Source site: ${siteUrl}`,
        'Site content excerpt:',
        siteText
    ].join('\n');

    let responseText = '';
    let lastError = '';

    for (const model of modelCandidates) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                temperature: 0.1,
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: 'You are a careful recruiting analyst. Output only JSON.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            })
        });

        responseText = await response.text();
        if (response.ok) {
            lastError = '';
            break;
        }

        lastError = responseText || `OpenAI request failed with status ${response.status}`;
        const modelIssue = /model|does not exist|not found|unsupported/i.test(lastError);
        if (!modelIssue) {
            break;
        }
    }

    if (lastError) {
        throw new Error(lastError);
    }

    const data = JSON.parse(responseText);
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error('OpenAI returned empty job matches.');
    }

    const parsed = JSON.parse(content);
    const jobs = Array.isArray(parsed.jobs) ? parsed.jobs : [];
    return {
        jobs,
        searchSummary: normalizeText(parsed.searchSummary)
    };
}

function tokenizeForGrounding(value) {
    return normalizeSearchToken(value)
        .split(' ')
        .map((item) => item.trim())
        .filter((item) => item.length >= 4);
}

function isGroundedJobInSite(job, siteText) {
    const textToken = normalizeSearchToken(siteText || '');
    if (!textToken) return false;

    const titleTokens = tokenizeForGrounding(job?.title || '');
    if (!titleTokens.length) return false;

    const titleMatches = titleTokens.filter((token) => textToken.includes(token)).length;
    const titleCoverage = titleMatches / titleTokens.length;

    if (titleCoverage < 0.5) return false;

    const company = normalizeText(job?.company || '');
    if (!company || /company not specified/i.test(company)) {
        return true;
    }

    const companyTokens = tokenizeForGrounding(company);
    if (!companyTokens.length) return true;

    return companyTokens.some((token) => textToken.includes(token));
}

function filterGroundedJobs(rawJobs, siteText) {
    return (rawJobs || []).filter((job) => isGroundedJobInSite(job, siteText));
}

function normalizeJobMatches(rawJobs, fallbackUrl) {
    const deduped = [];
    const seen = new Set();

    for (const rawJob of rawJobs || []) {
        const title = normalizeText(rawJob?.title);
        const company = normalizeText(rawJob?.company) || 'Company not specified';
        const location = normalizeText(rawJob?.location) || 'Location not specified';
        if (!title) continue;

        const dedupeKey = `${normalizeSearchToken(title)}::${normalizeSearchToken(company)}::${normalizeSearchToken(location)}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);

        const skills = Array.isArray(rawJob?.skills)
            ? rawJob.skills.map((item) => normalizeText(item)).filter(Boolean).slice(0, 6)
            : [];

        deduped.push({
            title,
            company,
            location,
            salary: normalizeText(rawJob?.salary),
            type: normalizeText(rawJob?.type),
            summary: normalizeText(rawJob?.summary),
            skills,
            matchScore: clamp(safeInt(rawJob?.matchScore, 0), 0, 100),
            url: normalizeText(rawJob?.url) || fallbackUrl
        });

        if (deduped.length >= MAX_JOB_RESULTS) break;
    }

    return deduped;
}

function formatSalaryFromAdzuna(job) {
    const min = Number.isFinite(job?.salary_min) ? Number(job.salary_min) : null;
    const max = Number.isFinite(job?.salary_max) ? Number(job.salary_max) : null;
    if (min && max) return `${Math.round(min)} - ${Math.round(max)} EUR`;
    if (min) return `From ${Math.round(min)} EUR`;
    if (max) return `Up to ${Math.round(max)} EUR`;
    return '';
}

function buildSearchSnippet(job) {
    const summary = normalizeText(job?.summary);
    if (summary) return summary;

    const title = normalizeText(job?.title || 'Offre');
    const company = normalizeText(job?.company || 'Entreprise non precisee');
    const location = normalizeText(job?.location || 'Localisation non precisee');
    return `${title} - ${company} - ${location}`;
}

function dedupeJobsAcrossProviders(rawJobs) {
    const output = [];
    const seen = new Set();

    for (const job of rawJobs || []) {
        const title = normalizeText(job?.title);
        const company = normalizeText(job?.company);
        const location = normalizeText(job?.location);
        const key = `${normalizeSearchToken(title)}::${normalizeSearchToken(company)}::${normalizeSearchToken(location)}`;
        if (!title || seen.has(key)) continue;
        seen.add(key);
        output.push({
            ...job,
            summary: buildSearchSnippet(job)
        });
        if (output.length >= MAX_JOB_RESULTS * 2) break;
    }

    return output;
}

function buildAdzunaSearchUrl(preferences, page = 1) {
    const creds = getAdzunaCredentials();
    if (!creds) return '';

    const role = normalizeText(preferences?.targetRole || 'developpeur web');
    const city = normalizeText(preferences?.city || '');
    const country = normalizeSearchToken(preferences?.country || 'france');
    const adzunaCountry = country.startsWith('fr') ? 'fr' : 'fr';

    const url = new URL(`https://api.adzuna.com/v1/api/jobs/${adzunaCountry}/search/${Math.max(1, page)}`);
    url.searchParams.set('app_id', creds.appId);
    url.searchParams.set('app_key', creds.appKey);
    url.searchParams.set('results_per_page', String(PROVIDER_PAGE_SIZE));
    url.searchParams.set('what', role);
    if (city) url.searchParams.set('where', city);
    url.searchParams.set('content-type', 'application/json');
    return url.toString();
}

function countTokenHits(textToken, tokens) {
    if (!textToken || !tokens.length) return 0;
    let hits = 0;
    for (const token of tokens) {
        if (textToken.includes(token)) hits += 1;
    }
    return hits;
}

function scoreProviderJob(job, context) {
    const combinedText = normalizeSearchToken([
        job?.title,
        job?.summary,
        job?.company,
        job?.location,
        Array.isArray(job?.skills) ? job.skills.join(' ') : ''
    ].join(' '));

    const roleTokens = tokenizeForGrounding(context?.preferences?.targetRole || '');
    const cityTokens = tokenizeForGrounding(context?.preferences?.city || '');
    const cvSkillTokens = (Array.isArray(context?.cvAnalysis?.technicalSkills) ? context.cvAnalysis.technicalSkills : [])
        .map((item) => normalizeSearchToken(item))
        .filter((item) => item.length >= 3)
        .slice(0, 24);

    const roleHits = countTokenHits(combinedText, roleTokens);
    const cityHits = countTokenHits(combinedText, cityTokens);
    const cvHits = countTokenHits(combinedText, cvSkillTokens);

    const roleScore = roleTokens.length ? (roleHits / roleTokens.length) * 45 : 20;
    const cityScore = cityTokens.length ? (cityHits / cityTokens.length) * 15 : 10;
    const cvScore = cvSkillTokens.length ? (cvHits / Math.min(cvSkillTokens.length, 10)) * 30 : 10;
    const freshnessBonus = 10;

    return clamp(Math.round(roleScore + cityScore + cvScore + freshnessBonus), 0, 100);
}

async function fetchJobsFromAdzuna(preferences) {
    const searchUrl = buildAdzunaSearchUrl(preferences, 1);
    if (!searchUrl) {
        return { provider: 'adzuna', jobs: [] };
    }

    const response = await fetch(searchUrl, {
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'ai-jobmatch-old/1.0 (provider-api)'
        }
    });

    if (!response.ok) {
        throw new Error(`Adzuna API error (${response.status}).`);
    }

    const payload = await response.json();
    const results = Array.isArray(payload?.results) ? payload.results : [];

    const jobs = results.map((item) => ({
        title: normalizeText(item?.title),
        company: normalizeText(item?.company?.display_name),
        location: normalizeText(item?.location?.display_name),
        salary: formatSalaryFromAdzuna(item),
        type: normalizeText(item?.contract_type || item?.contract_time),
        summary: normalizeText(item?.description),
        skills: [],
        matchScore: 0,
        url: normalizeText(item?.redirect_url)
    })).filter((job) => job.title);

    return { provider: 'adzuna', jobs };
}

async function getFranceTravailAccessToken() {
    const now = Date.now();
    if (FRANCE_TRAVAIL_TOKEN_CACHE.token && now < FRANCE_TRAVAIL_TOKEN_CACHE.expiresAtMs) {
        return FRANCE_TRAVAIL_TOKEN_CACHE.token;
    }

    const creds = getFranceTravailCredentials();
    if (!creds) return '';

    const tokenEndpoints = [
        'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=/partenaire',
        'https://entreprise.pole-emploi.fr/connexion/oauth2/access_token?realm=/partenaire'
    ];

    const form = new URLSearchParams();
    form.set('grant_type', 'client_credentials');
    form.set('client_id', creds.clientId);
    form.set('client_secret', creds.clientSecret);
    form.set('scope', FRANCE_TRAVAIL_SCOPE);

    for (const endpoint of tokenEndpoints) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: form.toString()
            });

            if (!response.ok) continue;
            const payload = await response.json();
            const token = normalizeText(payload?.access_token);
            const expiresInSec = safeInt(payload?.expires_in, 300);
            if (!token) continue;

            // Keep 30 seconds margin before expiry.
            FRANCE_TRAVAIL_TOKEN_CACHE.token = token;
            FRANCE_TRAVAIL_TOKEN_CACHE.expiresAtMs = Date.now() + Math.max(60, expiresInSec - 30) * 1000;
            return token;
        } catch {
            // Try next endpoint.
        }
    }

    return '';
}

function mapFranceTravailJob(item, fallbackUrl) {
    const title = normalizeText(item?.intitule || item?.appellationlibelle || item?.libelle);
    const company = normalizeText(item?.entreprise?.nom || item?.entreprise?.raisonSociale || item?.nomEntreprise || 'France Travail');
    const location = normalizeText(item?.lieuTravail?.libelle || item?.lieuLibelle || item?.commune || item?.ville);
    const salary = normalizeText(item?.salaire?.libelle || item?.salaireLibelle);
    const type = normalizeText(item?.typeContratLibelle || item?.natureContrat || item?.contrat);
    const summary = normalizeText(item?.description || item?.libelleMetier || item?.intitule);

    const directUrl = normalizeText(
        item?.origineOffre?.urlOrigine
        || item?.origineOffre?.url
        || item?.urlOrigine
        || item?.url
    );

    return {
        title,
        company,
        location,
        salary,
        type,
        summary,
        skills: [],
        matchScore: 0,
        url: directUrl || fallbackUrl
    };
}

async function fetchJobsFromFranceTravail(preferences) {
    const token = await getFranceTravailAccessToken();
    if (!token) {
        return { provider: 'france-travail', jobs: [] };
    }

    const role = normalizeText(preferences?.targetRole || 'developpeur web');
    const city = normalizeText(preferences?.city || 'Paris');

    const endpoints = [
        'https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search',
        'https://api.pole-emploi.io/partenaire/offresdemploi/v2/offres/search'
    ];

    const params = new URLSearchParams();
    params.set('motsCles', role);
    if (city) params.set('lieux', city);
    params.set('range', `0-${Math.max(1, PROVIDER_PAGE_SIZE - 1)}`);

    for (const endpoint of endpoints) {
        try {
            const url = `${endpoint}?${params.toString()}`;
            const response = await fetch(url, {
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) continue;
            const payload = await response.json();
            const results = Array.isArray(payload?.resultats)
                ? payload.resultats
                : Array.isArray(payload?.results)
                    ? payload.results
                    : [];

            const jobs = results
                .map((item) => mapFranceTravailJob(item, endpoint))
                .filter((job) => normalizeText(job.title));

            return { provider: 'france-travail', jobs };
        } catch {
            // Try next endpoint.
        }
    }

    return { provider: 'france-travail', jobs: [] };
}

async function fetchJobsFromProviderApi(preferences) {
    const providers = [];

    const franceTravailCreds = getFranceTravailCredentials();
    if (franceTravailCreds) {
        try {
            providers.push(await fetchJobsFromFranceTravail(preferences));
        } catch {
            providers.push({ provider: 'france-travail', jobs: [] });
        }
    }

    const adzunaCreds = getAdzunaCredentials();
    if (adzunaCreds) {
        try {
            providers.push(await fetchJobsFromAdzuna(preferences));
        } catch {
            providers.push({ provider: 'adzuna', jobs: [] });
        }
    }

    const allJobs = dedupeJobsAcrossProviders(
        providers.flatMap((providerResult) => Array.isArray(providerResult?.jobs) ? providerResult.jobs : [])
    );

    const providerNames = providers
        .filter((providerResult) => Array.isArray(providerResult?.jobs) && providerResult.jobs.length)
        .map((providerResult) => providerResult.provider)
        .filter(Boolean);

    return {
        provider: providerNames.join('+'),
        jobs: allJobs
    };
}

async function findMatchingJobs(payload) {
    const language = normalizeText(payload?.language) || 'en';
    const initialSiteUrl = sanitizeSiteUrl(payload?.preferences?.siteUrl || payload?.siteUrl || 'https://www.indeed.fr');
    if (!initialSiteUrl) {
        throw new Error('Missing site URL.');
    }

    const preferences = {
        siteUrl: initialSiteUrl,
        targetRole: normalizeText(payload?.preferences?.targetRole),
        country: normalizeText(payload?.preferences?.country),
        city: normalizeText(payload?.preferences?.city)
    };

    const siteUrl = buildPreferredSearchUrl(initialSiteUrl, preferences);
    preferences.siteUrl = siteUrl;

    const cvText = normalizeText(payload?.cvText);
    const cvAnalysis = payload?.cvAnalysis && typeof payload.cvAnalysis === 'object' ? payload.cvAnalysis : {};
    if (!cvText && !cvAnalysis?.profileSummary && !Array.isArray(cvAnalysis?.technicalSkills)) {
        throw new Error('Missing CV context for job matching.');
    }

    const displayMode = normalizeSearchToken(payload?.displayMode || '');
    if (isIndeedHost(siteUrl) && displayMode === 'external') {
        const directJobs = normalizeJobMatches([
            {
                title: `Indeed - ${normalizeText(preferences.targetRole || 'offres')}`,
                company: 'Indeed',
                location: normalizeText(preferences.city || preferences.country || 'France'),
                salary: '',
                type: '',
                summary: 'Accedez directement aux offres officielles Indeed selon vos criteres.',
                skills: [],
                matchScore: 100,
                url: siteUrl
            }
        ], siteUrl);

        return {
            source: 'external-link',
            provider: 'indeed',
            siteUrl,
            preferences,
            jobs: directJobs,
            searchSummary: 'Affichage direct des offres Indeed sans extraction serveur.',
            inspectedChars: 0,
            inspectedPages: 0
        };
    }

    const providerResult = await fetchJobsFromProviderApi(preferences);
    if (Array.isArray(providerResult.jobs) && providerResult.jobs.length) {
        const scored = providerResult.jobs
            .map((job) => ({
                ...job,
                matchScore: scoreProviderJob(job, { cvText, cvAnalysis, preferences })
            }))
            .sort((a, b) => b.matchScore - a.matchScore)
            .slice(0, MAX_JOB_RESULTS);

        const providerJobs = normalizeJobMatches(scored, siteUrl);
        return {
            source: 'provider-api',
            provider: providerResult.provider,
            siteUrl,
            preferences,
            jobs: providerJobs,
            searchSummary: providerJobs.length
                ? `Found ${providerJobs.length} jobs from ${providerResult.provider}.`
                : '',
            inspectedChars: 0
        };
    }

    const sitePayload = await fetchSiteTextForJobs(siteUrl);
    const siteText = sitePayload.text;

    if (isIndeedHost(siteUrl) && isCloudflareChallengeText(siteText)) {
        const fallbackJobs = await fetchIndeedJobsFallback(preferences);
        if (fallbackJobs.length) {
            const scoredFallback = fallbackJobs
                .map((job) => ({
                    ...job,
                    matchScore: scoreProviderJob(job, { cvText, cvAnalysis, preferences })
                }))
                .sort((a, b) => b.matchScore - a.matchScore)
                .slice(0, MAX_JOB_RESULTS);

            return {
                source: 'indeed-fallback-search',
                siteUrl,
                preferences,
                jobs: normalizeJobMatches(scoredFallback, siteUrl),
                searchSummary: 'Indeed bloque l\'accès direct côté serveur, résultats récupérés via recherche web Indeed.',
                inspectedChars: siteText.length,
                inspectedPages: safeInt(sitePayload.inspectedPages, 1)
            };
        }
    }

    const aiResult = await analyzeJobMatchesWithOpenAI({
        cvText,
        cvAnalysis,
        preferences,
        siteUrl,
        siteText,
        language
    });

    const groundedJobs = filterGroundedJobs(aiResult.jobs, siteText);
    const jobs = normalizeJobMatches(groundedJobs, siteUrl);
    return {
        source: 'ai',
        siteUrl,
        preferences,
        jobs,
        searchSummary: aiResult.searchSummary || '',
        inspectedChars: siteText.length,
        inspectedPages: safeInt(sitePayload.inspectedPages, 1)
    };
}

function prepareCvTextForModel(text) {
    const normalized = String(text || '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/[^\wÀ-ÿ\n\s.,;:()\-+@/#]/g, ' ')
        .split('\n')
        .map(line => line.replace(/[ \t]{2,}/g, ' ').trim())
        .filter(Boolean)
        .join('\n');

    // Keep prompts stable and avoid oversized payloads on dense PDFs.
    const MAX_LEN = 30000;
    return normalized.length > MAX_LEN ? normalized.slice(0, MAX_LEN) : normalized;
}

function extractKnownSkills(text) {
    const normalized = String(text || '').toLowerCase();
    const skillMap = [
        ['html', /\bhtml\b/],
        ['css', /\bcss\b/],
        ['javascript', /\bjavascript\b|\bjs\b/],
        ['typescript', /\btypescript\b|\bts\b/],
        ['react', /\breact\b/],
        ['react native', /react\s+native/],
        ['node.js', /\bnode\.?js\b|\bnode\b/],
        ['express.js', /\bexpress\.?js\b|\bexpress\b/],
        ['php', /\bphp\b/],
        ['sql', /\bsql\b/],
        ['jquery', /\bjquery\b/],
        ['bootstrap', /\bbootstrap\b/],
        ['github', /\bgithub\b/],
        ['git', /\bgit\b/],
        ['aws', /\baws\b/],
        ['api', /\bapi\b/],
        ['docker', /\bdocker\b/],
        ['wordpress', /\bwordpress\b/],
        ['figma', /\bfigma\b/],
        ['photoshop', /\bphotoshop\b/],
        ['webdesign', /\bweb\s?design\b|\bwebdesign\b/],
        ['maquette', /\bmaquette\b/]
    ];

    return skillMap.filter(([, pattern]) => pattern.test(normalized)).map(([name]) => name);
}

function getLanguageName(language) {
    return String(language || '').toLowerCase().startsWith('fr') ? 'French' : 'English';
}

function inferProfession(text, matchedSkills) {
    const normalized = text.toLowerCase();
    if (/designer|ui\/?ux|figma|sketch|adobe xd/.test(normalized)) return 'Designer';
    if (/product manager|product owner/.test(normalized)) return 'Product Manager';
    if (/data scientist|machine learning|ml/.test(normalized)) return 'Data Scientist';
    if (/devops|docker|kubernetes|terraform/.test(normalized)) return 'DevOps Engineer';
    if (/backend|node|python|django|api/.test(normalized)) return 'Backend Developer';
    if (/frontend|react|typescript|javascript|next/.test(normalized)) return 'Frontend Developer';
    if (matchedSkills.some(skill => ['figma', 'sketch', 'adobe xd'].includes(skill.toLowerCase()))) return 'Designer';
    return 'Software Engineer';
}

function inferLevel(years, text) {
    const normalized = text.toLowerCase();
    if (/lead|principal|head/.test(normalized)) return 'Lead';
    if (/senior|staff/.test(normalized)) return 'Senior';
    if (years >= 8) return 'Lead';
    if (years >= 5) return 'Senior';
    if (years >= 2) return 'Mid';
    return 'Junior';
}

function buildSummarySentence(profession, level, years, matchedSkills, languages) {
    const skillText = matchedSkills.slice(0, 4).join(', ');
    const languageText = languages.length ? ` Languages: ${languages.join(', ')}.` : '';
    return `${level} ${profession} with ${years || 'several'} years of experience${skillText ? ` across ${skillText}` : ''}.${languageText}`;
}

async function readJsonBody(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(chunk);
    }

    if (!chunks.length) return {};

    const raw = Buffer.concat(chunks).toString('utf8');
    return JSON.parse(raw || '{}');
}

function buildAnalysisPrompt(text, filename, language) {
    const responseLanguage = getLanguageName(language);
    return [
        'You are an expert recruiting analyst reviewing a CV.',
        `Write the response in ${responseLanguage}.`,
        'Return only valid JSON with these fields:',
        '{"score":0-100,"matchedSkills":[string],"technicalSkills":[string],"years":number,"languages":[string],"profession":string,"level":string,"summary":string,"profileSummary":string,"insights":[string,string,string],"recommendation":string,"title":string,"body":string}',
        'Rules:',
        '- Read the entire CV text before deciding.',
        '- Be exhaustive for the technical stack and avoid dropping explicit skills.',
        '- score must reflect the quality of the CV for a modern product/engineering role.',
        '- matchedSkills should contain the most relevant concrete skills found in the CV.',
        '- technicalSkills should list up to 24 explicit technical skills/tools found in the CV (languages, frameworks, cloud, dev tools).',
        '- years should be the best estimated years of experience or 0 if unclear.',
        '- languages should list detected human languages if present, including French, English, Spanish, German, Italian, Portuguese, Arabic, and Dutch when relevant.',
        '- profession should be a short role title such as Frontend Developer, Designer, Backend Developer, or Software Engineer.',
        '- level should be one of Junior, Mid, Senior, or Lead.',
        '- summary should be concise and recruitment-oriented.',
        '- profileSummary should be a full one-sentence profile summary in plain language.',
        '- insights should be exactly 3 short strings.',
        '- recommendation should be a short next-step suggestion.',
        '- title should be a short completion status.',
        '- body should explain the result in one sentence.',
        `Filename: ${filename || 'cv'}`,
        'CV text:',
        text
    ].join('\n');
}

async function analyzeWithOpenAI(text, filename, language) {
    const preparedText = prepareCvTextForModel(text);
    const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || ENV_FILE_VALUES.AI_API_KEY || ENV_FILE_VALUES.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('Missing AI_API_KEY in old/.env');
    }

    const configuredModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const modelCandidates = Array.from(new Set([configuredModel, 'gpt-4o-mini', 'gpt-4.1-mini']));
    let responseText = '';
    let lastError = '';

    for (const model of modelCandidates) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                temperature: 0.2,
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: 'You are a careful recruiting analyst. Output only JSON.'
                    },
                    {
                        role: 'user',
                        content: buildAnalysisPrompt(preparedText, filename, language)
                    }
                ]
            })
        });

        responseText = await response.text();
        if (response.ok) {
            lastError = '';
            break;
        }

        lastError = responseText || `OpenAI request failed with status ${response.status}`;
        const modelIssue = /model|does not exist|not found|unsupported/i.test(lastError);
        if (!modelIssue) {
            break;
        }
    }

    if (lastError) {
        throw new Error(lastError);
    }

    const data = JSON.parse(responseText);
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error('OpenAI returned an empty analysis.');
    }

    const parsed = JSON.parse(content);
    const localizedDefaults = String(language || '').toLowerCase().startsWith('fr')
        ? {
            title: 'Analyse du CV terminée',
            body: 'Votre CV a été analysé par le modèle IA.',
            summary: 'Profil analysé par l’IA.',
            profileSummary: 'Profil analysé par l’IA.',
            recommendation: 'Passez à l’étape suivante avec ce résultat.'
        }
        : {
            title: 'CV Analysis Complete',
            body: 'Your CV has been analyzed by the AI model.',
            summary: 'AI-analyzed profile.',
            profileSummary: 'AI-analyzed profile.',
            recommendation: 'Proceed with the next step from this result.'
        };
    const profession = normalizeText(parsed.profession) || inferProfession(text, Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills : []);
    const level = normalizeText(parsed.level) || inferLevel(safeInt(parsed.years, 0), text);
    const matchedSkills = Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills.map(normalizeText).filter(Boolean) : [];
    const aiTechnicalSkills = Array.isArray(parsed.technicalSkills) ? parsed.technicalSkills.map(normalizeText).filter(Boolean) : [];
    const heuristicTechnicalSkills = extractKnownSkills(preparedText);
    const technicalSkills = Array.from(new Set([...aiTechnicalSkills, ...matchedSkills, ...heuristicTechnicalSkills])).slice(0, 24);
    const languages = Array.isArray(parsed.languages) ? parsed.languages.map(normalizeText).filter(Boolean) : [];
    return {
        source: 'ai',
        score: clamp(safeInt(parsed.score, 0), 0, 100),
        profession,
        level,
        matchedSkills,
        technicalSkills,
        years: clamp(safeInt(parsed.years, 0), 0, 60),
        languages,
        summary: normalizeText(parsed.summary) || localizedDefaults.summary || buildSummarySentence(profession, level, safeInt(parsed.years, 0), matchedSkills, languages),
        profileSummary: normalizeText(parsed.profileSummary) || localizedDefaults.profileSummary || buildSummarySentence(profession, level, safeInt(parsed.years, 0), matchedSkills, languages),
        insights: Array.isArray(parsed.insights) ? parsed.insights.map(normalizeText).filter(Boolean).slice(0, 3) : [],
        recommendation: normalizeText(parsed.recommendation) || localizedDefaults.recommendation,
        title: normalizeText(parsed.title) || localizedDefaults.title,
        body: normalizeText(parsed.body) || localizedDefaults.body
    };
}

function fallbackAnalysisError(error) {
    return {
        source: 'error',
        error: error && error.message ? error.message : 'Unable to analyze CV.'
    };
}

const server = http.createServer(async (req, res) => {
    try {
        const requestUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
        const pathname = requestUrl.pathname;

        if (req.method === 'OPTIONS') {
            res.writeHead(204, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            });
            return res.end();
        }

        if (req.method === 'GET' && pathname === '/api/locations/countries') {
            const q = normalizeText(requestUrl.searchParams.get('q'));
            const limit = toPositiveInt(requestUrl.searchParams.get('limit'), MAX_LOCATION_RESULTS);
            const items = searchCountries(q, limit);
            return sendJson(res, 200, { items });
        }

        if (req.method === 'GET' && pathname === '/api/locations/cities') {
            const countryInput = normalizeText(requestUrl.searchParams.get('country'));
            const q = normalizeText(requestUrl.searchParams.get('q'));
            const limit = toPositiveInt(requestUrl.searchParams.get('limit'), MAX_LOCATION_RESULTS);

            if (!countryInput) {
                return sendJson(res, 400, { error: 'Missing country query parameter.' });
            }

            const country = resolveCountryByInput(countryInput);
            if (!country) {
                return sendJson(res, 404, { error: 'Country not found.' });
            }

            const localCities = searchCities(country.isoCode, q, limit);
            const onlineCities = await searchCitiesOnline(country.isoCode, q, limit);
            const cities = mergeCityResults(localCities, onlineCities, limit);
            return sendJson(res, 200, {
                country,
                items: cities.map((city) => ({
                    name: city.name,
                    stateCode: city.stateCode,
                    stateName: city.stateName
                }))
            });
        }

        if (req.method === 'POST' && pathname === '/api/analyze-cv') {
            const body = await readJsonBody(req);
            const text = normalizeText(body.text);
            const filename = normalizeText(body.filename);
            const language = normalizeText(body.language) || 'en';

            if (!text) {
                return sendJson(res, 400, { error: 'Missing CV text.' });
            }

            try {
                const analysis = await analyzeWithOpenAI(text, filename, language);
                return sendJson(res, 200, analysis);
            } catch (error) {
                return sendJson(res, 500, fallbackAnalysisError(error));
            }
        }

        if (req.method === 'POST' && pathname === '/api/find-jobs') {
            const body = await readJsonBody(req);

            try {
                const result = await findMatchingJobs(body || {});
                return sendJson(res, 200, result);
            } catch (error) {
                return sendJson(res, 500, {
                    source: 'error',
                    error: error && error.message ? error.message : 'Unable to find matching jobs.'
                });
            }
        }

        const requestPath = pathname === '/' ? '/index.html' : pathname;
        const filePath = path.join(ROOT, requestPath.replace(/^\//, ''));

        if (!filePath.startsWith(ROOT)) {
            res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end('Forbidden');
        }

        const exists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
        if (!exists) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            return res.end('Not found');
        }

        const data = await fsp.readFile(filePath);
        res.writeHead(200, {
            'Content-Type': guessContentType(filePath),
            'Access-Control-Allow-Origin': '*'
        });
        return res.end(data);
    } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end(error && error.message ? error.message : 'Internal Server Error');
    }
});

server.listen(PORT, () => {
    console.log(`AI JobMatch legacy server running at http://127.0.0.1:${PORT}`);
});