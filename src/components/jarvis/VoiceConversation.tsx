import { useState, useEffect, useRef, useCallback } from "react";
import { X, Mic, Volume2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Language } from "@/hooks/useSpeech";
import { RealtimeChat, RealtimeEvent } from "@/utils/RealtimeChat";

interface VoiceConversationProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onMessage: (userMessage: string, assistantResponse: string) => void;
}

const statusMessages = {
  en: {
    connecting: "Connecting...",
    listening: "Listening...",
    thinking: "Thinking...",
    speaking: "Speaking...",
    tapToSpeak: "Speak naturally",
    error: "Connection error",
  },
  it: {
    connecting: "Connessione...",
    listening: "Ascolto...",
    thinking: "Sto pensando...",
    speaking: "Sto parlando...",
    tapToSpeak: "Parla naturalmente",
    error: "Errore di connessione",
  },
};

type ConversationState = "connecting" | "idle" | "listening" | "processing" | "speaking" | "error";

export const VoiceConversation = ({
  isOpen,
  onClose,
  language,
  onMessage,
}: VoiceConversationProps) => {
  const [state, setState] = useState<ConversationState>("connecting");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [partialTranscript, setPartialTranscript] = useState("");
  
  const chatRef = useRef<RealtimeChat | null>(null);
  const currentUserTranscript = useRef<string>("");
  const currentAssistantResponse = useRef<string>("");

  const t = statusMessages[language];

  const handleRealtimeEvent = useCallback((event: RealtimeEvent) => {
    switch (event.type) {
      case "session.created":
        console.log("Session created");
        setState("idle");
        break;

      case "input_audio_buffer.speech_started":
        setState("listening");
        setPartialTranscript("");
        break;

      case "input_audio_buffer.speech_stopped":
        setState("processing");
        break;

      case "conversation.item.input_audio_transcription.completed":
        const userText = event.transcript || "";
        currentUserTranscript.current = userText;
        setTranscript(userText);
        setPartialTranscript("");
        break;

      case "response.created":
        setState("processing");
        currentAssistantResponse.current = "";
        break;

      case "response.audio_transcript.delta":
        currentAssistantResponse.current += event.delta || "";
        setResponse(currentAssistantResponse.current);
        setState("speaking");
        break;

      case "response.audio_transcript.done":
        setResponse(event.transcript || currentAssistantResponse.current);
        break;

      case "response.done":
        // Save the exchange to chat history
        if (currentUserTranscript.current && currentAssistantResponse.current) {
          onMessage(currentUserTranscript.current, currentAssistantResponse.current);
        }
        setState("idle");
        break;

      case "error":
        console.error("Realtime API error:", event);
        setState("error");
        break;

      default:
        // Log other events for debugging
        if (event.type.startsWith("response.") || event.type.startsWith("conversation.")) {
          console.log("Event:", event.type);
        }
    }
  }, [onMessage]);

  // Initialize connection when opened
  useEffect(() => {
    if (!isOpen) {
      chatRef.current?.disconnect();
      chatRef.current = null;
      setState("connecting");
      setTranscript("");
      setResponse("");
      setPartialTranscript("");
      currentUserTranscript.current = "";
      currentAssistantResponse.current = "";
      return;
    }

    const initChat = async () => {
      try {
        setState("connecting");
        chatRef.current = new RealtimeChat(handleRealtimeEvent);
        await chatRef.current.init(language);
      } catch (error) {
        console.error("Failed to initialize:", error);
        setState("error");
      }
    };

    initChat();

    return () => {
      chatRef.current?.disconnect();
      chatRef.current = null;
    };
  }, [isOpen, language, handleRealtimeEvent]);

  const handleClose = () => {
    chatRef.current?.disconnect();
    chatRef.current = null;
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl animate-fade-in">
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 safe-area-top w-12 h-12 rounded-full glass flex items-center justify-center hover:bg-secondary/50 transition-colors z-10"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Language indicator */}
      <div className="absolute top-4 left-4 safe-area-top px-3 py-1.5 rounded-full glass text-xs font-medium">
        {language === "en" ? "🇬🇧 English" : "🇮🇹 Italiano"}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Visual orb */}
        <div className="relative mb-8">
          {/* Outer rings */}
          <div
            className={cn(
              "absolute inset-0 rounded-full transition-all duration-500",
              state === "listening" && "animate-ping bg-primary/20",
              state === "speaking" && "animate-pulse bg-primary/30"
            )}
            style={{ transform: "scale(1.5)" }}
          />
          <div
            className={cn(
              "absolute inset-0 rounded-full transition-all duration-700",
              state === "listening" && "animate-ping bg-primary/10",
              state === "speaking" && "animate-pulse bg-primary/20"
            )}
            style={{ transform: "scale(2)", animationDelay: "200ms" }}
          />

          {/* Main orb */}
          <div
            className={cn(
              "relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-soft",
              state === "connecting" && "bg-secondary animate-pulse",
              state === "idle" && "bg-gradient-accent",
              state === "listening" && "bg-gradient-accent scale-110 shadow-glow",
              state === "processing" && "bg-secondary animate-pulse",
              state === "speaking" && "bg-gradient-accent shadow-glow",
              state === "error" && "bg-destructive/50"
            )}
          >
            {state === "connecting" ? (
              <Loader2 className="w-12 h-12 text-primary-foreground animate-spin" />
            ) : state === "listening" ? (
              <div className="flex items-center gap-1">
                <span className="w-1 h-8 bg-primary-foreground rounded-full animate-[typing-dot_0.8s_ease-in-out_infinite]" />
                <span className="w-1 h-12 bg-primary-foreground rounded-full animate-[typing-dot_0.8s_ease-in-out_infinite_0.2s]" />
                <span className="w-1 h-6 bg-primary-foreground rounded-full animate-[typing-dot_0.8s_ease-in-out_infinite_0.4s]" />
                <span className="w-1 h-10 bg-primary-foreground rounded-full animate-[typing-dot_0.8s_ease-in-out_infinite_0.6s]" />
                <span className="w-1 h-4 bg-primary-foreground rounded-full animate-[typing-dot_0.8s_ease-in-out_infinite_0.8s]" />
              </div>
            ) : state === "processing" ? (
              <Loader2 className="w-12 h-12 text-primary-foreground animate-spin" />
            ) : state === "speaking" ? (
              <Volume2 className="w-12 h-12 text-primary-foreground animate-pulse" />
            ) : (
              <Mic className="w-12 h-12 text-primary-foreground" />
            )}
          </div>
        </div>

        {/* Status text */}
        <p className="text-lg font-medium text-foreground mb-4">
          {state === "connecting" && t.connecting}
          {state === "idle" && t.tapToSpeak}
          {state === "listening" && t.listening}
          {state === "processing" && t.thinking}
          {state === "speaking" && t.speaking}
          {state === "error" && t.error}
        </p>

        {/* Transcript display */}
        <div className="w-full max-w-md min-h-[120px] flex flex-col items-center justify-center text-center px-4">
          {transcript && (
            <div className="animate-fade-in mb-4">
              <p className="text-sm text-muted-foreground mb-1">
                {language === "en" ? "You said:" : "Hai detto:"}
              </p>
              <p className="text-lg">{transcript}</p>
            </div>
          )}

          {response && (
            <div className="animate-fade-in">
              <p className="text-sm text-muted-foreground mb-1">Jarvis:</p>
              <p className="text-lg text-primary">{response}</p>
            </div>
          )}

          {state === "error" && (
            <button
              onClick={() => {
                setState("connecting");
                const initChat = async () => {
                  try {
                    chatRef.current = new RealtimeChat(handleRealtimeEvent);
                    await chatRef.current.init(language);
                  } catch {
                    setState("error");
                  }
                };
                initChat();
              }}
              className="mt-4 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm"
            >
              {language === "en" ? "Retry" : "Riprova"}
            </button>
          )}
        </div>
      </div>

      {/* Bottom hint */}
      <div className="pb-8 safe-area-bottom text-center">
        <p className="text-xs text-muted-foreground">
          {language === "en"
            ? "Just speak - Jarvis will respond automatically"
            : "Parla - Jarvis risponderà automaticamente"}
        </p>
      </div>
    </div>
  );
};
