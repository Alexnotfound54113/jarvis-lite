import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/contexts/SettingsContext";
import { Volume2, VolumeX, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SettingsSheet = ({ open, onOpenChange }: SettingsSheetProps) => {
  const { language, setLanguage, ttsEnabled, setTtsEnabled } = useSettings();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[320px] sm:w-[380px] glass border-l border-border">
        <SheetHeader>
          <SheetTitle className="text-lg font-semibold">Settings</SheetTitle>
        </SheetHeader>

        <div className="mt-8 space-y-8">
          {/* Voice Output */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              {ttsEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
              <span>Voice Output</span>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/50">
              <Label htmlFor="tts-toggle" className="text-sm cursor-pointer">
                Jarvis speaks responses
              </Label>
              <Switch
                id="tts-toggle"
                checked={ttsEnabled}
                onCheckedChange={setTtsEnabled}
              />
            </div>
          </div>

          {/* Language Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Globe className="w-4 h-4" />
              <span>Language</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setLanguage("en")}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                  language === "en"
                    ? "border-primary bg-primary/5 shadow-glow"
                    : "border-transparent bg-secondary/50 hover:bg-secondary"
                )}
              >
                <span className="text-2xl">🇬🇧</span>
                <span className="text-sm font-medium">English</span>
              </button>

              <button
                onClick={() => setLanguage("it")}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                  language === "it"
                    ? "border-primary bg-primary/5 shadow-glow"
                    : "border-transparent bg-secondary/50 hover:bg-secondary"
                )}
              >
                <span className="text-2xl">🇮🇹</span>
                <span className="text-sm font-medium">Italiano</span>
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              {language === "en"
                ? "Jarvis will respond and speak in English"
                : "Jarvis risponderà e parlerà in italiano"}
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
