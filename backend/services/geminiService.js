// ============================================
// Resume Rider — Gemini AI Service
// Handles two core AI tasks:
//   1. Extract structured data from a resume
//   2. Extract structured criteria from a job description
// ============================================

const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;
let genAI;
if (apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
}

// ── Fallback model chain for retry logic ──
const FALLBACK_MODELS = [
    process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
    'gemini-2.0-flash-lite',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite-preview-06-17',
];
const MAX_RETRIES = FALLBACK_MODELS.length;

/**
 * Generic Gemini call with retry + model fallback logic.
 */
async function callGeminiWithRetry(prompt) {
    if (!genAI) {
        throw new Error('Gemini API key not configured.');
    }
    let lastError = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const modelName = FALLBACK_MODELS[attempt];
        const model = genAI.getGenerativeModel({ model: modelName });

        try {
            console.log(`  [Gemini] Attempt ${attempt + 1}/${MAX_RETRIES} (model: ${modelName})...`);
            const result = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: 'application/json',
                }
            });

            const responseText = result.response.text();
            if (!responseText) {
                throw new Error('Empty response from Gemini');
            }

            let jsonRes;
            try {
                jsonRes = JSON.parse(responseText);
            } catch (e) {
                // Strip markdown code fences if present
                const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
                jsonRes = JSON.parse(cleaned);
            }

            console.log(`  [Gemini] Succeeded on attempt ${attempt + 1} (model: ${modelName})`);
            return jsonRes;

        } catch (error) {
            lastError = error;
            const status = error.status || error.code;
            console.error(`  [Gemini] Attempt ${attempt + 1} failed (status: ${status}): ${error.message}`);

            // Retry on transient errors
            if ([429, 500, 503].includes(status) && attempt < MAX_RETRIES - 1) {
                const delayMs = Math.pow(2, attempt + 1) * 1000;
                console.log(`  [Gemini] Retrying in ${delayMs / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            } else if (![429, 500, 503].includes(status)) {
                // Non-transient error → try next model immediately
                continue;
            }
        }
    }

    throw new Error(`All Gemini retries exhausted: ${lastError?.message}`);
}


// ═══════════════════════════════════════════════
// 1. RESUME EXTRACTION
// ═══════════════════════════════════════════════

/**
 * Extract structured candidate profile from raw resume text using Gemini.
 *
 * @param {string} resumeText - Plain text content of the resume.
 * @param {string} fileName - Original file name (for context).
 * @returns {Promise<Object>} Structured candidate profile JSON.
 */
async function extractResumeData(resumeText, fileName) {
    const prompt = `
You are an expert HR resume parser. Analyze the following resume text and extract ALL structured information.

Be thorough and precise. Extract every piece of information available. If a field is not found in the resume, use null for strings/numbers or empty arrays for lists.

Return ONLY valid JSON matching this exact structure (no markdown, no extra text):
{
  "fullName": "<candidate's full name>",
  "email": "<email address or null>",
  "phone": "<phone number or null>",
  "location": "<city, state/country or null>",
  "linkedIn": "<LinkedIn URL or null>",
  "portfolio": "<portfolio/website URL or null>",
  "summary": "<brief 2-3 sentence professional summary based on the resume>",
  "totalYearsExperience": <estimated total years of professional experience as a number, or 0 if unclear>,
  "skills": ["<skill1>", "<skill2>", "..."],
  "education": [
    {
      "degree": "<degree name, e.g. B.Tech Computer Science>",
      "institution": "<university/college name>",
      "year": "<graduation year or expected year, or null>",
      "gpa": "<GPA or percentage if mentioned, or null>"
    }
  ],
  "experienceHistory": [
    {
      "role": "<job title>",
      "company": "<company name>",
      "duration": "<e.g. Jan 2022 - Dec 2023>",
      "durationYears": <approximate duration in years as a number>,
      "highlights": ["<key achievement or responsibility 1>", "<key achievement 2>"]
    }
  ],
  "projects": [
    {
      "name": "<project name>",
      "description": "<brief description>",
      "technologies": ["<tech1>", "<tech2>"]
    }
  ],
  "certifications": ["<certification 1>", "<certification 2>"],
  "languages": ["<language 1>", "<language 2>"]
}

Resume File Name: ${fileName}

Resume Text:
${resumeText}
`;

    const result = await callGeminiWithRetry(prompt);
    return validateResumeData(result);
}


// ═══════════════════════════════════════════════
// 2. JOB DESCRIPTION EXTRACTION
// ═══════════════════════════════════════════════

/**
 * Extract structured job requirements from a job description text using Gemini.
 *
 * @param {string} jobText - Plain text of the job description.
 * @returns {Promise<Object>} Structured job criteria JSON.
 */
async function extractJobCriteria(jobText) {
    const prompt = `
You are an expert HR job description analyst. Analyze the following job description and extract ALL structured requirements.

Be thorough: separate required skills from preferred/nice-to-have skills. Extract education requirements, experience requirements, and any mentioned certifications.

Return ONLY valid JSON matching this exact structure (no markdown, no extra text):
{
  "jobTitle": "<extracted or inferred job title>",
  "department": "<department if mentioned, or null>",
  "requiredSkills": ["<skill1>", "<skill2>", "..."],
  "preferredSkills": ["<nice-to-have skill 1>", "<nice-to-have skill 2>", "..."],
  "minYearsExperience": <minimum years of experience required as a number, or 0>,
  "minEducationLevel": "<e.g. Bachelor's, Master's, PhD, or null if not specified>",
  "educationField": "<e.g. Computer Science, Engineering, or null>",
  "certifications": ["<required or preferred certification 1>", "..."],
  "responsibilities": ["<key responsibility 1>", "<key responsibility 2>", "..."],
  "keywords": ["<important keyword 1>", "<keyword 2>", "..."]
}

Job Description:
${jobText}
`;

    const result = await callGeminiWithRetry(prompt);
    return validateJobCriteria(result);
}


// ═══════════════════════════════════════════════
// 3. AI-POWERED CANDIDATE FEEDBACK
// ═══════════════════════════════════════════════

/**
 * Generate AI-powered qualitative feedback for a candidate against a job.
 *
 * @param {Object} candidateProfile - Structured candidate data.
 * @param {Object} jobCriteria - Structured job requirements.
 * @param {Object} matchScores - The deterministic match scores from scoringService.
 * @returns {Promise<Object>} AI feedback with strengths, gaps, and interview questions.
 */
async function generateCandidateFeedback(candidateProfile, jobCriteria, matchScores) {
    const prompt = `
You are a senior HR recruitment analyst. Given a candidate's profile, the job requirements, and their match scores, provide a qualitative assessment.

Candidate Profile:
${JSON.stringify(candidateProfile, null, 2)}

Job Requirements:
${JSON.stringify(jobCriteria, null, 2)}

Match Scores:
${JSON.stringify(matchScores, null, 2)}

Return ONLY valid JSON matching this exact structure:
{
  "candidateSummary": "<3-4 sentence executive summary of the candidate's fit for this role>",
  "strengths": ["<specific strength 1>", "<specific strength 2>", "<specific strength 3>"],
  "gaps": ["<specific gap or concern 1>", "<specific gap 2>"],
  "improvementSuggestions": ["<actionable suggestion 1>", "<suggestion 2>"],
  "interviewQuestions": [
    {
      "question": "<targeted interview question based on gaps or experience>",
      "rationale": "<why this question is relevant>"
    },
    {
      "question": "<another targeted question>",
      "rationale": "<why>"
    },
    {
      "question": "<a third question>",
      "rationale": "<why>"
    }
  ],
  "overallAssessment": "<one of: Strong Match, Good Match, Moderate Match, Weak Match, Poor Match>",
  "riskFactors": ["<potential risk 1>", "<potential risk 2 if any>"]
}
`;

    return await callGeminiWithRetry(prompt);
}


// ═══════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════

function validateResumeData(data) {
    // Ensure all expected fields exist with sensible defaults
    return {
        fullName: data.fullName || 'Unknown Candidate',
        email: data.email || null,
        phone: data.phone || null,
        location: data.location || null,
        linkedIn: data.linkedIn || null,
        portfolio: data.portfolio || null,
        summary: data.summary || 'No summary available.',
        totalYearsExperience: Number(data.totalYearsExperience) || 0,
        skills: Array.isArray(data.skills) ? data.skills : [],
        education: Array.isArray(data.education) ? data.education : [],
        experienceHistory: Array.isArray(data.experienceHistory) ? data.experienceHistory : [],
        projects: Array.isArray(data.projects) ? data.projects : [],
        certifications: Array.isArray(data.certifications) ? data.certifications : [],
        languages: Array.isArray(data.languages) ? data.languages : []
    };
}

function validateJobCriteria(data) {
    return {
        jobTitle: data.jobTitle || 'Untitled Position',
        department: data.department || null,
        requiredSkills: Array.isArray(data.requiredSkills) ? data.requiredSkills : [],
        preferredSkills: Array.isArray(data.preferredSkills) ? data.preferredSkills : [],
        minYearsExperience: Number(data.minYearsExperience) || 0,
        minEducationLevel: data.minEducationLevel || null,
        educationField: data.educationField || null,
        certifications: Array.isArray(data.certifications) ? data.certifications : [],
        responsibilities: Array.isArray(data.responsibilities) ? data.responsibilities : [],
        keywords: Array.isArray(data.keywords) ? data.keywords : []
    };
}


module.exports = {
    extractResumeData,
    extractJobCriteria,
    generateCandidateFeedback,
    callGeminiWithRetry
};
