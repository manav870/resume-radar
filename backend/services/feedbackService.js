const driveService = require('./driveService');
const docsService = require('./docsService');
const geminiService = require('./geminiService');

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function processBatch(inputFolderId, outputDocId, maxFiles = 5) {
    const resultPayload = {
        success: true,
        processedCount: 0,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
        results: []
    };

    try {
        console.log(`Listing files for ${inputFolderId}...`);
        const files = await driveService.listAssignmentFiles(inputFolderId, maxFiles);
        resultPayload.processedCount = files.length;
        
        for (const file of files) {
            const fileResult = {
                fileName: file.name,
                fileId: file.id,
                status: 'skipped',
                message: '',
                feedbackDocId: outputDocId,
                feedbackDocUrl: null,
                overallScore: 0,
                scores: {}
            };

            try {
                // 1. Read file text
                console.log(`Reading file: ${file.name}`);
                const text = await driveService.getFileText(file.id, file.mimeType);
                
                if (!text || text.trim().length === 0) {
                    fileResult.status = 'skipped';
                    fileResult.message = 'File is empty or unsupported format';
                    resultPayload.skippedCount++;
                    resultPayload.results.push(fileResult);
                    continue;
                }

                // 2. Generate feedback with Gemini
                console.log(`Generating feedback for: ${file.name}`);
                const feedback = await geminiService.generateFeedback(file.name, text);
                
                fileResult.overallScore = feedback.total_score;
                fileResult.scores = {}; // No longer using individual scores in UI

                // 3. Build text directly into the master output doc
                console.log(`Appending feedback to master doc for: ${file.name}`);
                await docsService.buildFeedbackText(outputDocId, file.name, feedback);

                // 4. Get file link
                const docInfo = await driveService.getDriveClient().files.get({
                    fileId: outputDocId,
                    fields: 'webViewLink'
                });
                
                fileResult.status = 'success';
                fileResult.message = 'Successfully appended feedback';
                fileResult.feedbackDocUrl = docInfo.data.webViewLink;
                resultPayload.successCount++;

            } catch (fileError) {
                console.error(`Failed processing ${file.name}:`, fileError);
                fileResult.status = 'failed';
                fileResult.message = fileError.message;
                resultPayload.failedCount++;
            }

            resultPayload.results.push(fileResult);
            
            // Add small delay to avoid rate limiting
            await delay(500);
        }
        
        return resultPayload;

    } catch (error) {
        console.error('Batch process failed:', error);
        resultPayload.success = false;
        resultPayload.message = error.message;
        throw error;
    }
}

module.exports = {
    processBatch
};
