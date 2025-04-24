import { Mic, Square, CheckCircle, RefreshCw } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "./button";

export type RecordingState = 'idle' | 'recording' | 'recorded';

interface MicrophoneButtonProps {
  onRecord: () => void;
  onStop: () => void;
  onSubmit?: () => void;
  onTryAgain?: () => void;
  recordingState: RecordingState;
  className?: string;
}

export function MicrophoneButton({
  onRecord,
  onStop,
  onSubmit,
  onTryAgain,
  recordingState,
  className,
}: MicrophoneButtonProps) {
  const isRecording = recordingState === 'recording';
  const isRecorded = recordingState === 'recorded';
  
  // Handle the main microphone button click
  const handleMainButtonClick = () => {
    if (isRecording) {
      onStop();
    } else if (!isRecorded) {
      onRecord();
    }
  };
  
  return (
    <div className="flex flex-col items-center gap-4">
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "h-16 w-16 rounded-full border-2 transition-all duration-300",
          isRecording 
            ? "border-red-500 bg-red-100 text-red-600 animate-pulse" 
            : isRecorded
              ? "border-green-500 bg-green-100 text-green-600"
              : "border-blue-500 bg-blue-100 text-blue-600 hover:bg-blue-200",
          className
        )}
        onClick={handleMainButtonClick}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
      >
        {isRecording ? (
          <Square className="h-8 w-8 animate-pulse" />
        ) : isRecorded ? (
          <CheckCircle className="h-8 w-8" />
        ) : (
          <Mic className="h-8 w-8" />
        )}
      </Button>
      
      {isRecorded && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-red-200 text-red-600 hover:bg-red-50"
            onClick={onTryAgain}
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Try Again
          </Button>
          <Button
            size="sm"
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={onSubmit}
          >
            <CheckCircle className="mr-1 h-3 w-3" />
            Submit
          </Button>
        </div>
      )}
      
      <div className="text-center text-xs text-gray-400">
        {isRecording ? (
          "Recording... Tap to stop"
        ) : isRecorded ? (
          "Recording complete!"
        ) : (
          "Tap to start recording"
        )}
      </div>
    </div>
  );
} 