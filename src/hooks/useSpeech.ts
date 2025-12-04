import { useCallback, useState } from "react";
import { speakWithFriday, stopFridaySpeech } from "@/lib/tts";

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
        await speakWithFriday(
          text,
          () => setIsSpeaking(true),
          () => setIsSpeaking(false)
        );
      } catch (error) {
        console.error("Error speaking with FRIDAY:", error);
        setIsSpeaking(false);
      }
    },
    [enabled]
  );

  const stop = useCallback(() => {
    stopFridaySpeech();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking };
};
