import { VoiceAgentAnnotation } from "../graph.js";
import { speechToText } from "../services/elevenlabs.js";

/**
 * Node: Speech to Text
 * Converts audio buffer to text using ElevenLabs
 */
export async function speechToTextNode(
  state: typeof VoiceAgentAnnotation.State
): Promise<Partial<typeof VoiceAgentAnnotation.State>> {
  console.log("🎤 [Speech-to-Text] Starting transcription...");

  try {
    if (!state.audioBuffer) {
      throw new Error("No audio buffer provided");
    }

    const transcribedText = await speechToText(state.audioBuffer);
    console.log(`🎤 [Speech-to-Text] Transcribed: "${transcribedText}"`);

    return { transcribedText };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ [Speech-to-Text] Error:", errorMessage);
    return { error: `Speech-to-text failed: ${errorMessage}` };
  }
}
