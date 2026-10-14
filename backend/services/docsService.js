const { google } = require('googleapis');
require('dotenv').config();

function getAuth() {
    return new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/documents']
    });
}

function getDocsClient() {
    return google.docs({ version: 'v1', auth: getAuth() });
}

function getDriveClient() {
    return google.drive({ version: 'v3', auth: getAuth() });
}

async function buildFeedbackText(docId, fileName, feedback) {
    const docs = getDocsClient();
    
    // Parse rollNo and studentName from fileName (e.g. "27_Mohan.txt")
    let rollNo = '[Unknown]';
    let studentName = '[Unknown]';
    const match = fileName.match(/^(\d+)_([^\.]+)/);
    if (match) {
        rollNo = match[1];
        studentName = match[2];
    }

    let textToInsert = `\n\n=================================================\n` +
                       `# Assignment Evaluation: ${fileName}\n\n` +
                       `**Roll No:** ${rollNo}\n` +
                       `**Student Name:** ${studentName}\n` +
                       `**Total Score:** ${feedback.total_score || 0}/20\n\n` +
                       `---\n\n` +
                       `## 1. Criterion Breakdown\n\n`;

    if (feedback.criterion_breakdown) {
        feedback.criterion_breakdown.forEach(c => {
            textToInsert += `* ${c.dimension}: ${c.score}/5\n  Diagnostic: ${c.diagnostic}\n\n`;
        });
    }

    textToInsert += `---\n\n## 2. Error Analysis & Corrections\n\n`;
    
    if (feedback.error_analysis) {
        feedback.error_analysis.forEach((e, idx) => {
            textToInsert += `* Error ${idx + 1}: ${e.error_name}\n` +
                            `  - What was written: "${e.what_was_written}"\n` +
                            `  - Why it is incorrect: ${e.why_incorrect}\n` +
                            `  - Correction / Better approach: ${e.correction}\n\n`;
        });
    }

    textToInsert += `---\n\n## 3. Hidden Assumptions & Missed Opportunities\n\n` +
                    `* Unstated Assumptions: ${feedback.hidden_assumptions || 'None noted.'}\n` +
                    `* Alternative Approaches: ${feedback.alternative_approaches || 'None noted.'}\n\n` +
                    `---\n\n## 4. Actionable Next Step\n\n`;

    if (feedback.actionable_next_step) {
        textToInsert += `* Core Principle to Review: ${feedback.actionable_next_step.core_principle}\n` +
                        `* Targeted Practice: ${feedback.actionable_next_step.targeted_practice}\n\n`;
    }

    textToInsert += `=================================================\n\n`;

    try {
        await docs.documents.batchUpdate({
            documentId: docId,
            requestBody: {
                requests: [
                    {
                        insertText: {
                            location: {
                                index: 1,
                            },
                            text: textToInsert
                        }
                    }
                ]
            }
        });
    } catch (error) {
        console.error('Error inserting text into document:', error);
        throw new Error('Failed to write feedback to document');
    }
}

module.exports = {
    buildFeedbackText
};
