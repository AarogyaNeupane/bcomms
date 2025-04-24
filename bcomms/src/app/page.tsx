"use client";

import { useState, useEffect, useRef } from "react";
import { IPhoneFrame } from "~/components/ui/iphone-frame";
import { MicrophoneButton, type RecordingState } from "~/components/ui/microphone-button";
import { ScenarioDropdown } from "~/components/ui/scenario-dropdown";
import { FeedbackCard } from "~/components/ui/feedback-card"; 
import type { Scenario } from "~/components/ui/scenario-dropdown";
import { AudioRecorder } from "~/lib/services/audio-recorder";
import { RevAiService, type TranscriptionResult } from "~/lib/services/rev-ai-service";
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
    
    checkApiAvailability();
  }, []);

  // Initialize services
  useEffect(() => {
    // Initialize services only once
    if (!revAiServiceRef.current) {
      // Initialize the Rev.ai service
      revAiServiceRef.current = new RevAiService({
        onTranscriptionUpdate: (result) => {
          setTranscription(result.text);
        },
        onConnected: () => {
          console.log('Successfully connected to Rev.ai');
        },
        onError: (error) => {
          console.error('Rev.ai error:', error);
          setError(`Transcription error: ${error.message}`);
          setRecordingState('idle');
        }
      });
    }

    // Initialize the Groq service
    if (!groqServiceRef.current) {
      groqServiceRef.current = new GroqService();
    }

    // Cleanup on unmount
    return () => {
      if (audioRecorderRef.current) {
        audioRecorderRef.current.dispose();
      }
      if (revAiServiceRef.current) {
        revAiServiceRef.current.disconnect();
      }
    };
  }, []);

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

    setError(null);
    setFeedback(undefined);
    setTranscription('');
    
    try {
      console.log("Starting recording and transcription process");
      
      // If there's an existing connection, disconnect it to ensure a clean slate
      if (revAiServiceRef.current) {
        revAiServiceRef.current.disconnect();
      }
      
      // Initialize the audio recorder first
      audioRecorderRef.current = new AudioRecorder({
        // Rev.ai requires specific audio format (16kHz, mono)
        onDataAvailable: (data) => {
          console.log(`Audio chunk received: ${data.size} bytes, type: ${data.type}`);
          // Only send data if we're connected to Rev.ai
          if (revAiServiceRef.current && revAiServiceRef.current.isReady()) {
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
          if (revAiServiceRef.current && revAiServiceRef.current.isReady()) {
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

      // Start recording after Rev.ai is connected
      console.log("Starting audio recording");
      await audioRecorderRef.current.startRecording();
      setRecordingState('recording');
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
    if (audioRecorderRef.current) {
      audioRecorderRef.current.stopRecording();
      setRecordingState('recorded');
    }
  };

  const handleTryAgain = () => {
    setShowFeedback(false);
    setTranscription('');
    setFeedback(undefined);
    setRecordingState('idle');
    setError(null);
    
    // Disconnect from Rev.ai
    if (revAiServiceRef.current) {
      revAiServiceRef.current.disconnect();
    }
  };

  const handleSubmitRecording = async () => {
    if (!selectedScenario) {
      setError("No scenario selected.");
      return;
    }

    if (!transcription.trim()) {
      setError("No speech detected. Please try again.");
      return;
    }

    // Check if Groq API is available
    if (apiStatus && !apiStatus.groq) {
      setError("Groq API key is missing. Cannot analyze response.");
      return;
    }

    setIsAnalyzing(true);
    setShowFeedback(true);
    
    try {
      if (!groqServiceRef.current) {
        throw new Error("Feedback service not initialized");
      }

      const feedbackResult = await groqServiceRef.current.analyzeSpeakingResponse(
        selectedScenario,
        transcription
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
