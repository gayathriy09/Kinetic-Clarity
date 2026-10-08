import React, { useEffect, useState, useRef } from 'react';

interface AudioWaveformProps {
  isRecording: boolean;
  isAiSpeaking?: boolean;
  audioStream?: MediaStream | null;
  barCount?: number;
  className?: string;
  onVolumeChange?: (volume: number) => void;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isRecording,
  isAiSpeaking = false,
  audioStream,
  barCount = 28,
  className = '',
  onVolumeChange,
}) => {
  const [frequencyData, setFrequencyData] = useState<number[]>(
    new Array(barCount).fill(12)
  );

  const audioCtxRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Teardown previous context if any
    const cleanupAudio = () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };

    if (!isRecording && !isAiSpeaking) {
      cleanupAudio();
      setFrequencyData(new Array(barCount).fill(12));
      if (onVolumeChange) onVolumeChange(0);
      return;
    }

    // 1. REAL MICROPHONE AUDIO STREAM CONNECTED
    if (audioStream && isRecording) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        audioCtxRef.current = audioCtx;

        if (audioCtx.state === 'suspended') {
          audioCtx.resume().catch(() => {});
        }

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.6;

        const source = audioCtx.createMediaStreamSource(audioStream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateData = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);

          let sum = 0;
          const newBars: number[] = [];
          for (let i = 0; i < barCount; i++) {
            const dataIndex = Math.floor((i / barCount) * bufferLength);
            const rawVal = dataArray[dataIndex] || 0;
            sum += rawVal;
            // Scale bar height between 14% and 95%
            const heightPct = Math.max(14, Math.min(95, (rawVal / 255) * 100));
            newBars.push(heightPct);
          }

          // Calculate average volume percentage 0-100
          const avgVolume = Math.min(100, Math.round((sum / (barCount * 255)) * 140));
          if (onVolumeChange) {
            onVolumeChange(avgVolume);
          }

          setFrequencyData(newBars);
          animationFrameRef.current = requestAnimationFrame(updateData);
        };

        updateData();

        return () => {
          cleanupAudio();
          source.disconnect();
        };
      } catch (err) {
        console.warn('Real Web Audio API setup notice:', err);
      }
    }

    // 2. SIMULATED OR AI ACTIVE WAVEFORM (when real stream not available or AI speaking)
    const interval = setInterval(() => {
      setFrequencyData((prev) =>
        prev.map((_, i) => {
          const centerBias = 1 - Math.abs(i - barCount / 2) / (barCount / 2);
          const randomFactor = Math.random() * 65;
          const height = Math.max(14, Math.min(95, randomFactor * centerBias + 20));
          return height;
        })
      );
      if (onVolumeChange && isRecording) {
        onVolumeChange(Math.round(40 + Math.random() * 35));
      }
    }, 85);

    return () => {
      clearInterval(interval);
      cleanupAudio();
    };
  }, [isRecording, isAiSpeaking, audioStream, barCount, onVolumeChange]);

  return (
    <div
      className={`flex items-center justify-center gap-[3px] h-10 px-3 bg-white/90 backdrop-blur-md rounded-full border border-slate-200/80 shadow-sm ${className}`}
      aria-label="Speech Audio Waveform"
    >
      {frequencyData.map((height, i) => {
        const isAiMode = isAiSpeaking;
        const barColor = isAiMode
          ? 'bg-[#7C3AED]'
          : isRecording
          ? 'bg-[#2563EB]'
          : 'bg-slate-300';

        return (
          <div
            key={i}
            className={`w-[3px] rounded-full transition-all duration-75 ${barColor}`}
            style={{
              height: `${isRecording || isAiSpeaking ? height : 12}%`,
              opacity: isRecording || isAiSpeaking ? 0.9 : 0.35,
            }}
          />
        );
      })}
    </div>
  );
};
