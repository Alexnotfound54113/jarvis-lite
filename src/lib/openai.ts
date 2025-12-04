import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ToolResult {
  type: "task" | "appointment" | "file";
  success: boolean;
  data?: any;
  error?: string;
}

export interface ChatResponse {
  reply: string;
  toolResults?: ToolResult[];
}

export async function sendMessageToAI(
  message: string,
  language: "en" | "it",
  conversationHistory: ChatMessage[] = [],
  conversationId?: string | null
): Promise<ChatResponse> {
  const messages = [
    ...conversationHistory,
    { role: "user" as const, content: message },
  ];

  const { data, error } = await supabase.functions.invoke("chat", {
    body: { messages, language, conversationId },
  });

  if (error) {
    console.error("Error calling chat function:", error);
    throw new Error("Sorry, I couldn't reach the server. Try again?");
  }

  if (data?.error) {
    console.error("Chat function returned error:", data.error);
    throw new Error(data.error);
  }

  return {
    reply: data?.reply || "Sorry, I couldn't generate a response.",
    toolResults: data?.toolResults,
  };
}
