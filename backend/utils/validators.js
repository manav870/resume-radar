// ============================================
// Resume Radar — Validation & Sanitization Helpers
// ============================================

/**
 * Validate and sanitize job criteria payload.
 */
function sanitizeJobCriteria(criteria = {}) {
    return {
        jobTitle: typeof criteria.jobTitle === 'string' && criteria.jobTitle.trim()
            ? criteria.jobTitle.trim()
            : 'Target Position',
        department: typeof criteria.department === 'string' && criteria.department.trim()
            ? criteria.department.trim()
            : 'General',
        requiredSkills: Array.isArray(criteria.requiredSkills)
            ? criteria.requiredSkills.filter(s => typeof s === 'string' && s.trim()).map(s => s.trim())
            : [],
        preferredSkills: Array.isArray(criteria.preferredSkills)
            ? criteria.preferredSkills.filter(s => typeof s === 'string' && s.trim()).map(s => s.trim())
            : [],
        minYearsExperience: Math.max(0, Number(criteria.minYearsExperience) || 0),
        minEducationLevel: typeof criteria.minEducationLevel === 'string' && criteria.minEducationLevel.trim()
            ? criteria.minEducationLevel.trim()
            : null,
        educationField: typeof criteria.educationField === 'string' && criteria.educationField.trim()
            ? criteria.educationField.trim()
            : null,
        certifications: Array.isArray(criteria.certifications)
            ? criteria.certifications.filter(c => typeof c === 'string' && c.trim()).map(c => c.trim())
            : [],
        responsibilities: Array.isArray(criteria.responsibilities)
            ? criteria.responsibilities.filter(r => typeof r === 'string' && r.trim()).map(r => r.trim())
            : [],
        keywords: Array.isArray(criteria.keywords)
            ? criteria.keywords.filter(k => typeof k === 'string' && k.trim()).map(k => k.trim())
            : []
    };
}

/**
 * Validate review status update for human-in-the-loop decisions.
 */
const VALID_REVIEW_STATUSES = ['unreviewed', 'shortlisted', 'rejected', 'interview_scheduled', 'hold'];

function isValidReviewStatus(status) {
    return typeof status === 'string' && VALID_REVIEW_STATUSES.includes(status.toLowerCase());
}

/**
 * Clamps numeric score between min and max.
 */
function clampScore(score, min = 1, max = 5) {
    let s = Number(score);
    if (isNaN(s)) return min;
    if (s < min) return min;
    if (s > max) return max;
    return s;
}

/**
 * Legacy validator retained for backwards compatibility.
 */
function validateAndSanitizeGeminiJSON(json) {
    if (!json || typeof json !== 'object') return {};
    const defaultScores = { clarity: 3, accuracy: 3, completeness: 3, creativity: 3 };
    
    if (!json.scores) {
        json.scores = defaultScores;
    } else {
        json.scores.clarity = clampScore(json.scores.clarity);
        json.scores.accuracy = clampScore(json.scores.accuracy);
        json.scores.completeness = clampScore(json.scores.completeness);
        json.scores.creativity = clampScore(json.scores.creativity);
    }
    
    if (!json.overall_score || isNaN(json.overall_score)) {
        json.overall_score = json.scores.clarity + json.scores.accuracy + json.scores.completeness + json.scores.creativity;
    }
    
    if (!Array.isArray(json.strengths)) {
        json.strengths = ['Good candidate alignment.'];
    }
    if (!Array.isArray(json.improvements)) {
        json.improvements = ['Review specific skill requirements.'];
    }
    if (!json.final_comment) {
        json.final_comment = 'Assessment completed.';
    }
    
    return json;
}

module.exports = {
    sanitizeJobCriteria,
    isValidReviewStatus,
    VALID_REVIEW_STATUSES,
    clampScore,
    validateAndSanitizeGeminiJSON
};
