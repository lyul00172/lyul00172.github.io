import React, { useState, useRef } from 'react';
import { PadConfig, SampleData } from '../../types/audio';
import { 
  FolderOpen, 
  Upload, 
  Play, 
  Square, 
  Check, 
  Music, 
  FileAudio, 
  Disc, 
  Layers, 
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface BrowseViewProps {
  padConfigs: PadConfig[];
  samples: Map<string, SampleData>;
  selectedPadId: number;
  onPadSelect: (padId: number) => void;
  onTriggerPad: (padId: number) => void;
  onDropAudioFile: (file: File, padId: number) => void;
  onLoadMultipleFiles: (files: File[], startPadId: number) => void;
  onPreviewBuffer: (buffer: AudioBuffer) => void;
  onAssignSampleToPad: (padId: number, sampleId: string) => void;
}

export const BrowseView: React.FC<BrowseViewProps> = ({
  padConfigs,
  samples,
  selectedPadId,
  onPadSelect,
  onTriggerPad,
  onDropAudioFile,
  onLoadMultipleFiles,
  onPreviewBuffer,
  onAssignSampleToPad,
}) => {
  const [targetPad, setTargetPad] = useState<number>(selectedPadId);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [playingSampleId, setPlayingSampleId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'LOCAL_FILES' | 'SAMPLE_LIBRARY' | 'KIT_PRESETS'>('LOCAL_FILES');

  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  // Convert samples map to array for display
  const sampleList = Array.from(samples.values());
  const customSamples = sampleList.filter((s) => s.isCustom);

  const handleSingleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onDropAudioFile(e.target.files[0], targetPad);
      e.target.value = '';
    }
  };

  const handleMultiFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onLoadMultipleFiles(files, targetPad);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.type.includes('audio') || f.name.match(/\.(wav|mp3|ogg|flac|aiff|m4a)$/i)
      );

      if (files.length === 1) {
        onDropAudioFile(files[0], targetPad);
      } else if (files.length > 1) {
        onLoadMultipleFiles(files, targetPad);
      }
    }
  };

  const handleAuditionSample = (sample: SampleData) => {
    if (!sample.buffer) return;
    setPlayingSampleId(sample.id);
    onPreviewBuffer(sample.buffer);
    setTimeout(() => {
      setPlayingSampleId(null);
    }, Math.min(2500, sample.duration * 1000));
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1017] text-slate-200 select-none overflow-hidden p-3.5 gap-3">
      {/* Top Header & Tab Navigation */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#141924] border border-[#222a3d] rounded-lg">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-akai-red/20 border border-akai-red/40 rounded text-akai-red">
            <FolderOpen size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              MPC BROWSER &bull; EXTERNAL AUDIO ASSIGNMENT
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              ASSIGN LOCAL AUDIO FILES (WAV, MP3, FLAC) TO 16 PADS
            </span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-[#090b10] p-1 rounded border border-[#1e2536]">
          <button
            onClick={() => setActiveTab('LOCAL_FILES')}
            type="button"
            className={`px-3 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
              activeTab === 'LOCAL_FILES' ? 'bg-akai-red text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            FILE UPLOADER
          </button>
          <button
            onClick={() => setActiveTab('SAMPLE_LIBRARY')}
            type="button"
            className={`px-3 py-1 rounded text-[10px] font-mono font-bold transition-colors ${
              activeTab === 'SAMPLE_LIBRARY' ? 'bg-akai-red text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            SAMPLE POOL ({sampleList.length})
          </button>
        </div>
      </div>

      {/* Main Body */}
      {activeTab === 'LOCAL_FILES' && (
        <div className="flex-1 flex flex-col md:flex-row gap-3 overflow-hidden">
          {/* Left: Drag & Drop Zone and File Selection */}
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
            {/* Target Pad Selector */}
            <div className="flex items-center justify-between p-3 bg-[#131722] border border-[#212738] rounded-lg text-xs font-mono">
              <span className="text-slate-300 font-bold">TARGET PAD:</span>
              <div className="flex items-center gap-2">
                <select
                  value={targetPad}
                  onChange={(e) => {
                    const id = parseInt(e.target.value);
                    setTargetPad(id);
                    onPadSelect(id);
                  }}
                  className="bg-[#1b2232] border border-[#2d374d] rounded px-3 py-1 text-xs font-mono font-bold text-amber-400 cursor-pointer"
                >
                  {padConfigs.map((p) => (
                    <option key={p.id} value={p.id}>
                      PAD {p.id + 1}: {p.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => onTriggerPad(targetPad)}
                  type="button"
                  className="px-2.5 py-1 bg-[#222a3d] hover:bg-[#2b354d] border border-[#34405c] rounded text-[10px] text-emerald-400 font-bold"
                >
                  AUDITION
                </button>
              </div>
            </div>

            {/* Drag & Drop Hero Box */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`flex-1 min-h-[160px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center transition-all ${
                isDragOver
                  ? 'border-akai-red bg-akai-red/20 shadow-[0_0_20px_rgba(217,20,36,0.4)]'
                  : 'border-[#262e40] bg-[#0c0e14] hover:border-[#38435d]'
              }`}
            >
              <FileAudio
                size={36}
                className={`mb-3 transition-transform ${isDragOver ? 'scale-125 text-akai-red' : 'text-slate-400'}`}
              />

              <h3 className="text-sm font-display font-bold text-white mb-1">
                DRAG &amp; DROP AUDIO FILES HERE
              </h3>
              <p className="text-[11px] font-mono text-slate-400 max-w-sm mb-4">
                Drop a single file to assign to <span className="text-amber-400 font-bold">PAD {targetPad + 1}</span>, or drop multiple files to auto-map across pads!
              </p>

              {/* Upload Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <input
                  ref={singleFileInputRef}
                  type="file"
                  accept="audio/*,.wav,.mp3,.ogg,.flac,.aiff,.m4a"
                  onChange={handleSingleFile}
                  className="hidden"
                />
                <button
                  onClick={() => singleFileInputRef.current?.click()}
                  type="button"
                  className="flex items-center gap-1.5 px-4 py-2 bg-akai-red hover:bg-rose-600 active:scale-95 text-white text-xs font-mono font-bold rounded-lg shadow-md transition-all"
                >
                  <Upload size={13} />
                  <span>SELECT AUDIO FILE</span>
                </button>

                <input
                  ref={multiFileInputRef}
                  type="file"
                  multiple
                  accept="audio/*,.wav,.mp3,.ogg,.flac,.aiff,.m4a"
                  onChange={handleMultiFiles}
                  className="hidden"
                />
                <button
                  onClick={() => multiFileInputRef.current?.click()}
                  type="button"
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1b2232] hover:bg-[#252f44] active:scale-95 text-slate-200 border border-[#2e3952] text-xs font-mono font-bold rounded-lg shadow-sm transition-all"
                >
                  <Layers size={13} />
                  <span>BATCH LOAD MULTI-FILES</span>
                </button>
              </div>

              <span className="text-[9px] font-mono text-slate-500 mt-3">
                SUPPORTED FORMATS: WAV, MP3, FLAC, OGG, AIFF, M4A &bull; INSTANT DECODING
              </span>
            </div>
          </div>

          {/* Right: Quick Pad Overview Matrix */}
          <div className="w-full md:w-64 bg-[#11141d] border border-[#202738] rounded-xl p-3 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-2 pb-1 border-b border-[#1f2637]">
              <span>16-PAD KIT ASSIGNMENT</span>
              <span className="text-cyan-400">CLICK TO SELECT</span>
            </div>

            <div className="grid grid-cols-4 gap-1.5 flex-1">
              {padConfigs.map((pad) => {
                const isSelected = pad.id === targetPad;
                const isExt = pad.sampleId.startsWith('user_') || pad.sampleId.startsWith('lib_') || pad.sampleId.startsWith('rec_');

                return (
                  <button
                    key={pad.id}
                    onClick={() => {
                      setTargetPad(pad.id);
                      onPadSelect(pad.id);
                      onTriggerPad(pad.id);
                    }}
                    style={{
                      borderColor: isSelected ? pad.color : '#1e2434',
                    }}
                    className={`
                      relative p-1 rounded border flex flex-col justify-between items-center transition-all text-center
                      ${isSelected ? 'bg-[#1b2234] shadow-[0_0_8px_rgba(255,255,255,0.2)]' : 'bg-[#131722] hover:bg-[#191f2d]'}
                    `}
                  >
                    <div className="flex items-center justify-between w-full text-[7px] font-mono text-slate-400">
                      <span>P{pad.id + 1}</span>
                      {isExt && <span className="text-cyan-400 font-bold">EXT</span>}
                    </div>

                    <span className="text-[8px] font-bold text-slate-200 truncate w-full px-0.5">
                      {pad.name}
                    </span>

                    <div
                      style={{ backgroundColor: pad.color }}
                      className="w-1.5 h-1.5 rounded-full"
                    />
                  </button>
                );
              })}
            </div>

            <p className="text-[9px] font-mono text-slate-400 text-center mt-2 pt-2 border-t border-[#1f2637]">
              Current Target: <span className="text-white font-bold">PAD {targetPad + 1} ({padConfigs[targetPad]?.name})</span>
            </p>
          </div>
        </div>
      )}

      {/* Sample Pool / Library Tab */}
      {activeTab === 'SAMPLE_LIBRARY' && (
        <div className="flex-1 flex flex-col bg-[#11141d] border border-[#202738] rounded-xl overflow-hidden">
          <div className="px-3 py-2 bg-[#161a25] border-b border-[#222a3a] flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>ALL LOADED AUDIO SAMPLES IN PROJECT</span>
            <span>{sampleList.length} SAMPLES &bull; {customSamples.length} EXTERNAL</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-[#191f2c] px-1 py-1">
            {sampleList.map((sample) => {
              const isPlaying = playingSampleId === sample.id;
              const isAssigned = padConfigs.some((p) => p.sampleId === sample.id);

              return (
                <div
                  key={sample.id}
                  className="flex items-center justify-between px-3 py-2 hover:bg-[#151a26] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleAuditionSample(sample)}
                      type="button"
                      className={`p-1.5 rounded-full border transition-all ${
                        isPlaying
                          ? 'bg-emerald-500 border-emerald-400 text-white animate-pulse'
                          : 'bg-[#1b2232] border-[#2c364c] text-slate-300 hover:text-white hover:bg-akai-red'
                      }`}
                    >
                      {isPlaying ? <Square size={12} className="fill-white" /> : <Play size={12} className="fill-current" />}
                    </button>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white font-display">
                          {sample.name}
                        </span>
                        {sample.isCustom && (
                          <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-700/50">
                            EXTERNAL FILE
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] font-mono text-slate-400">
                        {sample.category.toUpperCase()} &bull; {(sample.duration * 1000).toFixed(0)} ms
                      </span>
                    </div>
                  </div>

                  {/* Assign to Pad Controls */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400">ASSIGN TO:</span>
                    <select
                      onChange={(e) => {
                        const targetId = parseInt(e.target.value);
                        onAssignSampleToPad(targetId, sample.id);
                        onPadSelect(targetId);
                        onTriggerPad(targetId);
                      }}
                      defaultValue=""
                      className="bg-[#1b2232] border border-[#2d374d] rounded px-2 py-1 text-xs font-mono font-bold text-amber-400 cursor-pointer"
                    >
                      <option value="" disabled>Select Pad...</option>
                      {padConfigs.map((p) => (
                        <option key={p.id} value={p.id}>
                          PAD {p.id + 1} ({p.name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
