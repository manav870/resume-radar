# GradeFlow Feedback Frontend

This is the static frontend for the GradeFlow Batch Feedback Assistant. It provides a modern, clean interface for teachers to input Google Drive folder IDs and trigger the batch evaluation process.

## Local Setup

The frontend consists of static HTML, CSS, and JS files. You can serve them using Firebase CLI or any local HTTP server.

1. Install Firebase CLI globally (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```
2. Run the local server:
   ```bash
   firebase serve
   ```
   Or use any other static server like `npx serve public`.

3. Ensure `public/config.js` points to your running backend (usually `http://localhost:8080`).

## Deployment to Firebase Hosting

1. Login to Firebase:
   ```bash
   firebase login
   ```
2. Initialize hosting (if not done, or modify `.firebaserc`):
   ```bash
   firebase init hosting
   ```
3. Update `public/config.js` with your deployed Cloud Run backend URL.
4. Deploy:
   ```bash
   firebase deploy
   ```
