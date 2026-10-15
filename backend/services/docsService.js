// ============================================
// Resume Radar — Google Docs Report Service
//
// Generates executive candidate evaluation dossiers
// in Google Docs with structured scorecards,
// skill-gap analyses, AI qualitative reviews,
// and tailored interview question guides.
// ============================================

const { google } = require('googleapis');
require('dotenv').config();

/**
 * Initialize Google Auth using Service Account credentials.
 */
function getAuth() {
    return new google.auth.GoogleAuth({
        scopes: [
            'https://www.googleapis.com/auth/drive',
            'https://www.googleapis.com/auth/documents'
        ]
    });
}

function getDocsClient() {
    return google.docs({ version: 'v1', auth: getAuth() });
}

function getDriveClient() {
    return google.drive({ version: 'v3', auth: getAuth() });
}

/**
 * Parse a raw Doc ID or full Google Docs URL into a clean document ID string.
 * Supports:
 *   - "12sI8scxKOLT_69zx8jGWQNu7Fga-266V4hrwrmm3eaU"
 *   - "https://docs.google.com/document/d/12sI8scxKOLT_69zx8jGWQNu7Fga-266V4hrwrmm3eaU/edit?tab=t.0"
 */
function parseDocId(input) {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    return trimmed.split('?')[0].split('#')[0].replace(/^\/+|\/+$/g, '');
}

/**
 * Create a new blank Google Document for candidate evaluation.
 *
 * @param {string} candidateName
 * @param {string} jobTitle
 * @param {string} [folderId] - Optional Google Drive folder ID to store report in
 * @returns {Promise<{ docId: string, docUrl: string }>}
 */
async function createEvaluationDocument(candidateName = 'Candidate', jobTitle = 'Role', folderId = null) {
    const drive = getDriveClient();
    const docTitle = `Resume Radar Report — ${candidateName} (${jobTitle})`;

    const fileMetadata = {
        name: docTitle,
        mimeType: 'application/vnd.google-apps.document'
    };

    if (folderId) {
        fileMetadata.parents = [folderId];
    }

    try {
        const res = await drive.files.create({
            requestBody: fileMetadata,
            fields: 'id, webViewLink, webContentLink'
        });

        const docId = res.data.id;
        const docUrl = res.data.webViewLink || `https://docs.google.com/document/d/${docId}/edit`;

        return { docId, docUrl };
    } catch (err) {
        if (err.message && (err.message.includes('quota') || err.message.includes('storageQuota'))) {
            throw new Error(`Google Drive storage quota reached for the Service Account. Since personal Google Drives do not grant storage quota to service accounts, please create a Google Doc in your personal Drive, share it with your Service Account email as Editor, and provide the Doc ID or URL in the "Export Doc ID" field.`);
        }
        throw err;
    }
}

/**
 * Build and insert the comprehensive recruitment evaluation dossier into a Google Doc.
 *
 * @param {string} docId - Target Google Doc ID
 * @param {Object} candidate - Candidate profile data
 * @param {Object} job - Job criteria data
 * @param {Object} match - Deterministic match evaluation from scoringService
 * @param {Object} [aiFeedback] - AI qualitative feedback from geminiService
 */
async function buildRecruitmentReport(docId, candidate = {}, job = {}, match = {}, aiFeedback = {}) {
    const docs = getDocsClient();

    const candidateName = candidate.fullName || 'Candidate';
    const jobTitle = job.jobTitle || 'Target Position';
    const finalScore = match.finalScore ?? 0;
    const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Determine status badge
    let statusBadge = 'UNDER REVIEW';
    if (finalScore >= 85) statusBadge = 'TOP CANDIDATE / STRONG MATCH';
    else if (finalScore >= 70) statusBadge = 'QUALIFIED / GOOD MATCH';
    else if (finalScore >= 50) statusBadge = 'POTENTIAL / MODERATE MATCH';
    else statusBadge = 'LOW ALIGNMENT';

    const cat = match.categoryScores || {};
    const req = cat.requiredSkills || {};
    const pref = cat.preferredSkills || {};
    const exp = cat.experience || {};
    const edu = cat.education || {};
    const cert = cat.certifications || {};

    let content = '';

    // Header Banner
    content += `================================================================================\n`;
    content += `RESUME RADAR — CANDIDATE EVALUATION DOSSIER\n`;
    content += `================================================================================\n\n`;

    content += `Candidate Name:     ${candidateName}\n`;
    content += `Target Role:        ${jobTitle}\n`;
    content += `Evaluation Date:    ${dateStr}\n`;
    content += `Overall Fit Status: [ ${statusBadge} ]\n`;
    content += `Deterministic Match Score: ${finalScore}% / 100%\n\n`;

    content += `--------------------------------------------------------------------------------\n`;
    content += `1. EXECUTIVE SCORECARD (TRANSPARENT WEIGHTED BREAKDOWN)\n`;
    content += `--------------------------------------------------------------------------------\n\n`;
    content += `Mathematical Formula:\n`;
    content += `${match.explanationString || 'Deterministic formula calculated from verified criteria.'}\n\n`;

    content += `Dimension Performance:\n`;
    content += `  * Required Skills (Weight 40%):  ${req.score ?? 0} / ${req.max ?? 40} pts (${req.percentage ?? 0}%)\n`;
    content += `  * Preferred Skills (Weight 15%): ${pref.score ?? 0} / ${pref.max ?? 15} pts (${pref.percentage ?? 0}%)\n`;
    content += `  * Experience (Weight 25%):       ${exp.score ?? 0} / ${exp.max ?? 25} pts (${exp.percentage ?? 0}%)\n`;
    content += `  * Education (Weight 10%):        ${edu.score ?? 0} / ${edu.max ?? 10} pts (${edu.percentage ?? 0}%)\n`;
    content += `  * Certifications (Weight 10%):   ${cert.score ?? 0} / ${cert.max ?? 10} pts (${cert.percentage ?? 0}%)\n\n`;

    content += `--------------------------------------------------------------------------------\n`;
    content += `2. SKILL GAP ANALYSIS\n`;
    content += `--------------------------------------------------------------------------------\n\n`;

    content += `Required Skills Met (${req.matched?.length || 0}):\n`;
    if (req.matched && req.matched.length > 0) {
        req.matched.forEach(s => { content += `  [OK] ${s}\n`; });
    } else {
        content += `  None matched\n`;
    }
    content += `\n`;

    content += `Missing Required Skills (${req.missing?.length || 0}):\n`;
    if (req.missing && req.missing.length > 0) {
        req.missing.forEach(s => { content += `  [MISSING] ${s}\n`; });
    } else {
        content += `  None! All mandatory skills evidenced.\n`;
    }
    content += `\n`;

    content += `Preferred / Bonus Skills Met (${pref.matched?.length || 0}):\n`;
    if (pref.matched && pref.matched.length > 0) {
        pref.matched.forEach(s => { content += `  [BONUS] ${s}\n`; });
    } else {
        content += `  No preferred skills matched.\n`;
    }
    content += `\n`;

    content += `--------------------------------------------------------------------------------\n`;
    content += `3. CANDIDATE PROFILE SUMMARY\n`;
    content += `--------------------------------------------------------------------------------\n\n`;
    content += `Contact Info:\n`;
    content += `  * Email:     ${candidate.email || 'Not provided'}\n`;
    content += `  * Phone:     ${candidate.phone || 'Not provided'}\n`;
    content += `  * Location:  ${candidate.location || 'Not provided'}\n`;
    content += `  * LinkedIn:  ${candidate.linkedIn || 'Not provided'}\n`;
    content += `  * Portfolio: ${candidate.portfolio || 'Not provided'}\n\n`;

    content += `Professional Summary:\n`;
    content += `${candidate.summary || 'Summary not provided.'}\n\n`;

    content += `Experience Alignment:\n`;
    content += `  * Candidate Experience: ${candidate.totalYearsExperience ?? 0} years\n`;
    content += `  * Job Requirement:      ${job.minYearsExperience ?? 0} years\n`;
    content += `  * Notes:                ${exp.notes || 'N/A'}\n\n`;

    if (Array.isArray(candidate.experienceHistory) && candidate.experienceHistory.length > 0) {
        content += `Recent Work History:\n`;
        candidate.experienceHistory.slice(0, 3).forEach((h, idx) => {
            content += `  ${idx + 1}. ${h.role || 'Role'} at ${h.company || 'Company'} (${h.duration || 'Duration'})\n`;
            if (Array.isArray(h.highlights)) {
                h.highlights.slice(0, 2).forEach(hl => {
                    content += `     - ${hl}\n`;
                });
            }
        });
        content += `\n`;
    }

    content += `Education Background:\n`;
    if (Array.isArray(candidate.education) && candidate.education.length > 0) {
        candidate.education.forEach(e => {
            content += `  * ${e.degree || 'Degree'} — ${e.institution || 'Institution'} (${e.year || 'Year'})\n`;
        });
    } else {
        content += `  * None listed\n`;
    }
    content += `  * Status: ${edu.notes || 'N/A'}\n\n`;

    content += `--------------------------------------------------------------------------------\n`;
    content += `4. AI QUALITATIVE ASSESSMENT & INTERVIEW PROBE GUIDE\n`;
    content += `--------------------------------------------------------------------------------\n\n`;

    if (aiFeedback.candidateSummary) {
        content += `Executive Assessment:\n`;
        content += `${aiFeedback.candidateSummary}\n\n`;
    }

    if (Array.isArray(aiFeedback.strengths) && aiFeedback.strengths.length > 0) {
        content += `Key Strengths:\n`;
        aiFeedback.strengths.forEach(st => { content += `  [+] ${st}\n`; });
        content += `\n`;
    }

    if (Array.isArray(aiFeedback.gaps) && aiFeedback.gaps.length > 0) {
        content += `Potential Gaps & Risk Factors:\n`;
        aiFeedback.gaps.forEach(gp => { content += `  [-] ${gp}\n`; });
        content += `\n`;
    }

    if (Array.isArray(aiFeedback.interviewQuestions) && aiFeedback.interviewQuestions.length > 0) {
        content += `Targeted Interview Questions:\n`;
        aiFeedback.interviewQuestions.forEach((q, idx) => {
            const questionText = typeof q === 'string' ? q : q.question;
            const rationaleText = q.rationale ? `\n     (Rationale: ${q.rationale})` : '';
            content += `  Q${idx + 1}: "${questionText}"${rationaleText}\n\n`;
        });
    }

    content += `--------------------------------------------------------------------------------\n`;
    content += `5. RECRUITER DECISION & AUDIT TRAIL (HUMAN-IN-THE-LOOP)\n`;
    content += `--------------------------------------------------------------------------------\n\n`;
    content += `[ ] SHORTLIST FOR TECHNICAL INTERVIEW\n`;
    content += `[ ] SCHEDULE HIRING MANAGER SCREEN\n`;
    content += `[ ] PUT ON TALENT POOL HOLD\n`;
    content += `[ ] REJECT WITH CONSTRUCTIVE FEEDBACK\n\n`;
    content += `Recruiter Reviewer: _________________________________\n`;
    content += `Review Date:        _________________________________\n`;
    content += `Notes & Comments:\n`;
    content += `________________________________________________________________________________\n`;
    content += `________________________________________________________________________________\n\n`;
    content += `================================================================================\n`;
    content += `Generated by Resume Radar Recruitment Analytics Engine\n`;
    content += `================================================================================\n`;

    try {
        await docs.documents.batchUpdate({
            documentId: docId,
            requestBody: {
                requests: [
                    {
                        insertText: {
                            location: {
                                index: 1
                            },
                            text: content
                        }
                    }
                ]
            }
        });
        return { success: true, docId };
    } catch (error) {
        console.error('Error inserting recruitment report into document:', error);
        throw new Error(`Failed to write evaluation report to document: ${error.message}`);
    }
}

/**
 * Backward compatibility helper for legacy caller signatures.
 */
async function buildFeedbackText(docId, fileName, feedback) {
    const candidateProfile = {
        fullName: fileName.replace(/\.[^/.]+$/, '').replace(/_/g, ' '),
        summary: feedback.hidden_assumptions || 'Candidate profile'
    };
    const jobCriteria = { jobTitle: 'Position Evaluation' };
    const match = {
        finalScore: (feedback.total_score ? feedback.total_score * 5 : 50),
        explanationString: 'Legacy evaluated feedback converted to Resume Radar format',
        categoryScores: {
            requiredSkills: { score: 20, max: 40, percentage: 50 },
            preferredSkills: { score: 7.5, max: 15, percentage: 50 },
            experience: { score: 15, max: 25, percentage: 60 },
            education: { score: 5, max: 10, percentage: 50 },
            certifications: { score: 5, max: 10, percentage: 50 }
        }
    };
    const aiFeedback = {
        candidateSummary: feedback.alternative_approaches || 'Summary evaluation',
        strengths: feedback.criterion_breakdown?.map(c => `${c.dimension}: ${c.diagnostic}`) || [],
        gaps: feedback.error_analysis?.map(e => `${e.error_name}: ${e.why_incorrect}`) || [],
        interviewQuestions: feedback.actionable_next_step ? [
            {
                question: `Explain how you apply: ${feedback.actionable_next_step.core_principle}`,
                rationale: feedback.actionable_next_step.targeted_practice
            }
        ] : []
    };

    return buildRecruitmentReport(docId, candidateProfile, jobCriteria, match, aiFeedback);
}

module.exports = {
    getAuth,
    getDocsClient,
    getDriveClient,
    createEvaluationDocument,
    buildRecruitmentReport,
    buildFeedbackText,
    parseDocId
};
