import { useState, useEffect, useRef, useCallback } from "react";
import { X, Mic, Volume2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Language } from "@/hooks/useSpeech";
import { RealtimeChat, RealtimeEvent } from "@/utils/RealtimeChat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VoiceConversationProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onMessage: (userMessage: string, assistantResponse: string) => void;
  onToolResult?: (results: any[]) => void;
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

// Execute tool and return result
async function executeTool(name: string, args: Record<string, unknown>, language: Language): Promise<{ success: boolean; message: string; data?: any }> {
  console.log("Executing tool:", name, args);
  
  try {
    if (name === "add_task") {
      const { data: task, error } = await supabase
        .from('tasks')
        .insert({
          title: args.title as string,
          client: (args.client as string) || null,
          priority: (args.priority as string) || 'medium',
          completed: false
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        message: language === 'it' 
          ? `Attività "${task.title}" aggiunta alla lista.`
          : `Task "${task.title}" added to your list.`,
        data: task
      };
    } 
    
    if (name === "add_appointment") {
      const { data: appointment, error } = await supabase
        .from('appointments')
        .insert({
          title: args.title as string,
          client: (args.client as string) || null,
          date: args.date as string,
          duration: (args.duration as number) || 30,
          location: (args.location as string) || null,
          color: 'blue'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        success: true,
        message: language === 'it'
          ? `Appuntamento "${appointment.title}" programmato.`
          : `Appointment "${appointment.title}" scheduled.`,
        data: appointment
      };
    } 
    
    if (name === "generate_file") {
      const { data: file, error } = await supabase
        .from('generated_files')
        .insert({
          filename: args.filename as string,
          content: args.content as string,
          mime_type: (args.mime_type as string) || 'text/plain'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success(language === 'it' ? 'File generato!' : 'File generated!', {
        description: file.filename
      });
      
      return {
        success: true,
        message: language === 'it'
          ? `File "${file.filename}" generato con successo.`
          : `File "${file.filename}" generated successfully.`,
        data: file
      };
    }
    
    return { success: false, message: `Unknown tool: ${name}` };
  } catch (error) {
    console.error("Tool execution error:", error);
    return { 
      success: false, 
      message: `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

export const VoiceConversation = ({
  isOpen,
  onClose,
  language,
  onMessage,
  onToolResult,
}: VoiceConversationProps) => {
  const [state, setState] = useState<ConversationState>("connecting");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [partialTranscript, setPartialTranscript] = useState("");
  
  const chatRef = useRef<RealtimeChat | null>(null);
  const currentUserTranscript = useRef<string>("");
  const currentAssistantResponse = useRef<string>("");
  const pendingToolCalls = useRef<Map<string, { name: string; arguments: string }>>(new Map());

  const t = statusMessages[language];

  const handleRealtimeEvent = useCallback(async (event: RealtimeEvent) => {
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

      // Handle function call arguments being built
      case "response.function_call_arguments.delta":
        // Accumulate arguments
        const callId = event.call_id as string;
        const existing = pendingToolCalls.current.get(callId);
        if (existing) {
          existing.arguments += event.delta || "";
        } else {
          pendingToolCalls.current.set(callId, {
            name: event.name || "",
            arguments: event.delta || ""
          });
        }
        break;

      // Handle completed function call
      case "response.function_call_arguments.done":
        const toolCallId = event.call_id as string;
        const toolName = event.name as string;
        const toolArgs = event.arguments as string;
        
        console.log("Function call completed:", toolName, toolArgs);
        
        try {
          const parsedArgs = JSON.parse(toolArgs);
          const result = await executeTool(toolName, parsedArgs, language);
          
          // Notify parent about tool result
          if (onToolResult && result.data) {
            onToolResult([{ type: toolName.replace('add_', '').replace('generate_', ''), success: result.success, data: result.data }]);
          }
          
          // Send result back to the conversation
          chatRef.current?.sendToolResult(toolCallId, JSON.stringify(result));
        } catch (error) {
          console.error("Error executing tool:", error);
          chatRef.current?.sendToolResult(toolCallId, JSON.stringify({ 
            success: false, 
            message: "Error executing tool" 
          }));
        }
        
        // Clean up
        pendingToolCalls.current.delete(toolCallId);
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
  }, [onMessage, onToolResult, language]);

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
              <p className="text-sm text-muted-foreground mb-1">FRIDAY:</p>
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
            ? "Just speak - FRIDAY will respond automatically"
            : "Parla - FRIDAY risponderà automaticamente"}
        </p>
      </div>
    </div>
  );
};
