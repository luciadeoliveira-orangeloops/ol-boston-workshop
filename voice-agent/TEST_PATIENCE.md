# Patience System Testing

This test suite allows you to test the patience system without using ElevenLabs (skipping speech-to-text and text-to-speech).

## How It Works

The patience system tracks off-topic questions:
- **Off-topic intents**: `general`, `unknown`
- **On-topic intents**: `stock`, `policy`, `product_search`, `categories`

When a user asks 10 off-topic questions, the agent stops responding.

## Running Tests

### Automated Test (Batch Mode)

Runs a predefined set of queries to test the patience system:

```bash
cd voice-agent
npm run test:patience
```

This will:
1. Execute 16 test queries (mix of on-topic and off-topic)
2. Show the intent detection and off-topic counter for each query
3. Stop when the patience limit is reached (10 off-topic questions)

### Interactive Test Mode

Chat interactively with the agent:

```bash
npm run test:patience:interactive
```

Type your queries and see real-time:
- Intent detection
- Off-topic counter (X/10)
- Agent responses

Type `exit` to quit.

## Example Output

```
📝 Query 1/16: "Do you have blue shirts in stock?"
--------------------------------------------------------------------------------

🧠 [Intent Detection] Intent: product_search (confidence: 0.95)
✅ [Patience Check] On-topic question. Count remains: 0/10

📊 Results:
   Intent: product_search
   Off-topic Count: 0/10
   Response: I found 5 products. Here are some options: ...

================================================================================

📝 Query 4/16: "What's the weather like today?"
--------------------------------------------------------------------------------

🧠 [Intent Detection] Intent: unknown (confidence: 0.98)
⚠️  [Patience Check] Off-topic question detected. Count: 0 → 1/10

📊 Results:
   Intent: unknown
   Off-topic Count: 1/10
   Response: I'm sorry, I didn't understand your request...
```

## Requirements

Make sure the backend and MCP services are running:

```bash
# From the workshop root directory
docker-compose up backend db mcp
```

Or start them individually if needed.

## Environment Variables

Ensure you have a `.env` file in the `voice-agent` directory with:

```env
OPENAI_API_KEY=your_key_here
MCP_SERVER_URL=http://localhost:4000
```
