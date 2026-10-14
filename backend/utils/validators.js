function clampScore(score) {
    let s = Number(score);
    if (isNaN(s)) return 3;
    if (s < 1) return 1;
    if (s > 5) return 5;
    return s;
}

function validateAndSanitizeGeminiJSON(json) {
    const defaultScores = { clarity: 3, accuracy: 3, completeness: 3, creativity: 3 };
    
    // Ensure scores object exists
    if (!json.scores) {
        json.scores = defaultScores;
    } else {
        json.scores.clarity = clampScore(json.scores.clarity);
        json.scores.accuracy = clampScore(json.scores.accuracy);
        json.scores.completeness = clampScore(json.scores.completeness);
        json.scores.creativity = clampScore(json.scores.creativity);
    }
    
    // Calculate overall score if missing or invalid
    if (!json.overall_score || isNaN(json.overall_score)) {
        json.overall_score = json.scores.clarity + json.scores.accuracy + json.scores.completeness + json.scores.creativity;
    }
    
    // Ensure arrays exist
    if (!Array.isArray(json.strengths)) {
        json.strengths = ['Good effort on the assignment.'];
    }
    if (!Array.isArray(json.improvements)) {
        json.improvements = ['Review the core concepts for better understanding.'];
    }
    
    // Ensure final comment exists
    if (!json.final_comment) {
        json.final_comment = 'Keep up the good work and continue practicing!';
    }
    
    return json;
}

module.exports = {
    validateAndSanitizeGeminiJSON,
    clampScore
};
