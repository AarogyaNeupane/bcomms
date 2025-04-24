import { NextResponse } from 'next/server';
import { env } from '~/env';
import type { Scenario } from '~/components/ui/scenario-dropdown';
import type { FeedbackResponse } from '~/lib/services/groq-service';

// Groq API endpoints
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Generate a prompt for the Groq LLM based on the scenario and user's response
function generatePrompt(scenario: Scenario, transcription: string): string {
  return `
You are a helpful English language speaking coach. You're analyzing a response to the following scenario:

Scenario: ${scenario.description}
Speaking task: ${scenario.prompt}

The user's spoken response (transcribed): "${transcription}"

Please provide specific, constructive feedback on the user's response. Include:

1. What aspects of the response were effective and why.
2. What could be improved and how specifically they should improve it.
3. A brief overall assessment of the response's effectiveness in the given scenario.

Format your response as JSON with the following structure:
{
  "strengths": ["strength point 1", "strength point 2", ...],
  "improvements": ["improvement point 1", "improvement point 2", ...],
  "overallFeedback": "A concise overall assessment"
}

Make sure each point is specific, actionable, and relevant to the scenario. Keep your response focused on language usage, clarity, politeness, and appropriateness for the situation. Don't invent details that weren't in the user's response.
`;
}

export async function POST(request: Request) {
  try {
    const { scenario, transcription } = await request.json();
    
    // Check if Groq API key is available
    if (!env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'Groq API key is not configured' },
        { status: 500 }
      );
    }

    // Generate prompt for the LLM
    const prompt = generatePrompt(scenario, transcription);
    
    // Call Groq API
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [
          { role: 'system', content: 'You are a helpful English language speaking coach that provides specific, actionable feedback.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.5,
        response_format: { type: 'json_object' }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error (${response.status}): ${errorText}`);
    }
    
    const data = await response.json();
    
    // Parse the response content as JSON
    const feedbackContent = JSON.parse(data.choices[0].message.content) as FeedbackResponse;
    
    return NextResponse.json({
      strengths: feedbackContent.strengths || [],
      improvements: feedbackContent.improvements || [],
      overallFeedback: feedbackContent.overallFeedback || 'No feedback available'
    });
  } catch (error) {
    console.error('Error in feedback API route:', error);
    return NextResponse.json(
      { error: 'Failed to analyze speaking response' },
      { status: 500 }
    );
  }
} 