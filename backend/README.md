# Resume Radar Backend

Node.js Express processing engine for Resume Radar — an AI-powered recruitment screening and analytics platform.

## Architecture & Services
- **`services/parserService.js`**: Universal document text extractor (`pdf-parse`, `mammoth`, plain text).
- **`services/geminiService.js`**: Google Gemini AI candidate profile & job criteria extraction engine with retry & fallback model chaining.
- **`services/scoringService.js`**: Deterministic weighted scoring engine (40% required skills, 15% preferred, 25% experience, 10% education, 10% certs).
- **`services/driveService.js`**: Google Drive v3 client for batch resume listing and multi-format downloading.
- **`services/docsService.js`**: Google Docs v1 client for creating executive candidate evaluation dossiers.
- **`services/feedbackService.js`**: Recruitment orchestration pipeline, direct single-file screening, and talent pool aggregate analytics.
- **`routes/feedback.js`**: REST API routes for batch screening, job parsing, candidate screening, report generation, and human-in-the-loop review updates.

## Local Setup
1. `npm install`
2. Configure `.env`:
   ```env
   PORT=8080
   GEMINI_API_KEY=your_gemini_api_key
   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
   MAX_FILES_DEFAULT=10
   ```
3. Add `service-account.json` to this directory (for Google Drive/Docs API access).
4. `npm start`
