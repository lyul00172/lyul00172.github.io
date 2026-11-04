import React from 'react';
import { Volume2, HelpCircle, Activity, Mic } from 'lucide-react';
import { QLinkKnob } from './QLinkKnob';

interface BrandHeaderProps {
  masterVolume: number;
  recGain: number;
  isEngineReady: boolean;
  onMasterVolumeChange: (vol: number) => void;
  onRecGainChange: (gain: number) => void;
  onOpenHelp: () => void;
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({
  masterVolume,
  recGain,
  isEngineReady,
  onMasterVolumeChange,
  onRecGainChange,
  onOpenHelp,
}) => {
  return (
    <div className="flex items-center justify-between px-6 py-3 bg-[#15171e] border-b border-[#292d3b] shadow-md select-none">
      {/* Left: AKAI Professional & MPC LIVE II Badges */}
      <div className="flex items-center gap-4">
        {/* Akai Professional Logo */}
        <div className="flex items-center gap-2">
          <div className="bg-akai-red text-white font-extrabold px-2.5 py-1 rounded text-sm tracking-wider font-display shadow-[0_0_10px_rgba(217,20,36,0.6)]">
            AKAI
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-display font-semibold tracking-widest text-slate-400">
              PROFESSIONAL
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-display font-black tracking-tight text-white">
                MPC LIVE
              </span>
              <span className="text-xs font-mono font-bold px-1.5 py-0.2 bg-[#2d3240] text-amber-400 rounded border border-amber-400/30">
                II
              </span>
            </div>
          </div>
        </div>

        {/* Device Subtitle */}
        <div className="hidden lg:flex flex-col border-l border-[#2e3342] pl-4">
          <span className="text-[9px] font-mono tracking-wider text-slate-400 uppercase">
            STANDALONE MUSIC PRODUCTION CENTER
          </span>
          <span className="text-[8px] font-mono text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            WEB AUDIO ENGINE ACTIVE &bull; 44.1kHz LOW LATENCY
          </span>
        </div>
      </div>

      {/* Right: Master Volume, Rec Gain, Headphone Jack & Status */}
      <div className="flex items-center gap-6">
        {/* Rec Gain Knob */}
        <div className="hidden md:flex items-center">
          <QLinkKnob
            label="REC GAIN"
            value={recGain}
            min={0}
            max={100}
            step={1}
            unit="%"
            onChange={onRecGainChange}
            size={36}
            color="#f59e0b"
          />
        </div>

        {/* Master Volume Knob */}
        <div className="flex items-center">
          <QLinkKnob
            label="MAIN VOL"
            value={masterVolume}
            min={0}
            max={100}
            step={1}
            unit="%"
            defaultValue={85}
            onChange={onMasterVolumeChange}
            size={40}
            color="#ff2a3b"
          />
        </div>

        {/* Headphone & Status Block */}
        <div className="flex items-center gap-3 pl-2 border-l border-[#2e3342]">
          {/* Headphone 1/4" Jack Simulation */}
          <div className="flex flex-col items-center">
            <div
              title="Headphone 1/4 inch Stereo Jack"
              className="w-5 h-5 rounded-full bg-[#0a0b0d] border-2 border-[#454c5c] flex items-center justify-center shadow-inner"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-[#1e2129] border border-black" />
            </div>
            <span className="text-[7px] font-mono text-slate-500 mt-0.5">PHONES</span>
          </div>

          {/* Engine Status LED */}
          <div className="flex flex-col items-center">
            <div
              title={isEngineReady ? 'Web Audio Context Running' : 'Click any pad to initialize'}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                isEngineReady
                  ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                  : 'bg-amber-500 animate-ping shadow-[0_0_8px_#f59e0b]'
              }`}
            />
            <span className="text-[7px] font-mono text-slate-500 mt-0.5 uppercase">
              {isEngineReady ? 'READY' : 'START'}
            </span>
          </div>

          {/* Help & Guide Button */}
          <button
            onClick={onOpenHelp}
            title="Keyboard Controls & Guide"
            type="button"
            className="p-1.5 rounded-lg bg-[#222530] hover:bg-[#2b3040] border border-[#393f50] text-slate-300 hover:text-white transition-colors"
          >
            <HelpCircle size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
