"use client";

import { useState, useEffect, useRef } from "react";
import { IPhoneFrame } from "~/components/ui/iphone-frame";
import { MicrophoneButton, type RecordingState } from "~/components/ui/microphone-button";
import { ScenarioDropdown } from "~/components/ui/scenario-dropdown";
import { FeedbackCard } from "~/components/ui/feedback-card"; 
import type { Scenario } from "~/components/ui/scenario-dropdown";
import { AudioRecorder } from "~/lib/services/audio-recorder";
import { RevAiService } from "~/lib/services/rev-ai-service";
import { GroqService, type FeedbackResponse } from "~/lib/services/groq-service";

const scenarios: Scenario[] = [
  {
    description: "You are calling the doctors for an appointment for a stomach problem.",
    prompt: "What would you say when the receptionist answers?"
  },
  {
    description: "You are at a busy, noisy coffee shop and need to order a specific drink and pastry.",
    prompt: "How would you tell the barista your order clearly?"
  },
  {
    description: "You are in a store and can't find the item you're looking for. You see an employee.",
    prompt: "What would you say to the employee to ask for help?"
  },
  {
    description: "You are meeting a friend's new partner for the first time at a casual social gathering.",
    prompt: "How would you introduce yourself and start a brief conversation?"
  },
  {
    description: "You need to return an item of clothing that doesn't fit to a store.",
    prompt: "What would you say to the sales associate at the customer service desk?"
  },
  {
    description: "You didn't quite understand a detail explained by a coworker/classmate about a task or assignment.",
    prompt: "How would you approach them and ask for clarification?"
  },
  {
    description: "You need to call a restaurant to make a dinner reservation for two people tonight.",
    prompt: "What would you say when the restaurant answers the phone?"
  },
  {
    description: "You are in a small team meeting (or class) and your manager (or instructor) asks for brief input from each person.",
    prompt: "What would you say when it's your turn?"
  },
  {
    description: "You are lost in an unfamiliar area and need to ask someone for directions.",
    prompt: "How would you approach a stranger and ask for help?"
  },
  {
    description: "Someone has just given you instructions for something, but you missed a key step or phrase.",
    prompt: "What would you say to ask them to repeat or clarify without sounding like you weren't paying attention?"
  }
];

export default function Home() {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [transcription, setTranscription] = useState('');
  const [feedback, setFeedback] = useState<FeedbackResponse | undefined>(undefined);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<{ revai: boolean; groq: boolean } | null>(null);

  // References to our services
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const revAiServiceRef = useRef<RevAiService | null>(null);
  const groqServiceRef = useRef<GroqService | null>(null);

  // Check API availability
  useEffect(() => {
    // Use void operator to explicitly mark the promise as intentionally not awaited
    void checkApiAvailability();
    
    async function checkApiAvailability() {
      try {
        // Check Rev.ai API
        const revaiResponse = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'setup' })
        });
        
        const revaiAvailable = revaiResponse.ok;
        
        // Check Groq API by making a minimal request
        const groqResponse = await fetch('/api/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            scenario: scenarios[0], 
            transcription: 'Test transcription for API check' 
          })
        });
        
        const groqAvailable = groqResponse.ok;
        
        setApiStatus({
          revai: revaiAvailable,
          groq: groqAvailable
        });
        
        if (!revaiAvailable || !groqAvailable) {
          const missingApis = [];
          if (!revaiAvailable) missingApis.push('Rev.ai');
          if (!groqAvailable) missingApis.push('Groq');
          
          setError(`Missing API keys: ${missingApis.join(', ')}. Please add them to your .env file.`);
        }
      } catch (error) {
        console.error('Error checking API availability:', error);
      }
    }
  }, []);

  // Handle automatic transition from stopping to recorded when transcription is available
  useEffect(() => {
    // Only process if we're in the stopping state
    if (recordingState === 'stopping') {
      // If we have transcription text, set a short timeout to transition to recorded state
      if (transcription.trim()) {
        console.log('Transcription detected while in stopping state:', transcription);
        
        // Use a small timeout to allow other state updates to complete
        const timer = setTimeout(() => {
          console.log('Auto-transitioning from stopping to recorded state due to transcription');
          setRecordingState('recorded');
        }, 500);
        
        // Clean up the timer if the component unmounts or state changes
        return () => clearTimeout(timer);
      }
    }
  }, [recordingState, transcription]);

  // Initialize services - only once when component mounts
  useEffect(() => {
    console.log('Initializing services (component mount)');
    
    // Initialize Rev.ai service if not already initialized
    if (!revAiServiceRef.current) {
      revAiServiceRef.current = new RevAiService({
        onTranscriptionUpdate: (result) => {
          setTranscription(result.text);
        },
        onTranscriptionComplete: (finalResult) => {
          console.log('Final transcription received:', finalResult.text);
          setTranscription(finalResult.text);
          
          // Ensure we transition to the recorded state once we have the final transcription
          if (recordingState === 'stopping') {
            console.log('Transitioning from stopping to recorded state after receiving final transcription');
            setRecordingState('recorded');
          }
        },
        onConnected: () => {
          console.log('Successfully connected to Rev.ai');
        },
        onError: (error) => {
          console.error('Rev.ai error:', error);
          setError(`Transcription error: ${error.message}`);
          
          // Also ensure we exit the stopping state if there's an error
          if (recordingState === 'stopping') {
            console.log('Error occurred while stopping, forcing state to idle');
            setRecordingState('idle');
          }
        }
      });
    }

    // Initialize the Groq service if not already initialized
    if (!groqServiceRef.current) {
      groqServiceRef.current = new GroqService();
    }

    // Cleanup only when component unmounts (empty dependency array)
    return () => {
      console.log('Component unmounting, cleaning up services');
      if (audioRecorderRef.current) {
        audioRecorderRef.current.dispose();
        audioRecorderRef.current = null;
      }
      if (revAiServiceRef.current) {
        revAiServiceRef.current.disconnect();
        // Don't set to null as we might reuse the service
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount

  const handleStartRecording = async () => {
    if (!selectedScenario) {
      setError("Please select a scenario before recording.");
      return;
    }

    // Check if APIs are available
    if (apiStatus && (!apiStatus.revai || !apiStatus.groq)) {
      setError("Required API keys are missing. Check your environment setup.");
      return;
    }

    // Set state first to avoid race conditions
    setRecordingState('recording');
    setError(null);
    setFeedback(undefined);
    setTranscription('');
    
    try {
      console.log("Starting recording and transcription process");
      
      // Only disconnect if the service is actually ready/connected
      if (revAiServiceRef.current?.isReady()) {
        console.log("Disconnecting existing Rev.ai connection");
        revAiServiceRef.current.disconnect();
      }
      
      // Initialize the audio recorder first - create a new instance each time
      if (audioRecorderRef.current) {
        // Properly dispose of any existing recorder
        audioRecorderRef.current.dispose();
      }
      
      audioRecorderRef.current = new AudioRecorder({
        // Rev.ai requires specific audio format (16kHz, mono)
        onDataAvailable: (data) => {
          console.log(`Audio chunk received: ${data.size} bytes, type: ${data.type}`);
          // Only send data if we're connected to Rev.ai
          if (revAiServiceRef.current?.isReady()) {
            try {
              revAiServiceRef.current.sendAudioChunk(data);
            } catch (error) {
              console.error("Error sending audio chunk:", error);
            }
          } else {
            console.warn("Rev.ai not ready to receive audio chunks");
          }
        },
        onStop: () => {
          console.log("Recording stopped, finalizing transcription");
          // Signal end of audio stream when recording stops
          if (revAiServiceRef.current?.isReady()) {
            revAiServiceRef.current.finishTranscription();
          } else {
            console.warn("Rev.ai not ready when recording stopped");
          }
        }
      });

      // Initialize and connect to Rev.ai
      if (!revAiServiceRef.current) {
        throw new Error("Transcription service not initialized");
      }

      // Connect to Rev.ai before starting the recording
      console.log("Connecting to Rev.ai");
      await revAiServiceRef.current.connect();
      console.log("Rev.ai connection established");

      // Add a small delay to ensure the connection is fully established
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Verify that Rev.ai service is ready before proceeding
      if (!revAiServiceRef.current.isReady()) {
        throw new Error("Rev.ai connection established but not ready. Please try again.");
      }

      // Start recording after Rev.ai is connected
      console.log("Starting audio recording");
      await audioRecorderRef.current.startRecording();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Recording error:', errorMsg);
      
      // Check for API key related errors
      if (errorMsg.includes('API key') || errorMsg.includes('not configured')) {
        setError("API key error: Please check your environment setup and make sure you've added the required API keys.");
      } else {
        setError(`Failed to start recording: ${errorMsg}`);
      }
      
      setRecordingState('idle');
    }
  };

  const handleStopRecording = () => {
    try {
      console.log('Stopping recording...');
      setRecordingState('stopping');
      
      // First, ensure we have a reference to both services before proceeding
      if (!audioRecorderRef.current) {
        console.error('Audio recorder not initialized');
        setError('Failed to stop recording: recorder not initialized');
        setRecordingState('idle');
        return;
      }
      
      // Create a flag to track if we've already finalized the transcription
      let transcriptionFinalized = false;
      
      // Set up a handler for when audio recording stops
      const originalOnStop = audioRecorderRef.current.options.onStop;
      audioRecorderRef.current.onStop = (blob) => {
        console.log(`Audio recording stopped, blob size: ${blob.size} bytes`);
        
        // Call the original onStop handler if it exists
        if (originalOnStop) {
          originalOnStop(blob);
        }
        
        // Check if we received a valid audio blob
        if (blob.size <= 4) {
          console.warn('Received minimal or empty audio blob, likely a dummy chunk');
          
          // If this is a dummy chunk (from our fallback mechanism), show a helpful error
          setError('No audio was detected. Please check your microphone and try again.');
          
          // Force state to idle after a short delay to allow UI to update
          setTimeout(() => {
            setRecordingState('idle');
            
            // Clean up resources
            if (revAiServiceRef.current) {
              revAiServiceRef.current.disconnect();
            }
          }, 300);
          
          return;
        }
        
        // Only finalize if we haven't already and Rev.ai is ready
        if (!transcriptionFinalized && revAiServiceRef.current?.isReady()) {
          console.log('Finalizing transcription after recording stopped');
          transcriptionFinalized = true;
          revAiServiceRef.current.finishTranscription();
        }
      };
      
      // Stop the recording
      audioRecorderRef.current.stopRecording();
      
      // Also set up a backup finalization with a delay to ensure Rev.ai gets the signal
      if (revAiServiceRef.current?.isReady()) {
        setTimeout(() => {
          if (!transcriptionFinalized && revAiServiceRef.current?.isReady()) {
            console.log('Backup finalization of transcription after delay');
            transcriptionFinalized = true;
            revAiServiceRef.current.finishTranscription();
          }
        }, 800); // Increased from 500ms to 800ms for more reliability
      }
      
      // Set a shorter initial timeout to check for progress
      setTimeout(() => {
        if (recordingState === 'stopping' && !transcription.trim()) {
          console.log('No transcription after 2 seconds, showing progress message');
          setError('Processing audio... If nothing happens in a few seconds, please try again.');
        }
      }, 2000);
      
      // Set a medium timeout to check for progress
      setTimeout(() => {
        if (recordingState === 'stopping') {
          if (transcription.trim()) {
            console.log('Transcription received, transitioning to recorded state');
            setRecordingState('recorded');
            setError(null);
          }
        }
      }, 3000);
      
      // Set a longer timeout to ensure we move to 'recorded' state even if there's an issue
      // This prevents the UI from getting stuck in 'stopping' state
      setTimeout(() => {
        if (recordingState === 'stopping') {
          console.log('Force timeout: Transitioning from stopping state after timeout');
          
          // If we have transcription text, use recorded state
          if (transcription.trim()) {
            setRecordingState('recorded');
            setError(null);
          } else {
            // If no transcription, show error and reset
            setError('No transcription received. Please check your microphone and try again.');
            setRecordingState('idle');
            
            // Ensure we disconnect from Rev.ai to clean up resources
            if (revAiServiceRef.current) {
              console.log('Disconnecting Rev.ai service after timeout with no transcription');
              revAiServiceRef.current.disconnect();
            }
          }
        }
      }, 4000); // Reduced from 5000ms to 4000ms since we have earlier checks
    } catch (error) {
      console.error('Error stopping recording:', error);
      setError(`Failed to stop recording: ${error instanceof Error ? error.message : String(error)}`);
      setRecordingState('idle');
    }
  };

  const handleTryAgain = () => {
    console.log('User requested to try again, resetting state');
    
    // First set recording state to idle to prevent any race conditions
    // This ensures no cleanup functions are triggered by state changes
    setRecordingState('idle');
    
    // Small delay to ensure state update is processed before continuing
    setTimeout(() => {
      // Clear UI state
      setShowFeedback(false);
      setTranscription('');
      setFeedback(undefined);
      setError(null);
      
      // Disconnect from Rev.ai to ensure clean state
      if (revAiServiceRef.current) {
        console.log('Disconnecting Rev.ai service for retry');
        revAiServiceRef.current.disconnect();
      }
      
      // Dispose of audio recorder to ensure clean state
      if (audioRecorderRef.current) {
        console.log('Disposing audio recorder for retry');
        audioRecorderRef.current.dispose();
        audioRecorderRef.current = null;
      }
      
      console.log('Reset complete, ready for new recording');
    }, 100);
  };

  const handleSubmitRecording = async () => {
    if (!selectedScenario) {
      setError("No scenario selected.");
      return;
    }

    const trimmedTranscription = transcription.trim();
    
    if (!trimmedTranscription) {
      // If there's no transcription, provide a helpful error message
      setError("No speech detected or transcription failed. Please try recording again.");
      setRecordingState('idle');
      return;
    }

    // Check if Groq API is available
    if (apiStatus && !apiStatus.groq) {
      setError("Groq API key is missing. Cannot analyze response.");
      return;
    }

    setError(null); // Clear any previous errors
    setIsAnalyzing(true);
    setShowFeedback(true);
    
    try {
      if (!groqServiceRef.current) {
        throw new Error("Feedback service not initialized");
      }

      const feedbackResult = await groqServiceRef.current.analyzeSpeakingResponse(
        selectedScenario,
        trimmedTranscription
      );
      
      setFeedback(feedbackResult);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Feedback error:', errorMsg);
      
      // Check for API key related errors
      if (errorMsg.includes('API key') || errorMsg.includes('not configured')) {
        setError("API key error: Please check your Groq API key setup.");
      } else {
        setError(`Failed to analyze response: ${errorMsg}`);
      }
      
      // Keep the feedback panel open even when there's an error, so user can see the error
      setFeedback({
        strengths: [],
        improvements: ["Unable to analyze your response due to a technical issue."],
        overallFeedback: "Please try again later or contact support if the problem persists."
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleScenarioSelect = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    
    // Reset recording state when changing scenarios
    if (recordingState !== 'idle') {
      handleTryAgain();
    }
  };

  // Display setup instructions if API keys are missing
  const showApiSetupInstructions = apiStatus && (!apiStatus.revai || !apiStatus.groq);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-500 to-purple-600 p-4 md:p-8">
      {showApiSetupInstructions ? (
        <div className="max-w-2xl rounded-lg bg-white p-6 shadow-xl">
          <h2 className="mb-4 text-2xl font-bold text-red-600">API Setup Required</h2>
          <p className="mb-4">To use this application, you need to set up the following API keys:</p>
          
          <ul className="mb-6 ml-6 list-disc space-y-2">
            {!apiStatus.revai && (
              <li className="text-red-600">
                <span className="font-medium">Rev.ai API Key</span> - For speech-to-text transcription
              </li>
            )}
            {!apiStatus.groq && (
              <li className="text-red-600">
                <span className="font-medium">Groq API Key</span> - For AI feedback analysis
              </li>
            )}
          </ul>
          
          <h3 className="mb-2 text-xl font-semibold">Setup Instructions:</h3>
          <ol className="ml-6 list-decimal space-y-2">
            <li>Sign up for accounts at <a href="https://www.rev.ai/" className="text-blue-600 underline" target="_blank" rel="noreferrer">Rev.ai</a> and <a href="https://console.groq.com/" className="text-blue-600 underline" target="_blank" rel="noreferrer">Groq</a></li>
            <li>Get your API keys from both services</li>
            <li>Create a <code className="bg-gray-100 px-1 py-0.5 rounded">.env</code> file in the root of your project</li>
            <li>Add the following lines to your <code className="bg-gray-100 px-1 py-0.5 rounded">.env</code> file:</li>
          </ol>
          
          <pre className="mt-4 rounded-md bg-gray-800 p-4 text-white">
{`REVAI_API_KEY=your_rev_ai_key_here
GROQ_API_KEY=your_groq_key_here`}
          </pre>
          
          <p className="mt-6 text-sm text-gray-600">After adding the API keys, restart your server (stop and run <code className="bg-gray-100 px-1 py-0.5 rounded">npm run dev</code> again).</p>
        </div>
      ) : (
        <div className="flex w-full max-w-7xl flex-row items-start justify-between gap-16">
          {/* Left Section - Title and Scenario Selection */}
          <div className="w-full max-w-md space-y-6">
            <div className="mb-6">
              <h1 className="mb-3 text-left text-4xl font-bold text-white md:text-5xl">
                Speaking Practice
              </h1>
              <p className="text-left text-lg text-white/90">
                Select a scenario and click the microphone to practice your speaking skills
              </p>
            </div>
            
            <div className="space-y-4 rounded-xl bg-white/10 p-6 backdrop-blur-sm shadow-lg">
              <h2 className="text-2xl font-semibold text-white">Select a Scenario</h2>
              <ScenarioDropdown
                scenarios={scenarios}
                selectedScenario={selectedScenario}
                onSelect={handleScenarioSelect}
                className="bg-white/90"
              />
              
              {selectedScenario && (
                <div className="mt-6 rounded-lg bg-white/20 p-4 text-white">
                  <h3 className="font-medium">Speaking Task:</h3>
                  <p className="mt-2">{selectedScenario.prompt}</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Center Section - iPhone */}
          <div className="flex flex-1 justify-center items-center">
            <div className="scale-110 transition-transform duration-300 hover:scale-[1.12]">
              <IPhoneFrame>
                <div className="relative flex h-full flex-col items-center justify-between p-4">
                  <div className="pt-8 text-center text-sm text-gray-500">
                    {selectedScenario ? (
                      <p className="font-medium">{selectedScenario.description}</p>
                    ) : (
                      <p>Select a scenario to begin</p>
                    )}
                  </div>
                  
                  <div className="flex h-full items-center justify-center">
                    <MicrophoneButton 
                      onRecord={handleStartRecording}
                      onStop={handleStopRecording}
                      onSubmit={handleSubmitRecording}
                      onTryAgain={handleTryAgain}
                      recordingState={recordingState}
                    />
                  </div>
                  
                  {error && (
                    <div className="absolute bottom-10 left-0 right-0 mx-auto w-4/5 rounded-md bg-red-100 p-2 text-center text-xs text-red-600">
                      {error}
                    </div>
                  )}
                  
                  {showFeedback && (
                    <FeedbackCard
                      transcription={transcription}
                      feedback={feedback}
                      isLoading={isAnalyzing}
                      onClose={() => setShowFeedback(false)}
                      onTryAgain={handleTryAgain}
                      className={`transform ${showFeedback ? 'translate-y-0' : 'translate-y-full'}`}
                    />
                  )}
                </div>
              </IPhoneFrame>
            </div>
          </div>
          
          {/* Empty space on the right to balance the layout */}
          <div className="hidden lg:block w-full max-w-md"></div>
        </div>
      )}
    </main>
  );
}
