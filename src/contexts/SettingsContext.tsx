import { createContext, useContext, useState, ReactNode } from "react";
import { Language } from "@/hooks/useSpeech";

interface SettingsContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  ttsEnabled: boolean;
  setTtsEnabled: (enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>("en");
  const [ttsEnabled, setTtsEnabled] = useState(true);

  return (
    <SettingsContext.Provider
      value={{ language, setLanguage, ttsEnabled, setTtsEnabled }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
