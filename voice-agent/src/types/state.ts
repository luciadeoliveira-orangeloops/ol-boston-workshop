/**
 * State interface for the voice agent graph
 */
export interface VoiceAgentState {
  // Input
  audioBuffer?: Buffer;
  
  // Speech-to-text output
  transcribedText?: string;
  
  // Health check
  healthStatus?: {
    backend: boolean;
    mcp: boolean;
    elevenlabs: boolean;
  };
  
  // Intent detection
  intent?: "stock" | "policy" | "product_search" | "general" | "unknown";
  intentParams?: Record<string, any>;
  
  // MCP call results
  mcpToolName?: string;
  mcpResponse?: string;
  
  // Final response
  responseText?: string;
  audioResponse?: Buffer;
  
  // Error handling
  error?: string;
}
