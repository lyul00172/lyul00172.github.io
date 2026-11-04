import React from 'react';
import { PadConfig } from '../../types/audio';
import { Volume2, VolumeX, Sliders } from 'lucide-react';

interface TrackMixerViewProps {
  padConfigs: PadConfig[];
  selectedPadId: number;
  masterVolume: number;
  onUpdatePadConfig: (padId: number, updated: Partial<PadConfig>) => void;
  onMasterVolumeChange: (vol: number) => void;
  onPadSelect: (padId: number) => void;
  onTriggerPad: (padId: number) => void;
}

export const TrackMixerView: React.FC<TrackMixerViewProps> = ({
  padConfigs,
  selectedPadId,
  masterVolume,
  onUpdatePadConfig,
  onMasterVolumeChange,
  onPadSelect,
  onTriggerPad,
}) => {
  return (
    <div className="flex flex-col h-full bg-[#0d1017] text-slate-200 select-none overflow-hidden p-3 gap-2">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#141924] border border-[#222a3d] rounded-lg">
        <div className="flex items-center gap-2">
          <Sliders size={14} className="text-akai-red" />
          <span className="text-xs font-mono font-bold text-white uppercase">
            16-CHANNEL DRUM PROGRAM MIXER
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">
          ANALOG BUS WITH COMPRESSOR &amp; MASTER LIMITER
        </span>
      </div>

      {/* Mixer Channel Strips Container */}
      <div className="flex-1 flex gap-2 overflow-x-auto py-1 px-1">
        {/* 16 Pad Channel Strips */}
        {padConfigs.map((pad) => {
          const isSelected = pad.id === selectedPadId;

          return (
            <div
              key={pad.id}
              onClick={() => onPadSelect(pad.id)}
              style={{
                borderColor: isSelected ? pad.color : '#1e2433',
              }}
              className={`
                flex flex-col justify-between items-center w-14 shrink-0 bg-[#121622] rounded-lg border p-2 cursor-pointer transition-colors
                ${isSelected ? 'bg-[#181f2f]' : 'hover:bg-[#151a28]'}
              `}
            >
              {/* Pad Number & Dot */}
              <div className="flex items-center justify-between w-full text-[9px] font-mono text-slate-400">
                <span>P{pad.id + 1}</span>
                <div
                  style={{ backgroundColor: pad.color }}
                  className="w-2 h-2 rounded-full"
                />
              </div>

              {/* Pan Slider (Mini) */}
              <div className="flex flex-col items-center w-full my-1">
                <span className="text-[7px] font-mono text-slate-400">
                  {pad.pan === 0 ? 'C' : pad.pan > 0 ? `R${Math.round(pad.pan * 100)}` : `L${Math.round(Math.abs(pad.pan) * 100)}`}
                </span>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.1}
                  value={pad.pan}
                  onChange={(e) => {
                    e.stopPropagation();
                    onUpdatePadConfig(pad.id, { pan: parseFloat(e.target.value) });
                  }}
                  className="w-full accent-amber-400 h-1 cursor-pointer"
                />
              </div>

              {/* Vertical Fader */}
              <div className="flex-1 flex flex-col items-center justify-center my-1 relative">
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={pad.volume}
                  onChange={(e) => {
                    e.stopPropagation();
                    onUpdatePadConfig(pad.id, { volume: parseFloat(e.target.value) });
                  }}
                  style={{
                    writingMode: 'vertical-lr',
                    direction: 'rtl',
                  }}
                  className="h-28 w-4 accent-akai-red cursor-pointer"
                />
              </div>

              {/* Volume value */}
              <span className="text-[8px] font-mono text-slate-300 font-bold mb-1">
                {Math.round(pad.volume * 100)}%
              </span>

              {/* Mute & Solo Buttons */}
              <div className="flex gap-1 w-full mt-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdatePadConfig(pad.id, { isMuted: !pad.isMuted });
                  }}
                  type="button"
                  className={`flex-1 py-0.5 rounded text-[8px] font-mono font-bold ${
                    pad.isMuted
                      ? 'bg-rose-600 text-white'
                      : 'bg-[#1b2230] text-slate-400 hover:text-white'
                  }`}
                >
                  M
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTriggerPad(pad.id);
                  }}
                  type="button"
                  className="flex-1 py-0.5 rounded text-[8px] font-mono font-bold bg-[#1b2230] text-emerald-400 hover:text-white hover:bg-emerald-700"
                >
                  &bull;
                </button>
              </div>

              {/* Pad Title */}
              <span className="text-[9px] font-bold text-slate-200 truncate w-full text-center mt-1">
                {pad.name}
              </span>
            </div>
          );
        })}

        {/* Master Bus Channel Strip */}
        <div className="flex flex-col justify-between items-center w-16 shrink-0 bg-[#161c2b] rounded-lg border-2 border-akai-red/60 p-2 ml-2 shadow-lg">
          <span className="text-[9px] font-mono font-black text-rose-400 uppercase tracking-wider">
            MASTER
          </span>

          <div className="flex-1 flex flex-col items-center justify-center my-2">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={masterVolume}
              onChange={(e) => onMasterVolumeChange(parseInt(e.target.value))}
              style={{
                writingMode: 'vertical-lr',
                direction: 'rtl',
              }}
              className="h-28 w-4 accent-rose-500 cursor-pointer"
            />
          </div>

          <span className="text-[9px] font-mono text-white font-bold mb-1">
            {masterVolume}%
          </span>

          <div className="w-full text-center py-1 bg-akai-red text-white text-[8px] font-mono font-black rounded uppercase">
            BUS
          </div>
        </div>
      </div>
    </div>
  );
};
