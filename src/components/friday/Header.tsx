import { Menu, Settings, Volume2, VolumeX } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onMenuClick?: () => void;
  onSettingsClick?: () => void;
  isSpeaking?: boolean;
}

export const Header = ({ onMenuClick, onSettingsClick, isSpeaking }: HeaderProps) => {
  const { ttsEnabled, language } = useSettings();

  return (
    <header className="glass-subtle safe-area-top sticky top-0 z-50">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onMenuClick}
          className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-secondary/50 transition-colors"
          aria-label="Menu"
        >
          <Menu className="w-5 h-5 text-foreground/80" />
        </button>

        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              isSpeaking ? "bg-primary animate-pulse-soft" : "bg-primary/50"
            )}
          />
          <h1 className="text-lg font-semibold tracking-tight">FRIDAY</h1>
          <span className="text-xs text-muted-foreground uppercase">
            {language === "en" ? "EN" : "IT"}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {ttsEnabled ? (
            <Volume2 className="w-4 h-4 text-primary/60" />
          ) : (
            <VolumeX className="w-4 h-4 text-muted-foreground/60" />
          )}
          <button
            onClick={onSettingsClick}
            className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-secondary/50 transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5 text-foreground/80" />
          </button>
        </div>
      </div>
    </header>
  );
};
