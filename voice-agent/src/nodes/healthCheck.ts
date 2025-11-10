import { VoiceAgentAnnotation } from "../graph.js";
import fetch from "node-fetch";

const BACKEND_URL = process.env.BACKEND_URL || "http://backend:3001";
const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "http://mcp:4000";
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";

/**
 * Node: Health Check
 * Verifies that all required services are available
 */
export async function healthCheckNode(
  state: typeof VoiceAgentAnnotation.State
): Promise<Partial<typeof VoiceAgentAnnotation.State>> {
  console.log("🏥 [Health Check] Checking services...");

  const healthStatus = {
    backend: false,
    mcp: false,
    elevenlabs: false,
  };

  // Check backend
  try {
    const backendResponse = await fetch(`${BACKEND_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    healthStatus.backend = backendResponse.ok;
  } catch (error) {
    console.warn("⚠️ [Health Check] Backend not available");
  }

  // Check MCP server
  try {
    const mcpResponse = await fetch(`${MCP_SERVER_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    healthStatus.mcp = mcpResponse.ok;
  } catch (error) {
    console.warn("⚠️ [Health Check] MCP server not available");
  }

  // Check ElevenLabs (basic check - API key present)
  healthStatus.elevenlabs = !!ELEVENLABS_API_KEY;

  console.log("🏥 [Health Check] Status:", healthStatus);

  // If critical services are down, set error
  if (!healthStatus.mcp) {
    return {
      healthStatus,
      error: "MCP server is not available",
    };
  }

  if (!healthStatus.elevenlabs) {
    return {
      healthStatus,
      error: "ElevenLabs API key not configured",
    };
  }

  return { healthStatus };
}
