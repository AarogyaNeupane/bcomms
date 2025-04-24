interface AudioRecorderOptions {
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
  private options: AudioRecorderOptions;

  constructor(options: AudioRecorderOptions = {}) {
    this.options = {
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

      // Set up the MediaRecorder with the appropriate MIME type
      // Note: Browser support for specific MIME types may vary
      let mimeType = '';
      
      // Check format support in this order of preference
      const supportedTypes = [
        'audio/webm',
        'audio/webm;codecs=opus',
        'audio/wav',
        'audio/mp4',
        'audio/ogg'
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
      
      // Create MediaRecorder with or without explicit mimetype
      this.mediaRecorder = mimeType 
        ? new MediaRecorder(this.stream, { mimeType }) 
        : new MediaRecorder(this.stream);
      
      console.log(`MediaRecorder created with format: ${this.mediaRecorder.mimeType}`);
      
      this.audioChunks = [];

      // Handle data as it becomes available (for streaming to Rev.ai)
      // Get chunks every 250ms as recommended by Rev.ai documentation
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          console.log(`Audio data available: ${event.data.size} bytes, type: ${event.data.type}`);
          this.audioChunks.push(event.data);
          
          if (this.options.onDataAvailable) {
            this.options.onDataAvailable(event.data);
          }
        } else {
          console.warn('Audio data event fired but data size is 0');
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
        
        if (this.options.onStop) {
          this.options.onStop(audioBlob);
        }
        
        this.stopStream();
      };

      // Start recording with 100ms chunks for better real-time streaming
      // Smaller chunks ensure that longer sentences get sent to Rev.ai more frequently
      // Rev.ai documentation recommends chunks between 100ms to 250ms
      this.mediaRecorder.start(100);
      console.log(`Recording started with format: ${mimeType}, sample rate: 16kHz, mono channel, chunk interval: 100ms`);
    } catch (error) {
      console.error('Error starting recording:', error);
      throw new Error(`Failed to start recording: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Stop recording audio
   */
  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      console.log('Recording stopped');
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