# CVME Legacy - Structure separee

## Dossiers

- `frontend/`: interface utilisateur (pages, scripts, traductions, assets)
  - `frontend/index.html`
  - `frontend/main.js`
  - `frontend/locales/`
  - `frontend/resources/`
- `backend/`: logique serveur/API
  - `backend/server.js`
- `server.js`: lanceur compatible (`require('./backend/server')`)

## Demarrage

Depuis `old/`:

```powershell
node .\server.js
```

Puis ouvrir:

- `http://127.0.0.1:3000`

## Variables d'environnement (`old/.env`)

- IA:
  - `AI_API_KEY` (ou `OPENAI_API_KEY`)
  - `OPENAI_MODEL` (optionnel)
- Adzuna:
  - `ADZUNA_APP_ID`
  - `ADZUNA_APP_KEY`
- France Travail:
  - `FRANCE_TRAVAIL_CLIENT_ID`
  - `FRANCE_TRAVAIL_CLIENT_SECRET`
  - alias acceptes: `POLE_EMPLOI_CLIENT_ID`, `POLE_EMPLOI_CLIENT_SECRET`

## Ou modifier quoi

- UI / wording / affichage cartes: `frontend/main.js`
- HTML des pages: `frontend/*.html`
- Traductions FR/EN: `frontend/locales/fr.js` et `frontend/locales/en.js`
- Endpoints API et logique matching jobs: `backend/server.js`

## Notes

- Le serveur sert les fichiers statiques depuis `frontend/`.
- Si un site bloque l'extraction (ex: Indeed), le backend utilise des fallbacks.
