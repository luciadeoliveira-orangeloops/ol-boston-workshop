import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { server } from "./mcpServer.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { docsRouter } from "./routes/docs.js";
import { stockRouter } from "./routes/stock.js";
import { productsRouter } from "./routes/products.js";
import { categoriesRouter } from "./routes/categories.js";
import { attributesRouter } from "./routes/attributes.js";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();

// ============================================================================
// SESSION MANAGEMENT for MCP SSE
// ============================================================================
interface SSEClient {
  sessionId: string;
  response: Response;
  eventId: number;
  messageQueue: Array<{ id: number; data: any }>;
}

const sessions = new Map<string, SSEClient>();
const pendingRequests = new Map<string, { resolve: Function; reject: Function }>();

// Helper function to send SSE message
function sendSSEMessage(client: SSEClient, data: any) {
  const eventId = ++client.eventId;
  const message = `id: ${eventId}\ndata: ${JSON.stringify(data)}\n\n`;
  console.log(`🔵 SSE Message #${eventId} to session ${client.sessionId}:`, JSON.stringify(data, null, 2));
  client.response.write(message);
  return eventId;
}

// CORS configuration for MCP - Enhanced for ElevenLabs compatibility
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS', 'DELETE', 'PUT', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'Accept', 
    'Last-Event-ID', 
    'Mcp-Session-Id',
    'X-Requested-With',
    'Origin',
    'User-Agent',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: [
    'Mcp-Session-Id', 
    'Content-Type',
    'Content-Length',
    'ETag',
    'Date',
    'Connection',
    'X-Powered-By'
  ],
  credentials: false, // Changed to false for better compatibility with cloud services
  maxAge: 86400 // 24 hours - cache preflight requests
}));

app.use(express.json());

// Enhanced OPTIONS handling for better CORS preflight support
app.options('*', (req: Request, res: Response) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE, PUT, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Last-Event-ID, Mcp-Session-Id, X-Requested-With, Origin, User-Agent, Cache-Control, Pragma');
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id, Content-Type, Content-Length, ETag, Date, Connection, X-Powered-By');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.status(204).end();
});

// Serve static files from public directory (for .well-known and openapi.json)
app.use(express.static(path.join(__dirname, "..", "public")));

// Serve openapi.json from root
app.get("/openapi.json", (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "..", "openapi.json"));
});

app.get("/", (_req: Request, res: Response) => res.send("🟣 MCP Server running"));
app.get("/health", (_req: Request, res: Response) => res.json({ status: "ok", service: "mcp" }));

// ============================================================================
// MCP DISCOVERY ENDPOINT (GET /mcp without SSE)
// ============================================================================
// This is called when Accept header does NOT include text/event-stream
function handleDiscovery(_req: Request, res: Response) {
  // Ensure CORS headers are set
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Content-Length');
  
  res.json({
    name: "workshop-retail-catalog",
    version: "1.0.0",
    protocol: "mcp",
    protocolVersion: "2025-03-26",
    description: "Retail product catalog with search and policy documents",
    capabilities: {
      tools: true,
      resources: true
    },
    endpoints: {
      mcp: "/mcp"
    }
  });
}

// ============================================================================
// MCP SSE STREAM ENDPOINT (GET /mcp with text/event-stream)
// ============================================================================
function handleSSEStream(req: Request, res: Response) {
  const acceptHeader = req.headers.accept || "";
  
  if (!acceptHeader.includes("text/event-stream")) {
    return handleDiscovery(req, res);
  }

  // Get or create session ID BEFORE setting headers
  let sessionId = req.headers["mcp-session-id"] as string;
  
  if (!sessionId) {
    sessionId = randomUUID();
    console.log(`🆕 Creating new SSE session: ${sessionId}`);
  } else {
    console.log(`🔄 Using existing session ID: ${sessionId}`);
  }

  // Set up SSE headers all at once
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Mcp-Session-Id", sessionId);
  res.setHeader("Access-Control-Expose-Headers", "Mcp-Session-Id");
  res.flushHeaders();

  // Handle resumption with Last-Event-ID
  const lastEventId = req.headers["last-event-id"] as string;
  
  // Check if session already exists
  const existingClient = sessions.get(sessionId);
  if (existingClient) {
    console.log(`⚠️  Session ${sessionId} already exists, replacing with new connection`);
  }
  
  const client: SSEClient = {
    sessionId,
    response: res,
    eventId: lastEventId ? parseInt(lastEventId, 10) : 0,
    messageQueue: []
  };

  sessions.set(sessionId, client);

  console.log(`✅ SSE connection established for session: ${sessionId}`);

  // Send initial connection confirmation (optional, some clients don't need this)
  sendSSEMessage(client, {
    jsonrpc: "2.0",
    method: "connection/established",
    params: { sessionId }
  });

  // Handle client disconnect
  req.on("close", () => {
    console.log(`🔌 SSE connection closed for session: ${sessionId}`);
    sessions.delete(sessionId);
  });
}

// ============================================================================
// GET /mcp - SSE Stream or Discovery
// ============================================================================
app.get("/mcp", (req: Request, res: Response) => {
  const acceptHeader = req.headers.accept || "";
  
  console.log(`📥 GET /mcp - Accept header: ${acceptHeader}`);
  
  if (acceptHeader.includes("text/event-stream")) {
    console.log(`🔄 Routing to SSE stream handler`);
    handleSSEStream(req, res);
  } else {
    console.log(`🔄 Routing to discovery handler`);
    handleDiscovery(req, res);
  }
});

// ============================================================================
// POST /mcp - Handle JSON-RPC Requests
// ============================================================================
app.post("/mcp", async (req: Request, res: Response) => {
  console.log("📨 MCP POST request received:", JSON.stringify(req.body, null, 2));
  console.log("📋 Headers:", JSON.stringify({
    'accept': req.headers.accept,
    'content-type': req.headers['content-type'],
    'mcp-session-id': req.headers['mcp-session-id'],
    'origin': req.headers.origin
  }, null, 2));
  
  // Ensure CORS headers are always set for responses
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id, Content-Type, Content-Length');
  
  try {
    const request = req.body;
    const sessionId = req.headers["mcp-session-id"] as string;

    // Validate JSON-RPC 2.0 request
    if (!request.jsonrpc || request.jsonrpc !== "2.0") {
      return res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "Invalid Request: jsonrpc must be 2.0"
        },
        id: request.id || null
      });
    }

    // Validate Accept header (must include application/json AND text/event-stream)
    const acceptHeader = req.headers.accept || "";
    if (!acceptHeader.includes("application/json") && !acceptHeader.includes("text/event-stream")) {
      return res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32600,
          message: "Invalid Request: Accept header must include application/json or text/event-stream"
        },
        id: request.id || null
      });
    }

    // Process the request
    let result;
    let newSessionId = sessionId;
    
    try {
      switch (request.method) {
        case "initialize":
          // Generate session ID if not provided
          if (!newSessionId) {
            newSessionId = randomUUID();
            console.log(`🆕 Generated new session ID: ${newSessionId}`);
          }
          
          // Support multiple protocol versions
          const requestedVersion = request.params?.protocolVersion || "2024-11-05";
          const supportedVersions = ["2024-11-05", "2025-03-26"];
          const protocolVersion = supportedVersions.includes(requestedVersion) 
            ? requestedVersion 
            : "2024-11-05";
          
          result = {
            protocolVersion,
            capabilities: {
              tools: {},
              resources: {}
            },
            serverInfo: {
              name: "workshop-retail-catalog",
              version: "1.0.0"
            }
          };
          break;
          
        case "tools/list": {
          const handlers = (server as any)._requestHandlers;
          const handler = handlers.get("tools/list");
          if (!handler) throw new Error("Handler not found");
          result = await handler({ method: "tools/list", params: {} });
          break;
        }
        
        case "tools/call": {
          const handlers = (server as any)._requestHandlers;
          const handler = handlers.get("tools/call");
          if (!handler) throw new Error("Handler not found");
          result = await handler({ 
            method: "tools/call",
            params: request.params 
          });
          break;
        }
        
        case "resources/list": {
          const handlers = (server as any)._requestHandlers;
          const handler = handlers.get("resources/list");
          if (!handler) throw new Error("Handler not found");
          result = await handler({ method: "resources/list", params: {} });
          break;
        }
        
        case "resources/read": {
          const handlers = (server as any)._requestHandlers;
          const handler = handlers.get("resources/read");
          if (!handler) throw new Error("Handler not found");
          result = await handler({ 
            method: "resources/read",
            params: request.params 
          });
          break;
        }
        
        case "ping":
          result = {};
          break;
        
        case "notifications/initialized":
          // This is a notification, no response needed
          console.log("✅ Client sent initialized notification");
          return res.status(202).end();
          
        default:
          return res.status(400).json({
            jsonrpc: "2.0",
            error: {
              code: -32601,
              message: `Method not found: ${request.method}`
            },
            id: request.id || null
          });
      }
      
      // Prepare response
      const response = {
        jsonrpc: "2.0",
        result,
        id: request.id
      };

      console.log(`📦 Response prepared:`, JSON.stringify(response, null, 2));

      // Check if we have an SSE session to send the response through
      const client = newSessionId ? sessions.get(newSessionId) : null;
      
      if (client) {
        // Send response via SSE stream
        console.log(`📤 Sending response via SSE for session: ${newSessionId}`);
        console.log(`📊 Active sessions: ${sessions.size}, Session exists: ${!!client}`);
        sendSSEMessage(client, response);
        
        // Don't send body - just 202 Accepted status
        console.log(`✅ Sent 202 Accepted (no body)`);
        res.status(202).end();
      } else {
        // No SSE session - fall back to direct JSON response
        // This is allowed for clients that don't use SSE
        console.log(`📤 Sending direct JSON response (no SSE session)${newSessionId ? ` with session ID: ${newSessionId}` : ''}`);
        console.log(`📊 Active sessions: ${sessions.size}`);
        
        // Always set session ID header if we have one (especially for initialize)
        if (newSessionId) {
          res.setHeader("Mcp-Session-Id", newSessionId);
          console.log(`🔖 Set Mcp-Session-Id header: ${newSessionId}`);
        }
        
        res.json(response);
      }
      
    } catch (handlerError) {
      console.error("❌ Handler error:", handlerError);
      
      const errorResponse = {
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: handlerError instanceof Error ? handlerError.message : "Internal error"
        },
        id: request.id || null
      };

      console.log(`❌ Error response:`, JSON.stringify(errorResponse, null, 2));

      const client = sessionId ? sessions.get(sessionId) : null;
      
      if (client) {
        console.log(`📤 Sending error via SSE for session: ${sessionId}`);
        sendSSEMessage(client, errorResponse);
        res.status(500).end();
      } else {
        console.log(`📤 Sending error as direct JSON response`);
        res.status(500).json(errorResponse);
      }
    }
    
  } catch (error) {
    console.error("❌ MCP request error:", error);
    res.status(500).json({
      jsonrpc: "2.0",
      error: {
        code: -32603,
        message: error instanceof Error ? error.message : "Internal error"
      },
      id: req.body.id || null
    });
  }
});

// legacy (si ya lo usabas):
app.use("/docs", docsRouter);
app.use("/query-stock", stockRouter);

// nuevos endpoints “humanos”:
app.use("/categories", categoriesRouter);
app.use("/attributes", attributesRouter);
app.use("/query-products", productsRouter);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`✅ MCP listening on http://0.0.0.0:${port}`));
