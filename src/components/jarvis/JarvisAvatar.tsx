import { cn } from "@/lib/utils";
import { Mic } from "lucide-react";

interface JarvisAvatarProps {
  isThinking?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  interactive?: boolean;
}

export const JarvisAvatar = ({
  isThinking,
  size = "md",
  onClick,
  interactive = false,
}: JarvisAvatarProps) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-24 h-24",
  };

  const innerSizeClasses = {
    sm: "w-3 h-3",
    md: "w-5 h-5",
    lg: "w-10 h-10",
  };

  const iconSizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-10 h-10",
  };

  const Component = interactive ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      className={cn(
        "relative rounded-full bg-gradient-accent flex items-center justify-center transition-all",
        sizeClasses[size],
        isThinking && "animate-pulse-soft",
        interactive && "cursor-pointer hover:scale-105 active:scale-95 shadow-glow"
      )}
    >
      {interactive ? (
        <Mic className={cn("text-primary-foreground", iconSizeClasses[size])} />
      ) : (
        <div
          className={cn(
            "rounded-full bg-primary-foreground/90",
            innerSizeClasses[size]
          )}
        />
      )}
      {isThinking && (
        <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
      )}
      {interactive && (
        <>
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div
            className="absolute inset-0 rounded-full bg-primary/10 animate-ping"
            style={{ animationDelay: "300ms" }}
          />
        </>
      )}
    </Component>
  );
};
