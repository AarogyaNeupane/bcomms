# Speaking Practice App

An interactive web application for practicing speaking scenarios with real-time speech-to-text transcription and AI-powered feedback.

## Features

- Choose from a variety of realistic speaking scenarios
- Record your spoken response directly in the browser
- Get real-time speech-to-text transcription using Rev.ai
- Receive detailed AI feedback on your speaking using Groq's LLaMA 3 70B model
- Beautiful, responsive UI that works on desktop and mobile devices

## Setup Instructions

### Prerequisites

- Node.js 16 or higher
- A Rev.ai API key (sign up at [https://www.rev.ai/](https://www.rev.ai/))
- A Groq API key (sign up at [https://console.groq.com/](https://console.groq.com/))

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd speaking-practice-app
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the root of the project with the following content:
```
REVAI_API_KEY=your_rev_ai_api_key
GROQ_API_KEY=your_groq_api_key
```

4. Start the development server
```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:3000`

## Usage Guide

1. **Select a Scenario**: Choose from the dropdown menu of speaking scenarios
2. **Record Your Response**: 
   - Click the microphone button to start recording
   - Speak your response
   - Click the button again to stop recording
3. **Submit for Feedback**:
   - Review your transcribed text
   - Click "Submit" to get AI feedback or "Try Again" to record a new response
4. **Review Feedback**:
   - View your strengths and areas for improvement
   - Read the overall assessment
   - Try as many times as you want!

## Technical Implementation

### Architecture

The application uses a client-server architecture to secure API keys:

1. **Client Side**: React components for the UI and audio recording
2. **Server Side**: Next.js API routes handle sensitive operations:
   - `/api/transcribe`: Manages Rev.ai authentication and speech-to-text
   - `/api/feedback`: Processes speech with Groq's LLaMA model for analysis

This separation ensures API keys remain secure on the server and are never exposed to the client.

### Speech-to-Text

The application uses Rev.ai's WebSocket streaming API to provide real-time transcription as you speak. The audio is recorded at 16kHz mono for optimal speech recognition and streamed in 250ms chunks to the Rev.ai service.

### AI Feedback

User responses are analyzed using Groq's llama3-70b-8192 model, which evaluates your speech based on:
- Clarity and effectiveness
- Appropriateness to the scenario
- Language usage and politeness

The feedback is structured into strengths, improvement areas, and an overall assessment.

## Development

The application is built with:

- Next.js and React
- TypeScript for type safety
- Tailwind CSS for styling
- WebAudio API for capturing audio
- WebSocket for streaming audio data
- Server API routes for secure API access

## License

This project is licensed under the MIT License - see the LICENSE file for details.
