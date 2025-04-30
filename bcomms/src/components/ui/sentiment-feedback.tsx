"use client";

import { useState } from "react";
import type { SentimentMessage, SentimentSummary } from "~/lib/services/rev-ai-sentiment-service";

interface SentimentFeedbackProps {
  sentiment?: SentimentSummary;
  isLoading?: boolean;
  className?: string;
}

export function SentimentFeedback({ sentiment, isLoading, className = "" }: SentimentFeedbackProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (isLoading) {
    return (
      <div className={`rounded-lg bg-gray-50 p-4 ${className}`}>
        <div className="flex items-center justify-center space-x-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
          <p className="text-sm text-gray-500">Analyzing sentiment...</p>
        </div>
      </div>
    );
  }

  if (!sentiment) {
    return null;
  }

  // Calculate percentages for the sentiment breakdown
  const totalMessages = sentiment.details.length;
  const positiveCount = sentiment.details.filter(m => m.sentiment === 'positive').length;
  const negativeCount = sentiment.details.filter(m => m.sentiment === 'negative').length;
  const neutralCount = sentiment.details.filter(m => m.sentiment === 'neutral').length;
  
  const positivePercent = totalMessages > 0 ? Math.round((positiveCount / totalMessages) * 100) : 0;
  const negativePercent = totalMessages > 0 ? Math.round((negativeCount / totalMessages) * 100) : 0;
  const neutralPercent = totalMessages > 0 ? Math.round((neutralCount / totalMessages) * 100) : 0;

  // Get color based on sentiment
  const getSentimentColor = (sentiment: 'positive' | 'negative' | 'neutral') => {
    switch (sentiment) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      case 'neutral': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  // Get background color based on sentiment
  const getSentimentBgColor = (sentiment: 'positive' | 'negative' | 'neutral') => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100';
      case 'negative': return 'bg-red-100';
      case 'neutral': return 'bg-gray-100';
      default: return 'bg-gray-100';
    }
  };

  // Get emoji based on sentiment
  const getSentimentEmoji = (sentiment: 'positive' | 'negative' | 'neutral') => {
    switch (sentiment) {
      case 'positive': return '😊';
      case 'negative': return '😞';
      case 'neutral': return '😐';
      default: return '😐';
    }
  };

  // Format score as percentage
  const formatScore = (score: number) => {
    // Convert score from -1...1 to 0...100
    const percentage = Math.round(((score + 1) / 2) * 100);
    return `${percentage}%`;
  };

  return (
    <div className={`rounded-lg ${getSentimentBgColor(sentiment.overall)} p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className={`text-lg font-semibold ${getSentimentColor(sentiment.overall)}`}>
          Sentiment Analysis {getSentimentEmoji(sentiment.overall)}
        </h3>
        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs text-gray-600 underline hover:text-gray-800"
        >
          {showDetails ? 'Hide details' : 'Show details'}
        </button>
      </div>

      <div className="mb-3">
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-red-600">Negative</span>
          <span className="text-gray-600">Neutral</span>
          <span className="text-green-600">Positive</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div 
            className="flex h-full"
            style={{ 
              background: 'linear-gradient(to right, #ef4444, #9ca3af, #22c55e)'
            }}
          >
            <div 
              className="h-2 border-r border-white"
              style={{ 
                width: `${((sentiment.score + 1) / 2) * 100}%`
              }}
            ></div>
          </div>
        </div>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-md bg-red-50 p-1">
          <div className="font-medium text-red-600">{negativePercent}%</div>
          <div className="text-gray-500">Negative</div>
        </div>
        <div className="rounded-md bg-gray-50 p-1">
          <div className="font-medium text-gray-600">{neutralPercent}%</div>
          <div className="text-gray-500">Neutral</div>
        </div>
        <div className="rounded-md bg-green-50 p-1">
          <div className="font-medium text-green-600">{positivePercent}%</div>
          <div className="text-gray-500">Positive</div>
        </div>
      </div>

      {showDetails && sentiment.details.length > 0 && (
        <div className="mt-4 max-h-40 overflow-y-auto rounded-md bg-white p-2 text-xs">
          <h4 className="mb-2 font-medium text-gray-700">Sentiment Breakdown</h4>
          <ul className="space-y-2">
            {sentiment.details.map((message, index) => (
              <li key={index} className={`rounded-md p-1.5 ${getSentimentBgColor(message.sentiment)}`}>
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${getSentimentColor(message.sentiment)}`}>
                    {message.sentiment.charAt(0).toUpperCase() + message.sentiment.slice(1)}
                  </span>
                  <span className="text-gray-500">
                    Score: {formatScore(message.score)}
                  </span>
                </div>
                <p className="mt-1 text-gray-700">{message.content}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
