import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import { processVoiceRequest, VoiceAgentAnnotation } from "./graph.js";
import { initializeMCPClient } from "./services/mcpClient.js";

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// CORS configuration
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Health check
app.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    service: "voice-agent",
    version: "1.0.0",
  });
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

/**
 * POST /voice
 * Main endpoint to process voice input
 * Accepts: multipart/form-data with 'audio' field
 * Returns: JSON with text response and audio response (base64)
 */
app.post(
  "/voice",
  upload.single("audio"),
  async (req: Request, res: Response) => {
    console.log("📨 [API] Received voice request");

    try {
      if (!req.file) {
        return res.status(400).json({
          error: "No audio file provided",
        });
      }

      const audioBuffer = req.file.buffer;
      console.log(`📨 [API] Audio size: ${audioBuffer.length} bytes`);

      // Process the audio through the LangGraph
      const result = await processVoiceRequest(audioBuffer);

      // Check for errors
      if (result.error) {
        return res.status(500).json({
          error: result.error,
          transcribedText: result.transcribedText,
        });
      }

      // Return the response
      const response: any = {
        transcribedText: result.transcribedText,
        intent: result.intent,
        responseText: result.responseText,
      };

      // Include audio response as base64 if available
      if (result.audioResponse) {
        response.audioResponse = result.audioResponse.toString("base64");
        response.audioMimeType = "audio/mpeg";
      }

      // Include debug info if requested
      if (req.query.debug === "true") {
        response.debug = {
          healthStatus: result.healthStatus,
          intentParams: result.intentParams,
          mcpToolName: result.mcpToolName,
        };
      }

      console.log("✅ [API] Request processed successfully");
      res.json(response);
    } catch (error) {
      console.error("❌ [API] Error processing request:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * POST /text
 * Text-only endpoint for testing (bypasses speech-to-text)
 */
app.post("/text", async (req: Request, res: Response) => {
  console.log("📨 [API] Received text request");

  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        error: "No text provided",
      });
    }

    const { createVoiceAgentGraph } = await import("./graph.js");
    const { healthCheckNode } = await import("./nodes/healthCheck.js");
    const { intentDetectionNode } = await import("./nodes/intentDetection.js");
    const { mcpCallNode } = await import("./nodes/mcpCall.js");
    const { textToSpeechNode } = await import("./nodes/textToSpeech.js");

    // Create initial state simulating speech-to-text output
    const initialState = {
      transcribedText: text,
      audioBuffer: undefined,
    };

    // Build custom graph without speech-to-text
    const { StateGraph, START, END } = await import("@langchain/langgraph");
    
    const textOnlyGraph = new StateGraph(VoiceAgentAnnotation)
      .addNode("healthCheck", healthCheckNode)
      .addNode("intentDetection", intentDetectionNode)
      .addNode("mcpCall", mcpCallNode)
      .addNode("textToSpeech", textToSpeechNode)
      .addEdge(START, "healthCheck")
      .addConditionalEdges("healthCheck", (state: any) => {
        if (state.error) return END;
        return "intentDetection";
      }, {
        intentDetection: "intentDetection",
        __end__: END,
      })
      .addEdge("intentDetection", "mcpCall")
      .addEdge("mcpCall", "textToSpeech")
      .addEdge("textToSpeech", END)
      .compile();

    const result = await textOnlyGraph.invoke(initialState);

    // Return response
    const response: any = {
      transcribedText: result.transcribedText,
      intent: result.intent,
      responseText: result.responseText,
    };

    if (result.audioResponse) {
      response.audioResponse = result.audioResponse.toString("base64");
      response.audioMimeType = "audio/mpeg";
    }

    console.log("✅ [API] Text request processed successfully");
    res.json(response);
  } catch (error) {
    console.error("❌ [API] Error processing text request:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Initialize MCP client and start server
const PORT = Number(process.env.PORT || 5000);

async function startServer() {
  try {
    console.log("🔄 Initializing MCP client...");
    await initializeMCPClient();
    console.log("✅ MCP client initialized");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Voice Agent API listening on http://0.0.0.0:${PORT}`);
      console.log(`\n📋 Available endpoints:`);
      console.log(`   POST /voice - Process voice input (multipart/form-data)`);
      console.log(`   POST /text  - Process text input (JSON)`);
      console.log(`   GET  /health - Health check\n`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
