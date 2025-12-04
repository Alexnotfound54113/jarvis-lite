import { useState, useCallback, useRef, useEffect } from "react";
import { Message } from "@/components/friday/ChatMessage";
import { Language } from "@/hooks/useSpeech";
import { sendMessageToAI, ChatMessage } from "@/lib/openai";

const welcomeMessages = {
  en: "Good morning! I'm FRIDAY, your personal assistant. I have full memory of our conversations and can manage your tasks and appointments directly. How can I help you?",
  it: "Buongiorno! Sono FRIDAY, la tua assistente personale. Ho piena memoria delle nostre conversazioni e posso gestire le tue attività e appuntamenti direttamente. Come posso aiutarti?",
};

const generateId = () => Math.random().toString(36).substring(2, 9);

interface UseFridayProps {
  language: Language;
  conversationId: string | null;
  saveMessage: (role: "user" | "assistant", content: string) => Promise<void>;
  loadConversationHistory: () => Promise<{ role: string; content: string }[]>;
  onToolResult?: (results: any[]) => void;
}

export const useFriday = ({
  language,
  conversationId,
  saveMessage,
  loadConversationHistory,
  onToolResult,
}: UseFridayProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: welcomeMessages[language],
      role: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastAssistantMessage, setLastAssistantMessage] = useState<string | null>(null);
  const conversationHistoryRef = useRef<ChatMessage[]>([]);
  const historyLoadedRef = useRef(false);

  // Load conversation history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (historyLoadedRef.current) return;
      historyLoadedRef.current = true;

      const history = await loadConversationHistory();
      if (history.length > 0) {
        // Convert to display messages
        const displayMessages: Message[] = history.map((msg, idx) => ({
          id: `history-${idx}`,
          content: msg.content,
          role: msg.role as "user" | "assistant",
          timestamp: new Date(),
        }));

        // Add welcome message at start
        setMessages([
          {
            id: "welcome",
            content: welcomeMessages[language],
            role: "assistant",
            timestamp: new Date(),
          },
          ...displayMessages,
        ]);

        // Set conversation history for AI context
        conversationHistoryRef.current = history.map((msg) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        }));
      }
    };

    loadHistory();
  }, [loadConversationHistory, language]);

  // Update welcome message when language changes
  const updateWelcomeMessage = useCallback((lang: Language) => {
    setMessages((prev) => {
      if (prev.length >= 1 && prev[0].id === "welcome") {
        return [
          {
            ...prev[0],
            content: welcomeMessages[lang],
          },
          ...prev.slice(1),
        ];
      }
      return prev;
    });
  }, []);

  const sendMessage = useCallback(
    async (content: string, lang: Language) => {
      const userMessage: Message = {
        id: generateId(),
        content,
        role: "user",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setLastAssistantMessage(null);

      // Save user message to database
      await saveMessage("user", content);

      try {
        const { reply, toolResults } = await sendMessageToAI(
          content,
          lang,
          conversationHistoryRef.current,
          conversationId
        );

        // Update conversation history
        conversationHistoryRef.current.push(
          { role: "user", content },
          { role: "assistant", content: reply }
        );

        const assistantMessage: Message = {
          id: generateId(),
          content: reply,
          role: "assistant",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setLastAssistantMessage(reply);

        // Save assistant message to database
        await saveMessage("assistant", reply);

        // Notify about tool results
        if (toolResults && toolResults.length > 0 && onToolResult) {
          onToolResult(toolResults);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Sorry, I couldn't reach the server. Try again?";
        const assistantMessage: Message = {
          id: generateId(),
          content: errorMessage,
          role: "assistant",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setLastAssistantMessage(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [conversationId, saveMessage, onToolResult]
  );

  const addVoiceExchange = useCallback(
    async (userText: string, assistantText: string) => {
      const userMessage: Message = {
        id: generateId(),
        content: userText,
        role: "user",
        timestamp: new Date(),
      };
      const assistantMessage: Message = {
        id: generateId(),
        content: assistantText,
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage, assistantMessage]);

      // Save both to database
      await saveMessage("user", userText);
      await saveMessage("assistant", assistantText);

      // Update conversation history
      conversationHistoryRef.current.push(
        { role: "user", content: userText },
        { role: "assistant", content: assistantText }
      );
    },
    [saveMessage]
  );

  return {
    messages,
    isLoading,
    sendMessage,
    lastAssistantMessage,
    updateWelcomeMessage,
    addVoiceExchange,
  };
};
