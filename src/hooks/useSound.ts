import { useRef, useCallback, useState, useEffect } from 'react';

const SOUND_ENABLED_KEY = 'sudoku-sound-enabled';

interface UseSoundReturn {
  soundEnabled: boolean;
  toggleSound: () => void;
  playDigitSound: () => void;
  playErrorSound: () => void;
  playVictorySound: () => void;
}

export function useSound(): UseSoundReturn {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(SOUND_ENABLED_KEY);
    return saved === null ? true : saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem(SOUND_ENABLED_KEY, String(soundEnabled));
  }, [soundEnabled]);

  const getCtx = useCallback((): AudioContext => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Play a single tone at a scheduled time offset from now
  const playTone = useCallback(
    (frequency: number, duration: number, type: OscillatorType = 'sine', gain = 0.25, offset = 0): void => {
      if (!soundEnabled) return;
      try {
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.type = type;
        osc.frequency.setValueAtTime(frequency, ctx.currentTime + offset);
        gainNode.gain.setValueAtTime(gain, ctx.currentTime + offset);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + duration);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + duration + 0.01);
      } catch (_) {}
    },
    [soundEnabled, getCtx]
  );

  // Short soft pluck — digit input feedback
  const playDigitSound = useCallback((): void => {
    playTone(520, 0.12, 'sine', 0.18);
  }, [playTone]);

  // Descending sawtooth buzz — error/conflict feedback
  const playErrorSound = useCallback((): void => {
    if (!soundEnabled) return;
    try {
      const ctx = getCtx();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.28);
      gainNode.gain.setValueAtTime(0.22, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.29);
    } catch (_) {}
  }, [soundEnabled, getCtx]);

  // Ascending major arpeggio — victory fanfare
  const playVictorySound = useCallback((): void => {
    // C5 - E5 - G5 - C6
    [523, 659, 784, 1047].forEach((freq, i) => {
      playTone(freq, 0.5, 'sine', 0.28, i * 0.14);
    });
  }, [playTone]);

  const toggleSound = useCallback((): void => {
    setSoundEnabled((prev) => !prev);
  }, []);

  return { soundEnabled, toggleSound, playDigitSound, playErrorSound, playVictorySound };
}
