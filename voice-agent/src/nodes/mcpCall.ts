import { VoiceAgentAnnotation } from "../graph.js";
import { callTool, readResource } from "../services/mcpClient.js";

/**
 * Node: MCP Call
 * Calls the appropriate MCP tool based on the detected intent
 */
export async function mcpCallNode(
  state: typeof VoiceAgentAnnotation.State
): Promise<Partial<typeof VoiceAgentAnnotation.State>> {
  console.log("🔧 [MCP Call] Processing intent...");

  try {
    if (!state.intent || state.intent === "unknown") {
      return {
        responseText: "I'm sorry, I didn't understand your request. Could you please rephrase?",
      };
    }

    if (state.intent === "general") {
      return {
        responseText: "Hello! I'm your retail assistant. I can help you search for products, check stock availability, or answer questions about our store policies. How can I assist you today?",
      };
    }

    let mcpResponse: string;
    let mcpToolName: string;

    switch (state.intent) {
      case "categories": {
        // Get available categories
        mcpToolName = "get_categories";
        console.log(`🔧 [MCP Call] Calling ${mcpToolName}`);
        
        const result = await callTool(mcpToolName, {});
        mcpResponse = result.content[0]?.text || "No response from server";
        
        // Parse and format the response
        const categories = JSON.parse(mcpResponse);
        
        if (!categories || categories.length === 0) {
          return {
            mcpToolName,
            mcpResponse,
            responseText: "I couldn't retrieve the categories at this moment.",
          };
        }

        const categoryList = categories.join(", ");
        const responseText = `We have ${categories.length} main categories available: ${categoryList}.`;
        
        return { mcpToolName, mcpResponse, responseText };
      }

      case "stock": {
        // Check stock for a specific product ID
        const productId = state.intentParams?.productId;
        
        if (!productId) {
          return {
            responseText: "I need a product ID to check stock. Could you provide the product ID?",
          };
        }

        mcpToolName = "query_stock";
        console.log(`🔧 [MCP Call] Calling ${mcpToolName} with productId: ${productId}`);
        
        try {
          const result = await callTool(mcpToolName, { productId });
          mcpResponse = result.content[0]?.text || "No response from server";
          console.log(`🔧 [MCP Call] Raw response: ${mcpResponse}`);
          
          // Check if it's an error response
          if (mcpResponse.startsWith("Error:")) {
            return {
              mcpToolName,
              mcpResponse,
              responseText: `I couldn't find stock information for product ID ${productId}. Please verify the product ID is correct.`,
            };
          }
          
          // Parse and format the response
          const stockData = JSON.parse(mcpResponse);
          const responseText = stockData.inStock
            ? `Yes, product ${productId} is in stock. We have ${stockData.quantity} units available.`
            : `Sorry, product ${productId} is currently out of stock.`;
          
          return { mcpToolName, mcpResponse, responseText };
        } catch (error) {
          console.error(`🔧 [MCP Call] Error calling ${mcpToolName}:`, error);
          return {
            mcpToolName,
            mcpResponse: error instanceof Error ? error.message : String(error),
            responseText: `I'm sorry, I couldn't retrieve stock information for product ${productId}. Please verify the product ID.`,
          };
        }
      }

      case "policy": {
        // Read policy document
        const policyType = state.intentParams?.policyType || "faq";
        const uri = `file://docs/${policyType}_policy.txt`;
        
        mcpToolName = "read_resource";
        console.log(`🔧 [MCP Call] Reading resource: ${uri}`);
        
        try {
          mcpResponse = await readResource(uri);
          
          // Summarize the policy (take first 800 characters)
          const summary = mcpResponse.length > 800 
            ? mcpResponse.substring(0, 800) + "... Would you like more details?"
            : mcpResponse;
          
          return {
            mcpToolName,
            mcpResponse,
            responseText: summary,
          };
        } catch (error) {
          // Fallback to FAQ if specific policy not found
          try {
            const faqUri = "file://docs/faq.txt";
            mcpResponse = await readResource(faqUri);
            
            return {
              mcpToolName,
              mcpResponse,
              responseText: `Here's some general information that might help: ${mcpResponse.substring(0, 800)}...`,
            };
          } catch (fallbackError) {
            return {
              mcpToolName,
              mcpResponse: error instanceof Error ? error.message : String(error),
              responseText: `I'm sorry, I couldn't find information about ${policyType} policy. Please try rephrasing your question.`,
            };
          }
        }
      }

      case "product_search": {
        // Search for products
        mcpToolName = "query_products";
        
        const searchParams: any = {};
        
        // Extract parameters from intentParams
        if (state.intentParams) {
          const params = state.intentParams;
          
          // Map category
          if (params.category) {
            searchParams.category = params.category;
          }
          
          // Map attributes, cleaning up problematic fields
          if (params.attributes) {
            searchParams.attributes = {};
            
            for (const [key, value] of Object.entries(params.attributes)) {
              // Skip price-related fields in attributes (they should be at root level)
              if (key.toLowerCase().includes('price') && typeof value === 'string') {
                // Extract price from string like "under $60" or "$60"
                const priceMatch = (value as string).match(/\$?\s*(\d+(?:\.\d+)?)/);
                if (priceMatch) {
                  const priceValue = parseFloat(priceMatch[1]);
                  if (value.toLowerCase().includes('under') || value.toLowerCase().includes('less')) {
                    searchParams.maxPrice = priceValue;
                  } else if (value.toLowerCase().includes('over') || value.toLowerCase().includes('more')) {
                    searchParams.minPrice = priceValue;
                  }
                }
                continue; // Don't add to attributes
              }
              
              // Add other attributes
              searchParams.attributes[key] = value;
            }
          }
          
          // Map price filters (if already properly formatted)
          if (params.minPrice !== undefined) {
            searchParams.minPrice = params.minPrice;
          }
          if (params.maxPrice !== undefined) {
            searchParams.maxPrice = params.maxPrice;
          }
          
          // Map stock filter
          if (params.inStock !== undefined) {
            searchParams.inStock = params.inStock;
          }
          
          // Set a reasonable limit
          searchParams.limit = params.limit || 20;
        }
        
        console.log(`🔧 [MCP Call] Calling ${mcpToolName} with params:`, JSON.stringify(searchParams));
        
        const result = await callTool(mcpToolName, searchParams);
        mcpResponse = result.content[0]?.text || "No response from server";
        
        // Parse and format the response
        const products = JSON.parse(mcpResponse);
        
        if (!products || products.length === 0) {
          return {
            mcpToolName,
            mcpResponse,
            responseText: "I couldn't find any products matching your criteria. Would you like to try a different search?",
          };
        }

        const count = products.length;
        const firstFew = products.slice(0, 3);
        
        // Format product list with proper field names
        const productList = firstFew
          .map((p: any) => {
            const name = p.productName || p.product_name || p.productDisplayName || p.product_display_name || "Unknown product";
            const price = p.price || "price not available";
            return `${name} for $${price}`;
          })
          .join(", ");
        
        const responseText = `I found ${count} product${count > 1 ? 's' : ''}. Here are some options: ${productList}${count > 3 ? ', and more' : ''}.`;
        
        return { mcpToolName, mcpResponse, responseText };
      }

      default:
        return {
          responseText: "I'm not sure how to help with that. Could you please be more specific?",
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ [MCP Call] Error:", errorMessage);
    
    return {
      error: `MCP call failed: ${errorMessage}`,
      responseText: "I'm sorry, I encountered an error while processing your request. Please try again.",
    };
  }
}
