import { NextResponse } from 'next/server';
import { env } from '~/env';

// Rev.ai API endpoint for WebSocket streaming
const REV_AI_STREAMING_URL = 'wss://api.rev.ai/speechtotext/v1/stream';

export async function POST(request: Request) {
  try {
    const { action, audio } = await request.json();
    
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