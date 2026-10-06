// AI JobMatch - Main JavaScript File
// Handles all interactive functionality across the platform

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

const cvSkillCatalog = [
    'javascript', 'typescript', 'react', 'next', 'node', 'python', 'django',
    'php', 'symfony', 'sql', 'mysql', 'postgresql', 'docker', 'kubernetes',
    'aws', 'azure', 'gcp', 'linux', 'git', 'ci/cd', 'html', 'css', 'figma',
    'tailwind', 'graphql', 'rest', 'api'
];

const LANGUAGE_STORAGE_KEY = 'ai-jobmatch-language';
const UI_COPY = {
    en: window.UI_COPY_EN || {},
    fr: window.UI_COPY_FR || {}
};

let currentLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY) || (navigator.language && navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en');
let typedInstance = null;
let latestCvText = '';
let latestCvAnalysis = null;
let hasDynamicJobs = false;

const locationAutocompleteState = {
    lastCountries: [],
    selectedCountry: null,
    cityCache: new Map()
};

const FRANCE_COUNTRY_LABEL = 'France';
const FRANCE_COUNTRY_CODE = 'FR';

if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

function getCopy() {
    return UI_COPY[currentLanguage] || UI_COPY.en;
}

function setTextById(id, text) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = text;
    }
}

function applyLanguage(language, options = {}) {
    currentLanguage = UI_COPY[language] ? language : 'en';
    localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
    document.documentElement.lang = currentLanguage;

    const copy = getCopy();
    document.title = copy.pageTitle;

    setTextById('nav-dashboard-label', copy.navDashboard);
    setTextById('nav-auto-apply-label', copy.navAutoApply);
    setTextById('nav-recruiter-label', copy.navRecruiter);
    setTextById('language-label', copy.languageLabel);
    setTextById('user-role-label', copy.userRole);
    setTextById('hero-subtitle', copy.heroSubtitle);
    setTextById('upload-title', copy.uploadTitle);
    setTextById('upload-drop-title', copy.uploadDropTitle);
    setTextById('upload-drop-subtitle', copy.uploadDropSubtitle);
    setTextById('upload-button', copy.uploadButton);
    setTextById('upload-format', copy.uploadFormat);
    setTextById('analysis-profile-label', copy.profileSummaryLabel);
    setTextById('analysis-profession-label', copy.professionLabel);
    setTextById('analysis-level-label', copy.levelLabel);
    setTextById('analysis-skills-label', copy.skillsLabel);
    setTextById('job-pref-title', copy.jobPrefTitle);
    setTextById('job-pref-subtitle', copy.jobPrefSubtitle);
    setTextById('label-target-site', copy.targetSiteLabel);
    setTextById('label-target-job', copy.targetJobLabel);
    setTextById('label-target-country', copy.targetCountryLabel);
    setTextById('label-target-city', copy.targetCityLabel);
    setTextById('show-recommended-jobs', copy.showRecommendedJobs);
    setTextById('ai-insights-title', copy.aiInsights);
    setTextById('recommended-jobs-title', copy.recommendedJobs);
    setTextById('filter-all', copy.allFilter);
    setTextById('filter-remote', copy.remoteFilter);
    setTextById('filter-full-time', copy.fullTimeFilter);
    setTextById('insight-1-title', copy.aiSkillTitle);
    setTextById('insight-1-body', copy.aiSkillBody);
    setTextById('insight-2-title', copy.aiExperienceTitle);
    setTextById('insight-2-body', copy.aiExperienceBody);
    setTextById('insight-3-title', copy.aiNextStepTitle);
    setTextById('insight-3-body', copy.aiNextStepBody);

    const targetSiteInput = document.getElementById('target-site-url');
    const targetJobInput = document.getElementById('target-job-title');
    const targetCountryInput = document.getElementById('target-country');
    const targetCityInput = document.getElementById('target-city');

    if (targetSiteInput) targetSiteInput.placeholder = copy.targetSitePlaceholder;
    if (targetJobInput) targetJobInput.placeholder = copy.targetJobPlaceholder;
    if (targetCountryInput) targetCountryInput.placeholder = copy.targetCountryPlaceholder;
    if (targetCityInput) targetCityInput.placeholder = copy.targetCityPlaceholder;

    const languageSwitcher = document.getElementById('language-switcher');
    if (languageSwitcher && languageSwitcher.value !== currentLanguage) {
        languageSwitcher.value = currentLanguage;
    }

    if (!options.skipTyped && document.getElementById('typed-text')) {
        initializeTypedText();
    }

    if (options.refreshJobCards) {
        translateJobCards();
    }
}

function translateJobCards() {
    if (hasDynamicJobs) return;

    const copy = getCopy();
    const cards = document.querySelectorAll('#job-listings .job-card');
    const translations = currentLanguage === 'fr' ? [
        {
            title: 'Développeur Frontend Senior',
            company: 'TechCorp Solutions',
            description: 'Rejoignez notre équipe pour créer des applications web innovantes avec React et TypeScript.',
            tags: ['React', 'TypeScript', 'Node.js'],
            location: 'San Francisco, CA',
            salary: '$120k - $160k',
            match: '94% de correspondance',
            cta: 'Postuler'
        },
        {
            title: 'Ingénieur Full Stack',
            company: 'InnovateLabs',
            description: 'Travaillez sur des projets passionnants combinant frontend et backend dans un environnement 100% distant.',
            tags: ['Python', 'Django', 'React'],
            location: 'Télétravail',
            salary: '$100k - $140k',
            match: '87% de correspondance',
            cta: 'Postuler'
        },
        {
            title: 'Designer UI/UX',
            company: 'DesignStudio Pro',
            description: 'Créez des expériences et interfaces élégantes pour des marques et produits innovants.',
            tags: ['Figma', 'Sketch', 'Adobe XD'],
            location: 'New York, NY',
            salary: '$90k - $120k',
            match: '91% de correspondance',
            cta: 'Postuler'
        }
    ] : [
        {
            title: 'Senior Frontend Developer',
            company: 'TechCorp Solutions',
            description: 'Join our innovative team to build cutting-edge web applications using React and TypeScript.',
            tags: ['React', 'TypeScript', 'Node.js'],
            location: 'San Francisco, CA',
            salary: '$120k - $160k',
            match: '94% Match',
            cta: 'Apply Now'
        },
        {
            title: 'Full Stack Engineer',
            company: 'InnovateLabs',
            description: 'Work on exciting projects combining frontend and backend technologies in a fully remote environment.',
            tags: ['Python', 'Django', 'React'],
            location: 'Remote',
            salary: '$100k - $140k',
            match: '87% Match',
            cta: 'Apply Now'
        },
        {
            title: 'UI/UX Designer',
            company: 'DesignStudio Pro',
            description: 'Create beautiful user experiences and interfaces for leading brands and innovative products.',
            tags: ['Figma', 'Sketch', 'Adobe XD'],
            location: 'New York, NY',
            salary: '$90k - $120k',
            match: '91% Match',
            cta: 'Apply Now'
        }
    ];

    cards.forEach((card, index) => {
        const data = translations[index];
        if (!data) return;

        const title = card.querySelector('h4');
        const company = card.querySelector('p.text-sm.text-gray-600');
        const description = card.querySelector('p.text-sm.text-gray-600.mb-3');
        const metaSpans = card.querySelectorAll('.flex.items-center.space-x-4.text-sm.text-gray-500.mb-3 span span');
        const tagSpans = card.querySelectorAll('.flex.space-x-2 span');
        const matchBadge = card.querySelector('.match-score');
        const applyButton = card.querySelector('button.bg-gray-100');

        if (title) title.textContent = data.title;
        if (company) company.textContent = data.company;
        if (description) description.textContent = data.description;
        if (metaSpans[0]) metaSpans[0].textContent = data.location;
        if (metaSpans[1]) metaSpans[1].textContent = data.salary;
        tagSpans.forEach((tag, tagIndex) => {
            if (data.tags[tagIndex]) {
                tag.textContent = data.tags[tagIndex];
            }
        });
        if (matchBadge) matchBadge.textContent = data.match;
        if (applyButton) applyButton.textContent = data.cta;
    });
}

function initializeApp() {
    // Initialize different components based on current page
    const currentPage = getCurrentPage();
    
    switch(currentPage) {
        case 'index':
            initializeHomePage();
            break;
        case 'auto-apply':
            initializeAutoApplyPage();
            break;
        case 'recruiter':
            initializeRecruiterPage();
            break;
    }
    
    // Initialize common components
    initializeNavigation();
    initializeAnimations();
}

function getCurrentPage() {
    const path = window.location.pathname;
    if (path.includes('auto-apply')) return 'auto-apply';
    if (path.includes('recruiter')) return 'recruiter';
    return 'index';
}

function escapeHtml(text) {
    return String(text)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function initializeLanguageSwitcher() {
    const languageSwitcher = document.getElementById('language-switcher');
    if (!languageSwitcher) return;

    languageSwitcher.value = currentLanguage;
    languageSwitcher.addEventListener('change', function() {
        applyLanguage(this.value, { refreshJobCards: true });
    });
}

function findButtonsByText(labels) {
    const buttons = document.querySelectorAll('button');
    return Array.from(buttons).filter(button => labels.some(label => button.textContent.includes(label)));
}

function updateProgressBar(element, percentage) {
    if (!element) return;
    const clamped = `${Math.max(0, Math.min(100, percentage))}%`;
    element.style.width = clamped;
}

function getAnalysisEndpoint() {
    if (window.location.protocol === 'file:') {
        return 'http://127.0.0.1:3000/api/analyze-cv';
    }

    const host = window.location.hostname;
    const port = window.location.port;
    const isLocalHost = host === '127.0.0.1' || host === 'localhost';

    // When served by static servers (for example :5501), route API calls to the Node backend on :3000.
    if (isLocalHost && port && port !== '3000') {
        return `http://${host}:3000/api/analyze-cv`;
    }

    return '/api/analyze-cv';
}

function getJobSearchEndpoint() {
    return getAnalysisEndpoint().replace('/api/analyze-cv', '/api/find-jobs');
}

function normalizeAiAnalysis(payload) {
    const copy = getCopy();
    const matchedSkills = Array.isArray(payload?.matchedSkills) ? payload.matchedSkills : [];
    const languages = Array.isArray(payload?.languages) ? payload.languages : [];
    const insights = Array.isArray(payload?.insights) ? payload.insights : [];
    const technicalSkills = Array.isArray(payload?.technicalSkills) ? payload.technicalSkills : matchedSkills;

    return {
        source: payload?.source || 'ai',
        score: Number(payload?.score) || 0,
        profession: typeof payload?.profession === 'string' ? payload.profession : 'Software Engineer',
        level: typeof payload?.level === 'string' ? payload.level : 'Mid',
        matchedSkills,
        technicalSkills,
        years: Number(payload?.years) || 0,
        languages,
        summary: typeof payload?.summary === 'string' ? payload.summary : matchedSkills.slice(0, 6).join(', '),
        profileSummary: typeof payload?.profileSummary === 'string' ? payload.profileSummary : (typeof payload?.summary === 'string' ? payload.summary : matchedSkills.slice(0, 6).join(', ')),
        insights: insights.slice(0, 3).map(insight => String(insight)),
        recommendation: typeof payload?.recommendation === 'string' ? payload.recommendation : 'Review the AI summary for next steps.',
        title: typeof payload?.title === 'string' ? payload.title : copy.cvAnalysisCompleteTitle,
        body: typeof payload?.body === 'string' ? payload.body : copy.analysisBody
    };
}

async function requestAiAnalysis(text, filename, language = currentLanguage) {
    const response = await fetch(getAnalysisEndpoint(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text, filename, language })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `AI analysis failed with status ${response.status}.`);
    }

    const payload = await response.json();
    return normalizeAiAnalysis(payload);
}

async function requestAiJobSearch(payload) {
    const response = await fetch(getJobSearchEndpoint(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Job search failed with status ${response.status}.`);
    }

    return response.json();
}

function renderDynamicJobs(jobs) {
    const copy = getCopy();
    const listings = document.getElementById('job-listings');
    if (!listings) return;

    const safeJobs = Array.isArray(jobs) ? jobs : [];
    if (!safeJobs.length) {
        listings.innerHTML = `<div class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">${escapeHtml(copy.noJobsFound)}</div>`;
        return;
    }

    const cards = safeJobs.map((job) => {
        const title = escapeHtml(job.title || 'Job');
        const company = escapeHtml(job.company || copy.defaultCompany);
        const location = escapeHtml(job.location || copy.defaultLocation);
        const salary = escapeHtml(job.salary || '-');
        const type = escapeHtml(job.type || '');
        const summary = escapeHtml(job.summary || '');
        const score = Number.isFinite(Number(job.matchScore)) ? `${Number(job.matchScore)}%` : '-';
        const skills = Array.isArray(job.skills) ? job.skills.slice(0, 4) : [];
        const skillBadges = skills.map((skill) => `<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">${escapeHtml(skill)}</span>`).join('');
        const offerUrl = escapeHtml(job.url || '#');

        return `
            <div class="job-card border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="mb-2">
                            <h4 class="font-semibold text-gray-900">${title}</h4>
                            <p class="text-sm text-gray-600">${company}</p>
                        </div>
                        <div class="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                            <span>${location}</span>
                            <span>${salary}</span>
                            ${type ? `<span>${type}</span>` : ''}
                        </div>
                        <p class="text-sm text-gray-600 mb-3">${summary}</p>
                        <div class="flex items-center justify-between">
                            <div class="flex flex-wrap gap-2">${skillBadges}</div>
                            <div class="flex items-center space-x-2">
                                <div class="match-score text-white px-3 py-1 rounded-full text-sm font-semibold">${score}</div>
                                <a href="${offerUrl}" target="_blank" rel="noopener noreferrer" class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">${escapeHtml(copy.openOffer)}</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    listings.innerHTML = cards;
}

async function extractCvText(file) {
    const fileName = file.name.toLowerCase();

    const normalizeExtractedText = (input) => {
        const raw = String(input || '');

        // Fix OCR artifacts like "S k i l l s" -> "Skills".
        const fixedSpacedLetters = raw.replace(/\b(?:[A-Za-zÀ-ÿ]\s+){3,}[A-Za-zÀ-ÿ]\b/g, (match) => {
            const compact = match.replace(/\s+/g, '');
            return compact.length >= 4 ? compact : match;
        });

        return fixedSpacedLetters
            .replace(/\r/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/[ \t]{2,}/g, ' ')
            .replace(/\u0000/g, ' ')
            .trim();
    };

    const readBinaryText = async () => {
        const buffer = await file.arrayBuffer();
        return new TextDecoder('ascii', { fatal: false }).decode(buffer);
    };

    const getWordStats = (text) => {
        const words = String(text || '').match(/[A-Za-zÀ-ÿ]{2,}/g) || [];
        const unique = new Set(words.map(word => word.toLowerCase()));
        return {
            totalWords: words.length,
            uniqueWords: unique.size
        };
    };

    const isLowQualityCvText = (text) => {
        const normalized = String(text || '').trim();
        if (!normalized) return true;

        const { totalWords, uniqueWords } = getWordStats(normalized);
        if (normalized.length < 450) return true;
        if (totalWords < 90) return true;
        if (uniqueWords < 70) return true;

        return false;
    };

    if (fileName.endsWith('.pdf')) {
        const binary = await readBinaryText();
        const literalTextMatches = Array.from(binary.matchAll(/\(([^()]{8,})\)\s*Tj/g)).map(match => match[1]);

        if (literalTextMatches.length) {
            return normalizeExtractedText(literalTextMatches.join('\n'));
        }

        // Prefer PDF.js extraction before any binary fallback to avoid sending garbage text to the AI endpoint.
        if (window.pdfjsLib) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
                const pdf = await loadingTask.promise;
                const pageTexts = [];

                for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
                    const page = await pdf.getPage(pageNumber);
                    const textContent = await page.getTextContent();
                    const content = textContent.items
                        .map(item => (item && item.str ? String(item.str) : ''))
                        .join(' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    if (content) {
                        pageTexts.push(content);
                    }
                }

                const mergedText = pageTexts.join(' ').replace(/\s+/g, ' ').trim();
                const normalizedPdfText = normalizeExtractedText(mergedText);
                const shouldRunOcr = isLowQualityCvText(normalizedPdfText);

                // OCR fallback for scanned/image-only PDFs or low-quality extracted layers.
                if (window.Tesseract && shouldRunOcr) {
                    const ocrChunks = [];
                    const pageCount = Math.min(pdf.numPages, 8);

                    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
                        const page = await pdf.getPage(pageNumber);
                        const viewport = page.getViewport({ scale: 2.2 });
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        if (!context) continue;

                        canvas.width = Math.floor(viewport.width);
                        canvas.height = Math.floor(viewport.height);

                        await page.render({ canvasContext: context, viewport }).promise;

                        const dataUrl = canvas.toDataURL('image/png');
                        const ocrResult = await window.Tesseract.recognize(dataUrl, 'eng+fra', {
                            logger: () => {}
                        });
                        const ocrText = (ocrResult && ocrResult.data && ocrResult.data.text ? ocrResult.data.text : '')
                            .replace(/\s+/g, ' ')
                            .trim();
                        if (ocrText.length > 10) {
                            ocrChunks.push(ocrText);
                        }
                    }

                    const ocrMerged = normalizeExtractedText(ocrChunks.join('\n'));
                    const pdfStats = getWordStats(normalizedPdfText);
                    const ocrStats = getWordStats(ocrMerged);

                    if (ocrMerged.length >= 20 && ocrStats.uniqueWords >= pdfStats.uniqueWords) {
                        return ocrMerged;
                    }
                }

                if (normalizedPdfText.length >= 20) {
                    return normalizedPdfText;
                }
            } catch (pdfJsError) {
                // Continue to the generic error below when PDF.js cannot extract readable content.
            }
        }

        // Last resort: keep only reasonable words, skip binary noise-heavy candidates.
        const fallback = binary.replace(/[^\wÀ-ÿ\s.,;:()\-+@/#]/g, ' ').replace(/\s+/g, ' ').trim();
        const alphaCount = (fallback.match(/[A-Za-zÀ-ÿ]/g) || []).length;
        if (fallback.length >= 20 && alphaCount >= 20) {
            return normalizeExtractedText(fallback);
        }

        throw new Error('This PDF does not expose readable text. Please use a text-based PDF or paste the CV content.');
    }

    if ((fileName.endsWith('.docx') || fileName.endsWith('.doc')) && window.mammoth) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await window.mammoth.extractRawText({ arrayBuffer });
        return (result.value || '').trim();
    }

    return normalizeExtractedText(await readBinaryText());
}

function analyzeCvText(text) {
    const normalized = text.toLowerCase();
    const matchedSkills = cvSkillCatalog.filter(skill => normalized.includes(skill));
    const yearsMatch = text.match(/(\d+)\s*(?:ans|years?|yrs?)/i);
    const years = yearsMatch ? Number(yearsMatch[1]) : 0;
    const languages = [];

    if (/fran[çc]ais|french/i.test(text)) languages.push('Français');
    if (/anglais|english/i.test(text)) languages.push('Anglais');
    if (/espagnol|spanish/i.test(text)) languages.push('Espagnol');
    if (/allemand|german/i.test(text)) languages.push('Allemand');
    if (/italien|italian/i.test(text)) languages.push('Italien');
    if (/portugais|portuguese/i.test(text)) languages.push('Portugais');
    if (/arabe|arabic/i.test(text)) languages.push('Arabe');
    if (/néerlandais|neerlandais|dutch/i.test(text)) languages.push('Néerlandais');

    const profession = /designer|ui\/?ux|figma|sketch|adobe xd/i.test(text)
        ? 'Designer'
        : /backend|node|python|django|api/i.test(text)
            ? 'Backend Developer'
            : /frontend|react|typescript|javascript|next/i.test(text)
                ? 'Frontend Developer'
                : 'Software Engineer';
    const level = years >= 8 ? 'Lead' : years >= 5 ? 'Senior' : years >= 2 ? 'Mid' : 'Junior';

    const baseScore = 45;
    const score = Math.min(98, baseScore + (matchedSkills.length * 5) + (Math.min(years, 10) * 2) + (languages.length * 3));
    const topSkill = matchedSkills[0] || 'React';
    const missingSkill = matchedSkills.includes('python') ? 'cloud' : 'python';

    return {
        score,
        profession,
        level,
        matchedSkills,
        technicalSkills: matchedSkills,
        years,
        languages,
        summary: matchedSkills.slice(0, 6).join(', ') || 'No major skills detected',
        profileSummary: `${level} ${profession} with ${years || 'several'} years of experience${matchedSkills.length ? ` focused on ${matchedSkills.slice(0, 4).join(', ')}` : ''}.${languages.length ? ` Languages: ${languages.join(', ')}.` : ''}`,
        insights: [
            `Matched skills: ${matchedSkills.slice(0, 4).join(', ') || 'none detected'}`,
            `Experience: ${years ? `${years}+ years` : 'not clearly stated'}`,
            `Recommended next focus: ${missingSkill}`
        ],
        recommendation: `Strongest signal: ${topSkill}`
    };
}

// ===== HOME PAGE FUNCTIONALITY =====

function initializeHomePage() {
    initializeLanguageSwitcher();
    applyLanguage(currentLanguage, { refreshJobCards: true });
    initializeTypedText();
    initializeCVUpload();
    initializeRecommendedJobsGate();
    initializeJobFilters();
    initializeProgressBars();
    initializeJobCards();
}

function normalizeLocationToken(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function createDebounce(fn, delayMs) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn(...args), delayMs);
    };
}

function setDatalistOptions(datalist, options) {
    if (!datalist) return;
    datalist.innerHTML = options
        .map((option) => {
            if (typeof option === 'string') {
                return `<option value="${escapeHtml(option)}"></option>`;
            }

            const value = escapeHtml(option.value || '');
            const label = escapeHtml(option.label || '');
            if (label) {
                return `<option value="${value}" label="${label}"></option>`;
            }

            return `<option value="${value}"></option>`;
        })
        .join('');
}

function getLocationApiBase() {
    const endpoint = getAnalysisEndpoint();
    const marker = '/api/analyze-cv';
    const index = endpoint.indexOf(marker);
    return index >= 0 ? endpoint.slice(0, index) : '';
}

async function fetchCitySuggestions(countryQuery, cityQuery) {
    const base = getLocationApiBase();
    const url = `${base}/api/locations/cities?country=${encodeURIComponent(String(countryQuery || ''))}&q=${encodeURIComponent(String(cityQuery || ''))}&limit=50`;
    const response = await fetch(url);
    if (!response.ok) return { country: null, items: [] };

    const payload = await response.json();
    return {
        country: payload.country || null,
        items: Array.isArray(payload.items) ? payload.items : []
    };
}

function getCityHintFromItems(cityItems) {
    if (Array.isArray(cityItems) && cityItems.length >= 2) {
        const first = cityItems[0]?.name || '';
        const second = cityItems[1]?.name || '';
        if (first && second) {
            return `${first}, ${second}...`;
        }
    }

    return getCopy().targetCityPlaceholder;
}

function toCityOption(item) {
    const name = String(item?.name || '').trim();
    const stateName = String(item?.stateName || '').trim();
    if (!name) return null;

    return {
        value: name,
        label: stateName ? `${name} (${stateName})` : name
    };
}

async function updateCitySuggestions(countryInput, cityInput, cityOptions) {
    const countryToken = (countryInput.value || FRANCE_COUNTRY_LABEL).trim();
    if (!countryToken) {
        setDatalistOptions(cityOptions, []);
        cityInput.placeholder = getCopy().targetCityPlaceholder;
        locationAutocompleteState.selectedCountry = null;
        return;
    }

    const country = {
        name: FRANCE_COUNTRY_LABEL,
        isoCode: FRANCE_COUNTRY_CODE
    };
    const countryQuery = FRANCE_COUNTRY_CODE;
    const cacheKey = `${countryQuery}::${normalizeLocationToken(cityInput.value)}`;

    let cityItems = locationAutocompleteState.cityCache.get(cacheKey);
    let responseCountry = country;

    if (!cityItems) {
        const response = await fetchCitySuggestions(countryQuery, cityInput.value);
        responseCountry = response.country || responseCountry;
        cityItems = response.items.filter((item) => item && item.name);
        locationAutocompleteState.cityCache.set(cacheKey, cityItems);
    }

    if (responseCountry) {
        locationAutocompleteState.selectedCountry = responseCountry;
    }

    const cityOptionsPayload = cityItems.map(toCityOption).filter(Boolean);

    setDatalistOptions(cityOptions, cityOptionsPayload);
    cityInput.placeholder = getCityHintFromItems(cityItems);
}

function initializeRecommendedJobsGate() {
    const showJobsButton = document.getElementById('show-recommended-jobs');
    const jobsContent = document.getElementById('recommended-jobs-content');
    const targetCountryInput = document.getElementById('target-country');
    const targetCityInput = document.getElementById('target-city');
    const targetCountryOptions = document.getElementById('target-country-options');
    const targetCityOptions = document.getElementById('target-city-options');
    const jobListings = document.getElementById('job-listings');

    if (targetCountryInput && targetCityInput && targetCountryOptions && targetCityOptions) {
        const debouncedCityUpdate = createDebounce(() => {
            updateCitySuggestions(targetCountryInput, targetCityInput, targetCityOptions).catch(() => {});
        }, 180);

        targetCountryInput.value = FRANCE_COUNTRY_LABEL;
        locationAutocompleteState.selectedCountry = { name: FRANCE_COUNTRY_LABEL, isoCode: FRANCE_COUNTRY_CODE };
        setDatalistOptions(targetCountryOptions, [FRANCE_COUNTRY_LABEL]);

        targetCityInput.addEventListener('input', function() {
            debouncedCityUpdate();
        });

        targetCityInput.addEventListener('focus', function() {
            updateCitySuggestions(targetCountryInput, targetCityInput, targetCityOptions).catch(() => {});
        });

        updateCitySuggestions(targetCountryInput, targetCityInput, targetCityOptions).catch(() => {});
    }

    if (showJobsButton && jobsContent) {
        showJobsButton.addEventListener('click', async function() {
            jobsContent.classList.remove('hidden');
            jobsContent.scrollIntoView({ behavior: 'smooth', block: 'start' });

            const copy = getCopy();
            if (!latestCvText && !latestCvAnalysis) {
                showNotification(copy.missingCvForJobs, 'error');
                return;
            }

            const siteUrl = document.getElementById('target-site-url')?.value?.trim() || 'https://www.indeed.fr';
            const targetRole = document.getElementById('target-job-title')?.value?.trim() || '';
            const country = targetCountryInput?.value?.trim() || FRANCE_COUNTRY_LABEL;
            const city = targetCityInput?.value?.trim() || '';

            const originalLabel = this.textContent;
            this.disabled = true;
            this.textContent = copy.searchingJobs;

            try {
                const result = await Promise.race([
                    requestAiJobSearch({
                        language: currentLanguage,
                        cvText: latestCvText,
                        cvAnalysis: latestCvAnalysis,
                        displayMode: 'auto',
                        preferences: {
                            siteUrl,
                            targetRole,
                            country,
                            city
                        }
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Job search timeout')), 90000))
                ]);

                renderDynamicJobs(result.jobs || []);
                hasDynamicJobs = true;
                initializeJobCards();
            } catch (error) {
                hasDynamicJobs = false;
                renderDynamicJobs([]);
                showNotification(copy.jobSearchError, 'error');
            } finally {
                this.disabled = false;
                this.textContent = originalLabel;
            }
        });
    }
}

function initializeTypedText() {
    const copy = getCopy();
    if (document.getElementById('typed-text')) {
        if (typedInstance) {
            typedInstance.destroy();
            typedInstance = null;
        }

        typedInstance = new Typed('#typed-text', {
            strings: copy.typedHero,
            typeSpeed: 50,
            backSpeed: 30,
            backDelay: 2000,
            loop: true,
            cursorChar: '|'
        });
    }
}

function initializeCVUpload() {
    const uploadZone = document.getElementById('upload-zone');
    const cvUpload = document.getElementById('cv-upload');
    const analysisResults = document.getElementById('analysis-results');
    const analysisStatusTitle = document.getElementById('analysis-status-title');
    const analysisStatusBody = document.getElementById('analysis-status-body');
    const analysisSummary = document.getElementById('analysis-summary');
    const analysisProfileSummary = document.getElementById('analysis-profile-summary');
    const analysisProfession = document.getElementById('analysis-profession');
    const analysisLevel = document.getElementById('analysis-level');
    const analysisSkills = document.getElementById('analysis-skills');
    const analysisFileName = document.getElementById('analysis-file-name');
    const analysisFileStatus = document.getElementById('analysis-file-status');
    
    if (!uploadZone || !cvUpload) return;
    
    // Drag and drop functionality
    uploadZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    
    uploadZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
    });
    
    uploadZone.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });
    
    // File input change
    cvUpload.addEventListener('change', function(e) {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
    
    async function handleFileUpload(file) {
        const copy = getCopy();
        analysisResults.classList.remove('hidden');
        uploadZone.innerHTML = `
            <div class="flex items-center justify-center space-x-3">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span>${escapeHtml(copy.analysisProcessing)}</span>
            </div>
        `;

        if (analysisStatusTitle) analysisStatusTitle.textContent = copy.analysisInProgressTitle;
        if (analysisStatusBody) analysisStatusBody.textContent = copy.analysisInProgress;
        if (analysisSummary) analysisSummary.textContent = copy.fileAnalyzed;
        if (analysisProfileSummary) analysisProfileSummary.textContent = '';
        if (analysisProfession) analysisProfession.textContent = '-';
        if (analysisLevel) analysisLevel.textContent = '-';
        if (analysisSkills) analysisSkills.innerHTML = '';
        if (analysisFileName) analysisFileName.textContent = file.name;
        if (analysisFileStatus) analysisFileStatus.textContent = copy.analysisAnalyze;

        await new Promise(resolve => setTimeout(resolve, 50));
        
        try {
            const cvText = await Promise.race([
                extractCvText(file),
                new Promise((_, reject) => setTimeout(() => reject(new Error('File analysis timed out.')), 90000))
            ]);
            if (!cvText || cvText.length < 20) {
                throw new Error('No readable text detected in this file.');
            }

            const analysis = await Promise.race([
                requestAiAnalysis(cvText, file.name, currentLanguage),
                new Promise((_, reject) => setTimeout(() => reject(new Error('AI analysis timed out.')), 60000))
            ]);

            latestCvText = cvText;
            latestCvAnalysis = analysis;
            hasDynamicJobs = false;

            if (analysisStatusTitle) analysisStatusTitle.textContent = analysis.title || copy.cvAnalysisCompleteTitle;
            if (analysisStatusBody) analysisStatusBody.textContent = analysis.body || copy.analysisBody;
            if (analysisFileStatus) analysisFileStatus.textContent = copy.fileSuccess;
            if (analysisProfileSummary) analysisProfileSummary.textContent = analysis.profileSummary || analysis.summary || '';
            if (analysisProfession) analysisProfession.textContent = analysis.profession || '-';
            if (analysisLevel) analysisLevel.textContent = analysis.level || '-';
            if (analysisSkills) {
                const rawSkills = analysis.technicalSkills || analysis.matchedSkills || [];
                const uniqueSkills = [];
                const seen = new Set();

                for (const skill of rawSkills) {
                    const normalized = String(skill || '').trim();
                    if (!normalized) continue;
                    const key = normalized.toLowerCase();
                    if (seen.has(key)) continue;
                    seen.add(key);
                    uniqueSkills.push(normalized);
                }

                const skills = uniqueSkills.slice(0, 24);
                analysisSkills.innerHTML = skills.map(skill => `<span class="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">${escapeHtml(skill)}</span>`).join('');
            }
            if (analysisSummary) {
                analysisSummary.innerHTML = `
                    <p class="font-semibold mb-2">${escapeHtml(copy.detectedProfile)}</p>
                    <p class="mb-1"><strong>${escapeHtml(copy.skills)}:</strong> ${escapeHtml(analysis.matchedSkills.join(', ') || 'none detected')}</p>
                    <p class="mb-1"><strong>${escapeHtml(copy.experience)}:</strong> ${analysis.years ? `${analysis.years}+ years` : 'not stated clearly'}</p>
                    <p class="mb-1"><strong>${escapeHtml(copy.languages)}:</strong> ${escapeHtml(analysis.languages.join(', ') || 'not detected')}</p>
                    <p><strong>${escapeHtml(copy.summary)}:</strong> ${escapeHtml(analysis.summary || 'No summary provided')}</p>
                    <p><strong>${escapeHtml(copy.nextStep)}:</strong> ${escapeHtml(analysis.recommendation)}</p>
                `;
            }

            const insights = document.querySelectorAll('#analysis-results .space-y-4 .flex.items-start.space-x-3');
            if (insights.length >= 3) {
                insights[0].querySelector('p.font-medium').textContent = analysis.insights[0] ? 'AI skill signal' : 'Add clear technical keywords';
                insights[0].querySelector('p.text-xs').textContent = analysis.insights[0] || 'Fewer matching skills detected';
                insights[1].querySelector('p.font-medium').textContent = analysis.insights[1] ? 'AI experience signal' : 'Update Location / Language';
                insights[1].querySelector('p.text-xs').textContent = analysis.insights[1] || 'Add a language line to your CV';
                insights[2].querySelector('p.font-medium').textContent = analysis.insights[2] ? 'AI next step' : 'Certification Boost';
                insights[2].querySelector('p.text-xs').textContent = analysis.insights[2] || 'Add certifications to strengthen the profile';
            }

            uploadZone.innerHTML = `
                <div class="flex items-center justify-center space-x-3">
                    <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div class="text-left">
                        <p class="font-medium text-gray-900">CV uploaded successfully</p>
                        <p class="text-sm text-gray-500">Click to upload a different file</p>
                    </div>
                </div>
            `;
        } catch (error) {
            const errorMessage = error && error.message ? error.message : '';
            const isAiFailure = errorMessage.includes('AI analysis timed out') || errorMessage.includes('AI analysis failed') || errorMessage.includes('source') || errorMessage.includes('Missing AI_API_KEY') || errorMessage.includes('OpenAI');

            latestCvText = '';
            latestCvAnalysis = null;
            hasDynamicJobs = false;

            if (analysisStatusTitle) analysisStatusTitle.textContent = isAiFailure ? copy.aiFallbackTitle : copy.analysisUnavailable;
            if (analysisStatusBody) analysisStatusBody.textContent = isAiFailure ? copy.aiFallbackBody : copy.analysisUnavailableBody;
            if (analysisSummary) analysisSummary.textContent = isAiFailure ? copy.aiFallbackBody : (errorMessage || copy.analysisUnavailableBody);
            if (analysisFileStatus) analysisFileStatus.textContent = isAiFailure ? copy.aiFallbackTitle : copy.analysisUnavailable;
            if (analysisProfileSummary) analysisProfileSummary.textContent = '';
            if (analysisProfession) analysisProfession.textContent = '-';
            if (analysisLevel) analysisLevel.textContent = '-';
            if (analysisSkills) analysisSkills.innerHTML = '';
            uploadZone.innerHTML = `
                <div class="flex items-center justify-center space-x-3">
                    <svg class="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86l-8.08 14A2 2 0 004 21h16a2 2 0 001.73-3.14l-8.08-14a2 2 0 00-3.46 0z"></path>
                    </svg>
                    <div class="text-left">
                        <p class="font-medium text-gray-900">${escapeHtml(isAiFailure ? copy.aiFallbackTitle : copy.readabilityIssue)}</p>
                        <p class="text-sm text-gray-500">${escapeHtml(isAiFailure ? copy.aiFallbackBody : copy.readabilityHint)}</p>
                    </div>
                </div>
            `;
        }
    }
}

function initializeJobFilters() {
    const filterChips = document.querySelectorAll('.filter-chip');
    
    filterChips.forEach(chip => {
        chip.addEventListener('click', function() {
            // Remove active class from all chips
            filterChips.forEach(c => c.classList.remove('active'));
            // Add active class to clicked chip
            this.classList.add('active');
            
            // Filter job listings
            filterJobListings(this.textContent.trim());
        });
    });
}

function filterJobListings(filter) {
    const jobCards = document.querySelectorAll('.job-card');
    
    jobCards.forEach(card => {
        const cardText = card.textContent.toLowerCase();
        let shouldShow = true;
        
        if (filter === 'Remote') {
            shouldShow = cardText.includes('remote');
        } else if (filter === 'Full-time') {
            shouldShow = cardText.includes('full-time');
        } else if (filter === 'All') {
            shouldShow = true;
        }
        
        // Animate card visibility
        if (shouldShow) {
            card.style.display = 'block';
            anime({
                targets: card,
                opacity: [0, 1],
                translateY: [20, 0],
                duration: 500,
                easing: 'easeOutCubic'
            });
        } else {
            anime({
                targets: card,
                opacity: 0,
                translateY: -20,
                duration: 300,
                easing: 'easeInCubic',
                complete: () => {
                    card.style.display = 'none';
                }
            });
        }
    });
}

function initializeProgressBars() {
    const progressBars = document.querySelectorAll('.progress-bar');
    
    progressBars.forEach(bar => {
        const width = bar.style.width || bar.getAttribute('style').match(/width:\s*(\d+%)/)[1];
        bar.style.width = '0%';
        
        // Animate on scroll
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    anime({
                        targets: bar,
                        width: width,
                        duration: 1500,
                        easing: 'easeOutCubic'
                    });
                }
            });
        });
        
        observer.observe(bar);
    });
}

function initializeJobCards() {
    const applyButtons = document.querySelectorAll('.job-card button');
    
    applyButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (this.textContent.includes('Apply Now')) {
                // Show success message
                showNotification('Application submitted successfully!', 'success');
                
                // Change button state
                this.textContent = 'Applied';
                this.classList.remove('bg-gray-100', 'text-gray-700');
                this.classList.add('bg-green-100', 'text-green-700');
                this.disabled = true;
            }
        });
    });
}

// ===== AUTO APPLY PAGE FUNCTIONALITY =====

function initializeAutoApplyPage() {
    initializeTemplateSelection();
    initializeCoverLetterEditor();
    initializeApplicationProgress();
    initializeHistoryActions();
}

function initializeTemplateSelection() {
    const templateCards = document.querySelectorAll('.template-card');
    
    templateCards.forEach(card => {
        card.addEventListener('click', function() {
            // Remove selected class from all cards
            templateCards.forEach(c => c.classList.remove('selected'));
            // Add selected class to clicked card
            this.classList.add('selected');
            
            // Update cover letter content based on template
            updateCoverLetterContent(this.querySelector('p').textContent);
        });
    });
}

function updateCoverLetterContent(templateType) {
    const editor = document.querySelector('.cover-letter-editor');
    if (!editor) return;
    
    const templates = {
        'Professional': `
            <p class="text-gray-800 leading-relaxed">
                <strong>Dear Hiring Manager,</strong>
                <br><br>
                I am writing to express my strong interest in the Senior Frontend Developer position at TechCorp Solutions. With over 5 years of experience in React development and a proven track record of building scalable web applications, I believe I would be a valuable addition to your innovative team.
                <br><br>
                In my current role, I have successfully led the development of complex React applications, implementing TypeScript for type safety and Node.js for backend integration. My experience aligns perfectly with your requirements, particularly in creating cutting-edge web applications that deliver exceptional user experiences.
                <br><br>
                Thank you for considering my application. I look forward to discussing how my experience and passion for frontend development can contribute to TechCorp Solutions' continued success.
                <br><br>
                <strong>Best regards,</strong><br>
                Sarah Chen
            </p>
        `,
        'Creative': `
            <p class="text-gray-800 leading-relaxed">
                <strong>Hello TechCorp Team!</strong>
                <br><br>
                As a passionate frontend developer with a love for creating beautiful, intuitive user experiences, I was thrilled to discover your opening for a Senior Frontend Developer. My journey in web development has been driven by curiosity and a desire to push the boundaries of what's possible on the web.
                <br><br>
                Over the past 5 years, I've had the privilege of working on diverse projects that have honed my skills in React, TypeScript, and modern web technologies. I believe in writing clean, maintainable code that not only works flawlessly but tells a story.
                <br><br>
                I'm excited about the possibility of bringing my creative problem-solving skills and technical expertise to your team. Let's create something amazing together!
                <br><br>
                <strong>Creative regards,</strong><br>
                Sarah Chen
            </p>
        `,
        'Technical': `
            <p class="text-gray-800 leading-relaxed">
                <strong>Dear Technical Hiring Committee,</strong>
                <br><br>
                I am submitting my application for the Senior Frontend Developer position at TechCorp Solutions. With 5+ years of experience in modern frontend development and a strong foundation in computer science principles, I bring both technical depth and practical experience to this role.
                <br><br>
                Technical Expertise:<br>
                • React 18+ with Hooks and Context API<br>
                • TypeScript with advanced type definitions<br>
                • Node.js backend integration and API design<br>
                • Performance optimization and testing strategies<br>
                • CI/CD pipelines and deployment automation<br><br>
                I have architected and implemented multiple large-scale applications, focusing on maintainability, scalability, and user experience. My approach emphasizes clean code practices, comprehensive testing, and continuous learning.
                <br><br>
                <strong>Technically yours,</strong><br>
                Sarah Chen
            </p>
        `
    };
    
    editor.innerHTML = templates[templateType] || templates['Professional'];
    
    // Animate content change
    anime({
        targets: editor,
        opacity: [0, 1],
        translateY: [10, 0],
        duration: 500,
        easing: 'easeOutCubic'
    });
}

function initializeCoverLetterEditor() {
    const editButtons = findButtonsByText(['Edit', 'Regenerate']);
    
    editButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (this.textContent.includes('Edit')) {
                enableEditor();
            } else if (this.textContent.includes('Regenerate')) {
                regenerateCoverLetter();
            }
        });
    });
}

function enableEditor() {
    const editor = document.querySelector('.cover-letter-editor');
    if (!editor) return;
    
    editor.contentEditable = true;
    editor.classList.add('border-blue-300', 'bg-white');
    editor.focus();
    
    // Add save button
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save Changes';
    saveButton.className = 'bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors mt-2';
    saveButton.onclick = () => {
        editor.contentEditable = false;
        editor.classList.remove('border-blue-300', 'bg-white');
        saveButton.remove();
        showNotification('Cover letter updated successfully!', 'success');
    };
    
    editor.parentNode.appendChild(saveButton);
}

function regenerateCoverLetter() {
    const editor = document.querySelector('.cover-letter-editor');
    if (!editor) return;
    
    // Show loading state
    editor.innerHTML = `
        <div class="flex items-center justify-center space-x-3">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span>Regenerating cover letter...</span>
        </div>
    `;
    
    // Simulate AI generation
    setTimeout(() => {
        updateCoverLetterContent('Professional');
        showNotification('Cover letter regenerated successfully!', 'success');
    }, 2000);
}

function initializeApplicationProgress() {
    const sendButtons = findButtonsByText(['Send Application', 'Auto Apply']);
    
    sendButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (this.textContent.includes('Send Application')) {
                sendApplication();
            } else if (this.textContent.includes('Auto Apply')) {
                showAutoApplyModal();
            }
        });
    });
}

function sendApplication() {
    // Show loading state
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'Sending...';
    button.disabled = true;
    
    // Simulate API call
    setTimeout(() => {
        button.textContent = 'Sent Successfully';
        button.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        button.classList.add('bg-green-600');
        
        // Update progress
        updateApplicationProgress();
        
        showNotification('Application sent successfully!', 'success');
    }, 2000);
}

function updateApplicationProgress() {
    const progressSteps = document.querySelectorAll('.progress-step');
    const progressBars = document.querySelectorAll('.h-1');
    
    // Mark current step as completed
    const currentStep = document.querySelector('.progress-step.active');
    if (currentStep) {
        currentStep.classList.remove('active');
        currentStep.classList.add('completed');
        currentStep.innerHTML = `
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
        `;
    }
    
    // Activate next step
    const nextStep = progressSteps[2];
    if (nextStep) {
        nextStep.classList.add('active');
        nextStep.classList.remove('bg-gray-300');
        nextStep.classList.add('bg-blue-600');
    }
    
    // Update progress bar
    const progressBar = progressBars[1];
    if (progressBar) {
        anime({
            targets: progressBar,
            width: '100%',
            duration: 1000,
            easing: 'easeOutCubic'
        });
    }
}

function initializeHistoryActions() {
    const historyButtons = document.querySelectorAll('.space-y-4 button');
    
    historyButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (this.textContent.includes('View Details')) {
                showApplicationDetails();
            }
        });
    });
}

// ===== RECRUITER PAGE FUNCTIONALITY =====

function initializeRecruiterPage() {
    initializeAnalyticsChart();
    initializeCandidateFilters();
    initializeCandidateActions();
    initializeRecruiterFilters();
}

function initializeAnalyticsChart() {
    const chartContainer = document.getElementById('pipeline-chart');
    if (!chartContainer) return;
    
    const chart = echarts.init(chartContainer);
    
    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: ['Applied', 'Screening', 'Interview', 'Offer', 'Hired'],
            axisLine: {
                lineStyle: {
                    color: '#E5E7EB'
                }
            },
            axisLabel: {
                color: '#6B7280'
            }
        },
        yAxis: {
            type: 'value',
            axisLine: {
                lineStyle: {
                    color: '#E5E7EB'
                }
            },
            axisLabel: {
                color: '#6B7280'
            },
            splitLine: {
                lineStyle: {
                    color: '#F3F4F6'
                }
            }
        },
        series: [{
            name: 'Candidates',
            type: 'bar',
            data: [247, 156, 89, 34, 8],
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: '#2563EB' },
                    { offset: 1, color: '#3B82F6' }
                ])
            },
            barWidth: '60%'
        }]
    };
    
    chart.setOption(option);
    
    // Animate chart on load
    setTimeout(() => {
        chart.setOption(option);
    }, 500);
}

function initializeCandidateFilters() {
    const filterChips = document.querySelectorAll('.filter-chip');
    
    filterChips.forEach(chip => {
        chip.addEventListener('click', function() {
            // Remove active class from sibling chips
            const siblings = this.parentNode.querySelectorAll('.filter-chip');
            siblings.forEach(s => s.classList.remove('active'));
            
            // Add active class to clicked chip
            this.classList.add('active');
            
            // Filter candidates
            filterCandidates(this.textContent.trim());
        });
    });
}

function filterCandidates(filter) {
    const candidateRows = document.querySelectorAll('.candidate-row');
    
    candidateRows.forEach(row => {
        let shouldShow = true;
        
        if (filter === 'Top 20%') {
            const score = parseInt(row.querySelector('.text-2xl.font-bold').textContent);
            shouldShow = score >= 90;
        } else if (filter === 'Interviews') {
            shouldShow = row.textContent.includes('Interview');
        } else if (filter === 'All') {
            shouldShow = true;
        }
        
        // Animate visibility
        if (shouldShow) {
            row.style.display = 'block';
            anime({
                targets: row,
                opacity: [0, 1],
                translateY: [20, 0],
                duration: 500,
                easing: 'easeOutCubic'
            });
        } else {
            anime({
                targets: row,
                opacity: 0,
                translateY: -20,
                duration: 300,
                easing: 'easeInCubic',
                complete: () => {
                    row.style.display = 'none';
                }
            });
        }
    });
}

function initializeCandidateActions() {
    const actionButtons = document.querySelectorAll('.candidate-row button');
    
    actionButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.stopPropagation();
            
            if (this.textContent.includes('Interview')) {
                scheduleInterview();
            } else if (this.textContent.includes('Review')) {
                showCandidateDetails();
            }
        });
    });
    
    // Row click handler
    const candidateRows = document.querySelectorAll('.candidate-row');
    candidateRows.forEach(row => {
        row.addEventListener('click', function() {
            showCandidateDetails();
        });
    });
}

function scheduleInterview() {
    showNotification('Interview scheduled successfully!', 'success');
    
    // Update candidate status
    const button = event.target;
    button.textContent = 'Scheduled';
    button.classList.remove('bg-blue-600', 'hover:bg-blue-700');
    button.classList.add('bg-green-600');
    button.disabled = true;
}

function initializeRecruiterFilters() {
    const filterInputs = document.querySelectorAll('input[type="checkbox"], input[type="radio"], select');
    
    filterInputs.forEach(input => {
        input.addEventListener('change', function() {
            applyRecruiterFilters();
        });
    });
}

function applyRecruiterFilters() {
    // Simulate filter application
    showNotification('Filters applied successfully!', 'success');
    
    // Animate candidate list update
    const candidateList = document.getElementById('candidate-list');
    if (candidateList) {
        anime({
            targets: candidateList.children,
            opacity: [1, 0.3, 1],
            duration: 800,
            easing: 'easeInOutQuad',
            delay: anime.stagger(100)
        });
    }
}

// ===== COMMON FUNCTIONALITY =====

function initializeNavigation() {
    // Mobile menu toggle (if needed)
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // Add click animation
            anime({
                targets: this,
                scale: [1, 0.95, 1],
                duration: 200,
                easing: 'easeInOutQuad'
            });
        });
    });
}

function initializeAnimations() {
    // Animate cards on scroll
    const cards = document.querySelectorAll('.card-hover');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                anime({
                    targets: entry.target,
                    opacity: [0, 1],
                    translateY: [30, 0],
                    duration: 800,
                    easing: 'easeOutCubic',
                    delay: Math.random() * 200
                });
            }
        });
    }, {
        threshold: 0.1
    });
    
    cards.forEach(card => {
        card.style.opacity = '0';
        observer.observe(card);
    });
    
    // Add hover animations to buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            if (!this.disabled) {
                anime({
                    targets: this,
                    scale: 1.05,
                    duration: 200,
                    easing: 'easeOutCubic'
                });
            }
        });
        
        button.addEventListener('mouseleave', function() {
            anime({
                targets: this,
                scale: 1,
                duration: 200,
                easing: 'easeOutCubic'
            });
        });
    });
}

// ===== UTILITY FUNCTIONS =====

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg text-white ${
        type === 'success' ? 'bg-green-600' : 
        type === 'error' ? 'bg-red-600' : 
        'bg-blue-600'
    }`;
    notification.textContent = message;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Animate in
    anime({
        targets: notification,
        translateX: [300, 0],
        opacity: [0, 1],
        duration: 500,
        easing: 'easeOutCubic'
    });
    
    // Remove after delay
    setTimeout(() => {
        anime({
            targets: notification,
            translateX: 300,
            opacity: 0,
            duration: 500,
            easing: 'easeInCubic',
            complete: () => {
                notification.remove();
            }
        });
    }, 3000);
}

function showApplicationDetails() {
    showNotification('Application details opened', 'info');
}

function showCandidateDetails() {
    showNotification('Candidate profile opened', 'info');
}

function showAutoApplyModal() {
    showNotification('Auto-apply feature activated!', 'success');
}

// ===== ERROR HANDLING =====

window.addEventListener('error', function(e) {
    console.error('JavaScript error:', e.error);
    showNotification('An error occurred. Please try again.', 'error');
});

// ===== RESPONSIVE HANDLING =====

window.addEventListener('resize', function() {
    // Reinitialize charts on resize
    const charts = document.querySelectorAll('[id$="-chart"]');
    charts.forEach(chart => {
        if (chart._echarts_instance) {
            chart._echarts_instance.resize();
        }
    });
});

// Export functions for global access
window.AIJobMatch = {
    showNotification,
    getCurrentPage
};