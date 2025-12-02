import { useState, useEffect, useRef, useCallback } from "react";
import { X, Mic, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Language } from "@/hooks/useSpeech";
import type { SpeechRecognitionInstance } from "@/types/speech";

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

const dummyResponses = {
  en: [
    "I've noted that down! Is there anything else you'd like me to help with?",
    "Great question! Based on your schedule, I'd recommend tackling that tomorrow morning.",
    "I've checked your calendar and you have a free slot at 3 PM today.",
    "Sure thing! I'll add that to your task list with high priority.",
    "That's a great idea! Let me know how I can help further.",
    "I understand. Would you like me to set a reminder for that?",
    "Absolutely! I'm here to help with whatever you need.",
  ],
  it: [
    "Ho preso nota! C'è qualcos'altro in cui posso aiutarti?",
    "Ottima domanda! Ti consiglio di affrontarlo domani mattina.",
    "Ho controllato il tuo calendario e hai uno slot libero alle 15:00.",
    "Certo! Lo aggiungerò alla tua lista con priorità alta.",
    "Ottima idea! Fammi sapere come posso aiutarti ancora.",
    "Capisco. Vuoi che imposti un promemoria per questo?",
    "Assolutamente! Sono qui per aiutarti con tutto ciò di cui hai bisogno.",
  ],
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
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const t = statusMessages[language];

  // Get best voice for language
  const getVoice = useCallback(() => {
    const voices = window.speechSynthesis.getVoices();
    const langCode = language === "en" ? "en" : "it";
    return voices.find((v) => v.lang.startsWith(langCode)) || voices[0];
  }, [language]);

  // Speak text
  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      synthRef.current = utterance;
      
      const voice = getVoice();
      if (voice) utterance.voice = voice;
      
      utterance.lang = languageCodes[language];
      utterance.rate = 1;
      utterance.pitch = 1;

      utterance.onend = () => {
        setState("idle");
        onEnd?.();
      };

      utterance.onerror = () => {
        setState("idle");
      };

      setState("speaking");
      window.speechSynthesis.speak(utterance);
    },
    [language, getVoice]
  );

  // Stop everything
  const stopAll = useCallback(() => {
    recognitionRef.current?.stop();
    window.speechSynthesis.cancel();
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
    }
    setState("idle");
    setInterimTranscript("");
  }, []);

  // Generate response
  const generateResponse = useCallback(
    (userText: string) => {
      setState("processing");
      setTranscript(userText);

      // Simulate AI thinking
      setTimeout(() => {
        const responses = dummyResponses[language];
        const responseText = responses[Math.floor(Math.random() * responses.length)];
        setResponse(responseText);
        
        // Save to chat history
        onMessage(userText, responseText);
        
        // Speak the response
        speak(responseText, () => {
          // After speaking, go back to idle (user can tap to continue)
        });
      }, 500 + Math.random() * 1000);
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

    recognition.onresult = (event) => {
      let interim = "";
      
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + " ";
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
      window.speechSynthesis.cancel();
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

  // Load voices
  useEffect(() => {
    window.speechSynthesis.getVoices();
  }, []);

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
