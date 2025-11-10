import fetch from "node-fetch";

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://mcp:4000";

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPToolResult {
  content: Array<{
    type: string;
    text: string;
  }>;
  isError?: boolean;
}

/**
 * Initialize connection to MCP server
 * The MCP server uses JSON-RPC 2.0 protocol over HTTP
 */
export async function initializeMCPClient(): Promise<void> {
  try {
    const response = await fetch(`${MCP_SERVER_URL}/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: {
            name: "voice-agent",
            version: "1.0.0",
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if ((result as any).error) {
      throw new Error(`MCP Error: ${(result as any).error.message}`);
    }
    
    console.log("✅ MCP client initialized successfully");
    
    // List available tools
    const tools = await listTools();
    console.log(`📋 Available MCP tools: ${tools.map(t => t.name).join(", ")}`);
  } catch (error) {
    console.error("❌ Failed to initialize MCP client:", error);
    throw error;
  }
}

/**
 * List available tools from MCP server
 */
export async function listTools(): Promise<MCPTool[]> {
  const response = await fetch(`${MCP_SERVER_URL}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json() as any;
  
  if (result.error) {
    throw new Error(`MCP Error: ${result.error.message}`);
  }

  return result.result.tools;
}

/**
 * Call a tool on the MCP server
 */
export async function callTool(
  toolName: string,
  args: Record<string, any>
): Promise<MCPToolResult> {
  const response = await fetch(`${MCP_SERVER_URL}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Math.floor(Math.random() * 1000000),
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json() as any;
  
  if (result.error) {
    throw new Error(`MCP Tool Error: ${result.error.message}`);
  }

  return result.result;
}

/**
 * Read a resource from the MCP server
 */
export async function readResource(uri: string): Promise<string> {
  const response = await fetch(`${MCP_SERVER_URL}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Math.floor(Math.random() * 1000000),
      method: "resources/read",
      params: { uri },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const result = await response.json() as any;
  
  if (result.error) {
    throw new Error(`MCP Resource Error: ${result.error.message}`);
  }

  return result.result.contents[0]?.text || "";
}

/**
 * Close the MCP client connection (no-op for HTTP transport)
 */
export async function closeMCPClient(): Promise<void> {
  console.log("✅ MCP client closed");
}
