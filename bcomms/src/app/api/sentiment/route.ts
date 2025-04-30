import { NextResponse } from 'next/server';
import { env } from '~/env';

// Rev.ai API endpoints
const REV_AI_SENTIMENT_URL = 'https://api.rev.ai/sentiment_analysis/v1';

// Define interface for the request payload
interface SentimentRequest {
  action: string;
  jobId?: string;
  text?: string;
}

export async function POST(request: Request) {
  try {
    const requestData = await request.json() as SentimentRequest;
    const { action, jobId, text } = requestData;
    
    // Check if Rev.ai API key is available
    if (!env.REVAI_API_KEY) {
      console.error('Rev.ai API key is not configured in environment variables');
      return NextResponse.json(
        { error: 'Rev.ai API key is not configured' },
        { status: 500 }
      );
    }

    // Different actions based on the request
    if (action === 'submit') {
      // Validate text input
      if (!text || text.trim().length === 0) {
        return NextResponse.json(
          { error: 'Text is required for sentiment analysis' },
          { status: 400 }
        );
      }

      console.log('Submitting text for sentiment analysis');
      
      // Submit text for sentiment analysis
      console.log(`Submitting text for sentiment analysis to Rev.ai API: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
      
      const response = await fetch(`${REV_AI_SENTIMENT_URL}/jobs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.REVAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          language: 'en'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Rev.ai sentiment analysis submission error (${response.status}):`, errorText);
        return NextResponse.json(
          { error: `Failed to submit sentiment analysis job: ${response.statusText}` },
          { status: response.status }
        );
      }

      const jobData = await response.json();
      console.log('Sentiment analysis job submitted successfully:', {
        jobId: jobData.id,
        status: jobData.status,
        createdOn: jobData.created_on
      });
      
      return NextResponse.json(jobData);
    } 
    else if (action === 'status') {
      // Validate job ID
      if (!jobId) {
        return NextResponse.json(
          { error: 'Job ID is required to check status' },
          { status: 400 }
        );
      }

      console.log(`Checking status for sentiment analysis job: ${jobId}`);
      
      // Get job status
      console.log(`Checking status for sentiment analysis job: ${jobId}`);
      
      const response = await fetch(`${REV_AI_SENTIMENT_URL}/jobs/${jobId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${env.REVAI_API_KEY}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Rev.ai sentiment analysis status check error (${response.status}):`, errorText);
        return NextResponse.json(
          { error: `Failed to check sentiment analysis job status: ${response.statusText}` },
          { status: response.status }
        );
      }

      const statusData = await response.json();
      console.log('Sentiment analysis job status details:', {
        jobId: statusData.id,
        status: statusData.status,
        createdOn: statusData.created_on,
        completedOn: statusData.completed_on || 'N/A',
        wordCount: statusData.word_count || 'N/A'
      });
      
      return NextResponse.json(statusData);
    } 
    else if (action === 'result') {
      // Validate job ID
      if (!jobId) {
        return NextResponse.json(
          { error: 'Job ID is required to get results' },
          { status: 400 }
        );
      }

      console.log(`Getting results for sentiment analysis job: ${jobId}`);
      
      // Get job results
      console.log(`Retrieving results for sentiment analysis job: ${jobId}`);
      
      const response = await fetch(`${REV_AI_SENTIMENT_URL}/jobs/${jobId}/result`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${env.REVAI_API_KEY}`,
          'Accept': 'application/vnd.rev.sentiment.v1.0+json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Rev.ai sentiment analysis results error (${response.status}):`, errorText);
        return NextResponse.json(
          { error: `Failed to get sentiment analysis results: ${response.statusText}` },
          { status: response.status }
        );
      }

      const resultData = await response.json();
      
      // Count sentiment types
      const messageCount = resultData.messages?.length || 0;
      const positiveCount = resultData.messages?.filter((m: { sentiment: string }) => m.sentiment === 'positive').length || 0;
      const negativeCount = resultData.messages?.filter((m: { sentiment: string }) => m.sentiment === 'negative').length || 0;
      const neutralCount = resultData.messages?.filter((m: { sentiment: string }) => m.sentiment === 'neutral').length || 0;
      
      console.log('Sentiment analysis results summary:', {
        totalMessages: messageCount,
        positiveMessages: positiveCount,
        negativeMessages: negativeCount,
        neutralMessages: neutralCount
      });
      
      // Log a sample of the first few messages if available
      if (resultData.messages && resultData.messages.length > 0) {
        console.log('Sample sentiment messages:');
        const sampleSize = Math.min(3, resultData.messages.length);
        for (let i = 0; i < sampleSize; i++) {
          const msg: { content: string; sentiment: string; score: number } = resultData.messages[i];
          console.log(`- "${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}": ${msg.sentiment} (score: ${msg.score})`);
        }
      }
      
      return NextResponse.json(resultData);
    }
    
    // Invalid action
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    // More detailed error logging
    console.error('Error in sentiment API route:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return NextResponse.json(
      { error: `Failed to process sentiment analysis request: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
