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
import { ChevronDown, ChevronUp, Mic } from "lucide-react";
import { cn } from "@/lib/utils";

const welcomeMessages = {
  en: "Good morning! I'm Jarvis, your personal assistant. How can I help you?",
  it: "Buongiorno! Sono Jarvis, il tuo assistente personale. Come posso aiutarti?",
};

const generateId = () => Math.random().toString(36).substring(2, 9);

const Index = () => {
  const { language, ttsEnabled } = useSettings();
  const { tasks = [], appointments = [], generatedFiles = [], addTask, toggleTask, deleteTask, addAppointment, deleteAppointment, deleteGeneratedFile } = useDatabase();

  const [messages, setMessages] = useState<Message[]>([
    { id: "welcome", content: welcomeMessages[language], role: "assistant", timestamp: new Date() },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastAssistantMessage, setLastAssistantMessage] = useState<string | null>(null);
  const conversationHistoryRef = useRef<AIChatMessage[]>([]);

  const { speak, stop, isSpeaking } = useSpeech({ language, enabled: ttsEnabled });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const [showWidgets, setShowWidgets] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleVoiceMessage = useCallback((userMessage: string, assistantResponse: string) => {
    setMessages((prev) => [
      ...prev,
      { id: generateId(), content: userMessage, role: "user", timestamp: new Date() },
      { id: generateId(), content: assistantResponse, role: "assistant", timestamp: new Date() },
    ]);
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isLoading]);
  useEffect(() => { if (lastAssistantMessage && ttsEnabled) speak(lastAssistantMessage); }, [lastAssistantMessage, ttsEnabled, speak]);
  useEffect(() => { setMessages((prev) => prev.length >= 1 && prev[0].id === "welcome" ? [{ ...prev[0], content: welcomeMessages[language] }, ...prev.slice(1)] : prev); }, [language]);
  useEffect(() => { if (!ttsEnabled) stop(); }, [ttsEnabled, stop]);

  const handleSend = useCallback(async (content: string) => {
    stop();
    setMessages((prev) => [...prev, { id: generateId(), content, role: "user", timestamp: new Date() }]);
    setIsLoading(true);
    setLastAssistantMessage(null);
    try {
      const { reply } = await sendMessageToAI(content, language, conversationHistoryRef.current);
      conversationHistoryRef.current.push({ role: "user", content }, { role: "assistant", content: reply });
      setMessages((prev) => [...prev, { id: generateId(), content: reply, role: "assistant", timestamp: new Date() }]);
      setLastAssistantMessage(reply);
    } catch (error) {
      setMessages((prev) => [...prev, { id: generateId(), content: error instanceof Error ? error.message : "Error", role: "assistant", timestamp: new Date() }]);
    } finally { setIsLoading(false); }
  }, [language, stop]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-subtle">
      <Header onMenuClick={() => setSidebarOpen(true)} onSettingsClick={() => setSettingsOpen(true)} isSpeaking={isSpeaking} />

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
            <button
              onClick={() => setVoiceOpen(true)}
              className="focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-full transition-transform hover:scale-105 active:scale-95"
              aria-label={language === "en" ? "Start voice conversation" : "Inizia conversazione vocale"}
            >
              <JarvisAvatar size="lg" isThinking={isLoading || isSpeaking} />
            </button>
            <p className="text-sm text-muted-foreground mt-4">{language === "en" ? "Tap to speak" : "Tocca per parlare"}</p>
          </div>
        )}
        <div className="space-y-4">
          {messages.map((message, index) => <ChatMessage key={message.id} message={message} isLatest={index === messages.length - 1} />)}
          {isLoading && <TypingIndicator />}
          <div ref={chatEndRef} />
        </div>
      </div>

      <div className="sticky bottom-0 px-4 pb-4 pt-2 bg-gradient-to-t from-background via-background to-transparent">
        <div className="flex gap-2">
          <ChatInput onSend={handleSend} isLoading={isLoading} placeholder={language === "en" ? "Ask Jarvis anything..." : "Chiedi qualcosa a Jarvis..."} language={language} />
          <button
            onClick={() => setVoiceOpen(true)}
            className="flex-shrink-0 w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shadow-soft"
            aria-label={language === "en" ? "Voice conversation" : "Conversazione vocale"}
          >
            <Mic className="w-5 h-5" />
          </button>
        </div>
      </div>

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
      <VoiceConversation isOpen={voiceOpen} onClose={() => setVoiceOpen(false)} language={language} onMessage={handleVoiceMessage} />
      <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} generatedFiles={generatedFiles} onDeleteFile={deleteGeneratedFile} language={language} />
    </div>
  );
};

export default Index;