function getFallbackFeedback() {
    return {
        total_score: 10,
        criterion_breakdown: [
            {
                dimension: "General Formatting",
                score: 3,
                diagnostic: "Unable to parse with AI. This is a generic fallback evaluation."
            }
        ],
        error_analysis: [
            {
                error_name: "AI Generation Error",
                what_was_written: "N/A",
                why_incorrect: "The automated grading system was temporarily unavailable.",
                correction: "Please review manually."
            }
        ],
        hidden_assumptions: "None identified due to system fallback.",
        alternative_approaches: "None identified due to system fallback.",
        actionable_next_step: {
            core_principle: "Manual Review Required",
            targeted_practice: "Please consult with the instructor for manual grading."
        }
    };
}

module.exports = {
    getFallbackFeedback
};
