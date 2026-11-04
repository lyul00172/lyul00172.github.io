import React, { useState } from 'react';
import { PadConfig } from '../../types/audio';
import { Music, Activity, Zap } from 'lucide-react';

interface PadPerformViewProps {
  selectedPad: PadConfig;
  onTriggerPadWithTune: (padId: number, semitones: number, velocity: number) => void;
}

export const PadPerformView: React.FC<PadPerformViewProps> = ({
  selectedPad,
  onTriggerPadWithTune,
}) => {
  const [performMode, setPerformMode] = useState<'TUNE' | 'VELOCITY'>('TUNE');

  // Semitone offsets for 16 pads: -8 to +7 (pad index 8 is root 0)
  const semitones = [-8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7];

  // Velocities from 16 to 127
  const velocities = Array.from({ length: 16 }, (_, i) => Math.round(16 + (i / 15) * 111));

  return (
    <div className="flex flex-col h-full bg-[#0d1017] text-slate-200 select-none overflow-hidden p-4 gap-3">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#141924] border border-[#222a3d] rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-500/20 border border-blue-500/40 rounded text-blue-400">
            <Music size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-mono font-bold text-white uppercase">
              16 LEVEL CHROMATIC / PERFORMANCE MODE
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              TARGET: PAD {selectedPad.id + 1} ({selectedPad.name})
            </span>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 bg-[#090b10] p-1 rounded border border-[#1e2536]">
          <button
            onClick={() => setPerformMode('TUNE')}
            type="button"
            className={`px-3 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
              performMode === 'TUNE' ? 'bg-akai-red text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            TUNE / PITCH
          </button>
          <button
            onClick={() => setPerformMode('VELOCITY')}
            type="button"
            className={`px-3 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
              performMode === 'VELOCITY' ? 'bg-akai-red text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            VELOCITY
          </button>
        </div>
      </div>

      {/* 4x4 Grid of 16-level cells */}
      <div className="flex-1 grid grid-cols-4 gap-2.5">
        {Array.from({ length: 16 }).map((_, idx) => {
          const semitone = semitones[idx];
          const velocity = velocities[idx];
          const isRoot = semitone === 0;

          return (
            <button
              key={idx}
              onClick={() => {
                if (performMode === 'TUNE') {
                  onTriggerPadWithTune(selectedPad.id, semitone, 110);
                } else {
                  onTriggerPadWithTune(selectedPad.id, 0, velocity);
                }
              }}
              type="button"
              className={`
                flex flex-col items-center justify-center p-3 rounded-lg border transition-all active:scale-95
                ${
                  isRoot && performMode === 'TUNE'
                    ? 'bg-akai-red/30 border-akai-red text-white shadow-[0_0_12px_rgba(217,20,36,0.5)]'
                    : 'bg-[#131722] hover:bg-[#1a202f] border-[#202738] text-slate-200'
                }
              `}
            >
              <span className="text-[10px] font-mono text-slate-400 mb-1">
                PAD {idx + 1}
              </span>
              <span className="text-sm font-display font-extrabold">
                {performMode === 'TUNE'
                  ? `${semitone >= 0 ? `+${semitone}` : semitone} st`
                  : `VEL ${velocity}`}
              </span>
              {isRoot && performMode === 'TUNE' && (
                <span className="text-[8px] font-mono text-amber-400 font-bold mt-0.5">
                  ROOT
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
