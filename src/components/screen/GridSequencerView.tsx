import React, { useState } from 'react';
import { PadConfig, SequencerPattern } from '../../types/audio';
import { Play, Square, Trash2, Wand2, Copy, ChevronLeft, ChevronRight } from 'lucide-react';

interface GridSequencerViewProps {
  padConfigs: PadConfig[];
  pattern: SequencerPattern;
  currentStep: number;
  isPlaying: boolean;
  totalBars: number;
  selectedPadId: number;
  onToggleStep: (padId: number, stepIndex: number) => void;
  onClearPadPattern: (padId: number) => void;
  onPadSelect: (padId: number) => void;
  onTriggerPad: (padId: number) => void;
}

export const GridSequencerView: React.FC<GridSequencerViewProps> = ({
  padConfigs,
  pattern,
  currentStep,
  isPlaying,
  totalBars,
  selectedPadId,
  onToggleStep,
  onClearPadPattern,
  onPadSelect,
  onTriggerPad,
}) => {
  const [activeBar, setActiveBar] = useState<number>(0); // 0 = Bar 1 (0-15), 1 = Bar 2 (16-31)
  const stepsPerBar = 16;
  const startStep = activeBar * stepsPerBar;
  const endStep = startStep + stepsPerBar;

  const handleFill = (padId: number, interval: number) => {
    for (let s = startStep; s < endStep; s++) {
      if ((s - startStep) % interval === 0) {
        if (!pattern[padId]?.[s]?.active) {
          onToggleStep(padId, s);
        }
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1017] text-slate-200 select-none overflow-hidden">
      {/* Top Toolbar: Bar Navigator & Step Tools */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#141924] border-b border-[#222a3d]">
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-white uppercase">
            STEP SEQUENCER
          </span>

          {/* Bar Switcher Tabs */}
          <div className="flex items-center gap-1 bg-[#090b10] p-1 rounded border border-[#1e2536]">
            {Array.from({ length: totalBars }).map((_, barIdx) => {
              const isActive = activeBar === barIdx;
              const isCurrentPlayingBar = Math.floor(currentStep / 16) === barIdx && isPlaying;
              return (
                <button
                  key={barIdx}
                  onClick={() => setActiveBar(barIdx)}
                  type="button"
                  className={`
                    flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors
                    ${
                      isActive
                        ? 'bg-akai-red text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-[#1a202e]'
                    }
                  `}
                >
                  <span>BAR {barIdx + 1}</span>
                  {isCurrentPlayingBar && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Pad Batch Actions */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-400">
            PAD {selectedPadId + 1}:
          </span>
          <button
            onClick={() => handleFill(selectedPadId, 4)}
            title="Fill 1/4 notes"
            className="px-2 py-0.5 bg-[#1b2232] hover:bg-[#252f44] border border-[#2e3952] rounded text-[9px] font-mono text-slate-300 font-bold"
          >
            FILL 1/4
          </button>
          <button
            onClick={() => handleFill(selectedPadId, 2)}
            title="Fill 1/8 notes"
            className="px-2 py-0.5 bg-[#1b2232] hover:bg-[#252f44] border border-[#2e3952] rounded text-[9px] font-mono text-slate-300 font-bold"
          >
            FILL 1/8
          </button>
          <button
            onClick={() => onClearPadPattern(selectedPadId)}
            title="Clear steps for this pad"
            className="flex items-center gap-1 px-2 py-0.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 rounded text-[9px] font-mono text-rose-300 font-bold"
          >
            <Trash2 size={10} />
            <span>CLR ROW</span>
          </button>
        </div>
      </div>

      {/* Grid Header: Step Numbers & Beat Markers */}
      <div className="flex items-center pl-28 pr-3 py-1 bg-[#10141d] border-b border-[#1b2130] text-[9px] font-mono text-slate-500 font-semibold">
        {Array.from({ length: 16 }).map((_, i) => {
          const stepNum = startStep + i;
          const isDownbeat = i % 4 === 0;
          const isCurrent = isPlaying && currentStep === stepNum;
          return (
            <div
              key={i}
              className={`flex-1 text-center py-0.5 rounded ${
                isCurrent
                  ? 'bg-emerald-500/30 text-emerald-300 font-bold'
                  : isDownbeat
                  ? 'text-slate-300'
                  : ''
              }`}
            >
              {i + 1}
            </div>
          );
        })}
      </div>

      {/* Grid Rows: 16 Pads */}
      <div className="flex-1 overflow-y-auto px-1 py-1 divide-y divide-[#171c28]">
        {padConfigs.map((pad) => {
          const isSelected = pad.id === selectedPadId;
          const padSteps = pattern[pad.id] || [];

          return (
            <div
              key={pad.id}
              className={`flex items-center py-1 px-2 hover:bg-[#141824]/60 transition-colors ${
                isSelected ? 'bg-[#151a26]' : ''
              }`}
            >
              {/* Pad Label Header */}
              <button
                onClick={() => {
                  onPadSelect(pad.id);
                  onTriggerPad(pad.id);
                }}
                className="flex items-center gap-1.5 w-26 pr-2 text-left truncate group"
              >
                <div
                  style={{ backgroundColor: pad.color }}
                  className="w-2 h-2 rounded-full shrink-0 group-hover:scale-125 transition-transform"
                />
                <div className="flex flex-col truncate">
                  <span className="text-[10px] font-bold text-slate-200 group-hover:text-white truncate">
                    {pad.name}
                  </span>
                  <span className="text-[8px] font-mono text-slate-500">
                    P{pad.id + 1}
                  </span>
                </div>
              </button>

              {/* 16 Step Cells for this Row */}
              <div className="flex-1 flex items-center gap-1">
                {Array.from({ length: 16 }).map((_, stepOffset) => {
                  const stepIndex = startStep + stepOffset;
                  const stepEvent = padSteps[stepIndex];
                  const isActive = stepEvent?.active || false;
                  const isCurrent = isPlaying && currentStep === stepIndex;
                  const isDownbeat = stepOffset % 4 === 0;

                  return (
                    <button
                      key={stepOffset}
                      onClick={() => onToggleStep(pad.id, stepIndex)}
                      type="button"
                      style={{
                        backgroundColor: isActive ? pad.color : undefined,
                        borderColor: isCurrent ? '#00d2ff' : isActive ? pad.color : isDownbeat ? '#2c3547' : '#1b212d',
                      }}
                      className={`
                        flex-1 h-7 rounded-[3px] border transition-all duration-75 relative flex items-center justify-center
                        ${
                          isActive
                            ? 'shadow-[0_0_8px_rgba(255,255,255,0.4)] text-white'
                            : isDownbeat
                            ? 'bg-[#181d2a] hover:bg-[#202737]'
                            : 'bg-[#11151f] hover:bg-[#181d2a]'
                        }
                        ${isCurrent ? 'ring-2 ring-cyan-400 z-10' : ''}
                      `}
                    >
                      {/* Velocity indicator dot or bar */}
                      {isActive && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
