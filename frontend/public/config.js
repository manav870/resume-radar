// ============================================
// Resume Radar — Frontend Configuration
// ============================================

// When hosted, automatically resolves to current origin, or falls back to port 8080.
const BACKEND_URL = (typeof window !== 'undefined' && window.location.protocol.startsWith('http'))
    ? window.location.origin
    : 'http://localhost:8080';

const APP_CONFIG = {
    appName: 'Resume Radar',
    version: '1.0.0',
    apiBase: BACKEND_URL,
    defaultWeights: {
        requiredSkills: 0.40,
        preferredSkills: 0.15,
        experience: 0.25,
        education: 0.10,
        certifications: 0.10
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BACKEND_URL, APP_CONFIG };
}
