// ============================================
// Resume Radar — Core Recruitment Orchestration Service
//
// Coordinates resume ingestion (Drive & direct upload),
// text extraction, Gemini AI candidate parsing,
// deterministic weighted scoring, qualitative feedback,
// and Google Docs diagnostic report generation.
// ============================================

const driveService = require('./driveService');
const parserService = require('./parserService');
const geminiService = require('./geminiService');
const scoringService = require('./scoringService');
const docsService = require('./docsService');
const fallbacks = require('../utils/fallbacks');
const { sanitizeJobCriteria } = require('../utils/validators');

const delay = (ms) => new Promise(res => setTimeout(res, ms));

/**
 * Calculate statistical aggregate analytics for a batch of evaluated candidates.
 */
function calculatePoolAnalytics(candidates = [], jobCriteria = {}) {
    const successfulCandidates = candidates.filter(c => c.status === 'success' && c.matchEvaluation);
    if (successfulCandidates.length === 0) {
        return {
            totalEvaluated: 0,
            averageScore: 0,
            highestScore: 0,
            lowestScore: 0,
            scoreDistribution: { '90-100': 0, '75-89': 0, '50-74': 0, 'below-50': 0 },
            topSkillsInPool: {},
            missingSkillsFrequency: {},
            experienceDistribution: { '<2 years': 0, '2-5 years': 0, '5+ years': 0 }
        };
    }

    const scores = successfulCandidates.map(c => c.matchEvaluation.finalScore);
    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = Math.round((sum / scores.length) * 10) / 10;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);

    const scoreDistribution = {
        '90-100': 0,
        '75-89': 0,
        '50-74': 0,
        'below-50': 0
    };

    scores.forEach(s => {
        if (s >= 90) scoreDistribution['90-100']++;
        else if (s >= 75) scoreDistribution['75-89']++;
        else if (s >= 50) scoreDistribution['50-74']++;
        else scoreDistribution['below-50']++;
    });

    // Skill frequencies across all candidates in pool
    const skillCounts = {};
    successfulCandidates.forEach(c => {
        const skills = c.candidateProfile?.skills || [];
        skills.forEach(s => {
            const key = s.trim();
            if (key) {
                skillCounts[key] = (skillCounts[key] || 0) + 1;
            }
        });
    });

    // Sort top skills
    const topSkillsInPool = Object.entries(skillCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 15)
        .reduce((obj, [k, v]) => { obj[k] = v; return obj; }, {});

    // Common missing required skills
    const missingCounts = {};
    successfulCandidates.forEach(c => {
        const missing = c.matchEvaluation?.missingRequiredSkills || [];
        missing.forEach(m => {
            const key = m.trim();
            if (key) {
                missingCounts[key] = (missingCounts[key] || 0) + 1;
            }
        });
    });

    const missingSkillsFrequency = Object.entries(missingCounts)
        .sort(([, a], [, b]) => b - a)
        .reduce((obj, [k, v]) => { obj[k] = v; return obj; }, {});

    // Experience bracket distribution
    const expDistribution = {
        '<2 years': 0,
        '2-5 years': 0,
        '5+ years': 0
    };

    successfulCandidates.forEach(c => {
        const yrs = Number(c.candidateProfile?.totalYearsExperience) || 0;
        if (yrs < 2) expDistribution['<2 years']++;
        else if (yrs <= 5) expDistribution['2-5 years']++;
        else expDistribution['5+ years']++;
    });

    return {
        totalEvaluated: successfulCandidates.length,
        averageScore: avg,
        highestScore: highest,
        lowestScore: lowest,
        scoreDistribution,
        topSkillsInPool,
        missingSkillsFrequency,
        experienceDistribution: expDistribution
    };
}

/**
 * Evaluate a single candidate text against job criteria and calculate
 * deterministic score + qualitative AI review + optional Google Doc.
 */
async function evaluateCandidateData(rawText, fileName, fileId = null, jobCriteria = {}, customWeights = {}, options = {}) {
    let candidateProfile;
    let matchEvaluation;
    let aiFeedback;
    let docInfo = { docId: null, docUrl: null };

    // 1. Structured Candidate Profile Extraction
    try {
        console.log(`[ResumeRadar] Extracting candidate profile for: ${fileName}`);
        candidateProfile = await geminiService.extractResumeData(rawText, fileName);
    } catch (aiErr) {
        console.warn(`[ResumeRadar] Gemini extraction failed for ${fileName}, using fallback:`, aiErr.message);
        candidateProfile = fallbacks.getFallbackCandidateProfile(fileName, rawText);
    }

    // 2. Deterministic Scoring Calculation
    console.log(`[ResumeRadar] Calculating deterministic match score for: ${fileName}`);
    matchEvaluation = scoringService.computeMatchScore(candidateProfile, jobCriteria, customWeights);

    // 3. AI Qualitative Assessment (Strengths, Gaps, Interview Probe Questions)
    try {
        console.log(`[ResumeRadar] Generating AI qualitative feedback for: ${fileName}`);
        aiFeedback = await geminiService.generateCandidateFeedback(candidateProfile, jobCriteria, matchEvaluation);
    } catch (feedbackErr) {
        console.warn(`[ResumeRadar] Qualitative feedback failed for ${fileName}, using fallback:`, feedbackErr.message);
        aiFeedback = fallbacks.getFallbackCandidateFeedback(candidateProfile, jobCriteria, matchEvaluation);
    }

    // 4. Optional Google Doc Report Generation
    if (options.generateDocs && (options.outputFolderId || options.outputDocId)) {
        try {
            console.log(`[ResumeRadar] Creating Google Doc report for: ${candidateProfile.fullName}`);
            const created = await docsService.createEvaluationDocument(
                candidateProfile.fullName,
                jobCriteria.jobTitle,
                options.outputFolderId
            );
            docInfo.docId = created.docId;
            docInfo.docUrl = created.docUrl;

            await docsService.buildRecruitmentReport(
                docInfo.docId,
                candidateProfile,
                jobCriteria,
                matchEvaluation,
                aiFeedback
            );
        } catch (docErr) {
            console.error(`[ResumeRadar] Google Doc generation failed for ${fileName}:`, docErr.message);
            // Non-fatal: candidate evaluation still succeeds even if Doc export fails
        }
    }

    return {
        candidateId: fileId || `cand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        fileName,
        fileId,
        status: 'success',
        candidateProfile,
        matchEvaluation,
        aiFeedback,
        reportDocId: docInfo.docId,
        reportDocUrl: docInfo.docUrl,
        reviewStatus: 'unreviewed',
        reviewerNotes: '',
        processedAt: new Date().toISOString()
    };
}

/**
 * Batch Process Resumes from a Google Drive Folder.
 *
 * @param {string} inputFolderId - Source Drive folder ID
 * @param {string} [outputFolderIdOrDocId] - Destination folder or doc ID
 * @param {number} [maxFiles=10] - Number of resumes to process
 * @param {Object} [jobCriteria] - Structured job requirements
 * @param {Object} [customWeights] - Custom scoring weights
 * @param {Object} [options] - Configuration flags (e.g., generateDocs)
 * @returns {Promise<Object>} Evaluated candidate batch with pool analytics
 */
async function processBatch(
    inputFolderId,
    outputFolderIdOrDocId = null,
    maxFiles = 10,
    jobCriteria = {},
    customWeights = {},
    options = {}
) {
    const sanitizedJob = sanitizeJobCriteria(jobCriteria);

    const resultPayload = {
        success: true,
        jobCriteria: sanitizedJob,
        processedCount: 0,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
        candidates: [],
        analytics: {},
        processedAt: new Date().toISOString()
    };

    try {
        console.log(`[ResumeRadar] Listing files in folder: ${inputFolderId}...`);
        const files = await driveService.listResumeFiles(inputFolderId, maxFiles);
        resultPayload.processedCount = files.length;

        if (files.length === 0) {
            resultPayload.message = 'No supported resume files (.pdf, .docx, .txt, Google Docs) found in this folder.';
            resultPayload.analytics = calculatePoolAnalytics([], sanitizedJob);
            return resultPayload;
        }

        const effectiveOptions = {
            ...options,
            outputFolderId: options.outputFolderId || outputFolderIdOrDocId,
            outputDocId: options.outputDocId || outputFolderIdOrDocId
        };

        for (const file of files) {
            console.log(`[ResumeRadar] Ingesting file: ${file.name} (${file.mimeType})`);

            try {
                // Step A: Download file content
                const fileData = await driveService.getFileContent(file.id, file.mimeType);

                // Step B: Extract text
                const text = await parserService.extractText(fileData, file.mimeType, file.name);

                if (!text || text.trim().length === 0) {
                    resultPayload.skippedCount++;
                    resultPayload.candidates.push({
                        candidateId: file.id,
                        fileName: file.name,
                        fileId: file.id,
                        status: 'skipped',
                        message: 'File contains no extractable text or is empty.',
                        reviewStatus: 'unreviewed'
                    });
                    continue;
                }

                // Step C, D, E, F: Evaluate candidate
                const candidateResult = await evaluateCandidateData(
                    text,
                    file.name,
                    file.id,
                    sanitizedJob,
                    customWeights,
                    effectiveOptions
                );

                resultPayload.successCount++;
                resultPayload.candidates.push(candidateResult);

            } catch (fileError) {
                console.error(`[ResumeRadar] Error processing ${file.name}:`, fileError.message);
                resultPayload.failedCount++;
                resultPayload.candidates.push({
                    candidateId: file.id,
                    fileName: file.name,
                    fileId: file.id,
                    status: 'failed',
                    message: fileError.message,
                    reviewStatus: 'unreviewed'
                });
            }

            // Brief delay to avoid Google API / Gemini throttling
            await delay(400);
        }

        // Sort candidates descending by match score
        resultPayload.candidates.sort((a, b) => {
            const scoreA = a.matchEvaluation?.finalScore ?? 0;
            const scoreB = b.matchEvaluation?.finalScore ?? 0;
            return scoreB - scoreA;
        });

        // Compute aggregate pool analytics
        resultPayload.analytics = calculatePoolAnalytics(resultPayload.candidates, sanitizedJob);

        return resultPayload;

    } catch (batchError) {
        console.error('[ResumeRadar] Batch processing encountered fatal error:', batchError);
        resultPayload.success = false;
        resultPayload.message = batchError.message;
        throw batchError;
    }
}

/**
 * Screen a single uploaded resume buffer directly (without Google Drive).
 *
 * @param {Buffer} fileBuffer - Uploaded file buffer
 * @param {string} mimeType - Uploaded file MIME type
 * @param {string} originalName - Original file name
 * @param {Object} jobCriteria - Job requirements
 * @param {Object} customWeights - Custom scoring weights
 * @param {Object} options - Additional options
 */
async function screenSingleFile(fileBuffer, mimeType, originalName, jobCriteria = {}, customWeights = {}, options = {}) {
    const sanitizedJob = sanitizeJobCriteria(jobCriteria);
    const text = await parserService.extractText(fileBuffer, mimeType, originalName);

    if (!text || text.trim().length === 0) {
        throw new Error('Uploaded file is empty or contains no readable text.');
    }

    return await evaluateCandidateData(
        text,
        originalName,
        null,
        sanitizedJob,
        customWeights,
        options
    );
}

/**
 * Parse job description text or file buffer into structured criteria.
 *
 * @param {string|Buffer} input - Raw text or file buffer
 * @param {string} [mimeType] - MIME type if input is a buffer
 * @param {string} [fileName] - File name if input is a buffer
 */
async function parseJobDescription(input, mimeType = null, fileName = null) {
    let jobText = '';

    if (Buffer.isBuffer(input)) {
        jobText = await parserService.extractText(input, mimeType, fileName);
    } else if (typeof input === 'string') {
        jobText = input;
    } else {
        throw new Error('Invalid job description input. Expected string or file buffer.');
    }

    if (!jobText || jobText.trim().length === 0) {
        throw new Error('Job description is empty.');
    }

    try {
        console.log('[ResumeRadar] Extracting job criteria with Gemini...');
        const rawCriteria = await geminiService.extractJobCriteria(jobText);
        return sanitizeJobCriteria(rawCriteria);
    } catch (err) {
        console.warn('[ResumeRadar] Gemini JD extraction failed, using fallback criteria:', err.message);
        return sanitizeJobCriteria(fallbacks.getFallbackJobCriteria(jobText));
    }
}

/**
 * Generate a Google Doc report on-demand for an existing evaluated candidate.
 */
async function generateReportForCandidate(candidateData, jobCriteria, outputFolderId = null) {
    const candidateProfile = candidateData.candidateProfile || candidateData;
    const matchEvaluation = candidateData.matchEvaluation || {};
    const aiFeedback = candidateData.aiFeedback || {};
    const sanitizedJob = sanitizeJobCriteria(jobCriteria);

    const created = await docsService.createEvaluationDocument(
        candidateProfile.fullName || 'Candidate',
        sanitizedJob.jobTitle,
        outputFolderId
    );

    await docsService.buildRecruitmentReport(
        created.docId,
        candidateProfile,
        sanitizedJob,
        matchEvaluation,
        aiFeedback
    );

    return created;
}

module.exports = {
    processBatch,
    screenSingleFile,
    parseJobDescription,
    generateReportForCandidate,
    calculatePoolAnalytics,
    evaluateCandidateData
};
