import { LangGraphVoiceAgent } from "@/components/LangGraphVoiceAgent";

export default function VoiceAgentPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">Voice Agent Demo</h1>
        <p className="text-muted-foreground">
          Interact with our retail catalog using your voice
        </p>
      </div>
      
      <LangGraphVoiceAgent />
      
      <div className="mt-8 max-w-2xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4">Try asking:</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• "Show me blue handbags"</li>
          <li>• "Do you have product 12345 in stock?"</li>
          <li>• "What's your return policy?"</li>
          <li>• "Find me summer dresses under $50"</li>
          <li>• "What are your shipping options?"</li>
        </ul>
      </div>
    </div>
  );
}
