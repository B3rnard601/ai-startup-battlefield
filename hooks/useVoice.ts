'use client';

import { useCallback, useRef, useState, useEffect } from 'react';

type AgentType = 'investor' | 'competitor' | 'customer' | 'journalist' | 'employee' | 'system';

// Each agent has a distinct vocal character
const VOICE_PROFILES: Record<string, { rate: number; pitch: number; volume: number }> = {
  investor:   { rate: 0.82, pitch: 0.78, volume: 1.0 }, // slow, deep, boardroom
  competitor: { rate: 1.18, pitch: 1.12, volume: 1.0 }, // fast, aggressive
  journalist: { rate: 1.05, pitch: 1.00, volume: 1.0 }, // news anchor, clear
  customer:   { rate: 0.95, pitch: 1.08, volume: 0.9 }, // conversational
  employee:   { rate: 0.90, pitch: 0.92, volume: 0.9 }, // measured, tired
  system:     { rate: 1.10, pitch: 0.65, volume: 0.7 }, // robotic
};

export function useVoice() {
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [listening, setListening]       = useState(false);
  const [supported, setSupported]       = useState(false);
  const synthRef  = useRef<SpeechSynthesis | null>(null);
  const recognRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSupported('speechSynthesis' in window || 'webkitSpeechRecognition' in window);
      synthRef.current = window.speechSynthesis;
    }
  }, []);

  // ── TTS ─────────────────────────────────────────────────────────────────
  const speak = useCallback((text: string, agent: AgentType | string = 'system') => {
    if (!voiceEnabled || !synthRef.current) return;

    // Cancel anything already speaking
    synthRef.current.cancel();

    // Strip markdown/special chars before speaking
    const clean = text
      .replace(/\[.*?\]/g, '')
      .replace(/[#*_`]/g, '')
      .replace(/HEADLINE:|STORY:/g, '')
      .trim();

    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    const profile   = VOICE_PROFILES[agent] ?? VOICE_PROFILES.system;

    utterance.rate   = profile.rate;
    utterance.pitch  = profile.pitch;
    utterance.volume = profile.volume;

    // Pick a voice — prefer English
    const voices = synthRef.current.getVoices();
    const enVoice = voices.find(v => v.lang.startsWith('en') && !v.name.includes('Google'));
    if (enVoice) utterance.voice = enVoice;

    synthRef.current.speak(utterance);
  }, [voiceEnabled]);

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
  }, []);

  // ── STT ─────────────────────────────────────────────────────────────────
  const startListening = useCallback((onResult: (text: string) => void) => {
    const SR: any =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SR) return;

    const recog = new SR();
    recog.lang          = 'en-US';
    recog.interimResults = false;
    recog.maxAlternatives = 1;

    recog.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      onResult(transcript);
      setListening(false);
    };
    recog.onerror  = () => setListening(false);
    recog.onend    = () => setListening(false);

    recognRef.current = recog;
    recog.start();
    setListening(true);
  }, []);

  const stopListening = useCallback(() => {
    recognRef.current?.stop();
    setListening(false);
  }, []);

  const toggleVoice = useCallback(() => {
    setVoiceEnabled(v => {
      if (v) synthRef.current?.cancel(); // stop on disable
      return !v;
    });
  }, []);

  return {
    voiceEnabled,
    toggleVoice,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    listening,
    supported,
  };
}
