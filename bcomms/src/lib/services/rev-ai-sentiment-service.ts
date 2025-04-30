// Define types for the Rev.ai Sentiment Analysis API responses
export interface SentimentMessage {
  content: string;
  score: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  ts?: number;
  end_ts?: number;
}

export interface SentimentAnalysisResult {
  messages: SentimentMessage[];
}

export interface SentimentAnalysisJob {
  id: string;
  status: 'in_progress' | 'completed' | 'failed';
  created_on: string;
  completed_on?: string;
  word_count?: number;
  type: 'sentiment_analysis';
}

export interface SentimentSummary {
  overall: 'positive' | 'negative' | 'neutral';
  score: number;
  details: SentimentMessage[];
}

interface RevAiSentimentServiceOptions {
  onError?: (error: Error) => void;
}

/**
 * Service for handling Rev.ai sentiment analysis
 */
export class RevAiSentimentService {
  private options: RevAiSentimentServiceOptions;
  
  constructor(options: RevAiSentimentServiceOptions = {}) {
    this.options = options;
  }

  /**
   * Submit text for sentiment analysis
   * @param text The text to analyze
   * @returns A promise that resolves to the job ID
   */
  async submitTranscriptionForAnalysis(text: string): Promise<string> {
    try {
      console.log('Submitting text for sentiment analysis...');
      console.log('Text to analyze:', text);
      
      const response = await fetch('/api/sentiment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'submit',
          text: text
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('API submission response not OK:', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody
        });
        throw new Error(`Failed to submit for sentiment analysis: ${response.statusText}. Details: ${errorBody}`);
      }

      const responseData = await response.json();
      console.log('Sentiment analysis job submitted:', responseData.id);
      
      return responseData.id;
    } catch (error) {
      console.error('Error submitting text for sentiment analysis:', error);
      if (this.options.onError) {
        this.options.onError(new Error(`Failed to submit for sentiment analysis: ${error instanceof Error ? error.message : String(error)}`));
      }
      throw error;
    }
  }

  /**
   * Check the status of a sentiment analysis job
   * @param jobId The ID of the job to check
   * @returns A promise that resolves to the job status
   */
  async getJobStatus(jobId: string): Promise<SentimentAnalysisJob> {
    try {
      console.log(`Checking status of sentiment analysis job: ${jobId}`);
      
      const response = await fetch('/api/sentiment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'status',
          jobId: jobId
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('API status check response not OK:', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody
        });
        throw new Error(`Failed to check sentiment analysis status: ${response.statusText}. Details: ${errorBody}`);
      }

      const jobStatus = await response.json() as SentimentAnalysisJob;
      console.log(`Sentiment analysis job status: ${jobStatus.status}`);
      
      return jobStatus;
    } catch (error) {
      console.error('Error checking sentiment analysis job status:', error);
      if (this.options.onError) {
        this.options.onError(new Error(`Failed to check sentiment analysis status: ${error instanceof Error ? error.message : String(error)}`));
      }
      throw error;
    }
  }

  /**
   * Get the results of a completed sentiment analysis job
   * @param jobId The ID of the completed job
   * @returns A promise that resolves to the sentiment analysis results
   */
  async getSentimentResults(jobId: string): Promise<SentimentAnalysisResult> {
    try {
      console.log(`Getting results for sentiment analysis job: ${jobId}`);
      
      const response = await fetch('/api/sentiment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'result',
          jobId: jobId
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('API results response not OK:', {
          status: response.status,
          statusText: response.statusText,
          body: errorBody
        });
        throw new Error(`Failed to get sentiment analysis results: ${response.statusText}. Details: ${errorBody}`);
      }

      const results = await response.json() as SentimentAnalysisResult;
      console.log(`Sentiment analysis results received with ${results.messages.length} messages`);
      
      return results;
    } catch (error) {
      console.error('Error getting sentiment analysis results:', error);
      if (this.options.onError) {
        this.options.onError(new Error(`Failed to get sentiment analysis results: ${error instanceof Error ? error.message : String(error)}`));
      }
      throw error;
    }
  }

  /**
   * Wait for a sentiment analysis job to complete and get the results
   * @param jobId The ID of the job to wait for
   * @param maxAttempts Maximum number of polling attempts
   * @param initialDelay Initial delay in milliseconds
   * @param maxDelay Maximum delay in milliseconds
   * @returns A promise that resolves to the sentiment analysis results
   */
  async waitForJobCompletion(
    jobId: string, 
    maxAttempts: number = 30, 
    initialDelay: number = 1000, 
    maxDelay: number = 10000
  ): Promise<SentimentAnalysisResult> {
    let attempts = 0;
    let delay = initialDelay;

    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        const jobStatus = await this.getJobStatus(jobId);
        
        if (jobStatus.status === 'completed') {
          return await this.getSentimentResults(jobId);
        } else if (jobStatus.status === 'failed') {
          throw new Error(`Sentiment analysis job failed: ${jobId}`);
        }
        
        // Exponential backoff with jitter
        delay = Math.min(delay * 1.5, maxDelay);
        delay = delay * (0.9 + Math.random() * 0.2); // Add 10% jitter
        
        console.log(`Job still in progress. Waiting ${Math.round(delay)}ms before next check (attempt ${attempts}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } catch (error) {
        console.error(`Error during polling attempt ${attempts}:`, error);
        
        // If we've reached max attempts, throw the error
        if (attempts >= maxAttempts) {
          throw error;
        }
        
        // Otherwise, wait and try again
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error(`Sentiment analysis job did not complete after ${maxAttempts} attempts`);
  }

  /**
   * Analyze the sentiment of a text and return a summary
   * @param text The text to analyze
   * @returns A promise that resolves to a sentiment summary
   */
  async analyzeSentiment(text: string): Promise<SentimentSummary> {
    try {
      // Submit the text for analysis
      const jobId = await this.submitTranscriptionForAnalysis(text);
      console.log('Sentiment analysis job submitted with ID:', jobId);
      
      // Wait for the job to complete and get results
      console.log('Waiting for sentiment analysis job to complete...');
      const results = await this.waitForJobCompletion(jobId);
      console.log('Sentiment analysis job completed, processing results...');
      
      // Calculate overall sentiment
      const summary = this.calculateSentimentSummary(results);
      console.log('Sentiment analysis summary calculated:');
      console.log('- Overall sentiment:', summary.overall);
      console.log('- Score:', summary.score);
      console.log('- Number of messages analyzed:', summary.details.length);
      
      return summary;
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      if (this.options.onError) {
        this.options.onError(new Error(`Failed to analyze sentiment: ${error instanceof Error ? error.message : String(error)}`));
      }
      throw error;
    }
  }

  /**
   * Calculate a summary of the sentiment analysis results
   * @param results The sentiment analysis results
   * @returns A sentiment summary
   */
  private calculateSentimentSummary(results: SentimentAnalysisResult): SentimentSummary {
    if (!results.messages || results.messages.length === 0) {
      return {
        overall: 'neutral',
        score: 0,
        details: []
      };
    }

    // Calculate weighted average score based on message length
    let totalScore = 0;
    let totalWeight = 0;
    
    console.log('Calculating weighted sentiment score from', results.messages.length, 'messages');
    
    // Count sentiment types
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    for (const message of results.messages) {
      const weight = message.content.length;
      totalScore += message.score * weight;
      totalWeight += weight;
      
      // Count by sentiment type
      if (message.sentiment === 'positive') positiveCount++;
      else if (message.sentiment === 'negative') negativeCount++;
      else neutralCount++;
    }

    const averageScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    console.log('Sentiment breakdown:');
    console.log('- Positive messages:', positiveCount);
    console.log('- Negative messages:', negativeCount);
    console.log('- Neutral messages:', neutralCount);
    console.log('- Weighted average score:', averageScore);
    
    // Determine overall sentiment
    let overall: 'positive' | 'negative' | 'neutral';
    if (averageScore > 0.2) {
      overall = 'positive';
    } else if (averageScore < -0.2) {
      overall = 'negative';
    } else {
      overall = 'neutral';
    }

    return {
      overall,
      score: averageScore,
      details: results.messages
    };
  }
}
