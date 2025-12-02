import { cn } from "@/lib/utils";

interface JarvisAvatarProps {
  isThinking?: boolean;
  size?: "sm" | "md" | "lg";
}

export const JarvisAvatar = ({ isThinking, size = "md" }: JarvisAvatarProps) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-20 h-20",
  };

  const innerSizeClasses = {
    sm: "w-3 h-3",
    md: "w-5 h-5",
    lg: "w-8 h-8",
  };

  return (
    <div
      className={cn(
        "relative rounded-full bg-gradient-accent flex items-center justify-center",
        sizeClasses[size],
        isThinking && "animate-pulse-soft"
      )}
    >
      <div
        className={cn(
          "rounded-full bg-primary-foreground/90",
          innerSizeClasses[size]
        )}
      />
      {isThinking && (
        <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" />
      )}
    </div>
  );
};
