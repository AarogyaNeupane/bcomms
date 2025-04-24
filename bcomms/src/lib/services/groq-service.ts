import type { Scenario } from "~/components/ui/scenario-dropdown";

export interface FeedbackResponse {
  strengths: string[];
  improvements: string[];
  overallFeedback: string;
}

/**
 * Service for interacting with the server API to get feedback on user responses
 */
export class GroqService {
  /**
   * Analyze a user's spoken response using the server API
   */
  async analyzeSpeakingResponse(
    scenario: Scenario,
    transcription: string
  ): Promise<FeedbackResponse> {
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scenario,
          transcription
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Feedback API error (${response.status}): ${errorText}`);
      }
      
      const feedbackContent = await response.json() as FeedbackResponse;
      
      return {
        strengths: feedbackContent.strengths || [],
        improvements: feedbackContent.improvements || [],
        overallFeedback: feedbackContent.overallFeedback || 'No feedback available'
      };
    } catch (error) {
      console.error('Error analyzing speaking response:', error);
      throw new Error(`Failed to analyze speaking response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 