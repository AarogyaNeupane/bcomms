import { NextResponse } from 'next/server';
import { env } from '~/env';

// Rev.ai API endpoint for WebSocket streaming
const REV_AI_STREAMING_URL = 'wss://api.rev.ai/speechtotext/v1/stream';

// Define interface for the request payload
interface TranscribeRequest {
  action: string;
  jobId?: string;
  // We'll include audio property but mark it as optional since we don't use it for 'setup' action
  audio?: Blob;
}

export async function POST(request: Request) {
  try {
    const requestData = await request.json() as TranscribeRequest;
    const { action, jobId } = requestData;
    
    // Check if Rev.ai API key is available
    if (!env.REVAI_API_KEY) {
      console.error('Rev.ai API key is not configured in environment variables');
      return NextResponse.json(
        { error: 'Rev.ai API key is not configured' },
        { status: 500 }
      );
    }

    // Different actions based on the request
    if (action === 'setup') {
      console.log('Providing Rev.ai API key and streaming URL');
      
      // Return the API key and base URL - client will construct the full URL with parameters
      return NextResponse.json({ 
        apiKey: env.REVAI_API_KEY,
        streamingUrl: REV_AI_STREAMING_URL
      });
    } else if (action === 'endStream') {
      // Handle endStream action
      if (!jobId) {
        console.error('No job ID provided for endStream action');
        return NextResponse.json(
          { error: 'Job ID is required to end the stream' },
          { status: 400 }
        );
      }
      
      console.log(`Processing endStream for job ID: ${jobId}`);
      
      // For now, just acknowledge the end of stream
      // No actual API call needed as WebSocket handles this
      return NextResponse.json({ 
        success: true,
        message: `Stream ended for job ID: ${jobId}`
      });
    }
    
    // For future use if we need to handle other Rev.ai API actions
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    // More detailed error logging
    console.error('Error in transcribe API route:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    return NextResponse.json(
      { error: `Failed to process transcription request: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 