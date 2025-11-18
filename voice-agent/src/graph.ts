import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { speechToTextNode } from "./nodes/speechToText.js";
import { healthCheckNode } from "./nodes/healthCheck.js";
import { intentDetectionNode } from "./nodes/intentDetection.js";
import { patienceCheckNode, routeAfterPatienceCheck } from "./nodes/patienceCheck.js";
import { mcpCallNode } from "./nodes/mcpCall.js";
import { textToSpeechNode } from "./nodes/textToSpeech.js";

/**
 * Define the Voice Agent State Annotation
 */
export const VoiceAgentAnnotation = Annotation.Root({
  audioBuffer: Annotation<Buffer | undefined>(),
  transcribedText: Annotation<string | undefined>(),
  healthStatus: Annotation<{
    backend: boolean;
    mcp: boolean;
    elevenlabs: boolean;
  } | undefined>(),
  intent: Annotation<"stock" | "policy" | "product_search" | "categories" | "general" | "unknown" | undefined>(),
  intentParams: Annotation<Record<string, any> | undefined>(),
  mcpToolName: Annotation<string | undefined>(),
  mcpResponse: Annotation<string | undefined>(),
  responseText: Annotation<string | undefined>(),
  audioResponse: Annotation<Buffer | undefined>(),
  error: Annotation<string | undefined>(),
  // Patience system: tracks off-topic questions
  offTopicCount: Annotation<number>({
    reducer: (current: number, update: number) => current + update,
    default: () => 0,
  }),
});

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
 * Create the Voice Agent graph using LangGraph
 */
export function createVoiceAgentGraph() {
  const workflow = new StateGraph(VoiceAgentAnnotation)
    // Add nodes
    .addNode("speechToText", speechToTextNode)
    .addNode("healthCheck", healthCheckNode)
    .addNode("intentDetection", intentDetectionNode)
    .addNode("patienceCheck", patienceCheckNode)
    .addNode("mcpCall", mcpCallNode)
    .addNode("textToSpeech", textToSpeechNode)
    // Define edges
    .addEdge(START, "speechToText")
    .addEdge("speechToText", "healthCheck")
    .addConditionalEdges("healthCheck", shouldContinueAfterHealth, {
      intentDetection: "intentDetection",
      __end__: END,
    })
    .addEdge("intentDetection", "patienceCheck")
    .addConditionalEdges("patienceCheck", routeAfterPatienceCheck, {
      mcpCall: "mcpCall",
      textToSpeech: "textToSpeech",
    })
    .addEdge("mcpCall", "textToSpeech")
    .addEdge("textToSpeech", END);

  return workflow.compile();
}

/**
 * Process audio through the voice agent graph
 */
export async function processVoiceRequest(audioBuffer: Buffer): Promise<typeof VoiceAgentAnnotation.State> {
  const graph = createVoiceAgentGraph();

  console.log("🚀 Starting LangGraph voice agent...");

  const result = await graph.invoke({
    audioBuffer,
  });

  console.log("✅ LangGraph voice agent completed");

  return result;
}
