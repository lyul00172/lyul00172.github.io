import React from 'react';
import { QLinkKnob } from './QLinkKnob';
import { QLinkParam } from '../../types/mpc';

interface QLinkStripProps {
  params: QLinkParam[];
  qlinkBank: number; // 0, 1, 2, 3
  onToggleBank: () => void;
}

export const QLinkStrip: React.FC<QLinkStripProps> = ({
  params,
  qlinkBank,
  onToggleBank,
}) => {
  return (
    <div className="flex flex-col items-center justify-between h-full bg-[#16181f] border border-[#2b2f3c] rounded-lg p-2.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
      {/* Q-Link Header Button */}
      <button
        onClick={onToggleBank}
        title="Toggle Q-Link Bank (1-4, 5-8, 9-12, 13-16)"
        type="button"
        className="w-full flex items-center justify-between px-2 py-1 mb-2 bg-[#222631] hover:bg-[#2b3040] border border-[#373d4e] rounded text-[9px] font-mono font-bold text-slate-300 active:bg-akai-red active:text-white transition-colors"
      >
        <span className="text-akai-red font-extrabold tracking-wider">Q-LINK</span>
        <span className="bg-[#12141a] px-1.5 py-0.5 rounded text-[8px] text-amber-400">
          BANK {String.fromCharCode(65 + qlinkBank)}
        </span>
      </button>

      {/* 4 Stacked Q-Link Knobs */}
      <div className="flex flex-col justify-around items-center gap-3.5 flex-1 w-full">
        {params.slice(0, 4).map((p, idx) => (
          <div key={idx} className="relative flex flex-col items-center">
            {/* Index Badge */}
            <span className="absolute -top-1 -left-2 text-[8px] font-mono text-slate-500 font-bold">
              Q{idx + 1}
            </span>
            <QLinkKnob
              label={p.label}
              value={p.value}
              min={p.min}
              max={p.max}
              step={p.step}
              unit={p.unit}
              onChange={p.onChange}
              size={44}
              color={idx === 0 ? '#ff2a3b' : idx === 1 ? '#f59e0b' : idx === 2 ? '#00d2ff' : '#10b981'}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
