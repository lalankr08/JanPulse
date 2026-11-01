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
    // Check speech synthesis voice availability for non-English
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

    if (language === "en") {
      // Use Groq Orpheus server-side audio
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
      } catch (e) {
        console.warn("Groq Orpheus playback failed, falling back to browser speech:", e);
        // Fallback to browser speech
        playBrowserSpeech();
      }
    } else {
      // Indian language via browser speech synthesis
      playBrowserSpeech();
    }
  };

  const playBrowserSpeech = () => {
    if (typeof window === "undefined" || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "hi" ? "hi-IN" : language;
    utterance.rate = 0.95;
    
    utterance.onstart = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  if (language !== "en" && !hasVoice) {
    // Hide listen button if no voice is installed on device
    return null;
  }

  return (
    <button
      type="button"
      onClick={isPlaying ? handleStop : handlePlay}
      disabled={isLoading}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-medium bg-[#F4F1EA] hover:bg-[#E7E2D8] text-[#1E2430] border border-[#E7E2D8] transition-colors"
      aria-label={isPlaying ? "Stop audio" : "Listen to audio explanation"}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2F6B5C]" />
          <span>Generating voice...</span>
        </>
      ) : isPlaying ? (
        <>
          <Square className="w-3.5 h-3.5 fill-current text-[#8E3326]" />
          <span>Stop</span>
        </>
      ) : (
        <>
          <Volume2 className="w-3.5 h-3.5 text-[#2F6B5C]" />
          <span>Listen</span>
        </>
      )}
    </button>
  );
};

