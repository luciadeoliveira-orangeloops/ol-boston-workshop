import { VoiceAgentAnnotation } from "../graph.js";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

// Schema for intent detection output
const IntentSchema = z.object({
  intent: z.enum(["stock", "policy", "product_search", "categories", "general", "unknown"]),
  confidence: z.number().min(0).max(1),
  params: z.record(z.any()).optional(),
  reasoning: z.string(),
});

/**
 * Node: Intent Detection
 * Determines the user's intent from the transcribed text
 */
export async function intentDetectionNode(
  state: typeof VoiceAgentAnnotation.State
): Promise<Partial<typeof VoiceAgentAnnotation.State>> {
  console.log("🧠 [Intent Detection] Analyzing intent...");

  try {
    if (!state.transcribedText) {
      throw new Error("No transcribed text available");
    }

    const model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0,
    });

    const prompt = `You are an intent classifier for a retail voice assistant. Analyze the user's query and determine their intent.

Available intents:
- "stock": User wants to check stock availability for a specific product ID (needs numeric productId)
- "policy": User asks about store policies (returns, refund, shipping, warranty, etc.)
- "product_search": User wants to search/find products by attributes (category, type, color, size, price, pattern, gender, etc.)
- "categories": User wants to know what categories or product types are available
- "general": General greeting or conversation
- "unknown": Cannot determine intent

User query: "${state.transcribedText}"

IMPORTANT extraction rules:
1. For product_search, extract ALL relevant attributes:
   - category: Main category (Accessories, Apparel, Footwear, Personal Care)
   - attributes.type: Product type (Shirts, Hoodies, Jeans, Handbags, etc.) - ALWAYS extract from words like "shirts", "hoodies", "jeans"
   - attributes.color: Color (Blue, Black, Red, etc.)
   - attributes.gender: Gender (Men, Women, Unisex)
   - attributes.season: Season (Summer, Winter, etc.)
   - attributes.usage: Usage (Sports, Casual, Formal, etc.)
   - attributes.pattern: Pattern (Printed, Solid, Striped, etc.) - extract from words like "printed", "plain"
   - maxPrice: Maximum price (extract from "under $X", "less than $X")
   - minPrice: Minimum price (extract from "over $X", "more than $X")
   - size: Size (S, M, L, XL, etc.) - store in attributes.size

2. For stock checks: only if user asks about stock of a SPECIFIC NUMERIC product ID
3. For categories: if user asks "what categories", "what types", "what do you have"
4. For policy: if user asks about "return", "refund", "shipping", "warranty", "exchange", etc.

Examples:
- "Find blue hoodies in size M under $60" → intent: product_search, params: {attributes: {type: "Hoodies", color: "Blue", size: "M"}, maxPrice: 60}
- "Do you have black shirts in stock?" → intent: product_search, params: {attributes: {type: "Shirts", color: "Black"}, inStock: true}
- "What categories are available?" → intent: categories
- "Show me printed jeans" → intent: product_search, params: {attributes: {type: "Jeans", pattern: "Printed"}}
- "Tell me about the refund policy" → intent: policy, params: {policyType: "refund"}
- "What should I do to return a product?" → intent: policy, params: {policyType: "returns"}
- "Do you have product 12345 in stock?" → intent: stock, params: {productId: "12345"}

Respond in JSON format: { "intent": "...", "confidence": 0.95, "params": {...}, "reasoning": "..." }`;

    const response = await model.invoke(prompt);
    const content = response.content as string;
    
    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse intent response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const validated = IntentSchema.parse(parsed);

    console.log(`🧠 [Intent Detection] Intent: ${validated.intent} (confidence: ${validated.confidence})`);
    console.log(`🧠 [Intent Detection] Params:`, validated.params);
    console.log(`🧠 [Intent Detection] Reasoning: ${validated.reasoning}`);

    return {
      intent: validated.intent,
      intentParams: validated.params || {},
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ [Intent Detection] Error:", errorMessage);
    
    // Fallback to unknown intent
    return {
      intent: "unknown",
      intentParams: {},
    };
  }
}
