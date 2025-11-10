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

    // Fetch available categories and attributes from the database
    const [categoriesResponse, attributesResponse] = await Promise.all([
      fetch(`${process.env.MCP_SERVER_URL || "http://mcp:4000"}/categories`),
      fetch(`${process.env.MCP_SERVER_URL || "http://mcp:4000"}/attributes`),
    ]);

    const categories = (await categoriesResponse.json()) as string[];
    const attributes = (await attributesResponse.json()) as {
      article_types: string[];
      colours: string[];
      genders: string[];
      seasons: string[];
      usages: string[];
    };

    const model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0,
    });

    const prompt = `You are an intent classifier for a retail voice assistant. Analyze the user's query and determine their intent.

Available intents:
- "stock": User wants to check stock availability for a specific product ID (needs numeric productId)
- "policy": User asks about store policies (returns, refund, shipping, warranty, etc.)
- "product_search": User wants to search/find products by attributes (category, type, color, size, price, pattern, gender, brand, etc.) OR asks about stock of products by description
- "categories": User wants to know what categories or product types are available
- "general": General greeting or conversation
- "unknown": Cannot determine intent

User query: "${state.transcribedText}"

=== DATABASE SCHEMA ===
Available Categories (use EXACTLY these values): ${JSON.stringify(categories)}
Available Product Types (article_types - use EXACTLY these values): ${JSON.stringify(attributes.article_types)}
Available Colors (use EXACTLY these values): ${JSON.stringify(attributes.colours)}
Available Genders (use EXACTLY these values): ${JSON.stringify(attributes.genders)}
Available Seasons (use EXACTLY these values): ${JSON.stringify(attributes.seasons)}
Available Usages (use EXACTLY these values): ${JSON.stringify(attributes.usages)}

IMPORTANT extraction rules:
1. For product_search, extract ALL relevant attributes using EXACT values from the schema above:
   - category: Main category - MUST be one of: ${categories.join(", ")}
   - attributes.type: Product type - MUST be one of the article_types above (e.g., "Backpacks", "Shirts", "Handbags")
   - attributes.color: Color - MUST be one of the colours above
   - attributes.gender: Gender - MUST be one of the genders above
   - attributes.season: Season - MUST be one of the seasons above
   - attributes.usage: Usage - MUST be one of the usages above
   - searchTerm: Brand name or specific product name to search in product display name (extract brand names like "Nike", "Myntra", "Wildcraft", "Ray-Ban", "Adidas", "Puma", etc.)
   - maxPrice: Maximum price (extract from "under $X", "less than $X")
   - minPrice: Minimum price (extract from "over $X", "more than $X")
   - inStock: Set to true if user explicitly asks about stock availability or "in stock"

2. For stock checks: only if user asks about stock of a SPECIFIC NUMERIC product ID (e.g., "product 12345")
3. For categories: if user ONLY asks "what categories", "what types do you sell" without looking for specific products
4. For policy: if user asks about "return", "refund", "shipping", "warranty", "exchange", etc.

CRITICAL MATCHING RULES:
- When user says "backpack" → map to "Backpacks" (use the exact plural form from article_types)
- When user says "shirt" → map to "Shirts"
- When user says "shoe" → map to "Casual Shoes", "Sports Shoes", or "Formal Shoes" based on context
- When user mentions "footwear", "all footwear", "shoes" generally → use category: "Footwear" (do NOT use attributes.type)
- When user mentions a brand name, ALWAYS extract it as searchTerm
- Use fuzzy matching to find the closest match in the available values

Examples:
- "Find blue hoodies in size M under $60" → intent: product_search, params: {attributes: {color: "Blue"}, maxPrice: 60} (Note: hoodies not in DB)
- "Do you have black shirts in stock?" → intent: product_search, params: {attributes: {type: "Shirts", color: "Black"}, inStock: true}
- "How many Myntra shirts are in stock?" → intent: product_search, params: {searchTerm: "Myntra", attributes: {type: "Shirts"}, inStock: true}
- "What's the price of the Wildcraft backpack?" → intent: product_search, params: {searchTerm: "Wildcraft", attributes: {type: "Backpacks"}}
- "Show me all footwear products" → intent: product_search, params: {category: "Footwear"}
- "Do you have Nike shoes?" → intent: product_search, params: {searchTerm: "Nike", category: "Footwear"}
- "What categories are available?" → intent: categories
- "Tell me about the refund policy" → intent: policy, params: {policyType: "refund"}
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
