import { useRef, useEffect, useState } from "react";
import { Header } from "@/components/jarvis/Header";
import { ChatMessage } from "@/components/jarvis/ChatMessage";
import { ChatInput } from "@/components/jarvis/ChatInput";
import { TypingIndicator } from "@/components/jarvis/TypingIndicator";
import { AppointmentWidget } from "@/components/jarvis/AppointmentWidget";
import { TaskList } from "@/components/jarvis/TaskList";
import { JarvisAvatar } from "@/components/jarvis/JarvisAvatar";
import { useJarvis } from "@/hooks/useJarvis";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

const Index = () => {
  const {
    messages,
    isLoading,
    sendMessage,
    tasks,
    toggleTask,
    appointments,
  } = useJarvis();
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [showWidgets, setShowWidgets] = useState(true);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-subtle">
      <Header />

      {/* Collapsible Widgets Section */}
      <div className="px-4 pt-3">
        <button
          onClick={() => setShowWidgets(!showWidgets)}
          className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground py-2 hover:text-foreground transition-colors"
        >
          {showWidgets ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Hide widgets
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show widgets
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
              <AppointmentWidget appointments={appointments} />
              <TaskList tasks={tasks} onToggle={toggleTask} />
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-4 pb-4 scroll-smooth scrollbar-hide">
        {/* Welcome avatar */}
        {messages.length === 1 && (
          <div className="flex flex-col items-center py-8 animate-fade-in">
            <JarvisAvatar size="lg" isThinking={isLoading} />
            <p className="text-sm text-muted-foreground mt-4">
              Your AI assistant is ready
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

      {/* Input Area */}
      <div className="sticky bottom-0 px-4 pb-4 pt-2 bg-gradient-to-t from-background via-background to-transparent">
        <ChatInput onSend={sendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default Index;
