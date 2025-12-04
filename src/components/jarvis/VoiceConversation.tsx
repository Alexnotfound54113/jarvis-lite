import { useState, useEffect, useRef, useCallback } from "react";
import { X, Mic, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Language } from "@/hooks/useSpeech";
import type { SpeechRecognitionInstance } from "@/types/speech";
import { sendMessageToAI, ChatMessage } from "@/lib/openai";
import { speakWithJarvis, stopJarvisSpeech } from "@/lib/tts";

interface VoiceConversationProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onMessage: (userMessage: string, assistantResponse: string) => void;
}

const languageCodes = {
  en: "en-US",
  it: "it-IT",
};

const statusMessages = {
  en: {
    listening: "Listening...",
    thinking: "Thinking...",
    speaking: "Speaking...",
    tapToSpeak: "Tap to speak",
    processing: "Processing...",
  },
  it: {
    listening: "Ascolto...",
    thinking: "Sto pensando...",
    speaking: "Sto parlando...",
    tapToSpeak: "Tocca per parlare",
    processing: "Elaborazione...",
  },
};

type ConversationState = "idle" | "listening" | "processing" | "speaking";

export const VoiceConversation = ({
  isOpen,
  onClose,
  language,
  onMessage,
}: VoiceConversationProps) => {
  const [state, setState] = useState<ConversationState>("idle");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const conversationHistoryRef = useRef<ChatMessage[]>([]);

  const t = statusMessages[language];

  // Speak text using Fish Audio
  const speak = useCallback(
    async (text: string, onEnd?: () => void) => {
      stopJarvisSpeech();
      setState("speaking");
      
      try {
        await speakWithJarvis(
          text,
          undefined,
          () => {
            setState("idle");
            onEnd?.();
          }
        );
      } catch (error) {
        console.error("Error speaking:", error);
        setState("idle");
        onEnd?.();
      }
    },
    []
  );

  // Stop everything
  const stopAll = useCallback(() => {
    recognitionRef.current?.stop();
    stopJarvisSpeech();
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    setState("idle");
    setInterimTranscript("");
  }, []);

  // Generate response
  const generateResponse = useCallback(
    async (userText: string) => {
      setState("processing");
      setTranscript(userText);

      try {
        const { reply: responseText } = await sendMessageToAI(
          userText,
          language,
          conversationHistoryRef.current
        );

        // Update conversation history
        conversationHistoryRef.current.push(
          { role: "user", content: userText },
          { role: "assistant", content: responseText }
        );

        setResponse(responseText);
        
        // Save to chat history
        onMessage(userText, responseText);
        
        // Speak the response
        speak(responseText, () => {
          // After speaking, go back to idle (user can tap to continue)
        });
      } catch (error) {
        const errorMessage = language === "en"
          ? "Sorry, I couldn't reach the server. Try again?"
          : "Scusa, non riesco a raggiungere il server. Riprova?";
        setResponse(errorMessage);
        speak(errorMessage);
      }
    },
    [language, onMessage, speak]
  );

  // Start listening
  const startListening = useCallback(() => {
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      alert(
        language === "en"
          ? "Speech recognition not supported"
          : "Riconoscimento vocale non supportato"
      );
      return;
    }

    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    const recognition = new SpeechRecognitionAPI() as SpeechRecognitionInstance;
    recognitionRef.current = recognition;
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = languageCodes[language];

    let finalTranscript = "";
    let lastProcessedIndex = 0;

    recognition.onresult = (event) => {
      let interim = "";
      
      // Only process new results to avoid duplicates
      for (let i = lastProcessedIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " ";
          lastProcessedIndex = i + 1;
        } else {
          interim += result[0].transcript;
        }
      }

      setInterimTranscript(interim);
      setTranscript(finalTranscript.trim());

      // Reset silence timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }

      // If we have final transcript, wait for silence then process
      if (finalTranscript.trim()) {
        silenceTimeoutRef.current = setTimeout(() => {
          recognition.stop();
          if (finalTranscript.trim()) {
            generateResponse(finalTranscript.trim());
          }
        }, 1500);
      }
    };

    recognition.onend = () => {
      if (state === "listening" && !finalTranscript.trim()) {
        setState("idle");
      }
    };

    recognition.onerror = () => {
      setState("idle");
    };

    setTranscript("");
    setResponse("");
    setInterimTranscript("");
    setState("listening");
    recognition.start();
  }, [language, generateResponse, state]);

  // Handle main button tap
  const handleButtonTap = () => {
    if (state === "idle") {
      startListening();
    } else if (state === "listening") {
      // Stop listening and process what we have
      recognitionRef.current?.stop();
      if (transcript.trim()) {
        generateResponse(transcript.trim());
      } else {
        setState("idle");
      }
    } else if (state === "speaking") {
      // Stop speaking
      stopJarvisSpeech();
      setState("idle");
    }
  };

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      stopAll();
      setTranscript("");
      setResponse("");
    }
  }, [isOpen, stopAll]);


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-xl animate-fade-in">
      {/* Close button */}
      <button
        onClick={onClose}
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

          {/* Main button */}
          <button
            onClick={handleButtonTap}
            className={cn(
              "relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-soft",
              state === "idle" && "bg-gradient-accent hover:scale-105",
              state === "listening" && "bg-gradient-accent scale-110 shadow-glow",
              state === "processing" && "bg-secondary animate-pulse",
              state === "speaking" && "bg-gradient-accent shadow-glow"
            )}
          >
            {state === "listening" ? (
              <div className="flex items-center gap-1">
                <span className="w-1 h-8 bg-primary-foreground rounded-full animate-[typing-dot_0.8s_ease-in-out_infinite]" />
                <span className="w-1 h-12 bg-primary-foreground rounded-full animate-[typing-dot_0.8s_ease-in-out_infinite_0.2s]" />
                <span className="w-1 h-6 bg-primary-foreground rounded-full animate-[typing-dot_0.8s_ease-in-out_infinite_0.4s]" />
                <span className="w-1 h-10 bg-primary-foreground rounded-full animate-[typing-dot_0.8s_ease-in-out_infinite_0.6s]" />
                <span className="w-1 h-4 bg-primary-foreground rounded-full animate-[typing-dot_0.8s_ease-in-out_infinite_0.8s]" />
              </div>
            ) : state === "speaking" ? (
              <Volume2 className="w-12 h-12 text-primary-foreground animate-pulse" />
            ) : (
              <Mic className="w-12 h-12 text-primary-foreground" />
            )}
          </button>
        </div>

        {/* Status text */}
        <p className="text-lg font-medium text-foreground mb-4">
          {state === "idle" && t.tapToSpeak}
          {state === "listening" && t.listening}
          {state === "processing" && t.thinking}
          {state === "speaking" && t.speaking}
        </p>

        {/* Transcript display */}
        <div className="w-full max-w-md min-h-[120px] flex flex-col items-center justify-center text-center px-4">
          {(transcript || interimTranscript) && state !== "speaking" && (
            <div className="animate-fade-in">
              <p className="text-sm text-muted-foreground mb-1">
                {language === "en" ? "You said:" : "Hai detto:"}
              </p>
              <p className="text-lg">
                {transcript}
                {interimTranscript && (
                  <span className="text-muted-foreground/60">{interimTranscript}</span>
                )}
              </p>
            </div>
          )}

          {response && state === "speaking" && (
            <div className="animate-fade-in">
              <p className="text-sm text-muted-foreground mb-1">Jarvis:</p>
              <p className="text-lg text-primary">{response}</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom hint */}
      <div className="pb-8 safe-area-bottom text-center">
        <p className="text-xs text-muted-foreground">
          {language === "en"
            ? "Tap the orb to start or stop"
            : "Tocca l'orb per iniziare o fermare"}
        </p>
      </div>
    </div>
  );
};
