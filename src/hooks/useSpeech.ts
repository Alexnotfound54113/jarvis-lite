import { useCallback, useState } from "react";
import { speakWithJarvis, stopJarvisSpeech } from "@/lib/tts";

export type Language = "en" | "it";

interface UseSpeechOptions {
  language: Language;
  enabled: boolean;
}

export const useSpeech = ({ language, enabled }: UseSpeechOptions) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = useCallback(
    async (text: string) => {
      if (!enabled || !text) return;

      try {
        await speakWithJarvis(
          text,
          () => setIsSpeaking(true),
          () => setIsSpeaking(false)
        );
      } catch (error) {
        console.error("Error speaking with Jarvis:", error);
        setIsSpeaking(false);
      }
    },
    [enabled]
  );

  const stop = useCallback(() => {
    stopJarvisSpeech();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking };
};
