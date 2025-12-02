import { useCallback, useRef, useState, useEffect } from "react";

export type Language = "en" | "it";

interface UseSpeechOptions {
  language: Language;
  enabled: boolean;
}

const languageConfig = {
  en: {
    code: "en-US",
    voiceName: ["Samantha", "Google US English", "Microsoft Zira", "English"],
  },
  it: {
    code: "it-IT",
    voiceName: ["Alice", "Google italiano", "Microsoft Elsa", "Italian"],
  },
};

export const useSpeech = ({ language, enabled }: UseSpeechOptions) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Find the best voice for the selected language
  const getVoice = useCallback(() => {
    const config = languageConfig[language];
    
    // Try to find a preferred voice
    for (const preferredName of config.voiceName) {
      const voice = voices.find(
        (v) =>
          v.name.includes(preferredName) ||
          v.lang.startsWith(language === "en" ? "en" : "it")
      );
      if (voice) return voice;
    }

    // Fallback to any voice matching the language
    return voices.find((v) => v.lang.startsWith(language === "en" ? "en" : "it"));
  }, [language, voices]);

  const speak = useCallback(
    (text: string) => {
      if (!enabled || !text) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      const voice = getVoice();
      if (voice) {
        utterance.voice = voice;
      }

      utterance.lang = languageConfig[language].code;
      utterance.rate = 1;
      utterance.pitch = 1;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [enabled, language, getVoice]
  );

  const stop = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking };
};
