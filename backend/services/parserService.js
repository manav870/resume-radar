// ============================================
// Resume Rider — Document Parser Service
// Extracts raw text from PDF, DOCX, and plain text files
// ============================================

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extract plain text from a file buffer based on its MIME type.
 * Supports: PDF, DOCX, plain text, and Google Docs (pre-exported).
 *
 * @param {Buffer|string} fileData - The raw file content (Buffer for binary, string for text).
 * @param {string} mimeType - The MIME type of the file.
 * @param {string} fileName - Original file name (used for logging and fallback detection).
 * @returns {Promise<string>} Extracted plain text content.
 */
async function extractText(fileData, mimeType, fileName) {
    try {
        // PDF files
        if (mimeType === 'application/pdf') {
            return await extractFromPDF(fileData);
        }

        // DOCX files
        if (
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            (fileName && fileName.toLowerCase().endsWith('.docx'))
        ) {
            return await extractFromDOCX(fileData);
        }

        // Google Docs (exported as text/plain via Drive API)
        if (mimeType === 'application/vnd.google-apps.document') {
            // This case is handled by driveService exporting as text/plain
            // If we receive raw text, return it directly
            if (typeof fileData === 'string') return fileData;
            return fileData.toString('utf-8');
        }

        // Plain text files
        if (mimeType === 'text/plain' || (fileName && fileName.toLowerCase().endsWith('.txt'))) {
            if (typeof fileData === 'string') return fileData;
            return fileData.toString('utf-8');
        }

        // Unsupported format
        throw new Error(`Unsupported file format: ${mimeType} (${fileName})`);

    } catch (error) {
        console.error(`[ParserService] Failed to extract text from "${fileName}" (${mimeType}):`, error.message);
        throw error;
    }
}

/**
 * Extract text from a PDF buffer.
 */
async function extractFromPDF(buffer) {
    if (typeof buffer === 'string') {
        buffer = Buffer.from(buffer, 'binary');
    }
    const data = await pdfParse(buffer);
    const text = data.text || '';
    if (text.trim().length === 0) {
        throw new Error('PDF appears to be empty or image-only (no extractable text).');
    }
    return text;
}

/**
 * Extract text from a DOCX buffer.
 */
async function extractFromDOCX(buffer) {
    if (typeof buffer === 'string') {
        buffer = Buffer.from(buffer, 'binary');
    }
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value || '';
    if (result.messages && result.messages.length > 0) {
        console.warn('[ParserService] DOCX extraction warnings:', result.messages);
    }
    if (text.trim().length === 0) {
        throw new Error('DOCX appears to be empty (no extractable text).');
    }
    return text;
}

module.exports = {
    extractText,
    extractFromPDF,
    extractFromDOCX
};
