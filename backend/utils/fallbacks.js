// ============================================
// Resume Radar — Fallback & Resilience Utilities
//
// Provides safe, well-structured fallback objects
// whenever external APIs (Gemini, Drive, etc.)
// encounter timeouts, quotas, or network issues.
// ============================================

/**
 * Fallback structured candidate profile when AI extraction fails.
 * Attempts basic regex heuristics on the filename and text.
 */
function getFallbackCandidateProfile(fileName = 'Candidate.pdf', rawText = '') {
    // Infer a candidate name from the file name (e.g., "John_Doe_Resume.pdf" -> "John Doe")
    const cleanedName = fileName
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/resume|cv|profile|final/gi, '')
        .trim() || 'Candidate (Review Required)';

    // Basic email extraction heuristic from raw text
    const emailMatch = rawText ? rawText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/) : null;
    const phoneMatch = rawText ? rawText.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/) : null;

    return {
        fullName: cleanedName,
        email: emailMatch ? emailMatch[0] : null,
        phone: phoneMatch ? phoneMatch[0] : null,
        location: null,
        linkedIn: null,
        portfolio: null,
        summary: 'Resume parsed via fallback heuristics. Detailed AI extraction was unavailable; please review the raw resume.',
        totalYearsExperience: 1,
        skills: ['General Professional Skills'],
        education: [
            {
                degree: 'Degree (Unverified)',
                institution: 'See original resume',
                year: null,
                gpa: null
            }
        ],
        experienceHistory: [
            {
                role: 'Professional Experience',
                company: 'See original resume',
                duration: 'N/A',
                durationYears: 1,
                highlights: ['Experience details could not be extracted automatically.']
            }
        ],
        projects: [],
        certifications: [],
        languages: []
    };
}

/**
 * Fallback structured job criteria when AI JD extraction fails.
 */
function getFallbackJobCriteria(rawText = '') {
    return {
        jobTitle: 'Standard Professional Role',
        department: 'General',
        requiredSkills: ['Problem Solving', 'Communication', 'Technical Proficiency'],
        preferredSkills: ['Collaboration', 'Adaptability'],
        minYearsExperience: 1,
        minEducationLevel: "Bachelor's",
        educationField: null,
        certifications: [],
        responsibilities: ['Execute role responsibilities in accordance with team objectives.'],
        keywords: ['teamwork', 'professionalism', 'competence']
    };
}

/**
 * Fallback qualitative candidate feedback when AI generation fails.
 */
function getFallbackCandidateFeedback(candidateProfile = {}, jobCriteria = {}, matchScores = {}) {
    const finalScore = matchScores.finalScore ?? 50;

    let overall = 'Moderate Match';
    if (finalScore >= 80) overall = 'Strong Match';
    else if (finalScore >= 65) overall = 'Good Match';
    else if (finalScore < 50) overall = 'Weak Match';

    return {
        candidateSummary: `Candidate evaluated under system resilience mode. Deterministic match calculated at ${finalScore}%. Manual recruiter inspection is recommended.`,
        strengths: [
            'Baseline requirements reviewed against deterministic criteria',
            'Candidate credentials documented in application package'
        ],
        gaps: [
            'In-depth qualitative AI analysis temporarily unavailable',
            'Specific domain alignments require manual verification'
        ],
        improvementSuggestions: [
            'Conduct preliminary phone screening to verify core technical stack alignment',
            'Request portfolio or code sample if applicable'
        ],
        interviewQuestions: [
            {
                question: 'Can you walk us through the most impactful project you led recently?',
                rationale: 'Verify depth of experience and problem-solving process.'
            },
            {
                question: 'How do you handle technical challenges when working with unfamiliar tools?',
                rationale: 'Assess learning agility and adaptability.'
            },
            {
                question: 'What are your core expectations for this role and team?',
                rationale: 'Confirm role alignment and cultural fit.'
            }
        ],
        overallAssessment: overall,
        riskFactors: ['Requires manual verification due to fallback mode.']
    };
}

/**
 * Legacy assignment feedback fallback (retained for backward compatibility).
 */
function getFallbackFeedback() {
    return {
        total_score: 10,
        criterion_breakdown: [
            {
                dimension: 'General Evaluation',
                score: 3,
                diagnostic: 'Parsed via system fallback. Manual review recommended.'
            }
        ],
        error_analysis: [
            {
                error_name: 'AI Extraction Fallback',
                what_was_written: 'N/A',
                why_incorrect: 'System operated in resilient fallback mode.',
                correction: 'Please review candidate profile manually.'
            }
        ],
        hidden_assumptions: 'None identified due to system fallback.',
        alternative_approaches: 'None identified due to system fallback.',
        actionable_next_step: {
            core_principle: 'Manual Review',
            targeted_practice: 'Consult the original candidate document.'
        }
    };
}

module.exports = {
    getFallbackCandidateProfile,
    getFallbackJobCriteria,
    getFallbackCandidateFeedback,
    getFallbackFeedback
};
