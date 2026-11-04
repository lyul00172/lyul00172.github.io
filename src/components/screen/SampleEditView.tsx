import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PadConfig, SampleData, SliceMarker, ChopMode } from '../../types/audio';
import { 
  Upload, 
  RotateCcw, 
  Play, 
  Sliders, 
  Scissors, 
  Plus, 
  Trash2, 
  Sparkles, 
  Check, 
  Layers,
  ChevronRight,
  MoveHorizontal
} from 'lucide-react';

interface SampleEditViewProps {
  padConfig: PadConfig;
  sampleData?: SampleData;
  padConfigs: PadConfig[];
  onUpdatePadConfig: (updated: Partial<PadConfig>) => void;
  onTriggerPad: (padId: number) => void;
  onDropAudioFile: (file: File, padId: number) => void;
  onAssignChopsToPads: (sourceBuffer: AudioBuffer, baseName: string, slices: SliceMarker[], startPadId: number) => void;
  onPreviewBuffer: (buffer: AudioBuffer) => void;
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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [draggingMarkerIndex, setDraggingMarkerIndex] = useState<number | null>(null);
  const [draggingTrimHandle, setDraggingTrimHandle] = useState<'START' | 'END' | null>(null);

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

  // Draw Waveform Canvas (both for TRIM and CHOP modes)
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

    const buffer = sampleData?.buffer;
    if (buffer) {
      const channelData = buffer.getChannelData(0);
      const step = Math.ceil(channelData.length / width);
      const amp = height / 2;

      // In CHOP mode: Draw slice segment backgrounds & vertical boundary divider lines
      if (editSubTab === 'CHOP' && slices.length > 0) {
        slices.forEach((slice, idx) => {
          const x1 = slice.start * width;
          const x2 = slice.end * width;
          const isSelected = idx === activeSliceIndex;

          // Fill slice background area
          ctx.fillStyle = isSelected ? `${slice.color}35` : `${slice.color}15`;
          ctx.fillRect(x1, 0, Math.max(1, x2 - x1), height);

          // Divider Line
          ctx.strokeStyle = slice.color;
          ctx.lineWidth = isSelected ? 2.5 : 1.5;
          ctx.beginPath();
          ctx.moveTo(x1, 0);
          ctx.lineTo(x1, height);
          ctx.stroke();

          // Slice Marker flag label
          ctx.fillStyle = isSelected ? '#ffffff' : slice.color;
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.fillText(`[${idx + 1}]`, x1 + 4, 14);
        });
      }

      // Draw Main Audio Waveform
      ctx.fillStyle = editSubTab === 'CHOP' ? '#e2e8f0' : (padConfig.color || '#ff2a3b');
      for (let i = 0; i < width; i++) {
        let min = 1.0;
        let max = -1.0;
        for (let j = 0; j < step; j++) {
          const datum = channelData[i * step + j] || 0;
          if (datum < min) min = datum;
          if (datum > max) max = datum;
        }
        ctx.fillRect(i, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
      }

      // In TRIM mode: Draw Start & End markers
      if (editSubTab === 'TRIM') {
        const startX = (padConfig.startOffset || 0) * width;
        const endX = (padConfig.endOffset || 1) * width;

        // Gray out outside trim regions
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, startX, height);
        ctx.fillRect(endX, 0, width - endX, height);

        // Start Marker (Green)
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(startX, 0);
        ctx.lineTo(startX, height);
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.fillText('START', startX + 4, 14);

        // End Marker (Red)
        ctx.strokeStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(endX, 0);
        ctx.lineTo(endX, height);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.fillText('END', Math.max(0, endX - 25), 14);
      }
    } else {
      ctx.fillStyle = '#64748b';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NO AUDIO SAMPLE LOADED &bull; DRAG & DROP AUDIO FILE OR CLICK LOAD', width / 2, height / 2);
    }
  }, [sampleData, padConfig, editSubTab, slices, activeSliceIndex]);

  // Audition a specific slice
  const handleAuditionSlice = (sliceIdx: number) => {
    if (!sampleData?.buffer || !slices[sliceIdx]) return;
    const slice = slices[sliceIdx];
    setActiveSliceIndex(sliceIdx);

    const sliced = onSliceAudioBuffer(sampleData.buffer, slice.start, slice.end);
    onPreviewBuffer(sliced);
  };

  // Pointer Down on Canvas: Drag boundaries or select/audition slice or add slice point
  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !sampleData?.buffer) return;
    const rect = canvas.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    // 1. In TRIM mode: check start or end marker drag
    if (editSubTab === 'TRIM') {
      const startRatio = padConfig.startOffset || 0;
      const endRatio = padConfig.endOffset || 1;

      if (Math.abs(clickRatio - startRatio) < 0.04) {
        setDraggingTrimHandle('START');
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }
      if (Math.abs(clickRatio - endRatio) < 0.04) {
        setDraggingTrimHandle('END');
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }

      // If clicking inside, audition pad
      onTriggerPad(padConfig.id);
      return;
    }

    // 2. In CHOP mode:
    // Check if dragging an existing slice divider boundary line
    const hitIdx = slices.findIndex((s, idx) => idx > 0 && Math.abs(s.start - clickRatio) < 0.02);
    if (hitIdx !== -1) {
      setDraggingMarkerIndex(hitIdx);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      return;
    }

    // In MANUAL mode: Clicking creates a new chop slice point right at the clicked position!
    if (chopMode === 'MANUAL') {
      insertManualSliceAt(clickRatio);
      return;
    }

    // Otherwise, select and audition the clicked slice segment
    const sliceIdx = slices.findIndex((s) => clickRatio >= s.start && clickRatio <= s.end);
    if (sliceIdx !== -1) {
      handleAuditionSlice(sliceIdx);
    }
  };

  // Insert a new slice point manually where the user clicks
  const insertManualSliceAt = (ratio: number) => {
    if (ratio <= 0.02 || ratio >= 0.98) return;

    setSlices((prev) => {
      // Find which slice contains this ratio
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

      // Re-index ids
      return updated.map((s, idx) => ({ ...s, id: idx }));
    });

    // Audition the new slice
    if (sampleData?.buffer) {
      const sliced = onSliceAudioBuffer(sampleData.buffer, ratio, 1.0);
      onPreviewBuffer(sliced);
    }
  };

  // Pointer Move on Canvas
  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    // Handle TRIM marker drag
    if (draggingTrimHandle === 'START') {
      const maxEnd = (padConfig.endOffset || 1) - 0.02;
      onUpdatePadConfig({ startOffset: Math.min(maxEnd, ratio) });
      return;
    }
    if (draggingTrimHandle === 'END') {
      const minStart = (padConfig.startOffset || 0) + 0.02;
      onUpdatePadConfig({ endOffset: Math.max(minStart, ratio) });
      return;
    }

    // Handle CHOP slice boundary drag
    if (draggingMarkerIndex !== null && slices[draggingMarkerIndex] && slices[draggingMarkerIndex - 1]) {
      const prevSlice = slices[draggingMarkerIndex - 1];
      const nextSlice = slices[draggingMarkerIndex];

      const minBound = prevSlice.start + 0.01;
      const maxBound = nextSlice.end - 0.01;
      const clampedRatio = Math.max(minBound, Math.min(maxBound, ratio));

      setSlices((prev) => {
        const next = [...prev];
        next[draggingMarkerIndex].start = clampedRatio;
        next[draggingMarkerIndex - 1].end = clampedRatio;
        return next;
      });
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setDraggingMarkerIndex(null);
    setDraggingTrimHandle(null);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // fallback
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

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onDropAudioFile(e.target.files[0], padConfig.id);
      e.target.value = '';
    }
  };

  const activeSlice = slices[activeSliceIndex];

  return (
    <div className="flex flex-col h-full bg-[#0d1017] text-slate-200 select-none overflow-y-auto p-4 gap-3">
      {/* Top Bar: Pad Selector, Sub-Tab Switcher (TRIM vs CHOP), and Actions */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#141924] border border-[#222a3d] rounded-lg">
        {/* Left: Pad info */}
        <div className="flex items-center gap-3">
          <div
            style={{ backgroundColor: padConfig.color }}
            className="w-3.5 h-3.5 rounded-full"
          />
          <div className="flex flex-col">
            <span className="text-xs font-mono font-bold text-white uppercase">
              PAD {padConfig.id + 1}: {padConfig.name}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {sampleData ? `${(sampleData.duration * 1000).toFixed(0)} ms &bull; 44.1kHz` : 'NO SAMPLE'}
            </span>
          </div>
        </div>

        {/* Center: TRIM vs CHOP Sub-Mode Toggle */}
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
            <Sliders size={13} />
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
            <Scissors size={13} />
            <span>WAVEFORM CHOP</span>
          </button>
        </div>

        {/* Right: Audition, Soul Break Demo & Load File */}
        <div className="flex items-center gap-2">
          {editSubTab === 'CHOP' && (
            <button
              onClick={handleLoadSoulBreakDemo}
              title="Load 4-bar vintage soul vinyl loop for immediate chopping"
              type="button"
              className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 rounded text-[10px] font-mono font-bold text-white shadow-sm"
            >
              <Sparkles size={11} />
              <span>LOAD SOUL BREAK</span>
            </button>
          )}

          <button
            onClick={() => onTriggerPad(padConfig.id)}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-700 hover:bg-emerald-600 rounded text-[10px] font-mono font-bold text-white shadow-sm"
          >
            <Play size={11} className="fill-white" />
            <span>AUDITION</span>
          </button>

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
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1b2232] hover:bg-[#252f44] border border-[#2e3952] rounded text-[10px] font-mono font-bold text-slate-200 shadow-sm"
          >
            <Upload size={11} />
            <span>LOAD FILE</span>
          </button>
        </div>
      </div>

      {/* Chop Configuration Tools Bar (Only displayed in CHOP sub-tab) */}
      {editSubTab === 'CHOP' && (
        <div className="flex items-center justify-between p-2.5 bg-[#121622] border border-[#202738] rounded-lg text-xs font-mono">
          {/* Mode Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold">CHOP METHOD:</span>
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
                {mode === 'MANUAL' ? 'CLICK WAVE (직접 클릭)' : mode === 'EQUAL' ? 'EQUAL DIVISIONS' : 'TRANSIENT PEAKS'}
              </button>
            ))}
          </div>

          {/* Slices count / Sensitivity / Manual controls */}
          <div className="flex items-center gap-3">
            {chopMode === 'EQUAL' && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">DIVIDE:</span>
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
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-amber-400 font-bold">
                  파형 위를 클릭하면 그 위치에 슬라이스 마커가 생성됩니다!
                </span>
                <button
                  onClick={handleDeleteSlice}
                  title="Delete active slice marker"
                  className="flex items-center gap-1 px-2 py-0.5 bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 rounded text-[9px] text-rose-300 font-bold"
                >
                  <Trash2 size={10} />
                  <span>DELETE SLICE</span>
                </button>
              </div>
            )}

            <button
              onClick={recalculateChopSlices}
              type="button"
              className="flex items-center gap-1 px-2.5 py-1 bg-[#1b2232] hover:bg-[#252f44] border border-[#2e3952] rounded text-[10px] text-slate-300 font-bold"
            >
              <RotateCcw size={11} />
              <span>RESET</span>
            </button>
          </div>
        </div>
      )}

      {/* Main High-Resolution Interactive Waveform Canvas */}
      <div
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
        className={`relative h-36 bg-[#090b10] border rounded-xl overflow-hidden shadow-inner flex flex-col justify-between ${
          isDraggingFile ? 'border-akai-red ring-2 ring-akai-red' : 'border-[#1e2536]'
        }`}
      >
        <canvas
          ref={canvasRef}
          width={640}
          height={144}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          className="w-full h-full block cursor-crosshair touch-none"
        />

        {/* Overlay Instructions Badge */}
        <div className="absolute top-2 right-3 pointer-events-none text-[9px] font-mono text-slate-400 bg-black/60 px-2 py-0.5 rounded border border-white/10">
          {editSubTab === 'CHOP'
            ? 'CLICK WAVEFORM TO SLICE/AUDITION &bull; DRAG MARKERS TO ADJUST BOUNDARIES'
            : 'DRAG GREEN/RED HANDLES TO TRIM AUDIO'}
        </div>

        {/* Waveform Bottom Info Strip */}
        <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between bg-[#121622]/90 backdrop-blur-sm border border-[#232c40] rounded px-3 py-1 text-[10px] font-mono">
          {editSubTab === 'CHOP' ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">ACTIVE CHOP:</span>
                <span className="font-bold text-white">
                  SLICE {activeSliceIndex + 1} of {slices.length}
                </span>
                {activeSlice && (
                  <span className="text-amber-400 font-mono">
                    [{(activeSlice.start * 100).toFixed(1)}% &rarr; {(activeSlice.end * 100).toFixed(1)}%]
                  </span>
                )}
              </div>
              <button
                onClick={() => handleAuditionSlice(activeSliceIndex)}
                type="button"
                className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 rounded text-white font-bold"
              >
                <Play size={10} className="fill-white" />
                <span>PLAY SLICE</span>
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span>START: {((padConfig.startOffset || 0) * 100).toFixed(1)}%</span>
                <span>END: {((padConfig.endOffset || 1) * 100).toFixed(1)}%</span>
                <span>LENGTH: {(((padConfig.endOffset || 1) - (padConfig.startOffset || 0)) * 100).toFixed(1)}%</span>
              </div>
              <button
                onClick={() => onTriggerPad(padConfig.id)}
                type="button"
                className="flex items-center gap-1 px-2.5 py-0.5 bg-akai-red hover:bg-rose-600 rounded text-white font-bold"
              >
                <Play size={10} className="fill-white" />
                <span>TEST TRIM</span>
              </button>
            </>
          )}
        </div>

        {isDraggingFile && (
          <div className="absolute inset-0 bg-akai-red/80 backdrop-blur-sm flex items-center justify-center font-mono font-bold text-white text-xs">
            DROP AUDIO FILE TO REPLACE SAMPLE
          </div>
        )}
      </div>

      {/* CHOP SUB-MODE: Slices Matrix & Assign Chops to 16 Pads */}
      {editSubTab === 'CHOP' && (
        <div className="flex flex-col gap-2 bg-[#121622] p-3 rounded-xl border border-[#202738]">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1">
            <span>CHOP SLICES MATRIX ({slices.length} SLICES) &bull; CLICK TO AUDITION</span>
            <span className="text-amber-400 font-bold">READY TO MAP TO PADS</span>
          </div>

          {/* Slices Grid */}
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
                    ${isSelected ? 'bg-[#1b2234] shadow-[0_0_8px_rgba(255,255,255,0.2)]' : ''}
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

          {/* Assign Chops Across 16 Pads Bar */}
          <div className="flex items-center justify-between pt-2 border-t border-[#1f2637] mt-1">
            <div className="flex flex-col">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]" />
                ASSIGN CHOPS TO 16 PADS
              </span>
              <span className="text-[9px] font-mono text-slate-400">
                SLICES 1&ndash;{Math.min(16, slices.length)} MAP TO PAD 01&ndash;{Math.min(16, slices.length)} &bull; MONO CHOKE (MUTE GROUP 1) ENABLED
              </span>
            </div>

            <button
              onClick={handleAssignTo16Pads}
              type="button"
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 active:scale-95 text-white font-mono font-bold text-xs rounded-lg shadow-lg transition-all"
            >
              <Scissors size={13} />
              <span>ASSIGN TO 16 PADS</span>
            </button>
          </div>
        </div>
      )}

      {/* TRIM SUB-MODE: Sliders, Knobs, Envelope & Filter Controls */}
      {editSubTab === 'TRIM' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-[#131722] p-3 rounded-lg border border-[#212738]">
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
          <div className="flex items-center gap-4 bg-[#141924] p-3 rounded-lg border border-[#222a3d] text-xs font-mono">
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
        </>
      )}

      {/* Success Notification Banner */}
      {successMessage && (
        <div className="flex items-center gap-2 p-2.5 bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs font-mono rounded-lg shadow-md animate-pulse">
          <Check size={14} />
          <span>{successMessage}</span>
        </div>
      )}
    </div>
  );
};
