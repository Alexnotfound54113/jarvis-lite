import { Menu, Settings } from "lucide-react";

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header = ({ onMenuClick }: HeaderProps) => {
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
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-soft" />
          <h1 className="text-lg font-semibold tracking-tight">Jarvis</h1>
        </div>

        <button
          className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-secondary/50 transition-colors"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5 text-foreground/80" />
        </button>
      </div>
    </header>
  );
};
