import { useRef, useEffect, useState } from "react";
import { Header } from "@/components/jarvis/Header";
import { ChatMessage } from "@/components/jarvis/ChatMessage";
import { ChatInput } from "@/components/jarvis/ChatInput";
import { TypingIndicator } from "@/components/jarvis/TypingIndicator";
import { AppointmentWidget } from "@/components/jarvis/AppointmentWidget";
import { TaskList } from "@/components/jarvis/TaskList";
import { JarvisAvatar } from "@/components/jarvis/JarvisAvatar";
import { SettingsSheet } from "@/components/jarvis/SettingsSheet";
import { VoiceConversation } from "@/components/jarvis/VoiceConversation";
import { useJarvis } from "@/hooks/useJarvis";
import { useSpeech } from "@/hooks/useSpeech";
import { useSettings } from "@/contexts/SettingsContext";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const Index = () => {
  const { language, ttsEnabled } = useSettings();
  const {
    messages,
    isLoading,
    sendMessage,
    tasks,
    toggleTask,
    addTask,
    deleteTask,
    appointments,
    addAppointment,
    deleteAppointment,
    lastAssistantMessage,
    updateWelcomeMessage,
    addVoiceExchange,
  } = useJarvis(language);

  const { speak, stop, isSpeaking } = useSpeech({
    language,
    enabled: ttsEnabled,
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const [showWidgets, setShowWidgets] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voiceConversationOpen, setVoiceConversationOpen] = useState(false);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Speak assistant messages (only for text chat, not voice)
  useEffect(() => {
    if (lastAssistantMessage && ttsEnabled && !voiceConversationOpen) {
      speak(lastAssistantMessage);
    }
  }, [lastAssistantMessage, ttsEnabled, speak, voiceConversationOpen]);

  // Update welcome message when language changes
  useEffect(() => {
    updateWelcomeMessage(language);
  }, [language, updateWelcomeMessage]);

  // Stop speech when TTS is disabled
  useEffect(() => {
    if (!ttsEnabled) {
      stop();
    }
  }, [ttsEnabled, stop]);

  const handleSend = (message: string) => {
    stop(); // Stop any ongoing speech
    sendMessage(message, language);
  };

  const handleVoiceMessage = (userMessage: string, assistantResponse: string) => {
    addVoiceExchange(userMessage, assistantResponse);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-subtle">
      <Header
        onSettingsClick={() => setSettingsOpen(true)}
        isSpeaking={isSpeaking}
      />

      {/* Collapsible Widgets Section */}
      <div className="px-4 pt-3">
        <button
          onClick={() => setShowWidgets(!showWidgets)}
          className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground py-2 hover:text-foreground transition-colors"
        >
          {showWidgets ? (
            <>
              <ChevronUp className="w-4 h-4" />
              {language === "en" ? "Hide widgets" : "Nascondi widget"}
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              {language === "en" ? "Show widgets" : "Mostra widget"}
            </>
          )}
        </button>

        <div
          className={cn(
            "grid gap-4 overflow-hidden transition-all duration-300",
            showWidgets
              ? "grid-rows-[1fr] opacity-100 mb-4"
              : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="overflow-hidden">
            <div className="grid gap-4 sm:grid-cols-2">
              <AppointmentWidget
                appointments={appointments}
                onAdd={addAppointment}
                onDelete={deleteAppointment}
                language={language}
              />
              <TaskList
                tasks={tasks}
                onToggle={toggleTask}
                onAdd={addTask}
                onDelete={deleteTask}
                language={language}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 scroll-smooth scrollbar-hide">
        {/* Welcome avatar - now interactive */}
        {messages.length === 1 && (
          <div className="flex flex-col items-center py-8 animate-fade-in">
            <JarvisAvatar
              size="lg"
              isThinking={isLoading || isSpeaking}
              interactive
              onClick={() => setVoiceConversationOpen(true)}
            />
            <p className="text-sm text-muted-foreground mt-4">
              {language === "en"
                ? "Tap to start voice conversation"
                : "Tocca per iniziare una conversazione vocale"}
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="space-y-4">
          {messages.map((message, index) => (
            <ChatMessage
              key={message.id}
              message={message}
              isLatest={index === messages.length - 1}
            />
          ))}

          {isLoading && <TypingIndicator />}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Floating voice button when there are messages */}
      {messages.length > 1 && (
        <button
          onClick={() => setVoiceConversationOpen(true)}
          className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-gradient-accent shadow-glow flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40 animate-scale-in"
          aria-label={language === "en" ? "Voice conversation" : "Conversazione vocale"}
        >
          <JarvisAvatar size="md" interactive />
        </button>
      )}

      {/* Input Area */}
      <div className="sticky bottom-0 px-4 pb-4 pt-2 bg-gradient-to-t from-background via-background to-transparent">
        <ChatInput
          onSend={handleSend}
          isLoading={isLoading}
          placeholder={
            language === "en"
              ? "Ask Jarvis anything..."
              : "Chiedi qualcosa a Jarvis..."
          }
          language={language}
        />
      </div>

      {/* Settings */}
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />

      {/* Voice Conversation Mode */}
      <VoiceConversation
        isOpen={voiceConversationOpen}
        onClose={() => setVoiceConversationOpen(false)}
        language={language}
        onMessage={handleVoiceMessage}
      />
    </div>
  );
};

export default Index;
