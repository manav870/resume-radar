# GradeFlow Feedback Backend

This is the Node.js Express backend for the GradeFlow Batch Feedback Assistant.

## Local Setup
1. `npm install`
2. Copy `.env.example` to `.env` and fill in your credentials.
3. Add `service-account.json` to this directory.
4. `npm start`

## Deployment to Cloud Run
```bash
gcloud run deploy GradeFlow-feedback-backend \
  --source . \
  --allow-unauthenticated \
  --region asia-south1
```
