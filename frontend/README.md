# Resume Radar Frontend

Modern glassmorphic recruitment command center for Resume Radar.

## Pages & Structure
- **`public/index.html`**: Landing page & portal highlighting value proposition, key platform statistics, and quick-action launcher cards.
- **`public/job.html`**: Job Criteria & Specification Studio for extracting criteria from text or PDF/DOCX via Gemini AI and configuring scoring weights.
- **`public/grade.html`**: Candidate Batch Screening Console for batch Google Drive ingestion, direct resume upload, and real-time candidate ranking table.
- **`public/analytics.html`**: Talent Pool Analytics Dashboard with interactive Chart.js visualizations (match score tiers, dimension radar, skill density, gap analysis) and side-by-side candidate comparison matrix.
- **`public/guide.html`**: Comprehensive system architecture, Google Drive setup instructions, and REST API specification.
- **`public/style.css`**: Design system featuring dark/light modes, Plus Jakarta Sans typography, radar animations, score badges, and responsive layouts.
- **`public/app.js`**: Core client screening orchestrator.

## Local Running
When running the Express backend (`npm start` in `backend/` or `run.bat`), these static files are automatically served on `http://localhost:8080`.
