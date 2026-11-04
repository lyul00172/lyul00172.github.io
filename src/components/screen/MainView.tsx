import React, { useRef, useEffect } from 'react';
import { PadConfig } from '../../types/audio';
import { Play, Square, Sparkles, Trash2, Sliders, Music, Zap } from 'lucide-react';

interface MainViewProps {
  padConfigs: PadConfig[];
  selectedPadId: number;
  currentStep: number;
  isPlaying: boolean;
  bpm: number;
  totalBars: number;
  analyser: AnalyserNode | null;
  onPadSelect: (padId: number) => void;
  onTriggerPad: (padId: number) => void;
  onClearPattern: () => void;
}

export const MainView: React.FC<MainViewProps> = ({
  padConfigs,
  selectedPadId,
  currentStep,
  isPlaying,
  bpm,
  totalBars,
  analyser,
  onPadSelect,
  onTriggerPad,
  onClearPattern,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const selectedPad = padConfigs[selectedPadId] || padConfigs[0];

  // Draw real-time oscilloscope / waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const bufferLength = analyser ? analyser.fftSize : 256;
    const timeData = new Uint8Array(bufferLength);
    const freqData = new Uint8Array(bufferLength / 2);

    const render = () => {
      animId = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Background Grid
      ctx.strokeStyle = '#181e2b';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += 30) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += 20) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      if (analyser && isPlaying) {
        analyser.getByteTimeDomainData(timeData);
        analyser.getByteFrequencyData(freqData);

        // Draw frequency spectrum bars at bottom
        const barWidth = (width / freqData.length) * 2;
        let barX = 0;
        for (let i = 0; i < freqData.length; i++) {
          const barHeight = (freqData[i] / 255) * (height * 0.45);
          const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
          gradient.addColorStop(0, 'rgba(217, 20, 36, 0.4)');
          gradient.addColorStop(1, 'rgba(245, 158, 11, 0.8)');
          ctx.fillStyle = gradient;
          ctx.fillRect(barX, height - barHeight, barWidth - 1, barHeight);
          barX += barWidth;
        }

        // Draw main oscilloscope waveform line
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#00d2ff';
        ctx.shadowColor = '#00d2ff';
        ctx.shadowBlur = 8;
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }
        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        // Resting center line
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#2b3445';
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Idle message
        ctx.fillStyle = '#64748b';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('AUDIO READY • HIT PADS OR PRESS SPACE TO PLAY', width / 2, height / 2 - 12);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [analyser, isPlaying]);

  return (
    <div className="flex flex-col h-full gap-3 p-4 bg-[#0d1017] text-slate-200 select-none overflow-y-auto">
      {/* Top Banner: Track Info & Quick Actions */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#141924] border border-[#222a3d] rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-akai-red/20 border border-akai-red/40 rounded text-akai-red">
            <Music size={16} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white uppercase">TRACK 01: DRUM PROGRAM</span>
              <span className="text-[9px] font-mono px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                ACTIVE
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              BOOM BAP KIT &bull; {totalBars} BARS &bull; {totalBars * 16} STEPS &bull; {bpm} BPM
            </span>
          </div>
        </div>

        {/* Clear Pattern button */}
        <button
          onClick={onClearPattern}
          title="Clear all steps in current sequence"
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1e2330] hover:bg-rose-950/40 border border-[#30384c] hover:border-rose-700/60 rounded text-[10px] font-mono font-bold text-slate-300 hover:text-rose-300 transition-colors"
        >
          <Trash2 size={12} />
          <span>CLEAR SEQ</span>
        </button>
      </div>

      {/* Center Waveform & Oscilloscope Display (Full clear view with no box covering waves!) */}
      <div className="relative flex-1 min-h-[140px] bg-[#090b10] border border-[#1e2536] rounded-lg overflow-hidden shadow-inner flex flex-col justify-between">
        <canvas
          ref={canvasRef}
          width={600}
          height={150}
          className="w-full h-full block"
        />

        {/* Top Info Tag */}
        <div className="absolute top-2 left-3 flex items-center gap-2 pointer-events-none">
          <span className="text-[9px] font-mono font-bold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
            MASTER OSCILLOSCOPE
          </span>
          {isPlaying && (
            <span className="text-[9px] font-mono text-emerald-400 animate-pulse">
              ● STEP {currentStep + 1}
            </span>
          )}
        </div>
      </div>

      {/* Selected Pad Info Bar (Cleanly positioned below canvas, zero occlusion!) */}
      <div className="flex items-center justify-between bg-[#121622] border border-[#232c40] rounded-lg px-3 py-1.5 text-[10px] font-mono shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">SELECTED PAD:</span>
          <span className="font-bold text-white">PAD {selectedPad.id + 1} &bull; {selectedPad.name}</span>
        </div>
        <div className="flex items-center gap-3 text-slate-400">
          <span>VOL: <strong className="text-white">{Math.round(selectedPad.volume * 100)}%</strong></span>
          <span>PAN: <strong className="text-amber-400">{selectedPad.pan > 0 ? `R${Math.round(selectedPad.pan * 100)}` : selectedPad.pan < 0 ? `L${Math.round(Math.abs(selectedPad.pan) * 100)}` : 'C'}</strong></span>
          <span>TUNE: <strong className="text-cyan-400">{selectedPad.pitch >= 0 ? `+${selectedPad.pitch}` : selectedPad.pitch}st</strong></span>
        </div>
      </div>

      {/* Lower Section: 16-Pad Matrix Quick Overview & Launch */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1">
          <span>PROGRAM PADS (CLICK TO AUDITION / SELECT)</span>
          <span className="text-amber-400 font-semibold">BANK A</span>
        </div>

        <div className="grid grid-cols-8 gap-1.5">
          {padConfigs.map((pad) => {
            const isSelected = pad.id === selectedPadId;
            return (
              <button
                key={pad.id}
                onClick={() => {
                  onPadSelect(pad.id);
                  onTriggerPad(pad.id);
                }}
                style={{
                  borderColor: isSelected ? pad.color : '#222838',
                }}
                className={`
                  flex flex-col items-center justify-center p-1.5 rounded bg-[#131722] hover:bg-[#1a202f] border transition-all text-left
                  ${isSelected ? 'bg-[#1b2234] shadow-[0_0_8px_rgba(217,20,36,0.2)]' : ''}
                `}
              >
                <div className="flex items-center justify-between w-full text-[8px] font-mono text-slate-400 mb-0.5">
                  <span>{pad.id + 1}</span>
                  <div
                    style={{ backgroundColor: pad.color }}
                    className="w-1.5 h-1.5 rounded-full"
                  />
                </div>
                <span className="text-[9px] font-bold text-slate-200 truncate w-full">
                  {pad.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
