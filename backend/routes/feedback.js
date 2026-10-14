// ============================================
// Resume Radar — API Routes
// ============================================

const express = require('express');
const router = express.Router();
const multer = require('multer');
const feedbackService = require('../services/feedbackService');
const { isValidReviewStatus, VALID_REVIEW_STATUSES } = require('../utils/validators');

// Multer memory storage configuration for file uploads (PDF, DOCX, TXT)
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    limits: {
        fileSize: 15 * 1024 * 1024 // 15MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/msword',
            'text/plain'
        ];
        const hasAllowedExt = /\.(pdf|docx|doc|txt)$/i.test(file.originalname);

        if (allowedMimes.includes(file.mimetype) || hasAllowedExt) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file format. Only PDF, DOCX, DOC, and TXT files are accepted.'));
        }
    }
});

// ═══════════════════════════════════════════════
// 1. BATCH PROCESS RESUMES (GOOGLE DRIVE)
// ═══════════════════════════════════════════════

/**
 * POST /
 * Or POST /process-batch
 * Batch screens resumes from a designated Google Drive folder.
 */
router.post('/', async (req, res) => {
    try {
        const {
            inputFolderId,
            outputFolderId,
            outputDocId,
            maxFiles,
            jobCriteria,
            customWeights,
            generateDocs
        } = req.body;

        if (!inputFolderId || typeof inputFolderId !== 'string' || !inputFolderId.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or missing "inputFolderId". Please specify a valid Google Drive folder ID.'
            });
        }

        // Limit maxFiles to safety cap (up to 25 files per batch)
        const maxFilesLimit = 25;
        const requestedFiles = parseInt(maxFiles, 10) || parseInt(process.env.MAX_FILES_DEFAULT, 10) || 10;
        const finalMaxFiles = Math.min(Math.max(1, requestedFiles), maxFilesLimit);

        console.log(`[Route] Starting batch screening for max ${finalMaxFiles} files from folder: ${inputFolderId}`);

        const results = await feedbackService.processBatch(
            inputFolderId.trim(),
            outputFolderId || outputDocId || null,
            finalMaxFiles,
            jobCriteria || {},
            customWeights || {},
            { generateDocs: Boolean(generateDocs), outputFolderId, outputDocId }
        );

        return res.status(200).json(results);

    } catch (error) {
        console.error('[Route] Error in batch processing route:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'An unexpected error occurred during batch screening.',
            error: error.message
        });
    }
});


// ═══════════════════════════════════════════════
// 2. PARSE JOB DESCRIPTION (TEXT OR FILE)
// ═══════════════════════════════════════════════

/**
 * POST /jobs/parse
 * Extract structured criteria from pasted JD text OR uploaded JD file (PDF/DOCX).
 */
router.post('/jobs/parse', upload.single('jobFile'), async (req, res) => {
    try {
        let input;
        let mimeType = null;
        let fileName = null;

        if (req.file) {
            // Uploaded JD file
            input = req.file.buffer;
            mimeType = req.file.mimetype;
            fileName = req.file.originalname;
            console.log(`[Route] Parsing job criteria from uploaded file: ${fileName}`);
        } else if (req.body.jobText && typeof req.body.jobText === 'string') {
            // Pasted JD text
            input = req.body.jobText;
            console.log(`[Route] Parsing job criteria from raw text (${input.length} chars)`);
        } else {
            return res.status(400).json({
                success: false,
                message: 'Please provide either "jobText" in request body or attach a "jobFile" (PDF/DOCX).'
            });
        }

        const criteria = await feedbackService.parseJobDescription(input, mimeType, fileName);

        return res.status(200).json({
            success: true,
            criteria
        });

    } catch (error) {
        console.error('[Route] Error in /jobs/parse:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to parse job description.',
            error: error.message
        });
    }
});


// ═══════════════════════════════════════════════
// 3. SINGLE RESUME DIRECT SCREENING (UPLOAD)
// ═══════════════════════════════════════════════

/**
 * POST /candidates/screen-file
 * Upload and screen a single resume file (PDF/DOCX/TXT) against job criteria.
 */
router.post('/candidates/screen-file', upload.single('resumeFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No resume file uploaded. Please attach a file using the "resumeFile" field.'
            });
        }

        let jobCriteria = {};
        if (req.body.jobCriteria) {
            try {
                jobCriteria = typeof req.body.jobCriteria === 'string'
                    ? JSON.parse(req.body.jobCriteria)
                    : req.body.jobCriteria;
            } catch (e) {
                console.warn('[Route] Could not parse jobCriteria JSON:', e.message);
            }
        }

        let customWeights = {};
        if (req.body.customWeights) {
            try {
                customWeights = typeof req.body.customWeights === 'string'
                    ? JSON.parse(req.body.customWeights)
                    : req.body.customWeights;
            } catch (e) {
                console.warn('[Route] Could not parse customWeights JSON:', e.message);
            }
        }

        const generateDocs = req.body.generateDocs === 'true' || req.body.generateDocs === true;
        const outputFolderId = req.body.outputFolderId || null;

        console.log(`[Route] Screening uploaded single resume: ${req.file.originalname}`);

        const result = await feedbackService.screenSingleFile(
            req.file.buffer,
            req.file.mimetype,
            req.file.originalname,
            jobCriteria,
            customWeights,
            { generateDocs, outputFolderId }
        );

        return res.status(200).json({
            success: true,
            candidate: result
        });

    } catch (error) {
        console.error('[Route] Error screening single resume:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to evaluate resume.',
            error: error.message
        });
    }
});


// ═══════════════════════════════════════════════
// 4. ON-DEMAND GOOGLE DOC REPORT GENERATION
// ═══════════════════════════════════════════════

/**
 * POST /candidates/generate-report
 * Generate a Google Doc report on-demand for an evaluated candidate.
 */
router.post('/candidates/generate-report', async (req, res) => {
    try {
        const { candidateData, jobCriteria, outputFolderId } = req.body;

        if (!candidateData) {
            return res.status(400).json({
                success: false,
                message: 'Missing "candidateData" in request body.'
            });
        }

        console.log('[Route] Generating on-demand report for candidate...');
        const docResult = await feedbackService.generateReportForCandidate(
            candidateData,
            jobCriteria || {},
            outputFolderId || null
        );

        return res.status(200).json({
            success: true,
            docId: docResult.docId,
            docUrl: docResult.docUrl
        });

    } catch (error) {
        console.error('[Route] Error generating on-demand report:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to generate Google Doc report.',
            error: error.message
        });
    }
});


// ═══════════════════════════════════════════════
// 5. HUMAN-IN-THE-LOOP (HITL) REVIEW STATUS UPDATE
// ═══════════════════════════════════════════════

/**
 * POST /candidates/review-status
 * Update recruiter decision status: shortlisted, rejected, interview_scheduled, hold.
 */
router.post('/candidates/review-status', async (req, res) => {
    try {
        const { candidateId, status, notes } = req.body;

        if (!candidateId) {
            return res.status(400).json({
                success: false,
                message: 'Missing "candidateId".'
            });
        }

        if (!isValidReviewStatus(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid review status. Allowed values: ${VALID_REVIEW_STATUSES.join(', ')}`
            });
        }

        console.log(`[Route] Candidate ${candidateId} status updated to: ${status}`);

        return res.status(200).json({
            success: true,
            candidateId,
            status,
            notes: notes || '',
            updatedAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('[Route] Error updating candidate review status:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to update candidate review status.',
            error: error.message
        });
    }
});

module.exports = router;
