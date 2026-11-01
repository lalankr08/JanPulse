'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, Square, Loader2 } from 'lucide-react';
import { fetchEnglishSpeech } from '@/lib/api';

interface AudioPlayerProps {
  text: string;
  language?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ text, language = "en" }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasVoice, setHasVoice] = useState(true);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (language !== "en" && typeof window !== "undefined" && 'speechSynthesis' in window) {
      const checkVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        const found = voices.some(v => v.lang.startsWith(language));
        setHasVoice(found);
      };
      checkVoices();
      window.speechSynthesis.onvoiceschanged = checkVoices;
    }
  }, [language]);

  const handleStop = () => {
    if (audioElement) {
      audioElement.pause();
      audioElement.currentTime = 0;
    }
    if (typeof window !== "undefined" && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsLoading(false);
  };

  const handlePlay = async () => {
    if (isPlaying) {
      handleStop();
      return;
    }

    // 1. Primary: 100% Client-side browser speech synthesis (0 API tokens, 0 server cost, instant)
    if (typeof window !== "undefined" && 'speechSynthesis' in window) {
      playBrowserSpeech();
      return;
    }

    // 2. Fallback: Only call server Groq TTS if browser completely lacks speech synthesis
    if (language === "en") {
      try {
        setIsLoading(true);
        const blob = await fetchEnglishSpeech(text);
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        setAudioElement(audio);

        audio.onended = () => {
          setIsPlaying(false);
          setIsLoading(false);
        };
        audio.onerror = () => {
          setIsPlaying(false);
          setIsLoading(false);
        };

        await audio.play();
        setIsPlaying(true);
        setIsLoading(false);
      } catch {
        setIsPlaying(false);
        setIsLoading(false);
      }
    }
  };

  const playBrowserSpeech = () => {
    if (typeof window === "undefined" || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "hi" ? "hi-IN" : "en-IN";
    utterance.rate = 0.98;

    try {
      const voices = window.speechSynthesis.getVoices();
      const matched = voices.find(v => v.lang.replace('_', '-').startsWith(language === "hi" ? "hi" : "en"));
      if (matched) utterance.voice = matched;
    } catch {
      // Use default device voice
    }
    
    utterance.onstart = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  if (language !== "en" && !hasVoice) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={isPlaying ? handleStop : handlePlay}
      disabled={isLoading}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-tight transition-all active:scale-95 ${
        isPlaying
          ? 'bg-[#FF3B30]/10 text-[#FF3B30] hover:bg-[#FF3B30]/15'
          : 'bg-[#0071E3]/10 text-[#0071E3] hover:bg-[#0071E3]/15'
      }`}
      aria-label={isPlaying ? "Stop audio readout" : "Listen to audio readout"}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Generating...</span>
        </>
      ) : isPlaying ? (
        <>
          <Square className="w-3 h-3 fill-current" />
          <span>Stop</span>
        </>
      ) : (
        <>
          <Volume2 className="w-3.5 h-3.5" />
          <span>Listen</span>
        </>
      )}
    </button>
  );
};
