import { VoiceAgentAnnotation } from "../graph.js";

/**
 * Node: Patience Check
 * Tracks off-topic questions and enforces a limit
 * 
 * Off-topic intents: "general" and "unknown"
 * On-topic intents: "stock", "policy", "product_search", "categories"
 */
export async function patienceCheckNode(
  state: typeof VoiceAgentAnnotation.State
): Promise<Partial<typeof VoiceAgentAnnotation.State>> {
  console.log("⏱️  [Patience Check] Evaluating user intent...");

  const intent = state.intent;
  const currentCount = state.offTopicCount || 0;

  // Define off-topic intents
  const offTopicIntents = ["general", "unknown"];
  const isOffTopic = offTopicIntents.includes(intent || "");

  if (isOffTopic) {
    const newCount = currentCount + 1;
    console.log(`⚠️  [Patience Check] Off-topic question detected. Count: ${currentCount} → ${newCount}/10`);

    // Check if we've reached the patience limit
    if (newCount >= 10) {
      console.log("🛑 [Patience Check] Patience limit reached! No more responses.");
      return {
        offTopicCount: 1, // Increment by 1
        responseText: "I'm sorry, but I've noticed that your questions are not related to our products, stock, or RetailCo policies. Please focus your inquiries on topics relevant to our store. I cannot continue assisting you with topics outside of these areas.",
        error: "PATIENCE_LIMIT_REACHED",
      };
    }

    // Still within limit - let MCP handle the response but track the count
    const remainingQuestions = 10 - newCount;
    
    // Add metadata about warning level without overriding MCP response
    if (newCount >= 7) {
      console.log(`🔴 [Patience Check] WARNING: High off-topic count (${newCount}/10). ${remainingQuestions} questions remaining.`);
    } else if (newCount >= 5) {
      console.log(`🟡 [Patience Check] NOTICE: Moderate off-topic count (${newCount}/10).`);
    }

    return {
      offTopicCount: 1, // Increment by 1 (reducer will add it)
    };
  } else {
    // On-topic question - no increment needed
    console.log(`✅ [Patience Check] On-topic question. Count remains: ${currentCount}/10`);
    return {}; // No changes to state
  }
}

/**
 * Router function: determines if we should continue or end based on patience limit
 */
export function routeAfterPatienceCheck(state: typeof VoiceAgentAnnotation.State): string {
  // If we hit the patience limit, we set an error
  if (state.error === "PATIENCE_LIMIT_REACHED") {
    console.log("🚫 [Router] Patience limit reached, routing to textToSpeech for final message");
    return "textToSpeech";
  }

  // Otherwise, continue to MCP call
  console.log("➡️  [Router] Continuing to mcpCall");
  return "mcpCall";
}
