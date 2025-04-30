import React from "react";
import { Check, AlertTriangle, X, Repeat, BarChart } from "lucide-react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import type { FeedbackResponse } from "~/lib/services/groq-service";
import { SentimentFeedback } from "~/components/ui/sentiment-feedback";

interface FeedbackCardProps {
  transcription: string;
  feedback?: FeedbackResponse;
  isLoading?: boolean;
  onClose: () => void;
  onTryAgain: () => void;
  className?: string;
}

export function FeedbackCard({
  transcription,
  feedback,
  isLoading = false,
  onClose,
  onTryAgain,
  className,
}: FeedbackCardProps) {
  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 z-10 max-h-[90%] overflow-hidden rounded-t-3xl bg-white shadow-lg transition-transform duration-300 ease-in-out",
        isLoading ? "animate-pulse" : "",
        className
      )}
    >
      <div className="flex items-center justify-between border-b p-4">
        <h3 className="text-lg font-medium">Your Feedback</h3>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 rounded-full"
            onClick={onTryAgain}
          >
            <Repeat className="h-4 w-4" />
            <span className="sr-only">Try Again</span>
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="h-8 w-8 rounded-full"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
      </div>
      
      <div className="max-h-[calc(90vh-8rem)] overflow-y-auto p-4">
        {isLoading ? (
          <div className="space-y-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200"></div>
            <div className="h-4 w-full animate-pulse rounded bg-gray-200"></div>
            <div className="h-4 w-5/6 animate-pulse rounded bg-gray-200"></div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h4 className="mb-2 text-sm font-medium text-gray-500">Your Response</h4>
              <div className="rounded-lg bg-gray-50 p-3 text-gray-800">
                {transcription || "No response recorded"}
              </div>
            </div>
            
            {feedback ? (
              <>
                <div className="mb-4">
                  <h4 className="mb-2 flex items-center gap-1 font-medium text-green-600">
                    <Check className="h-4 w-4" />
                    <span>What Went Well</span>
                  </h4>
                  <ul className="ml-6 list-disc space-y-1 text-gray-700">
                    {feedback.strengths.length > 0 ? (
                      feedback.strengths.map((strength, index) => (
                        <li key={index}>{strength}</li>
                      ))
                    ) : (
                      <li className="text-gray-500">No specific strengths identified</li>
                    )}
                  </ul>
                </div>
                
                <div className="mb-4">
                  <h4 className="mb-2 flex items-center gap-1 font-medium text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Areas for Improvement</span>
                  </h4>
                  <ul className="ml-6 list-disc space-y-1 text-gray-700">
                    {feedback.improvements.length > 0 ? (
                      feedback.improvements.map((improvement, index) => (
                        <li key={index}>{improvement}</li>
                      ))
                    ) : (
                      <li className="text-gray-500">No specific improvements identified</li>
                    )}
                  </ul>
                </div>
                
                <div className="mb-3 rounded-lg bg-blue-50 p-3">
                  <h4 className="mb-1 text-sm font-medium text-blue-700">Overall Assessment</h4>
                  <p className="text-blue-800">{feedback.overallFeedback}</p>
                </div>
                
                {/* Sentiment Analysis Section */}
                {feedback.sentiment ? (
                  <div className="mb-4">
                    <h4 className="mb-2 flex items-center gap-1 font-medium text-purple-600">
                      <BarChart className="h-4 w-4" />
                      <span>Sentiment Analysis</span>
                    </h4>
                    <SentimentFeedback sentiment={feedback.sentiment} />
                  </div>
                ) : (
                  <div className="mb-4">
                    <h4 className="mb-2 flex items-center gap-1 font-medium text-purple-600">
                      <BarChart className="h-4 w-4" />
                      <span>Sentiment Analysis</span>
                    </h4>
                    <div className="rounded-lg bg-gray-50 p-3 text-gray-500 text-sm">
                      Sentiment analysis not available for this response.
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="mt-6 text-center text-gray-500">
                No feedback available. Please try again or check your connection.
              </div>
            )}
          </>
        )}
      </div>
      
      <div className="flex justify-end gap-2 border-t p-4">
        <Button 
          variant="outline" 
          onClick={onTryAgain}
          className="gap-1"
        >
          <Repeat className="h-4 w-4" />
          Try Again
        </Button>
        <Button 
          onClick={onClose}
          className="gap-1 bg-blue-600 hover:bg-blue-700"
        >
          Done
        </Button>
      </div>
    </div>
  );
}
