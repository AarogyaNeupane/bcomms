  export interface AudioRecorderOptions {
  onDataAvailable?: (data: Blob) => void;
  onStop?: (recording: Blob) => void;
  mimeType?: string;
  sampleRate?: number;
}

/**
 * A service for recording audio from the user's microphone,
 * optimized for the Rev.ai streaming API requirements.
 * Uses 16kHz mono audio format as recommended by Rev.ai.
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private _options: AudioRecorderOptions;
  
  // Getter for options
  get options(): AudioRecorderOptions {
    return this._options;
  }
  
  // Setter for onStop handler
  set onStop(handler: ((recording: Blob) => void) | undefined) {
    this._options.onStop = handler;
  }

  constructor(options: AudioRecorderOptions = {}) {
    this._options = {
      // Try different formats in order of preference
      mimeType: 'audio/webm',  // Most browsers support this format
      sampleRate: 16000, // 16kHz as required by Rev.ai
      ...options
    };
  }

  /**
   * Start recording audio from the user's microphone
   */
  async startRecording(): Promise<void> {
    try {
      // Reset state
      this.audioChunks = [];
      
      // Request microphone access with the specific constraints required by Rev.ai
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000, // Rev.ai works best with 16kHz
          channelCount: 1,   // Mono audio as required by Rev.ai
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      console.log('Stream obtained, active:', this.stream.active);

      // Verify we have a valid audio stream
      if (!this.stream || !this.stream.getAudioTracks().length) {
        throw new Error("No audio tracks available in the media stream");
      }
      
      const audioTracks = this.stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const audioTrack = audioTracks[0];
        if (audioTrack) {
          console.log(`Audio track obtained: ${audioTrack.label}, enabled: ${audioTrack.enabled}, muted: ${audioTrack.muted}`);
          
          // Log detailed track settings for debugging
          const settings = audioTrack.getSettings();
          console.log('Track settings:', JSON.stringify(settings));
          console.log('Track readyState:', audioTrack.readyState);
          
          // Check if the audio track is actually enabled
          if (!audioTrack.enabled) {
            console.warn("Audio track is disabled, attempting to enable it");
            audioTrack.enabled = true;
          }
        }
      } else {
        console.warn("No audio tracks found in stream despite earlier check");
      }

      // Set up the MediaRecorder with the appropriate MIME type
      // Note: Browser support for specific MIME types may vary
      let mimeType = '';
      
      // Check format support in this order of preference
      // Prioritize widely supported formats first, then try more specialized formats
      const supportedTypes = [
        'audio/webm',               // Generic WebM - widely supported in modern browsers
        'audio/webm;codecs=opus',   // Opus in WebM container - good support
        'audio/ogg;codecs=opus',    // Opus in Ogg container - good support
        'audio/ogg',                // Generic Ogg - fallback
        'audio/mp4',                // MP4 container - iOS support
        'audio/mpeg',               // MP3 as fallback - widely supported
        'audio/webm;codecs=pcm',    // PCM in WebM container - specialized
        'audio/wav'                 // WAV format - less common in browsers
      ];
      
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          console.log(`Using supported audio format: ${mimeType}`);
          break;
        }
      }
      
      if (!mimeType) {
        console.warn("No specified MIME types are supported. Using default MediaRecorder format.");
      }
      
      // Create MediaRecorder with explicit options
      const options: MediaRecorderOptions = {
        mimeType: mimeType || undefined,
        audioBitsPerSecond: 16000 // Match Rev.ai's expected sample rate
      };
      
      this.mediaRecorder = new MediaRecorder(this.stream, options);
      console.log(`MediaRecorder created with format: ${this.mediaRecorder.mimeType}, bitrate: 16kbps`);
      
      // Set up event handlers
      this.setupMediaRecorderEvents();

      // Add a small delay before starting to ensure everything is properly initialized
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Start recording with 250ms chunks - larger chunks may be more reliable
      // than very small chunks in some browsers
      this.mediaRecorder.start(250);
      console.log(`Recording started with format: ${mimeType || 'default'}, sample rate: 16kHz, mono channel, chunk interval: 250ms`);
      
      // Set multiple safety timers to ensure we get data
      // First check after 500ms
      setTimeout(() => {
        if (this.mediaRecorder && this.mediaRecorder.state === "recording" && this.audioChunks.length === 0) {
          console.log('No audio chunks received after 500ms, requesting data manually');
          try {
            this.mediaRecorder.requestData();
          } catch (requestError) {
            console.warn('Error requesting data after timeout:', requestError);
          }
        }
      }, 500);
      
      // Second check after 1000ms
      setTimeout(() => {
        if (this.mediaRecorder && this.mediaRecorder.state === "recording" && this.audioChunks.length === 0) {
          console.log('No audio chunks received after 1000ms, requesting data again');
          try {
            this.mediaRecorder.requestData();
            
            // Log stream state for debugging
            if (this.stream) {
              console.log('Stream still active:', this.stream.active);
              const tracks = this.stream.getAudioTracks();
              if (tracks && tracks.length > 0) {
                const track = tracks[0];
                if (track) {
                  console.log('Track readyState:', track.readyState);
                }
              }
            }
          } catch (requestError) {
            console.warn('Error requesting data after second timeout:', requestError);
          }
        }
      }, 1000);
      
      // Final check after 2000ms - if still no data, try restarting the recorder with a different format
      setTimeout(() => {
        if (this.mediaRecorder && this.mediaRecorder.state === "recording" && this.audioChunks.length === 0) {
          console.log('No audio chunks received after 2000ms, attempting recorder restart with different format');
          try {
            // Try stopping the current recorder
            const currentRecorder = this.mediaRecorder;
            if (currentRecorder) {
              currentRecorder.stop();
            }
            
            // Short delay before restarting
            setTimeout(() => {
              if (this.stream && this.stream.active) {
                // Try a different format as fallback - use the most basic format
                const fallbackOptions: MediaRecorderOptions = {
                  mimeType: 'audio/webm', // Most basic and widely supported format
                  audioBitsPerSecond: 16000
                };
                
                try {
                  console.log('Trying fallback format: audio/webm');
                  this.mediaRecorder = new MediaRecorder(this.stream, fallbackOptions);
                  
                  // Set up event handlers for the new recorder
                  this.setupMediaRecorderEvents();
                  
                  // Start with larger chunks for reliability
                  this.mediaRecorder.start(500);
                  console.log('MediaRecorder restarted with fallback format and 500ms chunk interval');
                  
                  // Create a dummy audio chunk to ensure we have at least something
                  // This ensures we don't get stuck in the "stopping" state with no data
                  this.createDummyAudioChunk();
                } catch (newRecorderError) {
                  console.error('Failed to create new MediaRecorder with fallback format:', newRecorderError);
                  
                  // Last resort - create a dummy audio chunk to prevent UI from getting stuck
                  this.createDummyAudioChunk();
                }
              } else {
                // Stream is no longer active, create a dummy chunk as last resort
                this.createDummyAudioChunk();
              }
            }, 200);
          } catch (restartError) {
            console.error('Error attempting to restart recorder:', restartError);
            // Create a dummy chunk as last resort
            this.createDummyAudioChunk();
          }
        }
      }, 2000);
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error(`Failed to start recording: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Set up event handlers for the MediaRecorder
   */
  private setupMediaRecorderEvents(): void {
    if (!this.mediaRecorder) {
      console.error('Cannot setup events: MediaRecorder is null');
      return;
    }
    
    // Handle data as it becomes available (for streaming to Rev.ai)
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        console.log(`Audio data available: ${event.data.size} bytes, type: ${event.data.type}`);
        this.audioChunks.push(event.data);
        
        if (this._options.onDataAvailable) {
          this._options.onDataAvailable(event.data);
        }
      } else {
        console.warn('Audio data event fired but data size is 0');
        
        // If we're still recording but getting empty chunks, try to request data manually
        if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
          console.log('Attempting to manually request data from MediaRecorder');
          try {
            // Force a data request - this might help in some browsers
            this.mediaRecorder.requestData();
          } catch (requestError) {
            console.warn('Error requesting data manually:', requestError);
          }
        }
      }
    };

    // Handle recording start
    this.mediaRecorder.onstart = () => {
      console.log('MediaRecorder started');
    };

    // Handle recording pause
    this.mediaRecorder.onpause = () => {
      console.log('MediaRecorder paused');
    };

    // Handle recording resume
    this.mediaRecorder.onresume = () => {
      console.log('MediaRecorder resumed');
    };

    // Handle recording stop
    this.mediaRecorder.onstop = () => {
      console.log(`MediaRecorder stopped. Total chunks: ${this.audioChunks.length}`);
      
      if (this.audioChunks.length === 0) {
        console.warn('No audio data was collected during recording');
      }
      
      const mimeType = this.mediaRecorder ? this.mediaRecorder.mimeType : 'audio/webm';
      const audioBlob = new Blob(this.audioChunks, { type: mimeType });
      console.log(`Created audio blob: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
      
      if (this._options.onStop) {
        this._options.onStop(audioBlob);
      }
      
      this.stopStream();
    };
  }

  /**
   * Creates a minimal dummy audio chunk to prevent the UI from getting stuck
   * when no real audio data is captured
   */
  private createDummyAudioChunk(): void {
    console.log('Creating dummy audio chunk to prevent UI from getting stuck');
    
    // Create a minimal audio blob - just enough to prevent the UI from getting stuck
    const dummyBlob = new Blob([new Uint8Array([0, 0, 0, 0])], { type: 'audio/webm' });
    
    // Add to our chunks array
    this.audioChunks.push(dummyBlob);
    
    // Call the onDataAvailable callback if it exists
    if (this._options.onDataAvailable) {
      this._options.onDataAvailable(dummyBlob);
    }
    
    console.log('Dummy audio chunk created and processed');
  }

  /**
   * Stop recording audio
   */
  stopRecording(): void {
    if (this.mediaRecorder && (this.mediaRecorder.state === "recording" || this.mediaRecorder.state === "paused")) {
      try {
        // Request data one last time before stopping to ensure we get the final audio
        if (this.mediaRecorder.state === "recording") {
          console.log('Requesting final data chunk before stopping');
          this.mediaRecorder.requestData();
        }
        
        // Check if we have any audio chunks before stopping
        if (this.audioChunks.length === 0) {
          console.warn('No audio chunks collected before stopping, creating dummy chunk');
          this.createDummyAudioChunk();
        }
        
        // Small delay to allow the final data to be processed
        setTimeout(() => {
          if (this.mediaRecorder && (this.mediaRecorder.state === "recording" || this.mediaRecorder.state === "paused")) {
            this.mediaRecorder.stop();
            console.log('Recording stopped');
          }
        }, 200);
      } catch (error) {
        console.error('Error stopping recording:', error);
        // Fallback - force stop even if there was an error
        try {
          if (this.mediaRecorder && (this.mediaRecorder.state === "recording" || this.mediaRecorder.state === "paused")) {
            this.mediaRecorder.stop();
          }
        } catch (stopError) {
          console.error('Error in fallback stop:', stopError);
        }
      }
    } else {
      console.log('MediaRecorder already inactive or null');
    }
  }

  /**
   * Get the current recording state
   */
  getState(): string {
    return this.mediaRecorder ? this.mediaRecorder.state : 'inactive';
  }

  /**
   * Clean up resources when done
   */
  private stopStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.stopRecording();
    this.stopStream();
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
}
