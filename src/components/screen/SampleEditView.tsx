import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PadConfig, SampleData, SliceMarker, ChopMode } from '../../types/audio';
import { 
  Upload, 
  RotateCcw, 
  Play, 
  Sliders, 
  Scissors, 
  Trash2, 
  Sparkles, 
  Check, 
  Volume2,
  VolumeX,
  Maximize2
} from 'lucide-react';

interface SampleEditViewProps {
  padConfig: PadConfig;
  sampleData?: SampleData;
  padConfigs: PadConfig[];
  onUpdatePadConfig: (updated: Partial<PadConfig>) => void;
  onTriggerPad: (padId: number) => void;
  onDropAudioFile: (file: File, padId: number) => void;
  onAssignChopsToPads: (sourceBuffer: AudioBuffer, baseName: string, slices: SliceMarker[], startPadId: number) => void;
  onPreviewBuffer: (buffer: AudioBuffer, volume?: number, startRatio?: number, endRatio?: number) => void;
  onSliceAudioBuffer: (source: AudioBuffer, start: number, end: number) => AudioBuffer;
  onGenerateEqualSlices: (count: number) => SliceMarker[];
  onDetectTransientSlices: (buffer: AudioBuffer, count: number, sensitivity: number) => SliceMarker[];
  onLoadSoulBreak: () => Promise<SampleData>;
  onPadSelect: (padId: number) => void;
}

const SLICE_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#10b981', '#06b6d4', '#0ea5e9',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#d946ef', '#ec4899', '#f43f5e', '#d91424',
];

export const SampleEditView: React.FC<SampleEditViewProps> = ({
  padConfig,
  sampleData,
  padConfigs,
  onUpdatePadConfig,
  onTriggerPad,
  onDropAudioFile,
  onAssignChopsToPads,
  onPreviewBuffer,
  onSliceAudioBuffer,
  onGenerateEqualSlices,
  onDetectTransientSlices,
  onLoadSoulBreak,
  onPadSelect,
}) => {
  // Sub-mode inside Sample Edit: TRIM (Parameters) or CHOP (Direct Waveform Slicing)
  const [editSubTab, setEditSubTab] = useState<'TRIM' | 'CHOP'>('TRIM');

  // Chopping State
  const [chopMode, setChopMode] = useState<ChopMode>('EQUAL');
  const [sliceCount, setSliceCount] = useState<number>(16);
  const [transientSensitivity, setTransientSensitivity] = useState<number>(0.28);
  const [slices, setSlices] = useState<SliceMarker[]>([]);
  const [activeSliceIndex, setActiveSliceIndex] = useState<number>(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Canvas and interaction refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Active dragging state for Start & End bars and Chop markers
  // 'START' | 'END' | 'SLICE_START' | 'SLICE_END' | number (slice boundary id) | null
  const [activeDragTarget, setActiveDragTarget] = useState<string | number | null>(null);

  const duration = sampleData?.buffer?.duration || 1.0;
  const startOffset = padConfig.startOffset ?? 0;
  const endOffset = padConfig.endOffset ?? 1;

  // Active slice in CHOP mode
  const activeSlice = slices[activeSliceIndex] || slices[0];
  const sliceStartRatio = activeSlice ? activeSlice.start : 0;
  const sliceEndRatio = activeSlice ? activeSlice.end : 1;

  // Recalculate chop slices when sample changes or mode/count changes
  const recalculateChopSlices = useCallback(() => {
    if (!sampleData?.buffer) return;

    if (chopMode === 'EQUAL') {
      const generated = onGenerateEqualSlices(sliceCount);
      setSlices(generated);
    } else if (chopMode === 'TRANSIENT') {
      const detected = onDetectTransientSlices(sampleData.buffer, sliceCount, transientSensitivity);
      setSlices(detected);
    }
  }, [sampleData, chopMode, sliceCount, transientSensitivity, onGenerateEqualSlices, onDetectTransientSlices]);

  useEffect(() => {
    if (editSubTab === 'CHOP' && slices.length === 0) {
      recalculateChopSlices();
    }
  }, [editSubTab, sampleData, recalculateChopSlices, slices.length]);

  // Load Soul Break Demo for instant chopping
  const handleLoadSoulBreakDemo = async () => {
    const demo = await onLoadSoulBreak();
    if (demo.buffer) {
      onDropAudioFile(new File([], 'Soul Vinyl Break'), padConfig.id);
    }
    setEditSubTab('CHOP');
    setTimeout(() => {
      recalculateChopSlices();
    }, 100);
  };

  // Draw Audio Waveform onto Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Dark grid background
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

    // Center zero baseline
    ctx.strokeStyle = '#232b3d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();

    const buffer = sampleData?.buffer;
    if (buffer) {
      const channelData = buffer.getChannelData(0);
      const step = Math.ceil(channelData.length / width);
      const amp = height / 2 - 2;

      // In CHOP mode: Draw subtle color washes for each slice
      if (editSubTab === 'CHOP' && slices.length > 0) {
        slices.forEach((slice, idx) => {
          const x1 = slice.start * width;
          const x2 = slice.end * width;
          const isSelected = idx === activeSliceIndex;

          ctx.fillStyle = isSelected ? `${slice.color}35` : `${slice.color}15`;
          ctx.fillRect(x1, 0, Math.max(1, x2 - x1), height);
        });
      }

      // Draw Main Audio Waveform
      for (let i = 0; i < width; i++) {
        const ratio = i / width;
        let isInsideActiveZone = true;

        if (editSubTab === 'TRIM') {
          isInsideActiveZone = ratio >= startOffset && ratio <= endOffset;
        } else if (editSubTab === 'CHOP' && activeSlice) {
          isInsideActiveZone = ratio >= activeSlice.start && ratio <= activeSlice.end;
        }

        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
          const datum = channelData[i * step + j] || 0;
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }

        const y1 = (1 + min) * amp;
        const barH = Math.max(1, (max - min) * amp);

        // Highlight active playback zone brightly, dim inactive trimmed regions
        if (isInsideActiveZone) {
          ctx.fillStyle = editSubTab === 'CHOP' ? '#00d2ff' : (padConfig.color || '#ff2a3b');
        } else {
          ctx.fillStyle = '#475569';
        }

        ctx.fillRect(i, y1, 1, barH);
      }
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NO AUDIO SAMPLE LOADED • DRAG & DROP AUDIO FILE OR CLICK LOAD', width / 2, height / 2);
    }
  }, [sampleData, padConfig, editSubTab, slices, activeSliceIndex, startOffset, endOffset, activeSlice]);

  // Audition helper
  const handleAuditionTrim = () => {
    if (!sampleData?.buffer) {
      onTriggerPad(padConfig.id);
      return;
    }
    onPreviewBuffer(sampleData.buffer, padConfig.volume, startOffset, endOffset);
  };

  const handleAuditionSlice = (sliceIdx: number) => {
    if (!sampleData?.buffer || !slices[sliceIdx]) return;
    const slice = slices[sliceIdx];
    setActiveSliceIndex(sliceIdx);
    onPreviewBuffer(sampleData.buffer, padConfig.volume, slice.start, slice.end);
  };

  // Pointer interactions for dragging START bar, END bar, and Chop boundaries
  const handleContainerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // If the click happened on a button or input, ignore
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;

    const container = waveformContainerRef.current;
    if (!container || !sampleData?.buffer) return;
    const rect = container.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    // 1. In TRIM mode:
    if (editSubTab === 'TRIM') {
      const distToStart = Math.abs(clickRatio - startOffset);
      const distToEnd = Math.abs(clickRatio - endOffset);

      if (distToStart < 0.035 || (distToStart < distToEnd && distToStart < 0.08)) {
        setActiveDragTarget('START');
        container.setPointerCapture(e.pointerId);
        return;
      }
      if (distToEnd < 0.035 || distToEnd < 0.08) {
        setActiveDragTarget('END');
        container.setPointerCapture(e.pointerId);
        return;
      }

      // If clicked between, audition trim!
      handleAuditionTrim();
      return;
    }

    // 2. In CHOP mode:
    if (editSubTab === 'CHOP' && activeSlice) {
      const distToSliceStart = Math.abs(clickRatio - activeSlice.start);
      const distToSliceEnd = Math.abs(clickRatio - activeSlice.end);

      if (distToSliceStart < 0.035) {
        setActiveDragTarget('SLICE_START');
        container.setPointerCapture(e.pointerId);
        return;
      }
      if (distToSliceEnd < 0.035) {
        setActiveDragTarget('SLICE_END');
        container.setPointerCapture(e.pointerId);
        return;
      }

      // Check other slice divider boundaries
      const hitSliceIdx = slices.findIndex((s, idx) => idx > 0 && Math.abs(s.start - clickRatio) < 0.025);
      if (hitSliceIdx !== -1) {
        setActiveDragTarget(hitSliceIdx);
        container.setPointerCapture(e.pointerId);
        return;
      }

      // In MANUAL chop mode: clicking inserts a new slice divider bar!
      if (chopMode === 'MANUAL') {
        insertManualSliceAt(clickRatio);
        return;
      }

      // Otherwise, select and audition clicked slice
      const foundIdx = slices.findIndex((s) => clickRatio >= s.start && clickRatio <= s.end);
      if (foundIdx !== -1) {
        handleAuditionSlice(foundIdx);
      }
    }
  };

  const handleContainerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeDragTarget || !waveformContainerRef.current) return;
    const rect = waveformContainerRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    // Dragging TRIM START
    if (activeDragTarget === 'START') {
      const maxAllowed = Math.max(0, endOffset - 0.015);
      const newStart = Math.max(0, Math.min(maxAllowed, ratio));
      onUpdatePadConfig({ startOffset: newStart });
      return;
    }

    // Dragging TRIM END
    if (activeDragTarget === 'END') {
      const minAllowed = Math.min(1, startOffset + 0.015);
      const newEnd = Math.min(1, Math.max(minAllowed, ratio));
      onUpdatePadConfig({ endOffset: newEnd });
      return;
    }

    // Dragging CHOP ACTIVE SLICE START
    if (activeDragTarget === 'SLICE_START' && activeSlice) {
      const minBound = activeSliceIndex > 0 ? (slices[activeSliceIndex - 1]?.start || 0) + 0.01 : 0;
      const maxBound = activeSlice.end - 0.015;
      const clamped = Math.max(minBound, Math.min(maxBound, ratio));

      setSlices((prev) => {
        const next = [...prev];
        if (next[activeSliceIndex]) {
          next[activeSliceIndex].start = clamped;
        }
        if (activeSliceIndex > 0 && next[activeSliceIndex - 1]) {
          next[activeSliceIndex - 1].end = clamped;
        }
        return next;
      });
      return;
    }

    // Dragging CHOP ACTIVE SLICE END
    if (activeDragTarget === 'SLICE_END' && activeSlice) {
      const minBound = activeSlice.start + 0.015;
      const maxBound = activeSliceIndex < slices.length - 1 ? (slices[activeSliceIndex + 1]?.end || 1) - 0.01 : 1;
      const clamped = Math.max(minBound, Math.min(maxBound, ratio));

      setSlices((prev) => {
        const next = [...prev];
        if (next[activeSliceIndex]) {
          next[activeSliceIndex].end = clamped;
        }
        if (activeSliceIndex < next.length - 1 && next[activeSliceIndex + 1]) {
          next[activeSliceIndex + 1].start = clamped;
        }
        return next;
      });
      return;
    }

    // Dragging an arbitrary slice boundary index
    if (typeof activeDragTarget === 'number' && slices[activeDragTarget] && slices[activeDragTarget - 1]) {
      const prevSlice = slices[activeDragTarget - 1];
      const nextSlice = slices[activeDragTarget];
      const minBound = prevSlice.start + 0.01;
      const maxBound = nextSlice.end - 0.01;
      const clamped = Math.max(minBound, Math.min(maxBound, ratio));

      setSlices((prev) => {
        const next = [...prev];
        next[activeDragTarget].start = clamped;
        next[activeDragTarget - 1].end = clamped;
        return next;
      });
    }
  };

  const handleContainerPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeDragTarget) {
      setActiveDragTarget(null);
      try {
        waveformContainerRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        // fallback
      }
    }
  };

  // Insert a new slice point manually where the user clicks
  const insertManualSliceAt = (ratio: number) => {
    if (ratio <= 0.02 || ratio >= 0.98) return;

    setSlices((prev) => {
      const targetIdx = prev.findIndex((s) => ratio > s.start && ratio < s.end);
      if (targetIdx === -1) return prev;

      const current = prev[targetIdx];
      const newColor = SLICE_COLORS[prev.length % SLICE_COLORS.length];

      const firstPart: SliceMarker = {
        id: current.id,
        start: current.start,
        end: ratio,
        color: current.color,
      };

      const secondPart: SliceMarker = {
        id: prev.length,
        start: ratio,
        end: current.end,
        color: newColor,
      };

      const updated = [...prev];
      updated.splice(targetIdx, 1, firstPart, secondPart);
      return updated.map((s, idx) => ({ ...s, id: idx }));
    });

    if (sampleData?.buffer) {
      onPreviewBuffer(sampleData.buffer, padConfig.volume, ratio, 1.0);
    }
  };

  // Delete currently selected slice in manual mode
  const handleDeleteSlice = () => {
    if (slices.length <= 1) return;

    setSlices((prev) => {
      const target = prev[activeSliceIndex];
      if (!target) return prev;

      const next = [...prev];
      if (activeSliceIndex === 0) {
        next[1].start = 0;
        next.splice(0, 1);
      } else {
        next[activeSliceIndex - 1].end = target.end;
        next.splice(activeSliceIndex, 1);
      }
      return next.map((s, idx) => ({ ...s, id: idx }));
    });

    setActiveSliceIndex((prev) => Math.max(0, prev - 1));
  };

  // Convert & Assign Slices across 16 Pads
  const handleAssignTo16Pads = () => {
    if (!sampleData?.buffer || slices.length === 0) return;
    onAssignChopsToPads(sampleData.buffer, padConfig.name, slices, 0);

    setSuccessMessage(`Assigned ${Math.min(16, slices.length)} chops across PAD 01 - PAD ${Math.min(16, slices.length)} with Mono Choke (Mute Group 1)!`);
    onTriggerPad(0);
    onPadSelect(0);

    setTimeout(() => {
      setSuccessMessage(null);
    }, 4500);
  };

  const handleResetTrim = () => {
    onUpdatePadConfig({ startOffset: 0, endOffset: 1 });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onDropAudioFile(e.target.files[0], padConfig.id);
      e.target.value = '';
    }
  };

  // Current start & end display values
  const currentStartRatio = editSubTab === 'CHOP' ? sliceStartRatio : startOffset;
  const currentEndRatio = editSubTab === 'CHOP' ? sliceEndRatio : endOffset;
  const currentStartTime = (currentStartRatio * duration).toFixed(3);
  const currentEndTime = (currentEndRatio * duration).toFixed(3);
  const currentDurationTime = ((currentEndRatio - currentStartRatio) * duration).toFixed(3);

  return (
    <div className="flex flex-col h-full bg-[#0d1017] text-slate-200 select-none overflow-y-auto p-3.5 gap-2.5">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#141924] border border-[#222a3d] rounded-lg shrink-0">
        {/* Left: Pad Info */}
        <div className="flex items-center gap-2.5">
          <div
            style={{ backgroundColor: padConfig.color }}
            className="w-3 h-3 rounded-full shadow-[0_0_8px_currentColor]"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono font-bold text-white uppercase">
                PAD {padConfig.id + 1}: {padConfig.name}
              </span>
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                {(duration).toFixed(2)}s
              </span>
            </div>
          </div>
        </div>

        {/* Center: TRIM vs CHOP Sub-Mode Switcher */}
        <div className="flex items-center gap-1 bg-[#090b10] p-1 rounded-lg border border-[#1e2536]">
          <button
            onClick={() => setEditSubTab('TRIM')}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
              editSubTab === 'TRIM'
                ? 'bg-akai-red text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders size={12} />
            <span>TRIM &amp; PARAMS</span>
          </button>

          <button
            onClick={() => {
              setEditSubTab('CHOP');
              if (slices.length === 0) recalculateChopSlices();
            }}
            type="button"
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-bold transition-all ${
              editSubTab === 'CHOP'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Scissors size={12} />
            <span>WAVEFORM CHOP</span>
          </button>
        </div>

        {/* Right: Quick Tools */}
        <div className="flex items-center gap-2">
          {editSubTab === 'CHOP' && (
            <button
              onClick={handleLoadSoulBreakDemo}
              title="Load 4-bar vintage soul vinyl loop for immediate chopping"
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 rounded text-[10px] font-mono font-bold text-white shadow-sm"
            >
              <Sparkles size={11} />
              <span>SOUL BREAK DEMO</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.wav,.mp3,.ogg,.flac,.aiff,.m4a"
            onChange={handleFileInput}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            type="button"
            className="flex items-center gap-1 px-2.5 py-1 bg-[#1b2232] hover:bg-[#252f44] border border-[#2e3952] rounded text-[10px] font-mono font-bold text-slate-200 shadow-sm"
          >
            <Upload size={11} />
            <span>LOAD FILE</span>
          </button>
        </div>
      </div>

      {/* CHOP Sub-Mode Options Bar */}
      {editSubTab === 'CHOP' && (
        <div className="flex items-center justify-between p-2 bg-[#121622] border border-[#202738] rounded-lg text-xs font-mono shrink-0">
          {/* Mode Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-bold mr-1">CHOP MODE:</span>
            {(['MANUAL', 'EQUAL', 'TRANSIENT'] as ChopMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => {
                  setChopMode(mode);
                  if (mode === 'EQUAL') {
                    setSlices(onGenerateEqualSlices(sliceCount));
                  } else if (mode === 'TRANSIENT' && sampleData?.buffer) {
                    setSlices(onDetectTransientSlices(sampleData.buffer, sliceCount, transientSensitivity));
                  }
                }}
                type="button"
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                  chopMode === mode
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-[#1b2232] text-slate-400 hover:text-white'
                }`}
              >
                {mode === 'MANUAL' ? 'CLICK TO SLICE' : mode === 'EQUAL' ? 'EQUAL DIVIDE' : 'TRANSIENT PEAKS'}
              </button>
            ))}
          </div>

          {/* Slices count / Sensitivity */}
          <div className="flex items-center gap-3">
            {chopMode === 'EQUAL' && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">SLICES:</span>
                {[4, 8, 16].map((count) => (
                  <button
                    key={count}
                    onClick={() => {
                      setSliceCount(count);
                      setSlices(onGenerateEqualSlices(count));
                    }}
                    type="button"
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      sliceCount === count ? 'bg-cyan-600 text-white' : 'bg-[#1b2232] text-slate-400 hover:text-white'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            )}

            {chopMode === 'TRANSIENT' && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400">SENSITIVITY:</span>
                <input
                  type="range"
                  min={0.1}
                  max={0.6}
                  step={0.02}
                  value={transientSensitivity}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setTransientSensitivity(val);
                    if (sampleData?.buffer) {
                      setSlices(onDetectTransientSlices(sampleData.buffer, sliceCount, val));
                    }
                  }}
                  className="w-20 accent-amber-500 cursor-pointer"
                />
                <span className="text-white font-bold">{Math.round(transientSensitivity * 100)}%</span>
              </div>
            )}

            {chopMode === 'MANUAL' && (
              <button
                onClick={handleDeleteSlice}
                title="Delete active slice marker"
                className="flex items-center gap-1 px-2 py-0.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 rounded text-[9px] text-rose-300 font-bold"
              >
                <Trash2 size={10} />
                <span>DEL SLICE</span>
              </button>
            )}

            <button
              onClick={recalculateChopSlices}
              type="button"
              className="flex items-center gap-1 px-2 py-0.5 bg-[#1b2232] hover:bg-[#252f44] border border-[#2e3952] rounded text-[10px] text-slate-300 font-bold"
            >
              <RotateCcw size={10} />
              <span>RESET</span>
            </button>
          </div>
        </div>
      )}

      {/* WAVEFORM CONTAINER (100% UNOBSTRUCTED - NO TEST TRIM BOX ON TOP!) */}
      <div
        ref={waveformContainerRef}
        onPointerDown={handleContainerPointerDown}
        onPointerMove={handleContainerPointerMove}
        onPointerUp={handleContainerPointerUp}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingFile(true);
        }}
        onDragLeave={() => setIsDraggingFile(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingFile(false);
          if (e.dataTransfer.files?.[0]) {
            onDropAudioFile(e.dataTransfer.files[0], padConfig.id);
          }
        }}
        className={`relative h-44 w-full bg-[#080a0f] border-2 rounded-xl overflow-hidden shadow-inner cursor-crosshair select-none touch-none shrink-0 ${
          isDraggingFile ? 'border-akai-red ring-2 ring-akai-red' : 'border-[#1f2637]'
        }`}
      >
        {/* Background Waveform Canvas */}
        <canvas
          ref={canvasRef}
          width={640}
          height={176}
          className="w-full h-full block pointer-events-none"
        />

        {/* Shaded Regions (Outside of Start & End) */}
        {editSubTab === 'TRIM' && (
          <>
            {/* Shaded Area before Start Bar */}
            <div
              style={{ width: `${startOffset * 100}%` }}
              className="absolute top-0 bottom-0 left-0 bg-black/60 pointer-events-none border-r border-emerald-500/40"
            />
            {/* Shaded Area after End Bar */}
            <div
              style={{ left: `${endOffset * 100}%`, right: 0 }}
              className="absolute top-0 bottom-0 bg-black/60 pointer-events-none border-l border-rose-500/40"
            />
          </>
        )}

        {/* IN CHOP MODE: Intermediate slice divider bars */}
        {editSubTab === 'CHOP' &&
          slices.map((slice, idx) => {
            if (idx === 0) return null;
            const xPercent = slice.start * 100;
            const isMarkerBeingDragged = activeDragTarget === idx;

            return (
              <div
                key={slice.id}
                style={{ left: `${xPercent}%` }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  setActiveDragTarget(idx);
                  waveformContainerRef.current?.setPointerCapture(e.pointerId);
                }}
                className="absolute top-0 bottom-0 w-6 -ml-3 flex flex-col items-center justify-between cursor-ew-resize group z-10"
              >
                {/* Top Badge */}
                <span
                  style={{ backgroundColor: slice.color }}
                  className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold text-white shadow-md transition-transform ${
                    isMarkerBeingDragged ? 'scale-125 ring-2 ring-white' : 'group-hover:scale-110'
                  }`}
                >
                  [{idx + 1}]
                </span>

                {/* Vertical Divider Line */}
                <div
                  style={{ backgroundColor: slice.color }}
                  className="w-[2px] h-full opacity-70 group-hover:opacity-100 shadow-[0_0_6px_currentColor]"
                />

                {/* Bottom Notch */}
                <div
                  style={{ backgroundColor: slice.color }}
                  className="w-1.5 h-1.5 rounded-full mb-1 opacity-70"
                />
              </div>
            );
          })}

        {/* ======================================================== */}
        {/* DRAGGABLE START BAR (GREEN) - INDICATING AUDIO START POINT */}
        {/* ======================================================== */}
        <div
          style={{ left: `${currentStartRatio * 100}%` }}
          onPointerDown={(e) => {
            e.stopPropagation();
            setActiveDragTarget(editSubTab === 'CHOP' ? 'SLICE_START' : 'START');
            waveformContainerRef.current?.setPointerCapture(e.pointerId);
          }}
          className="absolute top-0 bottom-0 w-8 -ml-4 flex flex-col items-center justify-between cursor-ew-resize group z-20"
        >
          {/* Top Grab Handle Pill */}
          <div
            className={`
              flex items-center gap-1 px-2 py-0.5 rounded-b-md bg-emerald-500 text-black font-mono font-black text-[9px]
              shadow-[0_2px_8px_rgba(16,185,129,0.8)] border border-emerald-300 transition-all select-none
              ${
                activeDragTarget === 'START' || activeDragTarget === 'SLICE_START'
                  ? 'scale-110 ring-2 ring-white bg-emerald-400'
                  : 'group-hover:scale-105 group-hover:bg-emerald-400'
              }
            `}
          >
            <span>START ▶</span>
            <span className="text-[7px] opacity-80">{currentStartTime}s</span>
          </div>

          {/* Vertical Luminous Green Laser Line */}
          <div className="w-[3px] h-full bg-emerald-400 shadow-[0_0_10px_#10b981] group-hover:w-[4px] transition-all" />

          {/* Bottom Pointer Triangle Handle */}
          <div className="w-3 h-2 bg-emerald-500 border border-emerald-300 shadow-sm flex items-center justify-center rounded-t-sm mb-0.5">
            <div className="w-1.5 h-1 bg-black rounded-full" />
          </div>
        </div>

        {/* ====================================================== */}
        {/* DRAGGABLE END BAR (RED) - INDICATING AUDIO END POINT   */}
        {/* ====================================================== */}
        <div
          style={{ left: `${currentEndRatio * 100}%` }}
          onPointerDown={(e) => {
            e.stopPropagation();
            setActiveDragTarget(editSubTab === 'CHOP' ? 'SLICE_END' : 'END');
            waveformContainerRef.current?.setPointerCapture(e.pointerId);
          }}
          className="absolute top-0 bottom-0 w-8 -ml-4 flex flex-col items-center justify-between cursor-ew-resize group z-20"
        >
          {/* Top Grab Handle Pill */}
          <div
            className={`
              flex items-center gap-1 px-2 py-0.5 rounded-b-md bg-rose-600 text-white font-mono font-black text-[9px]
              shadow-[0_2px_8px_rgba(225,29,72,0.8)] border border-rose-400 transition-all select-none
              ${
                activeDragTarget === 'END' || activeDragTarget === 'SLICE_END'
                  ? 'scale-110 ring-2 ring-white bg-rose-500'
                  : 'group-hover:scale-105 group-hover:bg-rose-500'
              }
            `}
          >
            <span className="text-[7px] opacity-80">{currentEndTime}s</span>
            <span>◀ END</span>
          </div>

          {/* Vertical Luminous Red Laser Line */}
          <div className="w-[3px] h-full bg-rose-500 shadow-[0_0_10px_#ef4444] group-hover:w-[4px] transition-all" />

          {/* Bottom Pointer Triangle Handle */}
          <div className="w-3 h-2 bg-rose-600 border border-rose-400 shadow-sm flex items-center justify-center rounded-t-sm mb-0.5">
            <div className="w-1.5 h-1 bg-white rounded-full" />
          </div>
        </div>

        {/* Active dragging tooltip */}
        {activeDragTarget && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/90 border border-cyan-400 text-cyan-300 font-mono text-xs rounded-md shadow-2xl z-30 pointer-events-none flex items-center gap-2 animate-pulse">
            <span className="font-bold">
              {activeDragTarget === 'START' || activeDragTarget === 'SLICE_START'
                ? `START BAR: ${currentStartTime}s (${(currentStartRatio * 100).toFixed(1)}%)`
                : `END BAR: ${currentEndTime}s (${(currentEndRatio * 100).toFixed(1)}%)`}
            </span>
          </div>
        )}

        {/* Drag & Drop File Over Dropzone */}
        {isDraggingFile && (
          <div className="absolute inset-0 bg-akai-red/80 backdrop-blur-sm flex items-center justify-center font-mono font-bold text-white text-xs z-30 pointer-events-none">
            DROP AUDIO FILE TO REPLACE PAD SAMPLE
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* CLEAN STATUS & PLAYBACK TOOLBAR (PLACED OUTSIDE BELOW THE WAVEFORM)       */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#121622] border border-[#222a3d] rounded-lg text-xs font-mono shrink-0">
        {/* Left: Precise Time Readouts */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
            <span className="text-slate-400 text-[10px]">START:</span>
            <span className="font-bold text-emerald-400 font-mono">{currentStartTime}s</span>
            <span className="text-[10px] text-slate-500">({(currentStartRatio * 100).toFixed(1)}%)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_#ef4444]" />
            <span className="text-slate-400 text-[10px]">END:</span>
            <span className="font-bold text-rose-400 font-mono">{currentEndTime}s</span>
            <span className="text-[10px] text-slate-500">({(currentEndRatio * 100).toFixed(1)}%)</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5">
            <span className="text-slate-400 text-[10px]">LENGTH:</span>
            <span className="font-bold text-cyan-400 font-mono">{currentDurationTime}s</span>
          </div>
        </div>

        {/* Right: Audition & Reset Controls */}
        <div className="flex items-center gap-2">
          {editSubTab === 'TRIM' ? (
            <>
              <button
                onClick={handleResetTrim}
                title="Reset Start to 0% and End to 100%"
                type="button"
                className="px-2.5 py-1 bg-[#1a202d] hover:bg-[#232b3d] border border-[#2d374d] rounded text-[10px] text-slate-300 font-bold transition-colors"
              >
                RESET TRIM
              </button>

              <button
                onClick={handleAuditionTrim}
                type="button"
                className="flex items-center gap-1.5 px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded text-xs shadow-md transition-all"
              >
                <Play size={12} className="fill-white" />
                <span>PLAY TRIMMED RANGE</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleAuditionSlice(activeSliceIndex)}
                type="button"
                className="flex items-center gap-1.5 px-3.5 py-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded text-xs shadow-md transition-all"
              >
                <Play size={12} className="fill-white" />
                <span>AUDITION CHOP [{activeSliceIndex + 1}]</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CHOP SUB-MODE: Slices Matrix Grid & Assign Chops across 16 Pads           */}
      {/* ========================================================================= */}
      {editSubTab === 'CHOP' && (
        <div className="flex flex-col gap-2 bg-[#121622] p-3 rounded-xl border border-[#202738] shrink-0">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1">
            <span>CHOP SLICES MATRIX ({slices.length} SLICES) • CLICK TO SELECT &amp; AUDITION</span>
            <span className="text-amber-400 font-bold">ACTIVE: SLICE {activeSliceIndex + 1}</span>
          </div>

          {/* Slices Grid (16 buttons) */}
          <div className="grid grid-cols-8 gap-1.5 max-h-24 overflow-y-auto pr-1">
            {slices.map((slice, idx) => {
              const isSelected = idx === activeSliceIndex;
              return (
                <button
                  key={slice.id}
                  onClick={() => handleAuditionSlice(idx)}
                  style={{
                    borderColor: isSelected ? slice.color : '#222838',
                  }}
                  className={`
                    p-1.5 rounded bg-[#131722] hover:bg-[#1a202f] border transition-all flex flex-col items-center justify-between
                    ${isSelected ? 'bg-[#1b2234] shadow-[0_0_10px_rgba(255,255,255,0.3)] ring-1 ring-white/50' : ''}
                  `}
                >
                  <div className="flex items-center justify-between w-full text-[8px] font-mono text-slate-400">
                    <span>S{idx + 1}</span>
                    <div style={{ backgroundColor: slice.color }} className="w-1.5 h-1.5 rounded-full" />
                  </div>
                  <span className="text-[9px] font-bold text-slate-200 mt-0.5">
                    PAD {idx + 1}
                  </span>
                </button>
              );
            })}
          </div>

          {/* The Big Assign Button Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-[#1f2637] mt-1">
            <div className="flex flex-col">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" />
                ASSIGN CHOPS TO 16 PADS
              </span>
              <span className="text-[9px] font-mono text-slate-400">
                SLICES 1–{Math.min(16, slices.length)} WILL BE ASSIGNED TO PAD 01–{Math.min(16, slices.length)} WITH CHOKE GROUP 1
              </span>
            </div>

            <button
              onClick={handleAssignTo16Pads}
              type="button"
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-600 via-rose-600 to-akai-red hover:from-amber-500 hover:to-rose-500 active:scale-95 text-white font-mono font-bold text-xs rounded-lg shadow-lg transition-all"
            >
              <Scissors size={14} />
              <span>ASSIGN TO 16 PADS</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TRIM SUB-MODE: Sliders, Knobs, Envelope & Filter Controls                 */}
      {/* ========================================================================= */}
      {editSubTab === 'TRIM' && (
        <div className="flex flex-col gap-2 shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 bg-[#131722] p-3 rounded-lg border border-[#212738]">
            {/* Pitch / Tune */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>TUNE / PITCH</span>
                <span className="font-bold text-cyan-400">
                  {padConfig.pitch > 0 ? `+${padConfig.pitch}` : padConfig.pitch} st
                </span>
              </div>
              <input
                type="range"
                min={-24}
                max={24}
                step={1}
                value={padConfig.pitch}
                onChange={(e) => onUpdatePadConfig({ pitch: parseInt(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Volume */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>PAD LEVEL</span>
                <span className="font-bold text-white">{Math.round(padConfig.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={padConfig.volume}
                onChange={(e) => onUpdatePadConfig({ volume: parseFloat(e.target.value) })}
                className="w-full accent-akai-red cursor-pointer"
              />
            </div>

            {/* Pan */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>PAN</span>
                <span className="font-bold text-amber-400">
                  {padConfig.pan > 0
                    ? `R${Math.round(padConfig.pan * 100)}`
                    : padConfig.pan < 0
                    ? `L${Math.round(Math.abs(padConfig.pan) * 100)}`
                    : 'CENTER'}
                </span>
              </div>
              <input
                type="range"
                min={-1}
                max={1}
                step={0.05}
                value={padConfig.pan}
                onChange={(e) => onUpdatePadConfig({ pan: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            {/* Filter Cutoff */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>CUTOFF</span>
                <span className="font-bold text-emerald-400">
                  {padConfig.cutoff >= 1000 ? `${(padConfig.cutoff / 1000).toFixed(1)}k Hz` : `${padConfig.cutoff} Hz`}
                </span>
              </div>
              <input
                type="range"
                min={100}
                max={20000}
                step={100}
                value={padConfig.cutoff}
                onChange={(e) => onUpdatePadConfig({ cutoff: parseInt(e.target.value) })}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            {/* Attack Envelope */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>ATTACK</span>
                <span className="font-bold text-slate-300">{(padConfig.attack * 1000).toFixed(0)} ms</span>
              </div>
              <input
                type="range"
                min={0.001}
                max={0.5}
                step={0.005}
                value={padConfig.attack}
                onChange={(e) => onUpdatePadConfig({ attack: parseFloat(e.target.value) })}
                className="w-full accent-slate-300 cursor-pointer"
              />
            </div>

            {/* Decay Envelope */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>DECAY</span>
                <span className="font-bold text-slate-300">{(padConfig.decay * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.05}
                value={padConfig.decay}
                onChange={(e) => onUpdatePadConfig({ decay: parseFloat(e.target.value) })}
                className="w-full accent-slate-300 cursor-pointer"
              />
            </div>

            {/* Reverb Send */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>REVERB SEND</span>
                <span className="font-bold text-purple-400">{Math.round(padConfig.sendReverb * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={padConfig.sendReverb}
                onChange={(e) => onUpdatePadConfig({ sendReverb: parseFloat(e.target.value) })}
                className="w-full accent-purple-400 cursor-pointer"
              />
            </div>

            {/* Delay Send */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>DELAY SEND</span>
                <span className="font-bold text-indigo-400">{Math.round(padConfig.sendDelay * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={padConfig.sendDelay}
                onChange={(e) => onUpdatePadConfig({ sendDelay: parseFloat(e.target.value) })}
                className="w-full accent-indigo-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Switches: Reverse & Mute Group */}
          <div className="flex items-center gap-4 bg-[#141924] p-2.5 rounded-lg border border-[#222a3d] text-xs font-mono">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={padConfig.reverse}
                onChange={(e) => onUpdatePadConfig({ reverse: e.target.checked })}
                className="accent-akai-red w-4 h-4 cursor-pointer"
              />
              <span className="font-bold text-slate-200">REVERSE PLAYBACK</span>
            </label>

            <div className="flex items-center gap-2 border-l border-[#2e374d] pl-4">
              <span className="text-slate-400">CHOKE / MUTE GROUP:</span>
              <select
                value={padConfig.muteGroup}
                onChange={(e) => onUpdatePadConfig({ muteGroup: parseInt(e.target.value) })}
                className="bg-[#1b2232] border border-[#2e3952] rounded px-2 py-1 text-slate-200 cursor-pointer"
              >
                <option value={0}>OFF (Polyphonic)</option>
                <option value={1}>GROUP 1 (Hi-Hats / Vinyl Choke)</option>
                <option value={2}>GROUP 2 (Bass / Sub Choke)</option>
                <option value={3}>GROUP 3</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="flex items-center gap-2 p-2.5 bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs font-mono rounded-lg shadow-md animate-pulse shrink-0">
          <Check size={14} />
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
};
