# Resume Radar

> **AI-Powered Recruitment Analytics & Candidate Match Platform**
> 
> Resume Radar parses resumes, evaluates job-specific candidate matches using transparent weighted scoring, generates explainable feedback and diagnostic Google Docs reports, and visualizes applicant pool insights while keeping final hiring decisions human-led.

---

## 📌 Problem Definition & Needs

Recruiters managing high-volume hiring receive hundreds of resumes per opening. Manual review is time-consuming, inconsistent, and unscalable, introducing unconscious bias. 

**Resume Radar provides:**
- **Automated Resume Parsing:** Extracts contact info, education, skills, experience, projects, and certifications into structured JSON.
- **Job Description Input:** Accepts job requirements as free text or PDF/DOCX uploads.
- **Drive Batch Ingestion:** Batch-processes candidate resumes directly from Google Drive.
- **Explainable Weighted Scoring:** Transparent mathematical match score with visible component logic (not an opaque black-box AI number).
- **Google Docs Feedback Reports:** Automatically generated executive scorecards, skill gap matrices, and interview probe questions.
- **Pool Analytics:** Visual dashboards for skill frequency, experience distribution, and match percentiles.
- **Human-in-the-Loop Review:** Dedicated reviewer actions for shortlisting, rejection, and interview scheduling.

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Document Parsers:** pdf-parse (PDF), mammoth (DOCX), multer (File Uploads)
- **AI Engine:** Google Gemini API (gemini-flash-lite-latest, gemini-2.5-flash)
- **APIs:** Google Drive API (v3), Google Docs API (v1)
- **Frontend:** Vanilla HTML5, Modern CSS Design System, JavaScript, Chart.js

---

## 🚀 Quick Start

### 1. Environment Setup
Create a .env file in ackend/:
`env
PORT=8080
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-flash-lite-latest
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
MAX_FILES_DEFAULT=10
`

### 2. Run Locally
`ash
cd backend
npm install
npm start
`
The server will run on http://localhost:8080.
