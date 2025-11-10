"use client";

import { useState, useRef } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Mic, MicOff, Volume2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "../../components/ui/alert";

const VOICE_AGENT_URL = process.env.NEXT_PUBLIC_VOICE_AGENT_URL || "http://localhost:5000";

export function LangGraphVoiceAgent() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    try {
      setError("");
      setTranscription("");
      setResponse("");
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendAudioToAgent(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Failed to access microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const sendAudioToAgent = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const response = await fetch(`${VOICE_AGENT_URL}/voice`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process audio");
      }

      const data = await response.json();
      
      setTranscription(data.transcribedText || "");
      setResponse(data.responseText || "");

      // Play audio response if available
      if (data.audioResponse) {
        playAudioResponse(data.audioResponse);
      }
    } catch (err) {
      console.error("Error sending audio:", err);
      setError(err instanceof Error ? err.message : "Failed to process audio");
    } finally {
      setIsProcessing(false);
    }
  };

  const playAudioResponse = (base64Audio: string) => {
    try {
      const audioData = atob(base64Audio);
      const audioArray = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }
      
      const audioBlob = new Blob([audioArray], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }
    } catch (err) {
      console.error("Error playing audio:", err);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-6 w-6" />
          LangGraph Voice Agent
        </CardTitle>
        <CardDescription>
          Ask about products, check stock, or inquire about store policies using your voice
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recording Controls */}
        <div className="flex justify-center">
          {!isRecording && !isProcessing && (
            <Button
              size="lg"
              onClick={startRecording}
              className="rounded-full h-20 w-20"
            >
              <Mic className="h-8 w-8" />
            </Button>
          )}
          
          {isRecording && (
            <Button
              size="lg"
              variant="destructive"
              onClick={stopRecording}
              className="rounded-full h-20 w-20 animate-pulse"
            >
              <MicOff className="h-8 w-8" />
            </Button>
          )}
          
          {isProcessing && (
            <Button
              size="lg"
              disabled
              className="rounded-full h-20 w-20"
            >
              <Loader2 className="h-8 w-8 animate-spin" />
            </Button>
          )}
        </div>

        {/* Status Text */}
        <div className="text-center text-sm text-muted-foreground">
          {isRecording && "🎤 Recording... Click to stop"}
          {isProcessing && "🔄 Processing your request..."}
          {!isRecording && !isProcessing && "Click the microphone to start"}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Transcription */}
        {transcription && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-1">You said:</p>
            <p className="text-sm">{transcription}</p>
          </div>
        )}

        {/* Response */}
        {response && (
          <div className="p-4 bg-primary/10 rounded-lg">
            <p className="text-sm font-medium mb-1">Assistant:</p>
            <p className="text-sm">{response}</p>
          </div>
        )}

        {/* Hidden audio element for playback */}
        <audio ref={audioRef} style={{ display: "none" }} />

        {/* Info */}
        <div className="text-xs text-muted-foreground text-center pt-4 border-t">
          Powered by LangGraph • ElevenLabs • MCP
        </div>
      </CardContent>
    </Card>
  );
}
