import { useRef, useEffect, useState, useCallback } from "react";
import { Header } from "@/components/jarvis/Header";
import { ChatMessage, Message } from "@/components/jarvis/ChatMessage";
import { ChatInput } from "@/components/jarvis/ChatInput";
import { TypingIndicator } from "@/components/jarvis/TypingIndicator";
import { AppointmentWidget } from "@/components/jarvis/AppointmentWidget";
import { TaskList } from "@/components/jarvis/TaskList";
import { JarvisAvatar } from "@/components/jarvis/JarvisAvatar";
import { SettingsSheet } from "@/components/jarvis/SettingsSheet";
import { VoiceConversation } from "@/components/jarvis/VoiceConversation";
import { Sidebar } from "@/components/jarvis/Sidebar";
import { useSpeech } from "@/hooks/useSpeech";
import { useSettings } from "@/contexts/SettingsContext";
import { useDatabase } from "@/hooks/useDatabase";
import { sendMessageToAI, ChatMessage as AIChatMessage } from "@/lib/openai";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const welcomeMessages = {
  en: "Good morning! I'm Jarvis, your personal assistant. How can I help you?",
  it: "Buongiorno! Sono Jarvis, il tuo assistente personale. Come posso aiutarti?",
};

const generateId = () => Math.random().toString(36).substring(2, 9);

const Index = () => {
  const { language, ttsEnabled } = useSettings();
  const {
    tasks,
    appointments,
    generatedFiles,
    addTask,
    toggleTask,
    deleteTask,
    addAppointment,
    deleteAppointment,
    deleteGeneratedFile,
  } = useDatabase();

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
  const conversationHistoryRef = useRef<AIChatMessage[]>([]);

  const { speak, stop, isSpeaking } = useSpeech({
    language,
    enabled: ttsEnabled,
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const [showWidgets, setShowWidgets] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voiceConversationOpen, setVoiceConversationOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (lastAssistantMessage && ttsEnabled && !voiceConversationOpen) {
      speak(lastAssistantMessage);
    }
  }, [lastAssistantMessage, ttsEnabled, speak, voiceConversationOpen]);

  useEffect(() => {
    setMessages((prev) => {
      if (prev.length >= 1 && prev[0].id === "welcome") {
        return [{ ...prev[0], content: welcomeMessages[language] }, ...prev.slice(1)];
      }
      return prev;
    });
  }, [language]);

  useEffect(() => {
    if (!ttsEnabled) stop();
  }, [ttsEnabled, stop]);

  const handleSend = useCallback(async (content: string) => {
    stop();
    const userMessage: Message = {
      id: generateId(),
      content,
      role: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setLastAssistantMessage(null);

    try {
      const { reply } = await sendMessageToAI(content, language, conversationHistoryRef.current);
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
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Error";
      setMessages((prev) => [...prev, { id: generateId(), content: errorMsg, role: "assistant", timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  }, [language, stop]);

  const handleVoiceMessage = (userMessage: string, assistantResponse: string) => {
    setMessages((prev) => [
      ...prev,
      { id: generateId(), content: userMessage, role: "user", timestamp: new Date() },
      { id: generateId(), content: assistantResponse, role: "assistant", timestamp: new Date() },
    ]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-subtle">
      <Header 
        onMenuClick={() => setSidebarOpen(true)} 
        onSettingsClick={() => setSettingsOpen(true)} 
        isSpeaking={isSpeaking} 
      />

      <Sidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        generatedFiles={generatedFiles}
        onDeleteFile={deleteGeneratedFile}
        language={language}
      />

      <div className="px-4 pt-3">
        <button onClick={() => setShowWidgets(!showWidgets)} className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground py-2 hover:text-foreground transition-colors">
          {showWidgets ? <><ChevronUp className="w-4 h-4" />{language === "en" ? "Hide widgets" : "Nascondi widget"}</> : <><ChevronDown className="w-4 h-4" />{language === "en" ? "Show widgets" : "Mostra widget"}</>}
        </button>
        <div className={cn("grid gap-4 overflow-hidden transition-all duration-300", showWidgets ? "grid-rows-[1fr] opacity-100 mb-4" : "grid-rows-[0fr] opacity-0")}>
          <div className="overflow-hidden">
            <div className="grid gap-4 sm:grid-cols-2">
              <AppointmentWidget appointments={appointments} onAdd={addAppointment} onDelete={deleteAppointment} language={language} />
              <TaskList tasks={tasks} onToggle={toggleTask} onAdd={addTask} onDelete={deleteTask} language={language} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 scroll-smooth scrollbar-hide">
        {messages.length === 1 && (
          <div className="flex flex-col items-center py-8 animate-fade-in">
            <JarvisAvatar size="lg" isThinking={isLoading || isSpeaking} interactive onClick={() => setVoiceConversationOpen(true)} />
            <p className="text-sm text-muted-foreground mt-4">{language === "en" ? "Tap to start voice conversation" : "Tocca per iniziare una conversazione vocale"}</p>
          </div>
        )}
        <div className="space-y-4">
          {messages.map((message, index) => <ChatMessage key={message.id} message={message} isLatest={index === messages.length - 1} />)}
          {isLoading && <TypingIndicator />}
          <div ref={chatEndRef} />
        </div>
      </div>

      {messages.length > 1 && (
        <button onClick={() => setVoiceConversationOpen(true)} className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-gradient-accent shadow-glow flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40">
          <JarvisAvatar size="md" interactive />
        </button>
      )}

      <div className="sticky bottom-0 px-4 pb-4 pt-2 bg-gradient-to-t from-background via-background to-transparent">
        <ChatInput onSend={handleSend} isLoading={isLoading} placeholder={language === "en" ? "Ask Jarvis anything..." : "Chiedi qualcosa a Jarvis..."} language={language} />
      </div>

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      <VoiceConversation isOpen={voiceConversationOpen} onClose={() => setVoiceConversationOpen(false)} language={language} onMessage={handleVoiceMessage} />
    </div>
  );
};

export default Index;
