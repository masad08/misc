import validateToken from './validateToken';
import OpenAI from 'openai';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send({ message: 'Only POST requests allowed' });
    }

    try {
        // Validate the token
        await validateToken(req.headers.authorization);
    } catch (error) {
        return res.status(403).send({ message: 'Invalid or expired token', error: error.toString() });
    }

    const { selectedScenario, feedbackText } = req.body;

    const selectedScenarioScore = `Title: ${selectedScenario.title}
        What Happened: ${selectedScenario.what_happened}
        Description: ${selectedScenario.description}
        Root Cause(s): ${selectedScenario["root_cause(s)"]}
        Contributing Factors: ${selectedScenario.contributing_factors.join(", ")}
        Recommendations: ${selectedScenario.recommendations.map(recommendation => `${recommendation.action}: ${recommendation.description}`).join("; ")}`;

    const feedbackTextScore = feedbackText.split('\n').map((item, index) => `Feedback ${index + 1}: ${item}`).join('\n');

    const instructionsScore = `You are an assessor for the user's effort in the last interactions for a simulated medical incident case investigation based on the user asking the right question and right flow.
        The feedback is based on defining the problem, gathering data, identifying contributing factors, finding root causes, and giving recommendations.
        Feedback is a continuous spectrum. So add on the previous feedback but briefly.
        Case Details:
        ${selectedScenarioScore}
        You will use the template below to score this feedback using numerical values only.
        The maximum score for each point is 10 out of 10, where 10 is perfect and complete, while 0 indicates none of the steps were addressed:
        {
            "RCAStepsFeedback": {
                "definingTheProblem": {
                    "Score": "",
                },
                "gatheringData": {
                    "Score": "",
                },
                "identifyingContributingFactors": {
                    "Score": "",
                },
                "findingRootCauses": {
                    "Score": "",
                },
                "givingRecommendations": {
                    "Score": "",
                }
            }
        }`;

    try {
        const messages = [
            { "role": "system", "content": instructionsScore },
            { "role": "user", "content": `Based on the above case details and user interaction, we got this feedback: ${feedbackTextScore}` }
        ];
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo-0125",
            messages: messages,
            max_tokens: 409
        });
        // Process response...
    } catch (error) {
        return res.status(500).send({ message: 'Error processing request', error: error.toString() });
    }
};
