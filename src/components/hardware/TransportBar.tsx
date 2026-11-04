import React, { useState, useEffect } from 'react';
import { Play, Square, Circle, RotateCcw, Volume2, FastForward } from 'lucide-react';
import { HardwareButton } from './HardwareButton';

interface TransportBarProps {
  isPlaying: boolean;
  isRecording: boolean;
  isOverdubbing: boolean;
  bpm: number;
  metronomeEnabled: boolean;
  onPlay: () => void;
  onPlayStart: () => void;
  onStop: () => void;
  onRecord: () => void;
  onOverdub: () => void;
  onTapTempo: () => void;
  onToggleMetronome: () => void;
  onUndo: () => void;
}

export const TransportBar: React.FC<TransportBarProps> = ({
  isPlaying,
  isRecording,
  isOverdubbing,
  bpm,
  metronomeEnabled,
  onPlay,
  onPlayStart,
  onStop,
  onRecord,
  onOverdub,
  onTapTempo,
  onToggleMetronome,
  onUndo,
}) => {
  // Flash LED on beat for Tap Tempo indicator
  const [tapLed, setTapLed] = useState(false);

  useEffect(() => {
    if (!isPlaying) {
      setTapLed(false);
      return;
    }
    const intervalMs = (60 / bpm) * 1000;
    const interval = setInterval(() => {
      setTapLed(true);
      setTimeout(() => setTapLed(false), 80);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [isPlaying, bpm]);

  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-[#15171e] border border-[#2b2f3c] rounded-xl shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
      {/* Left Aux Controls: Metronome & Tap Tempo & Undo */}
      <div className="flex items-center gap-2">
        <HardwareButton
          label="TAP"
          subLabel={`${bpm} BPM`}
          size="md"
          ledColor="amber"
          isLedOn={tapLed}
          onClick={onTapTempo}
          title="Tap repeatedly to set tempo (Shortcut: T)"
          className="min-w-[55px]"
        />

        <HardwareButton
          label="CLICK"
          subLabel={metronomeEnabled ? 'ON' : 'OFF'}
          size="md"
          ledColor="blue"
          isLedOn={metronomeEnabled}
          isActive={metronomeEnabled}
          onClick={onToggleMetronome}
          icon={<Volume2 size={12} />}
          title="Toggle Metronome Click (Shortcut: M)"
          className="min-w-[62px]"
        />

        <HardwareButton
          label="UNDO"
          size="md"
          ledColor="white"
          onClick={onUndo}
          icon={<RotateCcw size={12} />}
          title="Undo last action"
        />
      </div>

      {/* Center / Right Main Transport Controls */}
      <div className="flex items-center gap-2.5">
        {/* Record (Red) */}
        <button
          onClick={onRecord}
          title="Record live hits to sequence (Shortcut: R)"
          type="button"
          className={`
            relative flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[6px] border font-display font-bold text-xs uppercase transition-all duration-75 select-none
            ${
              isRecording
                ? 'bg-red-600 border-red-400 text-white shadow-[0_0_15px_#ef4444]'
                : 'bg-gradient-to-b from-[#2e2326] to-[#1e1518] border-[#4a2e33] text-rose-300 hover:text-white hover:border-[#6a3942]'
            }
            active:translate-y-[1px] shadow-[0_3px_5px_rgba(0,0,0,0.6)]
          `}
        >
          <Circle size={13} className={isRecording ? 'fill-white animate-pulse' : 'fill-rose-500'} />
          <span>REC</span>
          <span
            className={`w-2 h-2 rounded-full ml-1 ${
              isRecording ? 'bg-white shadow-[0_0_8px_white]' : 'bg-[#3b1c20]'
            }`}
          />
        </button>

        {/* Overdub (Amber) */}
        <button
          onClick={onOverdub}
          title="Overdub notes without erasing existing pattern"
          type="button"
          className={`
            relative flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-[6px] border font-display font-bold text-xs uppercase transition-all duration-75 select-none
            ${
              isOverdubbing
                ? 'bg-amber-600 border-amber-300 text-white shadow-[0_0_15px_#f59e0b]'
                : 'bg-gradient-to-b from-[#2b2720] to-[#1c1813] border-[#473b28] text-amber-300 hover:text-white hover:border-[#695535]'
            }
            active:translate-y-[1px] shadow-[0_3px_5px_rgba(0,0,0,0.6)]
          `}
        >
          <Circle size={12} className={isOverdubbing ? 'fill-white' : 'fill-amber-500'} />
          <span>OVERDUB</span>
        </button>

        {/* Stop (Charcoal Black) */}
        <button
          onClick={onStop}
          title="Stop playback (Shortcut: Space)"
          type="button"
          className={`
            flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[6px] border border-[#3b404e] font-display font-bold text-xs uppercase transition-all duration-75 select-none
            bg-gradient-to-b from-[#2d323e] to-[#1a1c22] text-slate-200 hover:text-white hover:border-[#52596e]
            ${!isPlaying ? 'border-slate-500 text-white' : ''}
            active:translate-y-[1px] shadow-[0_3px_5px_rgba(0,0,0,0.6)]
          `}
        >
          <Square size={13} className="fill-slate-300" />
          <span>STOP</span>
        </button>

        {/* Play (Green) */}
        <button
          onClick={onPlay}
          title="Play / Pause sequence (Shortcut: Space)"
          type="button"
          className={`
            relative flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-[6px] border font-display font-bold text-xs uppercase transition-all duration-75 select-none
            ${
              isPlaying
                ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_15px_#10b981]'
                : 'bg-gradient-to-b from-[#213028] to-[#131d17] border-[#2e4738] text-emerald-300 hover:text-white hover:border-[#3e634c]'
            }
            active:translate-y-[1px] shadow-[0_3px_5px_rgba(0,0,0,0.6)]
          `}
        >
          <Play size={14} className={isPlaying ? 'fill-white' : 'fill-emerald-400'} />
          <span>PLAY</span>
          <span
            className={`w-2 h-2 rounded-full ml-1 ${
              isPlaying ? 'bg-white shadow-[0_0_8px_#10b981]' : 'bg-[#152e20]'
            }`}
          />
        </button>

        {/* Play Start (Play from beginning) */}
        <button
          onClick={onPlayStart}
          title="Play from start of loop (Bar 1)"
          type="button"
          className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-[6px] border border-[#353b49] bg-gradient-to-b from-[#252a35] to-[#171a20] text-slate-300 hover:text-white hover:border-[#4d566b] active:translate-y-[1px] text-[11px] font-display font-bold uppercase shadow-[0_3px_5px_rgba(0,0,0,0.6)]"
        >
          <FastForward size={12} />
          <span>START</span>
        </button>
      </div>
    </div>
  );
};
