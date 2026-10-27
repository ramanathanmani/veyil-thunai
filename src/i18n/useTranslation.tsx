import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import en from './en.json';
import ta from './ta.json';
import hi from './hi.json';
import { Language, TranslationMap } from './keys';

const translations: Record<Language, TranslationMap> = {
  en,
  ta,
  hi,
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  speakText: (text: string, templateId?: string | string[]) => Promise<void>;
  isSpeaking: boolean;
  stopSpeaking: () => void;
}

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{
  children: React.ReactNode;
  initialLanguage?: Language;
}> = ({ children, initialLanguage = 'ta' }) => {
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const cancelRequestedRef = useRef<boolean>(false);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('veyil_lang', lang);
    }
  };

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('veyil_lang') as Language;
      if (saved && ['en', 'ta', 'hi'].includes(saved)) {
        setLanguageState(saved);
      }
    }
  }, []);

  // Update <html lang="..."> attribute dynamically for screen readers (TalkBack / VoiceOver)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }, [language]);

  const t = (key: string, params?: Record<string, string | number>): string => {
    const dict = translations[language] || translations.en;
    let text = dict[key] || translations.en[key] || key;

    if (params) {
      for (const [pKey, pVal] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
      }
    }
    return text;
  };

  const stopSpeaking = () => {
    cancelRequestedRef.current = true;
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const speakWithWebSpeech = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        if (language === 'ta') utterance.lang = 'ta-IN';
        else if (language === 'hi') utterance.lang = 'hi-IN';
        else utterance.lang = 'en-IN';

        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          resolve();
        };
        window.speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(false);
        resolve();
      }
    });
  };

  const speakText = async (text: string, templateId?: string | string[]): Promise<void> => {
    stopSpeaking();
    cancelRequestedRef.current = false;
    setIsSpeaking(true);

    const ids = templateId ? (Array.isArray(templateId) ? templateId : [templateId]) : [];

    // 1. If audio templates are provided, try playing audio files in sequence (§7: band, reason, action)
    if (ids.length > 0 && typeof Audio !== 'undefined') {
      try {
        for (const id of ids) {
          if (cancelRequestedRef.current) break;

          const audioUrl = `/audio/${language}/${id}.mp3`;
          await new Promise<void>((resolve, reject) => {
            const audio = new Audio(audioUrl);
            activeAudioRef.current = audio;

            audio.onended = () => {
              activeAudioRef.current = null;
              resolve();
            };
            audio.onerror = (e) => {
              activeAudioRef.current = null;
              reject(e);
            };

            const playPromise = audio.play();
            if (playPromise !== undefined) {
              playPromise.catch((err) => {
                activeAudioRef.current = null;
                reject(err);
              });
            }
          });
        }

        if (!cancelRequestedRef.current) {
          setIsSpeaking(false);
        }
        return;
      } catch (err) {
        console.warn(`Audio playback sequence failed or file missing; using Web Speech API fallback.`, err);
      }
    }

    // 2. Fallback to Web Speech API if audio files missing, errored, or no template ID
    if (!cancelRequestedRef.current) {
      await speakWithWebSpeech(text);
    }
  };

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        t,
        speakText,
        isSpeaking,
        stopSpeaking,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export function useTranslation(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}
