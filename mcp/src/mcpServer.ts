import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  CallToolRequest,
  ReadResourceRequest,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";
import { fetchBackend } from "./utils/fetchBackend.js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BACKEND_URL = process.env.BACKEND_URL || "http://backend:3001";

// Create MCP server
export const server = new Server(
  {
    name: "workshop-retail-catalog",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "query_products",
        description: "Search and filter products. IMPORTANT: Use get_categories to see main categories (Accessories, Apparel, etc.), then use get_product_types to see specific types (Handbags, Shirts, etc.). The 'category' parameter expects main categories, and 'type' attribute expects specific product types.",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "Main category: 'Accessories', 'Apparel', 'Footwear', or 'Personal Care'. Use get_categories to see all available."
            },
            attributes: {
              type: "object",
              description: "Filter by attributes. Available keys: 'type' (product type like 'Handbags', 'Shirts'), 'color' (e.g., 'Black', 'Blue'), 'gender' (e.g., 'Men', 'Women'), 'season' (e.g., 'Summer', 'Winter'), 'usage' (e.g., 'Sports', 'Casual'). Use get_product_types and get_attributes to see available values.",
              additionalProperties: { type: "string" }
            },
            minPrice: {
              type: "number",
              description: "Minimum price filter"
            },
            maxPrice: {
              type: "number",
              description: "Maximum price filter"
            },
            inStock: {
              type: "boolean",
              description: "Filter for products in stock"
            },
            searchTerm: {
              type: "string",
              description: "Search for products by brand name or product name (e.g., 'Nike', 'Wildcraft', 'Myntra')"
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return (default: 100, max: 100)"
            }
          }
        }
      },
      {
        name: "query_stock",
        description: "Check stock availability for a specific product by product ID",
        inputSchema: {
          type: "object",
          properties: {
            productId: {
              type: "string",
              description: "The unique identifier of the product"
            }
          },
          required: ["productId"]
        }
      },
      {
        name: "get_categories",
        description: "Get all available product categories (master categories like Apparel, Accessories, Footwear, Personal Care). Use this first to understand the main product categories.",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "get_product_types",
        description: "Get all available product types (article types) within categories. For example, 'Handbags' is a product type within 'Accessories' category. This helps understand the specific types of products available in each category.",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "Optional: Filter product types by category (e.g., 'Accessories', 'Apparel')"
            }
          }
        }
      },
      {
        name: "get_attributes",
        description: "Get all available product attributes (colors, genders, seasons, usages). Can be filtered by category and/or product type to see what attributes are available for specific products.",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              description: "Optional: Filter attributes by category (e.g., 'Accessories')"
            },
            type: {
              type: "string",
              description: "Optional: Filter attributes by product type (e.g., 'Handbags')"
            }
          }
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "query_products": {
        const queryParams = new URLSearchParams();
        
        if (args && typeof args === "object") {
          const params = args as any;
          
          // Map category to master_category (backend expects this)
          if (params.category) queryParams.append("master_category", params.category);
          
          if (params.minPrice) queryParams.append("min_price", params.minPrice.toString());
          if (params.maxPrice) queryParams.append("max_price", params.maxPrice.toString());
          if (params.inStock !== undefined) queryParams.append("inStock", params.inStock.toString());
          if (params.limit) queryParams.append("limit", params.limit.toString());
          if (params.searchTerm) queryParams.append("search", params.searchTerm);
          
          // Map attributes to backend field names
          if (params.attributes && typeof params.attributes === "object") {
            const attributeMapping: Record<string, string> = {
              'type': 'article_type',
              'Type': 'article_type',
              'color': 'base_colour',
              'Color': 'base_colour',
              'style': 'article_type',  // style is also article_type
              'Style': 'article_type',
              'season': 'season',
              'Season': 'season',
              'usage': 'usage',
              'Usage': 'usage',
              'gender': 'gender',
              'Gender': 'gender'
            };
            
            for (const [key, value] of Object.entries(params.attributes)) {
              const backendKey = attributeMapping[key] || key.toLowerCase();
              queryParams.append(backendKey, value as string);
            }
          }
        }

        const url = `${BACKEND_URL}/api/products?${queryParams.toString()}`;
        const data = await fetchBackend(url);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }

      case "query_stock": {
        if (!args || typeof args !== "object" || !(args as any).productId) {
          throw new Error("productId is required");
        }

        const url = `${BACKEND_URL}/api/stock?id=${(args as any).productId}`;
        const data = await fetchBackend(url);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }

      case "get_categories": {
        const url = `${BACKEND_URL}/api/categories`;
        const data = await fetchBackend(url);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }

      case "get_product_types": {
        const queryParams = new URLSearchParams();
        
        if (args && typeof args === "object") {
          const params = args as any;
          if (params.category) queryParams.append("category", params.category);
        }
        
        const url = `${BACKEND_URL}/api/categories/types?${queryParams.toString()}`;
        const data = await fetchBackend(url);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }

      case "get_attributes": {
        const queryParams = new URLSearchParams();
        
        if (args && typeof args === "object") {
          const params = args as any;
          if (params.category) queryParams.append("category", params.category);
          if (params.type) queryParams.append("type", params.type);
        }

        const url = `${BACKEND_URL}/api/attributes?${queryParams.toString()}`;
        const data = await fetchBackend(url);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }
      ],
      isError: true
    };
  }
});

// List available resources (documentation files)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const docsDir = path.join(__dirname, "..", "docs");
  const files = await fs.readdir(docsDir);
  
  const resources = files
    .filter((file: string) => file.endsWith(".txt"))
    .map((file: string) => ({
      uri: `file://docs/${file}`,
      name: file.replace(".txt", "").replace(/_/g, " "),
      description: `Policy document: ${file.replace(".txt", "").replace(/_/g, " ")}`,
      mimeType: "text/plain"
    }));

  return { resources };
});

// Read resource content
server.setRequestHandler(ReadResourceRequestSchema, async (request: ReadResourceRequest) => {
  const uri = request.params.uri;
  
  if (!uri.startsWith("file://docs/")) {
    throw new Error("Invalid resource URI");
  }

  const filename = uri.replace("file://docs/", "");
  const filePath = path.join(__dirname, "..", "docs", filename);

  try {
    const content = await fs.readFile(filePath, "utf-8");
    
    return {
      contents: [
        {
          uri,
          mimeType: "text/plain",
          text: content
        }
      ]
    };
  } catch (error) {
    throw new Error(`Failed to read resource: ${error instanceof Error ? error.message : String(error)}`);
  }
});
