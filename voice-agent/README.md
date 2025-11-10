# Voice Agent with LangGraph

This directory contains a voice agent implementation using LangGraph that connects to ElevenLabs for speech-to-text and text-to-speech, and uses the MCP server for accessing product catalog and policies.

## Architecture

The voice agent uses a LangGraph state machine with the following flow:

```
Audio Input → Speech-to-Text → Health Check → Intent Detection → MCP Call → Text-to-Speech → Audio Output
```

### Nodes

1. **Speech-to-Text**: Converts audio to text using ElevenLabs API
2. **Health Check**: Verifies all required services are available
3. **Intent Detection**: Uses GPT-4 to determine user intent (stock, policy, product_search, general)
4. **MCP Call**: Calls the appropriate MCP tool based on detected intent
5. **Text-to-Speech**: Converts response text to audio using ElevenLabs API

## Setup

1. Install dependencies:
```bash
cd voice-agent
npm install
```

2. Copy the `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

Required environment variables:
- `ELEVENLABS_API_KEY`: Your ElevenLabs API key
- `OPENAI_API_KEY`: Your OpenAI API key (for intent detection)
- `MCP_SERVER_URL`: URL of the MCP server (default: http://localhost:4000)
- `PORT`: Port for the voice agent API (default: 5000)

3. Start the MCP server first (in another terminal):
```bash
cd ../mcp
npm run dev
```

4. Start the voice agent:
```bash
npm run dev
```

## API Endpoints

### POST /voice
Process voice input and return voice output.

**Request**: multipart/form-data with 'audio' field
**Response**:
```json
{
  "transcribedText": "Show me blue handbags",
  "intent": "product_search",
  "responseText": "I found 5 products. Here are some options: Blue Canvas Handbag for $29.99, Navy Leather Tote for $89.99, Sky Blue Clutch for $34.99.",
  "audioResponse": "base64_encoded_audio",
  "audioMimeType": "audio/mpeg"
}
```

### POST /text
Process text input (for testing without audio).

**Request**:
```json
{
  "text": "What's your return policy?"
}
```

**Response**: Same as `/voice` endpoint

## Frontend Integration

The React component `LangGraphVoiceAgent` is available in the retail-catalog:

```tsx
import { LangGraphVoiceAgent } from "@/components/LangGraphVoiceAgent";

export default function Page() {
  return <LangGraphVoiceAgent />;
}
```

Access the demo at: http://localhost:3000/voice-agent

## Intent Detection

The agent can detect the following intents:

- **stock**: Check product availability (requires productId)
- **policy**: Query store policies (returns, shipping, warranty, etc.)
- **product_search**: Search products by category, type, color, price
- **general**: General conversation/greetings
- **unknown**: Fallback for unclear requests

## MCP Tools Used

The agent leverages these MCP tools:

- `query_products`: Search and filter products
- `query_stock`: Check stock for specific product
- `get_categories`: List available categories
- `get_product_types`: List product types
- `get_attributes`: Get available attributes
- Resources: Access policy documents

## Development

Run in development mode:
```bash
npm run dev
```

Build for production:
```bash
npm run build
npm start
```

## Debugging

Add `?debug=true` to the API request to get additional debug information in the response.
