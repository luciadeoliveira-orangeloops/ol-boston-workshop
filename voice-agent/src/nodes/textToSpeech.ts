import { VoiceAgentAnnotation } from "../graph.js";
import { textToSpeech } from "../services/elevenlabs.js";

/**
 * Node: Text to Speech
 * Converts the response text to audio using ElevenLabs
 */
export async function textToSpeechNode(
  state: typeof VoiceAgentAnnotation.State
): Promise<Partial<typeof VoiceAgentAnnotation.State>> {
  console.log("🔊 [Text-to-Speech] Converting text to speech...");

  try {
    if (!state.responseText) {
      throw new Error("No response text available");
    }

    const audioResponse = await textToSpeech(state.responseText);
    console.log(`🔊 [Text-to-Speech] Generated audio (${audioResponse.length} bytes)`);

    return { audioResponse };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ [Text-to-Speech] Error:", errorMessage);
    
    // Don't block the response if TTS fails
    return {
      error: `Text-to-speech failed: ${errorMessage}`,
    };
  }
}
