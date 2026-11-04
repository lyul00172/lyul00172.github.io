import { useEffect, useRef, useState } from 'react';

export function useAudioMeter(analyser: AnalyserNode | null, isPlaying: boolean) {
  const [level, setLevel] = useState<number>(0);
  const [peak, setPeak] = useState<number>(0);
  const waveformRef = useRef<Uint8Array | null>(null);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    if (!analyser) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const timeDomainArray = new Uint8Array(bufferLength);
    waveformRef.current = timeDomainArray;

    let currentPeak = 0;

    const updateMeter = () => {
      analyser.getByteFrequencyData(dataArray);
      analyser.getByteTimeDomainData(timeDomainArray);

      // Calculate RMS level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const avg = sum / bufferLength;
      const normalizedLevel = Math.min(100, Math.round((avg / 255) * 125));

      // Peak decay
      if (normalizedLevel > currentPeak) {
        currentPeak = normalizedLevel;
      } else {
        currentPeak = Math.max(0, currentPeak - 1.5);
      }

      setLevel(normalizedLevel);
      setPeak(Math.round(currentPeak));

      animationFrameId.current = requestAnimationFrame(updateMeter);
    };

    animationFrameId.current = requestAnimationFrame(updateMeter);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [analyser, isPlaying]);

  return { level, peak, waveformData: waveformRef.current };
}
