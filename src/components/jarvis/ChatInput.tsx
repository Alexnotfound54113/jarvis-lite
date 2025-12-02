import { useState, useRef, useEffect } from "react";
import { Mic, Send, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Language } from "@/hooks/useSpeech";

// Web Speech API type declarations
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  language?: Language;
}

const languageCodes = {
  en: "en-US",
  it: "it-IT",
};

export const ChatInput = ({
  onSend,
  isLoading,
  placeholder = "Ask Jarvis anything...",
  language = "en",
}: ChatInputProps) => {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);

  // Initialize and update speech recognition when language changes
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
      // Stop any existing recognition
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }

      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = languageCodes[language];

      recognitionRef.current.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join("");
        setInput(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };
    }

    return () => {
      recognitionRef.current?.stop();
    };
  }, [language]);

  const toggleListening = async () => {
    if (!recognitionRef.current) {
      alert(
        language === "en"
          ? "Speech recognition is not supported in your browser."
          : "Il riconoscimento vocale non è supportato nel tuo browser."
      );
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        alert(
          language === "en"
            ? "Please allow microphone access to use voice input."
            : "Consenti l'accesso al microfono per usare l'input vocale."
        );
      }
    }
  };

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="glass-subtle rounded-2xl p-2 shadow-soft safe-area-bottom">
      <div className="flex items-end gap-2">
        <button
          onClick={toggleListening}
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all",
            isListening
              ? "bg-destructive text-destructive-foreground animate-mic-pulse"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
          aria-label={isListening ? "Stop listening" : "Start voice input"}
        >
          {isListening ? (
            <MicOff className="w-5 h-5" />
          ) : (
            <Mic className="w-5 h-5" />
          )}
        </button>

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="flex-1 bg-transparent resize-none text-[15px] placeholder:text-muted-foreground focus:outline-none py-2.5 px-1 max-h-[120px] scrollbar-hide"
        />

        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all",
            input.trim() && !isLoading
              ? "bg-gradient-accent text-primary-foreground shadow-glow"
              : "bg-muted text-muted-foreground"
          )}
          aria-label="Send message"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// Type declarations for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}
