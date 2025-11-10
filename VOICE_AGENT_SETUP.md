# Voice Agent Setup Instructions

This document explains how to set up and run the LangGraph voice agent.

## Prerequisites

1. **ElevenLabs API Key**: Sign up at https://elevenlabs.io and get your API key
2. **OpenAI API Key**: Sign up at https://openai.com and get your API key
3. **Node.js 20+**: Required for running the application

## Quick Start

### 1. Configure Environment Variables

Create a `.env` file in the `voice-agent` directory:

```bash
cd voice-agent
cp .env.example .env
```

Edit `.env` and add your API keys:
```env
PORT=5000
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
MCP_SERVER_URL=http://localhost:4000
BACKEND_URL=http://localhost:3001
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Services

You need to start services in this order:

**Terminal 1 - Backend:**
```bash
cd backend
npm install
npm run dev
```

**Terminal 2 - MCP Server:**
```bash
cd mcp
npm install
npm run dev
```

**Terminal 3 - Voice Agent:**
```bash
cd voice-agent
npm install
npm run dev
```

**Terminal 4 - Frontend:**
```bash
cd retail-catalog
npm install
npm run dev
```

### 4. Test the Voice Agent

#### Using the Frontend
1. Open http://localhost:3000/voice-agent in your browser
2. Click the microphone button
3. Allow microphone permissions
4. Speak your query (e.g., "Show me blue handbags")
5. Click the microphone again to stop recording
6. Wait for the response to be processed and played back

#### Using the API Directly

**Test with text (easier for debugging):**
```bash
curl -X POST http://localhost:5000/text \
  -H "Content-Type: application/json" \
  -d '{"text": "What is your return policy?"}'
```

**Test with audio:**
```bash
# First, record an audio file (audio.webm)
# Then send it:
curl -X POST http://localhost:5000/voice \
  -F "audio=@audio.webm"
```

## Using Docker Compose

Alternatively, you can run everything with Docker:

### 1. Create `.env` file in the root directory:

```bash
cd /path/to/workshop
cp .env.example .env
```

Add to `.env`:
```env
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
VOICE_AGENT_PORT=5000
MCP_SERVER_URL=http://mcp:4000
NEXT_PUBLIC_VOICE_AGENT_URL=http://localhost:5000
```

### 2. Start all services:

```bash
docker-compose up -d
```

### 3. Access the application:
- Frontend: http://localhost:3000/voice-agent
- Voice Agent API: http://localhost:5000
- MCP Server: http://localhost:4000
- Backend: http://localhost:3001

## Example Queries

Try asking the voice agent:

- **Product Search**: "Show me blue handbags" or "Find summer dresses under 50 dollars"
- **Stock Check**: "Do you have product 15970 in stock?"
- **Policies**: "What's your return policy?" or "Tell me about shipping options"
- **General**: "Hello" or "Can you help me?"

## Troubleshooting

### Microphone not working
- Check browser permissions
- Try using HTTPS (some browsers require it for microphone access)
- Test in Chrome/Edge (better WebRTC support)

### "MCP server not available" error
- Ensure the MCP server is running on port 4000
- Check the MCP_SERVER_URL in your .env file

### "ElevenLabs API error"
- Verify your API key is correct
- Check your ElevenLabs account has available credits
- Ensure you're not hitting rate limits

### Speech-to-text not working
- Check audio format is supported (webm, mp3, wav)
- Ensure audio file is not corrupted
- Try recording again with better audio quality

### Intent not detected properly
- The intent detection uses GPT-4o-mini
- Verify your OpenAI API key is valid
- Try being more specific in your queries

## Architecture Overview

```
┌─────────────┐
│   Browser   │
│  (Frontend) │
└──────┬──────┘
       │ Audio
       ▼
┌─────────────────────────────────────────┐
│         Voice Agent (LangGraph)          │
│  ┌───────────────────────────────────┐  │
│  │ 1. Speech-to-Text (ElevenLabs)    │  │
│  └───────────────┬───────────────────┘  │
│                  ▼                       │
│  ┌───────────────────────────────────┐  │
│  │ 2. Health Check                   │  │
│  └───────────────┬───────────────────┘  │
│                  ▼                       │
│  ┌───────────────────────────────────┐  │
│  │ 3. Intent Detection (GPT-4)       │  │
│  └───────────────┬───────────────────┘  │
│                  ▼                       │
│  ┌───────────────────────────────────┐  │
│  │ 4. MCP Call                       │──┐│
│  └───────────────┬───────────────────┘  ││
│                  ▼                       ││
│  ┌───────────────────────────────────┐  ││
│  │ 5. Text-to-Speech (ElevenLabs)    │  ││
│  └───────────────────────────────────┘  ││
└─────────────────────────────────────────┘│
                                            │
       ┌────────────────────────────────────┘
       │
       ▼
┌─────────────┐      ┌─────────────┐
│ MCP Server  │─────▶│   Backend   │
│   (Tools)   │      │ (Postgres)  │
└─────────────┘      └─────────────┘
```

## Development

### Adding New Intents

Edit `voice-agent/src/nodes/intentDetection.ts` to add new intent types.

### Adding New MCP Tools

The voice agent automatically uses tools from the MCP server. Add new tools in `mcp/src/mcpServer.ts`.

### Customizing Voice

Change the voice ID in `voice-agent/src/services/elevenlabs.ts`:
```typescript
const voiceId = "21m00Tcm4TlvDq8ikWAM"; // Replace with your preferred voice ID
```

Get voice IDs from: https://api.elevenlabs.io/v1/voices

## License

MIT
