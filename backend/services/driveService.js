// ============================================
// Resume Rider — Updated Drive Service
// Batch-fetches resumes (PDF, DOCX, TXT, Google Docs)
// from a designated Google Drive folder
// ============================================

const { google } = require('googleapis');
require('dotenv').config();

function getAuth() {
    return new google.auth.GoogleAuth({
        scopes: [
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/documents'
        ]
    });
}

function getDriveClient() {
    return google.drive({ version: 'v3', auth: getAuth() });
}

// Supported MIME types for resume files
const SUPPORTED_MIME_TYPES = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.google-apps.document'
];

/**
 * List resume files from a Google Drive folder.
 * Filters to only supported file types and orders by name.
 *
 * @param {string} folderId - Google Drive folder ID.
 * @param {number} maxFiles - Maximum number of files to retrieve.
 * @returns {Promise<Array<{id: string, name: string, mimeType: string}>>}
 */
async function listResumeFiles(folderId, maxFiles = 10) {
    const drive = getDriveClient();
    try {
        // Build a query that matches any supported MIME type
        const mimeQueries = SUPPORTED_MIME_TYPES
            .map(mime => `mimeType='${mime}'`)
            .join(' or ');

        const res = await drive.files.list({
            q: `'${folderId}' in parents and trashed=false and (${mimeQueries})`,
            fields: 'files(id, name, mimeType, size, createdTime)',
            orderBy: 'name',
            pageSize: maxFiles
        });

        const files = res.data.files || [];
        console.log(`[DriveService] Found ${files.length} resume file(s) in folder ${folderId}`);
        return files;
    } catch (error) {
        console.error('[DriveService] Error listing files:', error.message);
        throw new Error(`Failed to list files in folder ${folderId}: ${error.message}`);
    }
}

/**
 * Download a file's content from Google Drive.
 * Returns a Buffer for binary files (PDF, DOCX) or a string for text files.
 *
 * @param {string} fileId - Google Drive file ID.
 * @param {string} mimeType - The file's MIME type.
 * @returns {Promise<Buffer|string>} File content.
 */
async function getFileContent(fileId, mimeType) {
    const drive = getDriveClient();
    try {
        // Google Docs → export as plain text
        if (mimeType === 'application/vnd.google-apps.document') {
            const res = await drive.files.export({
                fileId: fileId,
                mimeType: 'text/plain'
            });
            return res.data;
        }

        // Binary files (PDF, DOCX) → download as buffer
        if (
            mimeType === 'application/pdf' ||
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ) {
            const res = await drive.files.get(
                { fileId: fileId, alt: 'media' },
                { responseType: 'arraybuffer' }
            );
            return Buffer.from(res.data);
        }

        // Plain text files
        if (mimeType === 'text/plain') {
            const res = await drive.files.get(
                { fileId: fileId, alt: 'media' }
            );
            return res.data;
        }

        throw new Error(`Unsupported MIME type for download: ${mimeType}`);
    } catch (error) {
        console.error(`[DriveService] Error downloading file ${fileId}:`, error.message);
        throw new Error(`Failed to download file: ${error.message}`);
    }
}

/**
 * Create a new Google Doc in the specified folder.
 *
 * @param {string} title - Document title.
 * @param {string} folderId - Target folder ID.
 * @returns {Promise<{id: string, webViewLink: string}>}
 */
async function createDocInFolder(title, folderId) {
    const drive = getDriveClient();
    try {
        const res = await drive.files.create({
            requestBody: {
                name: title,
                mimeType: 'application/vnd.google-apps.document',
                parents: [folderId]
            },
            fields: 'id, webViewLink'
        });
        console.log(`[DriveService] Created Google Doc: ${res.data.id}`);
        return res.data;
    } catch (error) {
        console.error('[DriveService] Error creating doc:', error.message);
        throw new Error(`Failed to create Google Doc: ${error.message}`);
    }
}

module.exports = {
    getAuth,
    getDriveClient,
    listResumeFiles,
    getFileContent,
    createDocInFolder,
    SUPPORTED_MIME_TYPES
};
