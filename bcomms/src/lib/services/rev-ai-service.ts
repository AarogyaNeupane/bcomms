import { env } from "~/env";

// Define types for the Rev.ai API responses
interface RevAiTranscriptElement {
  type: 'text' | 'punct';
  value: string;
  ts?: number;
  end_ts?: number;
  confidence?: number;
}

interface RevAiTranscriptMessage {
  type: 'connected' | 'partial' | 'final';
  ts?: number;
  end_ts?: number;
  elements?: RevAiTranscriptElement[];
  id?: string; // Job ID from the connected message
}

export interface TranscriptionResult {
  text: string;
  isFinal: boolean;
  confidence?: number; // Average confidence score if available
}

interface RevAiServiceOptions {
  onTranscriptionUpdate?: (result: TranscriptionResult) => void;
  onTranscriptionComplete?: (finalResult: TranscriptionResult) => void;
  onError?: (error: Error) => void;
  onConnected?: () => void;
}

interface SetupResponse {
  apiKey: string;
  streamingUrl: string;
  error?: string;
}

/**
 * Service for handling Rev.ai speech-to-text transcription
 */
export class RevAiService {
  private websocket: WebSocket | null = null;
  private options: RevAiServiceOptions;
  private isConnected = false;
  private currentText = '';
  private authToken = '';
  private streamingUrl = '';
  private jobId?: string;
  
  constructor(options: RevAiServiceOptions = {}) {
    this.options = options;
  }

  /**
   * Initialize the WebSocket connection to Rev.ai streaming API
   */
  async connect(): Promise<void> {
    try {
      console.log('Starting Rev.ai setup...');
      
      // Reset the current text when starting a new connection
      this.currentText = '';
      
      // Get the API key and streaming URL from the server
      const setupResponse = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'setup'
        }),
      });

      // Check for non-OK responses with more detailed error handling
      if (!setupResponse.ok) {
        const errorBody = await setupResponse.text();
        console.error('API setup response not OK:', {
          status: setupResponse.status,
          statusText: setupResponse.statusText,
          body: errorBody
        });
        throw new Error(`Failed to setup transcription: ${setupResponse.statusText}. Details: ${errorBody}`);
      }

      const responseData = await setupResponse.json() as SetupResponse;
      console.log('Rev.ai setup response received');
      
      // Check for error in response data
      if (responseData.error) {
        throw new Error(`API returned error: ${responseData.error}`);
      }
      
      // Check for missing API key in response
      if (!responseData.apiKey) {
        console.error('API key missing in response:', responseData);
        throw new Error('Rev.ai API key is not available. Please check your server configuration.');
      }

      this.authToken = responseData.apiKey;
      
      // First, try with webm format which works best with browsers
      try {
        this.streamingUrl = `${responseData.streamingUrl}?access_token=${this.authToken}&content_type=audio/webm&language=en&detailed_partials=true`;
        console.log('Trying WebSocket connection to Rev.ai with audio/webm format');
        await this.establishWebSocketConnection();
        console.log('Successfully connected using audio/webm format');
        return;
      } catch (error) {
        console.warn('Failed to connect with audio/webm format, trying alternate format:', error);
      }
      
      // If webm fails, try with wav format
      try {
        this.streamingUrl = `${responseData.streamingUrl}?access_token=${this.authToken}&content_type=audio/x-wav&language=en&detailed_partials=true`;
        console.log('Trying WebSocket connection to Rev.ai with audio/x-wav format');
        await this.establishWebSocketConnection();
        console.log('Successfully connected using audio/x-wav format');
        return;
      } catch (error) {
        console.warn('Failed to connect with audio/x-wav format, trying raw format:', error);
      }
      
      // As a last resort, try with the raw audio format
      this.streamingUrl = `${responseData.streamingUrl}?access_token=${this.authToken}&content_type=audio/x-raw;layout=interleaved;rate=16000;format=S16LE;channels=1&language=en&detailed_partials=true`;
      console.log('Trying WebSocket connection to Rev.ai with audio/x-raw format');
      return this.establishWebSocketConnection();

    } catch (error) {
      console.error('Error setting up Rev.ai service:', error);
      if (this.options.onError) {
        this.options.onError(new Error(`Failed to connect to Rev.ai: ${error instanceof Error ? error.message : String(error)}`));
      }
      throw error;
    }
  }

  /**
   * Establish WebSocket connection with the obtained API key
   */
  private establishWebSocketConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create WebSocket connection with all parameters in the URL
        this.websocket = new WebSocket(this.streamingUrl);
        
        // Connection established
        this.websocket.onopen = () => {
          console.log('WebSocket connection established with Rev.ai');
          // No need to send a configuration message - all params are in the URL
        };
        
        // Handle messages from the Rev.ai service
        this.websocket.onmessage = (event) => {
          try {
            console.log(`WebSocket message received: ${typeof event.data === 'string' ? event.data.substring(0, 100) : 'binary data'}`);
            
            const message = JSON.parse(event.data) as RevAiTranscriptMessage;
            
            if (message.type === 'connected') {
              // Store the job ID if provided
              if (message.id) {
                this.jobId = message.id;
                console.log(`Rev.ai connection confirmed with job ID: ${message.id}`);
              } else {
                console.log('Rev.ai connection confirmed');
              }
              
              this.isConnected = true;
              if (this.options.onConnected) {
                this.options.onConnected();
              }
              resolve();
            } else if (message.type === 'partial' || message.type === 'final') {
              console.log(`Transcription ${message.type} received: ${JSON.stringify(message).substring(0, 200)}`);
              
              const transcriptionResult = this.processTranscription(message);
              console.log(`Processed transcription: ${transcriptionResult.text} (isFinal: ${transcriptionResult.isFinal})`);
              
              if (transcriptionResult.isFinal && this.options.onTranscriptionComplete) {
                this.options.onTranscriptionComplete(transcriptionResult);
              } else if (this.options.onTranscriptionUpdate) {
                this.options.onTranscriptionUpdate(transcriptionResult);
              }
            } else {
              console.log(`Unknown message type received: ${message.type}`);
            }
          } catch (error) {
            console.error('Error processing Rev.ai message:', error);
            console.error('Message data:', typeof event.data === 'string' ? event.data : 'Binary data');
            if (this.options.onError) {
              this.options.onError(new Error(`Error processing transcription: ${error instanceof Error ? error.message : String(error)}`));
            }
          }
        };
        
        // Handle WebSocket errors
        this.websocket.onerror = (error) => {
          console.error('WebSocket error:', error);
          if (this.options.onError) {
            this.options.onError(new Error('WebSocket connection error'));
          }
          reject(error);
        };
        
        // Handle WebSocket close
        this.websocket.onclose = (event) => {
          this.isConnected = false;
          console.log(`WebSocket closed: ${event.code} - ${event.reason}`);
        };
        
      } catch (error) {
        console.error('Error connecting to Rev.ai:', error);
        if (this.options.onError) {
          this.options.onError(new Error(`Failed to connect to Rev.ai: ${error instanceof Error ? error.message : String(error)}`));
        }
        reject(error);
      }
    });
  }

  /**
   * Send audio data to Rev.ai for transcription
   */
  sendAudioChunk(audioChunk: Blob): void {
    if (!this.isConnected || !this.websocket) {
      throw new Error('Not connected to Rev.ai. Call connect() first.');
    }

    // Only send chunks with actual data
    if (audioChunk.size === 0) {
      console.warn('Ignoring empty audio chunk');
      return;
    }

    // Log the audio format for debugging
    console.log(`Sending audio chunk: type=${audioChunk.type}, size=${audioChunk.size} bytes`);
    
    // Rev.ai expects binary audio data
    audioChunk.arrayBuffer().then(buffer => {
      if (this.websocket && this.isConnected) {
        // Send raw binary data as required by Rev.ai
        this.websocket.send(buffer);
      }
    }).catch(error => {
      console.error('Error processing audio chunk:', error);
      if (this.options.onError) {
        this.options.onError(new Error(`Error sending audio to Rev.ai: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
  }

  /**
   * Process transcription response from Rev.ai
   */
  private processTranscription(message: RevAiTranscriptMessage): TranscriptionResult {
    let transcriptText = '';
    let confidenceSum = 0;
    let confidenceCount = 0;

    // Extract text from the elements
    if (message.elements) {
      message.elements.forEach(element => {
        transcriptText += element.value;
        
        // Calculate average confidence
        if (element.type === 'text' && element.confidence !== undefined) {
          confidenceSum += element.confidence;
          confidenceCount++;
        }
      });
    }

    console.log(`Processing ${message.type} transcript: "${transcriptText}"`);
    
    if (message.type === 'final') {
      // Final transcripts from Rev.ai should replace our current text if they contain
      // significant content, as they represent completed processing
      if (transcriptText.trim().length > 0) {
        // If the final text is a subset of what we've accumulated, keep our accumulated text
        // This handles cases where Rev.ai might send a partial final result
        if (this.currentText.includes(transcriptText) && this.currentText.length > transcriptText.length) {
          console.log(`Final transcript "${transcriptText}" is contained in current text, keeping current`);
        } else {
          // Otherwise, use the final transcript
          this.currentText = transcriptText;
          console.log(`Updated with final transcript: "${this.currentText}"`);
        }
      }
    } else if (message.type === 'partial' && transcriptText.trim().length > 0) {
      // Smart handling of partial transcripts
      const cleanText = transcriptText.trim();
      
      if (this.currentText.length === 0) {
        // First partial, just use it
        this.currentText = cleanText;
      } else {
        // Check if this partial is new content or overlaps with existing content
        // Try to find the last few words of current text in the new partial
        const words = this.currentText.split(' ');
        const lastWords = words.slice(-3).join(' '); // Use last 3 words for overlap detection
        
        if (cleanText.includes(lastWords)) {
          // There's overlap, this partial likely continues our current text
          // Replace the overlapping part and append the rest
          const overlapIndex = cleanText.indexOf(lastWords);
          const newContent = cleanText.substring(overlapIndex + lastWords.length);
          
          if (newContent.trim().length > 0) {
            this.currentText += newContent;
            console.log(`Appended new content with overlap: "${newContent}"`);
          }
        } else if (!this.currentText.includes(cleanText)) {
          // No overlap found and not a duplicate, append as new content
          this.currentText += ' ' + cleanText;
          console.log(`Appended entirely new content: "${cleanText}"`);
        } else {
          // This partial is already in our text, ignore it
          console.log('Skipping duplicate partial');
        }
      }
    }

    // Clean up any double spaces that might have been introduced
    this.currentText = this.currentText.replace(/\s+/g, ' ').trim();
    
    const averageConfidence = confidenceCount > 0 ? confidenceSum / confidenceCount : undefined;

    return {
      text: this.currentText,
      isFinal: message.type === 'final',
      confidence: averageConfidence
    };
  }

  /**
   * Signal end of audio stream to Rev.ai
   */
  finishTranscription(): void {
    if (this.websocket && this.isConnected) {
      // Send EOS (End of Stream) message as required by Rev.ai documentation
      this.websocket.send('EOS');
    }
  }

  /**
   * Close the WebSocket connection
   */
  disconnect(): void {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
      this.isConnected = false;
      this.jobId = undefined;
    }
  }

  /**
   * Check if connected to Rev.ai
   */
  isReady(): boolean {
    return this.isConnected;
  }
} 