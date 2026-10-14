// ============================================
// Resume Radar — Transparent Weighted Scoring Engine
//
// Computes a fully explainable, deterministic match
// score between a candidate profile and job criteria.
// Every component of the final score is visible and
// auditable — zero opaque AI "black-box" numbers.
//
// Formula:
// Final Score = (W_req * S_req) + (W_pref * S_pref) +
//               (W_exp * S_exp) + (W_edu * S_edu) +
//               (W_cert * S_cert)
//
// Default Weights:
//   Required Skills  = 40% (W_req = 0.40)
//   Preferred Skills = 15% (W_pref = 0.15)
//   Experience       = 25% (W_exp = 0.25)
//   Education        = 10% (W_edu = 0.10)
//   Certifications   = 10% (W_cert = 0.10)
// ============================================

const DEFAULT_WEIGHTS = {
    requiredSkills: 0.40,
    preferredSkills: 0.15,
    experience: 0.25,
    education: 0.10,
    certifications: 0.10
};

// ── Education level hierarchy for deterministic comparison ──
const EDUCATION_LEVELS = {
    'high school': 1,
    'secondary': 1,
    'diploma': 2,
    'associate': 2,
    'associates': 2,
    'bachelor': 3,
    "bachelor's": 3,
    'bachelors': 3,
    'b.tech': 3,
    'btech': 3,
    'b.e.': 3,
    'be': 3,
    'b.sc': 3,
    'bsc': 3,
    'b.s.': 3,
    'bs': 3,
    'bca': 3,
    'bba': 3,
    'b.com': 3,
    'bcom': 3,
    'master': 4,
    "master's": 4,
    'masters': 4,
    'm.tech': 4,
    'mtech': 4,
    'm.e.': 4,
    'me': 4,
    'm.sc': 4,
    'msc': 4,
    'm.s.': 4,
    'ms': 4,
    'mca': 4,
    'mba': 4,
    'phd': 5,
    'ph.d': 5,
    'ph.d.': 5,
    'doctorate': 5,
    'doctoral': 5
};

// Common technology aliases dictionary for semantic matching
const SKILL_ALIASES = {
    'js': 'javascript',
    'javascript': 'javascript',
    'ts': 'typescript',
    'typescript': 'typescript',
    'py': 'python',
    'python': 'python',
    'react': 'react',
    'react.js': 'react',
    'reactjs': 'react',
    'node': 'node.js',
    'node.js': 'node.js',
    'nodejs': 'node.js',
    'vue': 'vue',
    'vue.js': 'vue',
    'vuejs': 'vue',
    'angular': 'angular',
    'angular.js': 'angular',
    'angularjs': 'angular',
    'mongo': 'mongodb',
    'mongodb': 'mongodb',
    'postgres': 'postgresql',
    'postgresql': 'postgresql',
    'k8s': 'kubernetes',
    'kubernetes': 'kubernetes',
    'docker': 'docker',
    'aws': 'amazon web services',
    'amazon web services': 'amazon web services',
    'gcp': 'google cloud platform',
    'google cloud': 'google cloud platform',
    'google cloud platform': 'google cloud platform',
    'azure': 'microsoft azure',
    'microsoft azure': 'microsoft azure',
    'rest': 'restful api',
    'rest api': 'restful api',
    'restful api': 'restful api',
    'graphql': 'graphql',
    'gql': 'graphql',
    'html': 'html5',
    'html5': 'html5',
    'css': 'css3',
    'css3': 'css3',
    'ci/cd': 'ci cd',
    'cicd': 'ci cd',
    'ml': 'machine learning',
    'machine learning': 'machine learning',
    'ai': 'artificial intelligence',
    'artificial intelligence': 'artificial intelligence',
    'nlp': 'natural language processing',
    'dl': 'deep learning',
    'deep learning': 'deep learning',
    'golang': 'go',
    'c++': 'cpp',
    'c#': 'csharp'
};

/**
 * Clean & normalize a string for fuzzy comparison.
 */
function normalizeString(str) {
    if (!str || typeof str !== 'string') return '';
    return str
        .toLowerCase()
        .replace(/[^a-z0-9+#.\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Canonicalize a skill string using alias mapping if available.
 */
function canonicalizeSkill(skill) {
    const norm = normalizeString(skill);
    return SKILL_ALIASES[norm] || norm;
}

/**
 * Check if a candidate skill matches a job skill.
 * Checks: exact match, alias match, substring match, word overlap.
 */
function skillMatches(candidateSkill, jobSkill) {
    const cNorm = normalizeString(candidateSkill);
    const jNorm = normalizeString(jobSkill);

    if (!cNorm || !jNorm) return false;
    if (cNorm === jNorm) return true;

    const cCanon = canonicalizeSkill(cNorm);
    const jCanon = canonicalizeSkill(jNorm);
    if (cCanon === jCanon) return true;

    // Substring checks on canonicalized and normalized values
    if (cCanon.includes(jCanon) || jCanon.includes(cCanon)) return true;
    if (cNorm.includes(jNorm) || jNorm.includes(cNorm)) return true;

    // Word-level overlap (e.g. "React Native Developer" matches "React Native")
    const cTokens = cCanon.split(' ').filter(t => t.length > 2);
    const jTokens = jCanon.split(' ').filter(t => t.length > 2);
    if (jTokens.length > 0 && jTokens.every(tok => cTokens.includes(tok))) {
        return true;
    }

    return false;
}

/**
 * Determine highest education level number from candidate education array.
 */
function getCandidateEducationLevel(educationList) {
    if (!Array.isArray(educationList) || educationList.length === 0) return 0;

    let highestLevel = 0;
    let highestDegree = '';

    for (const edu of educationList) {
        const degreeStr = normalizeString(edu.degree || '');
        for (const [key, level] of Object.entries(EDUCATION_LEVELS)) {
            if (degreeStr.includes(key)) {
                if (level > highestLevel) {
                    highestLevel = level;
                    highestDegree = edu.degree;
                }
            }
        }
    }

    return { level: highestLevel, degree: highestDegree || (educationList[0]?.degree || 'Unspecified') };
}

/**
 * Determine required education level number from job requirements.
 */
function getJobEducationLevel(minEducationLevel) {
    if (!minEducationLevel) return 0;
    const norm = normalizeString(minEducationLevel);

    for (const [key, level] of Object.entries(EDUCATION_LEVELS)) {
        if (norm.includes(key)) {
            return level;
        }
    }
    return 0;
}

/**
 * Collect all candidate skill contexts (skills list, project tech, history highlights)
 * to ensure we don't miss skills that appear in projects or work history.
 */
function extractAllCandidateSkillEvidence(candidateProfile) {
    const skillPool = new Set();

    if (Array.isArray(candidateProfile.skills)) {
        candidateProfile.skills.forEach(s => skillPool.add(s));
    }

    if (Array.isArray(candidateProfile.projects)) {
        candidateProfile.projects.forEach(p => {
            if (Array.isArray(p.technologies)) {
                p.technologies.forEach(t => skillPool.add(t));
            }
        });
    }

    if (Array.isArray(candidateProfile.experienceHistory)) {
        candidateProfile.experienceHistory.forEach(exp => {
            if (exp.role) skillPool.add(exp.role);
            if (Array.isArray(exp.highlights)) {
                exp.highlights.forEach(h => {
                    // Extract common tech words if found
                    for (const aliasKey of Object.keys(SKILL_ALIASES)) {
                        const regex = new RegExp(`\\b${aliasKey}\\b`, 'i');
                        if (regex.test(h)) skillPool.add(aliasKey);
                    }
                });
            }
        });
    }

    return Array.from(skillPool);
}

/**
 * Evaluate skills list against candidate skill pool.
 */
function evaluateSkillGroup(requiredList, candidateSkillPool) {
    const matched = [];
    const missing = [];

    if (!Array.isArray(requiredList) || requiredList.length === 0) {
        return { matched, missing, ratio: 1.0 };
    }

    for (const reqSkill of requiredList) {
        const isMatched = candidateSkillPool.some(cSkill => skillMatches(cSkill, reqSkill));
        if (isMatched) {
            matched.push(reqSkill);
        } else {
            missing.push(reqSkill);
        }
    }

    const ratio = matched.length / requiredList.length;
    return { matched, missing, ratio };
}

/**
 * Core Deterministic Weighted Scoring Engine.
 *
 * @param {Object} candidateProfile - Parsed candidate profile JSON.
 * @param {Object} jobCriteria - Parsed job requirements JSON.
 * @param {Object} [customWeights] - Optional custom weights overriding default weights.
 * @returns {Object} Comprehensive, explainable score breakdown.
 */
function computeMatchScore(candidateProfile = {}, jobCriteria = {}, customWeights = {}) {
    const weights = {
        requiredSkills: Number(customWeights.requiredSkills ?? DEFAULT_WEIGHTS.requiredSkills),
        preferredSkills: Number(customWeights.preferredSkills ?? DEFAULT_WEIGHTS.preferredSkills),
        experience: Number(customWeights.experience ?? DEFAULT_WEIGHTS.experience),
        education: Number(customWeights.education ?? DEFAULT_WEIGHTS.education),
        certifications: Number(customWeights.certifications ?? DEFAULT_WEIGHTS.certifications)
    };

    // Normalize weights to sum to 1.0 if customized
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    if (Math.abs(totalWeight - 1.0) > 0.001 && totalWeight > 0) {
        for (const k of Object.keys(weights)) {
            weights[k] = weights[k] / totalWeight;
        }
    }

    const maxPts = {
        requiredSkills: Math.round(weights.requiredSkills * 100 * 10) / 10,
        preferredSkills: Math.round(weights.preferredSkills * 100 * 10) / 10,
        experience: Math.round(weights.experience * 100 * 10) / 10,
        education: Math.round(weights.education * 100 * 10) / 10,
        certifications: Math.round(weights.certifications * 100 * 10) / 10
    };

    const candidateSkillPool = extractAllCandidateSkillEvidence(candidateProfile);

    // ── 1. Required Skills (Default 40%) ──
    const reqJobSkills = Array.isArray(jobCriteria.requiredSkills) ? jobCriteria.requiredSkills : [];
    const reqEvaluation = evaluateSkillGroup(reqJobSkills, candidateSkillPool);
    const reqScore = Math.round(reqEvaluation.ratio * maxPts.requiredSkills * 10) / 10;

    // ── 2. Preferred Skills (Default 15%) ──
    const prefJobSkills = Array.isArray(jobCriteria.preferredSkills) ? jobCriteria.preferredSkills : [];
    let prefEvaluation;
    let prefScore;
    if (prefJobSkills.length === 0) {
        // If job specifies no preferred skills, candidate gets full points if they have any skills
        const hasSkills = candidateSkillPool.length > reqEvaluation.matched.length;
        const ratio = hasSkills ? 1.0 : 0.8;
        prefEvaluation = { matched: [], missing: [], ratio };
        prefScore = Math.round(ratio * maxPts.preferredSkills * 10) / 10;
    } else {
        prefEvaluation = evaluateSkillGroup(prefJobSkills, candidateSkillPool);
        prefScore = Math.round(prefEvaluation.ratio * maxPts.preferredSkills * 10) / 10;
    }

    // ── 3. Experience Match (Default 25%) ──
    const reqExp = Number(jobCriteria.minYearsExperience) || 0;
    const candExp = Number(candidateProfile.totalYearsExperience) || 0;
    let expRatio = 1.0;
    let expNotes = 'Meets experience requirement';

    if (reqExp > 0) {
        if (candExp >= reqExp) {
            expRatio = 1.0;
            expNotes = `Meets or exceeds required experience (${candExp} yrs vs ${reqExp} yrs required)`;
        } else {
            // Proportional score
            expRatio = Math.max(0, Math.min(1.0, candExp / reqExp));
            expNotes = `Below required experience (${candExp} yrs vs ${reqExp} yrs required)`;
        }
    } else {
        expNotes = `No minimum experience specified; candidate has ${candExp} yrs`;
    }
    const expScore = Math.round(expRatio * maxPts.experience * 10) / 10;

    // ── 4. Education Match (Default 10%) ──
    const reqEduLevel = getJobEducationLevel(jobCriteria.minEducationLevel);
    const candEdu = getCandidateEducationLevel(candidateProfile.education);
    let eduRatio = 1.0;
    let eduNotes = 'Education meets or exceeds requirements';

    if (reqEduLevel > 0) {
        if (candEdu.level >= reqEduLevel) {
            eduRatio = 1.0;
            eduNotes = `Candidate degree (${candEdu.degree || 'Degree'}) meets or exceeds requirement (${jobCriteria.minEducationLevel})`;
        } else if (candEdu.level === reqEduLevel - 1) {
            eduRatio = 0.75;
            eduNotes = `Candidate degree (${candEdu.degree || 'Degree'}) is adjacent to requirement (${jobCriteria.minEducationLevel})`;
        } else if (candEdu.level > 0) {
            eduRatio = 0.50;
            eduNotes = `Candidate degree (${candEdu.degree || 'Degree'}) is below requirement (${jobCriteria.minEducationLevel})`;
        } else {
            eduRatio = 0.25;
            eduNotes = `No matching degree found; required: ${jobCriteria.minEducationLevel}`;
        }
    } else {
        // No education requirement specified in JD
        eduRatio = candEdu.level > 0 ? 1.0 : 0.8;
        eduNotes = candEdu.level > 0
            ? `Candidate has ${candEdu.degree || 'relevant education'}`
            : 'No education requirement specified';
    }
    const eduScore = Math.round(eduRatio * maxPts.education * 10) / 10;

    // ── 5. Certifications / Projects (Default 10%) ──
    const reqCerts = Array.isArray(jobCriteria.certifications) ? jobCriteria.certifications : [];
    const candCerts = Array.isArray(candidateProfile.certifications) ? candidateProfile.certifications : [];
    let certRatio = 0.5;
    let certNotes = '';

    if (reqCerts.length > 0) {
        const certEvaluation = evaluateSkillGroup(reqCerts, candCerts);
        certRatio = certEvaluation.ratio;
        certNotes = `${certEvaluation.matched.length}/${reqCerts.length} required certifications matched`;
    } else {
        // Job didn't specify certifications; reward verified certs or strong portfolio/projects
        const hasCerts = candCerts.length > 0;
        const hasProjects = Array.isArray(candidateProfile.projects) && candidateProfile.projects.length > 0;
        if (hasCerts && hasProjects) {
            certRatio = 1.0;
            certNotes = `Has ${candCerts.length} certification(s) and ${candidateProfile.projects.length} project(s)`;
        } else if (hasCerts || hasProjects) {
            certRatio = 0.85;
            certNotes = hasCerts ? `Has ${candCerts.length} certification(s)` : `Has ${candidateProfile.projects.length} project(s)`;
        } else {
            certRatio = 0.60;
            certNotes = 'No certifications or projects listed';
        }
    }
    const certScore = Math.round(certRatio * maxPts.certifications * 10) / 10;

    // ── Total Final Score (0 - 100%) ──
    const rawTotal = reqScore + prefScore + expScore + eduScore + certScore;
    const finalScore = Math.min(100, Math.max(0, Math.round(rawTotal * 10) / 10));

    // Formatted explainable formula string
    const explanationString = `Match Score: ${finalScore}% = (${reqScore}/${maxPts.requiredSkills} on Required Skills) + (${prefScore}/${maxPts.preferredSkills} on Preferred Skills) + (${expScore}/${maxPts.experience} on Experience) + (${eduScore}/${maxPts.education} on Education) + (${certScore}/${maxPts.certifications} on Certifications)`;

    return {
        finalScore,
        categoryScores: {
            requiredSkills: {
                score: reqScore,
                max: maxPts.requiredSkills,
                percentage: Math.round(reqEvaluation.ratio * 100),
                weight: weights.requiredSkills,
                matched: reqEvaluation.matched,
                missing: reqEvaluation.missing
            },
            preferredSkills: {
                score: prefScore,
                max: maxPts.preferredSkills,
                percentage: Math.round((prefEvaluation?.ratio || 0) * 100),
                weight: weights.preferredSkills,
                matched: prefEvaluation?.matched || [],
                missing: prefEvaluation?.missing || []
            },
            experience: {
                score: expScore,
                max: maxPts.experience,
                percentage: Math.round(expRatio * 100),
                weight: weights.experience,
                candidateYears: candExp,
                requiredYears: reqExp,
                notes: expNotes
            },
            education: {
                score: eduScore,
                max: maxPts.education,
                percentage: Math.round(eduRatio * 100),
                weight: weights.education,
                candidateDegree: candEdu.degree,
                candidateLevel: candEdu.level,
                requiredLevel: jobCriteria.minEducationLevel || 'Not specified',
                notes: eduNotes
            },
            certifications: {
                score: certScore,
                max: maxPts.certifications,
                percentage: Math.round(certRatio * 100),
                weight: weights.certifications,
                candidateCount: candCerts.length,
                notes: certNotes
            }
        },
        weightsUsed: weights,
        explanationString,
        matchedRequiredSkills: reqEvaluation.matched,
        missingRequiredSkills: reqEvaluation.missing,
        matchedPreferredSkills: prefEvaluation?.matched || [],
        missingPreferredSkills: prefEvaluation?.missing || []
    };
}

/**
 * Score a batch of candidates against a single job description.
 */
function batchScoreCandidates(candidates = [], jobCriteria = {}, customWeights = {}) {
    return candidates.map(candidate => {
        const evaluation = computeMatchScore(candidate.parsedData || candidate, jobCriteria, customWeights);
        return {
            ...candidate,
            matchEvaluation: evaluation
        };
    });
}

/**
 * Rank candidates by final score descending.
 */
function rankCandidates(scoredCandidates = []) {
    return [...scoredCandidates].sort((a, b) => {
        const scoreA = a.matchEvaluation?.finalScore ?? a.finalScore ?? 0;
        const scoreB = b.matchEvaluation?.finalScore ?? b.finalScore ?? 0;
        return scoreB - scoreA;
    });
}

module.exports = {
    DEFAULT_WEIGHTS,
    EDUCATION_LEVELS,
    SKILL_ALIASES,
    computeMatchScore,
    batchScoreCandidates,
    rankCandidates,
    normalizeString,
    canonicalizeSkill,
    skillMatches
};
