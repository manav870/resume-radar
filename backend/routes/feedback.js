const express = require('express');
const router = express.Router();
const feedbackService = require('../services/feedbackService');

router.post('/', async (req, res) => {
    try {
        const { inputFolderId, outputFolderId, maxFiles } = req.body;

        if (!inputFolderId || typeof inputFolderId !== 'string') {
            return res.status(400).json({ success: false, message: 'Invalid or missing inputFolderId' });
        }
        if (!outputFolderId || typeof outputFolderId !== 'string') {
            return res.status(400).json({ success: false, message: 'Invalid or missing outputFolderId' });
        }

        // Limit maxFiles to 5, default from env or 3
        const maxFilesLimit = 5;
        const requestedFiles = parseInt(maxFiles, 10) || parseInt(process.env.MAX_FILES_DEFAULT, 10) || 3;
        const finalMaxFiles = Math.min(requestedFiles, maxFilesLimit);

        console.log(`Starting batch process for max ${finalMaxFiles} files from ${inputFolderId}`);

        // Orchestrate processing
        const results = await feedbackService.processBatch(inputFolderId, outputFolderId, finalMaxFiles);
        
        res.status(200).json(results);
    } catch (error) {
        console.error('Error in /process-batch route:', error);
        res.status(500).json({
            success: false,
            message: 'An unexpected error occurred during batch processing',
            error: error.message
        });
    }
});

module.exports = router;
