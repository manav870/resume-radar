# GradeFlow Batch Feedback Assistant

GradeFlow Batch Feedback Assistant is an automated rubric-based feedback system for student assignments. It was built for Hackathon Problem Statement 3.

## Project Overview

The app helps teachers process multiple student assignments from a Google Drive folder. It reads assignment files sequentially, uses Google's Gemini API to generate rubric-based feedback, and creates individual Google Docs feedback reports in a designated output Google Drive folder.

## Problem Statement
Teachers spend an enormous amount of time manually grading text-based assignments against rubrics. This project automates the first pass of feedback generation, saving teachers time while providing students with consistent, structured, and encouraging feedback.

## Solution
A simple, zero-setup web application that:
1. Connects to Google Drive to read student submissions.
2. Evaluates them against 4 core criteria (Clarity, Accuracy, Completeness, Creativity) using Gemini 1.5 Flash.
3. Automatically generates nicely formatted Google Docs containing the evaluation and places them in an output folder.

## Tech Stack
- **Frontend:** HTML, CSS (Vanilla, Glassmorphism design), JavaScript. Deployable to Firebase Hosting.
- **Backend:** Node.js, Express.js. Deployable to Google Cloud Run.
- **APIs:** Google Drive API (v3), Google Docs API (v1), Gemini API.
- **Authentication:** Google Service Account (for server-to-server API access).

## Architecture
1. **Teacher** enters Input Folder ID and Output Folder ID on the frontend SPA.
2. **Frontend** sends a POST request to the **Express Backend**.
3. **Backend** uses **Google Drive API** to list up to 5 documents from the input folder.
4. For each document, the **Backend**:
   - Extracts plain text using **Drive API**.
   - Sends the text and a prompt to the **Gemini API**.
   - Parses the JSON response to extract scores, strengths, and improvements.
   - Creates a new Google Doc using the **Docs API**.
   - Populates the Doc with structured text.
   - Moves the Doc into the output folder using the **Drive API**.
5. **Backend** returns a summary of successes/failures to the **Frontend**.

---

## Complete Setup Instructions

### 1. Google Cloud Setup (Zero Cost)
1. Go to [Google Cloud Console](https://console.cloud.google.com/) and create a free project.
2. Navigate to **APIs & Services > Library** and enable:
   - **Google Drive API**
   - **Google Docs API**
3. Navigate to **APIs & Services > Credentials**.
4. Click **Create Credentials > Service Account**.
   - Name it (e.g., `GradeFlow-sa`).
   - Skip role assignment (none needed).
   - Click Done.
5. Click on the created Service Account, go to the **Keys** tab.
6. Click **Add Key > Create new key > JSON**.
7. Save the downloaded file as `service-account.json` inside the `backend/` folder of this project.

### 2. Gemini API Setup (Zero Cost)
1. Go to [Google AI Studio](https://aistudio.google.com/).
2. Sign in and click **Get API key**.
3. Create an API key in your Google Cloud Project.

### 3. Google Drive Folder Setup
1. Open your Google Drive.
2. Create a folder named `Hackathon Input`.
3. Create a folder named `Hackathon Output`.
4. Right-click each folder -> **Share**.
5. Paste the email address of your **Service Account** (found in your `service-account.json` under `client_email`).
6. Give the Service Account **Editor** permissions.
7. Copy the Folder IDs from the URL (the long string of characters after `folders/`).

### 4. Local Environment Variables
Create a file named `.env` in the `backend/` directory by copying `.env.example`:

```env
PORT=8080
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
MAX_FILES_DEFAULT=3
```

### 5. Running Locally

#### Backend
```bash
cd backend
npm install
npm start
```
The backend will run on `http://localhost:8080`.

#### Frontend
```bash
cd frontend
npm install -g firebase-tools
firebase serve
```
Ensure `frontend/public/config.js` has `BACKEND_URL` set to `http://localhost:8080`.

---

## Deployment Instructions

### Backend (Google Cloud Run)
```bash
cd backend
gcloud run deploy GradeFlow-feedback-backend \
  --source . \
  --allow-unauthenticated \
  --region asia-south1
```
Once deployed, copy the provided Service URL.

### Frontend (Firebase Hosting)
1. Update `frontend/public/config.js` with your new Cloud Run Backend URL.
2. Run deployment:
```bash
cd frontend
firebase login
firebase init hosting # Select your project, public directory is 'public'
firebase deploy
```

---

## Demo Script / Sample Data

To test the application, create a few Google Docs inside your "Input" folder. Use the following sample data:

**Sample Doc 1: Riya - Photosynthesis**
> Plants make food using sunlight. They take water from soil and air. This gives oxygen.

**Sample Doc 2: Arjun - Photosynthesis**
> Plants need sunlight to grow. They use water and carbon dioxide. Chlorophyll helps capture sunlight. The process gives oxygen.

**Sample Doc 3: Sneha - Photosynthesis**
> Photosynthesis is the process by which plants make their own food. Plants use sunlight, water, and carbon dioxide. Chlorophyll in leaves absorbs sunlight. The process produces glucose and releases oxygen.

**Demo Flow:**
1. Open the deployed frontend.
2. Paste the Input Folder ID and Output Folder ID.
3. Click "Generate Batch Feedback".
4. Watch the UI update as it processes the files sequentially.
5. Click the "Open Feedback" links to view the generated Google Docs containing nicely formatted rubrics and personalized feedback.

---

## Limitations
- **Sequential Processing:** Files are processed one by one with a small delay to respect API rate limits.
- **Max Files:** Hard-limited to 5 files per batch for MVP safety.
- **File Types:** Only supports plain text (`text/plain`) and Google Docs (`application/vnd.google-apps.document`). PDF parsing is not implemented.

## Future Improvements
- Add OAuth2 login so teachers don't need a Service Account to access their own drive folders.
- Add support for parsing PDF and Word Document uploads.
- Implement parallel batch processing using Google Cloud Tasks.
- Allow teachers to define custom grading rubrics directly from the UI.
