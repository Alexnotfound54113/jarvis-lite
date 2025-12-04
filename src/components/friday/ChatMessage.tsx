import { cn } from "@/lib/utils";

export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
  isLatest?: boolean;
}

export const ChatMessage = ({ message, isLatest }: ChatMessageProps) => {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full animate-fade-in",
        isUser ? "justify-end" : "justify-start"
      )}
      style={{ animationDelay: isLatest ? "0ms" : "0ms" }}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 transition-all",
          isUser
            ? "bg-gradient-accent text-primary-foreground rounded-br-md shadow-soft"
            : "glass rounded-bl-md shadow-soft"
        )}
      >
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
        <span
          className={cn(
            "block text-[11px] mt-1.5",
            isUser ? "text-primary-foreground/70" : "text-muted-foreground"
          )}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
};