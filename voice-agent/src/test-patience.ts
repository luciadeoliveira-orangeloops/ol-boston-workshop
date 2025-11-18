import "dotenv/config";
import { StateGraph, START, END, MemorySaver } from "@langchain/langgraph";
import { VoiceAgentAnnotation } from "./graph.js";
import { intentDetectionNode } from "./nodes/intentDetection.js";
import { patienceCheckNode, routeAfterPatienceCheck } from "./nodes/patienceCheck.js";
import { mcpCallNode } from "./nodes/mcpCall.js";
import fetch from "node-fetch";

/**
 * Simplified health check for testing - only checks what we need
 */
async function testHealthCheckNode(
  state: typeof VoiceAgentAnnotation.State
): Promise<Partial<typeof VoiceAgentAnnotation.State>> {
  console.log("🏥 [Health Check] Checking services for test...");

  // When running outside Docker, use localhost with mapped ports
  const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3001";
  const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://localhost:4000";

  const healthStatus = {
    backend: false,
    mcp: false,
    elevenlabs: true, // Skip ElevenLabs check for testing
  };

  // Check backend (optional for patience test)
  try {
    const backendResponse = await fetch(`${BACKEND_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    healthStatus.backend = backendResponse.ok;
    if (healthStatus.backend) {
      console.log("✅ [Health Check] Backend is available");
    }
  } catch (error) {
    console.warn("⚠️ [Health Check] Backend not available (optional for this test)");
  }

  // Check MCP server
  try {
    const mcpResponse = await fetch(`${MCP_SERVER_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });
    healthStatus.mcp = mcpResponse.ok;
    if (healthStatus.mcp) {
      console.log("✅ [Health Check] MCP server is available");
    }
  } catch (error) {
    console.error("❌ [Health Check] MCP server not available");
    console.error(`   Tried: ${MCP_SERVER_URL}/health`);
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
  }

  console.log("🏥 [Health Check] Status:", healthStatus);

  // Only fail if MCP is down (we need it for intent detection and product queries)
  if (!healthStatus.mcp) {
    return {
      healthStatus,
      error: `MCP server is not available at ${MCP_SERVER_URL}. Make sure Docker containers are running and ports are exposed.`,
    };
  }

  return { healthStatus };
}

/**
 * Conditional edge function to check health and route accordingly
 */
const shouldContinueAfterHealth = (state: typeof VoiceAgentAnnotation.State) => {
  if (state.error) {
    return END;
  }
  return "intentDetection";
};

/**
 * Create a simplified Voice Agent graph for testing (without audio processing)
 */
function createTestGraph() {
  const workflow = new StateGraph(VoiceAgentAnnotation)
    // Add nodes (skip speechToText and textToSpeech)
    .addNode("healthCheck", testHealthCheckNode)
    .addNode("intentDetection", intentDetectionNode)
    .addNode("patienceCheck", patienceCheckNode)
    .addNode("mcpCall", mcpCallNode)
    // Define edges
    .addEdge(START, "healthCheck")
    .addConditionalEdges("healthCheck", shouldContinueAfterHealth, {
      intentDetection: "intentDetection",
      __end__: END,
    })
    .addEdge("intentDetection", "patienceCheck")
    .addConditionalEdges("patienceCheck", routeAfterPatienceCheck, {
      mcpCall: "mcpCall",
      textToSpeech: END, // Skip textToSpeech, go to END
    })
    .addEdge("mcpCall", END);

  // Use MemorySaver to persist state across invocations
  const checkpointer = new MemorySaver();
  return workflow.compile({ checkpointer });
}

/**
 * Test function to simulate multiple queries
 */
async function testPatienceSystem() {
  const graph = createTestGraph();

  // Test queries - mix of on-topic and off-topic
  const testQueries = [
    // On-topic queries
    "Do you have blue shirts in stock?",
    "What categories do you sell?",
    "Tell me about your return policy",
    
    // Off-topic queries (these will increment the patience counter)
    "What's the weather like today?", // 1
    "Tell me a joke", // 2
    "Who won the World Cup?", // 3
    "What's 2 + 2?", // 4
    "Tell me about the history of France", // 5
    
    // On-topic
    "Do you have Nike shoes?",
    
    // More off-topic
    "What's the capital of Japan?", // 6
    "How do I bake a cake?", // 7
    "What's the meaning of life?", // 8
    "Tell me about quantum physics", // 9
    "What's your favorite color?", // 10 - Should trigger limit!
    
    // This one should not be answered
    "Do you have backpacks?",
  ];

  console.log("🧪 Starting Patience System Test\n");
  console.log("=" .repeat(80));

  // Use a consistent thread_id to maintain state across invocations
  const config = {
    configurable: {
      thread_id: "test-session-1",
    },
  };

  for (let i = 0; i < testQueries.length; i++) {
    const query = testQueries[i];
    
    console.log(`\n📝 Query ${i + 1}/${testQueries.length}: "${query}"`);
    console.log("-".repeat(80));

    try {
      const result = await graph.invoke({
        transcribedText: query,
      }, config); // Pass config to maintain state

      console.log(`\n📊 Results:`);
      console.log(`   Intent: ${result.intent}`);
      console.log(`   Off-topic Count: ${result.offTopicCount}/10`);
      console.log(`   Response: ${result.responseText?.substring(0, 150)}${result.responseText && result.responseText.length > 150 ? '...' : ''}`);
      
      if (result.error === "PATIENCE_LIMIT_REACHED") {
        console.log(`\n🛑 PATIENCE LIMIT REACHED! Stopping test.`);
        console.log("=" .repeat(80));
        break;
      }
    } catch (error) {
      console.error(`❌ Error processing query: ${error}`);
    }

    console.log("=" .repeat(80));
  }

  console.log("\n✅ Test completed!\n");
}

/**
 * Interactive test function
 */
async function interactiveTest() {
  const graph = createTestGraph();
  const readline = require("readline");
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("🎮 Interactive Patience System Test");
  console.log("=" .repeat(80));
  console.log("Type your queries (or 'exit' to quit)\n");

  // Use a consistent thread_id to maintain state across invocations
  const config = {
    configurable: {
      thread_id: "interactive-session",
    },
  };

  const askQuestion = () => {
    rl.question("\n💬 Your query: ", async (query: string) => {
      if (query.toLowerCase() === "exit") {
        console.log("\n👋 Goodbye!");
        rl.close();
        process.exit(0);
        return;
      }

      try {
        const result = await graph.invoke({
          transcribedText: query,
        }, config); // Pass config to maintain state

        const offTopicCount = result.offTopicCount || 0;

        console.log(`\n📊 Intent: ${result.intent} | Off-topic Count: ${offTopicCount}/10`);
        console.log(`🤖 Response: ${result.responseText}`);

        if (result.error === "PATIENCE_LIMIT_REACHED") {
          console.log("\n🛑 PATIENCE LIMIT REACHED! Session will end now.");
          console.log("\n👋 Goodbye!");
          rl.close();
          process.exit(0);
          return;
        }
      } catch (error) {
        console.error(`❌ Error: ${error}`);
      }

      askQuestion();
    });
  };

  askQuestion();
}

// Main execution
const args = process.argv.slice(2);

if (args.includes("--interactive") || args.includes("-i")) {
  interactiveTest();
} else {
  testPatienceSystem().catch(console.error);
}
