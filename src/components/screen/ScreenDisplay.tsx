import React from 'react';
import { ScreenMode } from '../../types/mpc';
import { PadConfig, SampleData, SequencerPattern, SliceMarker } from '../../types/audio';
import { MainView } from './MainView';
import { BrowseView } from './BrowseView';
import { GridSequencerView } from './GridSequencerView';
import { SampleEditView } from './SampleEditView';
import { TrackMixerView } from './TrackMixerView';
import { PadPerformView } from './PadPerformView';
import { SamplerRecordView } from './SamplerRecordView';
import { AudioRecorder } from '../../audio/AudioRecorder';
import { Volume2, Music, Layers, Activity, Mic, Sliders, FolderOpen } from 'lucide-react';

interface ScreenDisplayProps {
  currentMode: ScreenMode;
  padConfigs: PadConfig[];
  samples: Map<string, SampleData>;
  pattern: SequencerPattern;
  selectedPadId: number;
  currentStep: number;
  currentBar: number;
  currentBeat: number;
  isPlaying: boolean;
  bpm: number;
  swing: number;
  totalBars: number;
  masterVolume: number;
  analyser: AnalyserNode | null;
  audioLevel: number;
  audioPeak: number;
  recorder: AudioRecorder | null;
  onSetMode: (mode: ScreenMode) => void;
  onPadSelect: (padId: number) => void;
  onTriggerPad: (padId: number, velocity?: number) => void;
  onTriggerPadWithTune: (padId: number, semitones: number, velocity: number) => void;
  onToggleStep: (padId: number, stepIndex: number) => void;
  onClearPattern: () => void;
  onClearPadPattern: (padId: number) => void;
  onUpdatePadConfig: (padId: number, updated: Partial<PadConfig>) => void;
  onMasterVolumeChange: (vol: number) => void;
  onDropAudioFile: (file: File, padId: number) => void;
  onLoadMultipleFiles: (files: File[], startPadId: number) => void;
  onPreviewBuffer: (buffer: AudioBuffer) => void;
  onAssignSampleToPad: (padId: number, sampleId: string) => void;
  onAssignChopsToPads: (sourceBuffer: AudioBuffer, baseName: string, slices: SliceMarker[], startPadId: number) => void;
  onSliceAudioBuffer: (source: AudioBuffer, start: number, end: number) => AudioBuffer;
  onGenerateEqualSlices: (count: number) => SliceMarker[];
  onDetectTransientSlices: (buffer: AudioBuffer, count: number, sensitivity: number) => SliceMarker[];
  onLoadSoulBreak: () => Promise<SampleData>;
  onSampleRecorded: (padId: number, name: string, buffer: AudioBuffer) => void;
  onBpmChange: (bpm: number) => void;
  onSwingChange: (swing: number) => void;
}

export const ScreenDisplay: React.FC<ScreenDisplayProps> = ({
  currentMode,
  padConfigs,
  samples,
  pattern,
  selectedPadId,
  currentStep,
  currentBar,
  currentBeat,
  isPlaying,
  bpm,
  swing,
  totalBars,
  masterVolume,
  analyser,
  audioLevel,
  audioPeak,
  recorder,
  onSetMode,
  onPadSelect,
  onTriggerPad,
  onTriggerPadWithTune,
  onToggleStep,
  onClearPattern,
  onClearPadPattern,
  onUpdatePadConfig,
  onMasterVolumeChange,
  onDropAudioFile,
  onLoadMultipleFiles,
  onPreviewBuffer,
  onAssignSampleToPad,
  onAssignChopsToPads,
  onSliceAudioBuffer,
  onGenerateEqualSlices,
  onDetectTransientSlices,
  onLoadSoulBreak,
  onSampleRecorded,
  onBpmChange,
  onSwingChange,
}) => {
  const selectedPad = padConfigs[selectedPadId] || padConfigs[0];
  const selectedSample = samples.get(selectedPad.sampleId);

  // Tabs for the MPC OS touch display
  const navTabs: { id: ScreenMode; label: string; icon: React.ReactNode }[] = [
    { id: 'MAIN', label: 'MAIN', icon: <Layers size={13} /> },
    { id: 'BROWSE', label: 'BROWSE', icon: <FolderOpen size={13} /> },
    { id: 'STEP_SEQ', label: 'STEP SEQ', icon: <Activity size={13} /> },
    { id: 'SAMPLE_EDIT', label: 'SAMPLE EDIT', icon: <Sliders size={13} /> },
    { id: 'MIXER', label: 'MIXER', icon: <Volume2 size={13} /> },
    { id: 'PAD_PERFORM', label: '16 LEVEL', icon: <Music size={13} /> },
    { id: 'SAMPLER_REC', label: 'SAMPLER', icon: <Mic size={13} /> },
  ];

  return (
    <div className="flex flex-col w-full h-[480px] min-h-[460px] bg-[#08090d] border-4 border-[#181a20] rounded-xl shadow-[inset_0_0_20px_rgba(0,0,0,0.9),0_4px_12px_rgba(0,0,0,0.8)] overflow-hidden relative font-sans">
      {/* MPC OS Top Status Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-[#171a22] via-[#12141c] to-[#171a22] border-b border-[#262c3a] select-none text-slate-300">
        {/* Project & Song position */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-akai-red shadow-[0_0_6px_#d91424]" />
            <span className="text-[11px] font-mono font-black text-white tracking-wider">
              BOOM BAP 01
            </span>
          </div>

          {/* Bar / Beat / Tick Counter */}
          <div className="flex items-center gap-1 px-2 py-0.5 bg-[#0a0c10] border border-[#202533] rounded text-[11px] font-mono text-cyan-400 font-bold">
            <span>{currentBar.toString().padStart(2, '0')}</span>
            <span className="text-slate-600">:</span>
            <span>{currentBeat.toString().padStart(2, '0')}</span>
            <span className="text-slate-600">:</span>
            <span>{((currentStep % 4) * 24).toString().padStart(2, '0')}</span>
          </div>
        </div>

        {/* Center: BPM & Swing */}
        <div className="flex items-center gap-3 text-xs font-mono font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400">BPM</span>
            <input
              type="number"
              min={40}
              max={240}
              value={bpm}
              onChange={(e) => onBpmChange(parseInt(e.target.value) || 90)}
              className="w-12 bg-[#090b10] border border-[#262c3a] rounded px-1 text-center text-white font-mono font-bold text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-400">SWING</span>
            <input
              type="number"
              min={50}
              max={75}
              value={swing}
              onChange={(e) => onSwingChange(parseInt(e.target.value) || 50)}
              className="w-12 bg-[#090b10] border border-[#262c3a] rounded px-1 text-center text-amber-400 font-mono font-bold text-xs"
            />
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[10px] text-slate-400">
            <span>BARS</span>
            <span className="text-white font-bold">{totalBars}</span>
          </div>
        </div>

        {/* Right: Master VU Meter & Status */}
        <div className="flex items-center gap-3">
          {/* Stereo VU Meter */}
          <div className="flex items-center gap-1 bg-[#090b10] px-2 py-1 rounded border border-[#202533]">
            <span className="text-[8px] font-mono text-slate-400 mr-0.5">OUT</span>
            {/* L Bar */}
            <div className="w-16 h-2 bg-[#12151c] rounded-sm overflow-hidden flex">
              <div
                style={{ width: `${audioLevel}%` }}
                className={`h-full transition-all duration-75 ${
                  audioPeak > 90 ? 'bg-rose-500' : audioPeak > 75 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
              />
            </div>
            {/* Clip LED */}
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                audioPeak > 95 ? 'bg-rose-500 shadow-[0_0_6px_#ef4444]' : 'bg-[#2a1a1e]'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Screen Body View Area */}
      <div className="flex-1 overflow-hidden relative">
        {currentMode === 'MAIN' && (
          <MainView
            padConfigs={padConfigs}
            selectedPadId={selectedPadId}
            currentStep={currentStep}
            isPlaying={isPlaying}
            bpm={bpm}
            totalBars={totalBars}
            analyser={analyser}
            onPadSelect={onPadSelect}
            onTriggerPad={onTriggerPad}
            onClearPattern={onClearPattern}
          />
        )}

        {currentMode === 'BROWSE' && (
          <BrowseView
            padConfigs={padConfigs}
            samples={samples}
            selectedPadId={selectedPadId}
            onPadSelect={onPadSelect}
            onTriggerPad={onTriggerPad}
            onDropAudioFile={onDropAudioFile}
            onLoadMultipleFiles={onLoadMultipleFiles}
            onPreviewBuffer={onPreviewBuffer}
            onAssignSampleToPad={onAssignSampleToPad}
          />
        )}

        {currentMode === 'STEP_SEQ' && (
          <GridSequencerView
            padConfigs={padConfigs}
            pattern={pattern}
            currentStep={currentStep}
            isPlaying={isPlaying}
            totalBars={totalBars}
            selectedPadId={selectedPadId}
            onToggleStep={onToggleStep}
            onClearPadPattern={onClearPadPattern}
            onPadSelect={onPadSelect}
            onTriggerPad={onTriggerPad}
          />
        )}

        {currentMode === 'SAMPLE_EDIT' && (
          <SampleEditView
            padConfig={selectedPad}
            sampleData={selectedSample}
            padConfigs={padConfigs}
            onUpdatePadConfig={(updated) => onUpdatePadConfig(selectedPadId, updated)}
            onTriggerPad={onTriggerPad}
            onDropAudioFile={onDropAudioFile}
            onAssignChopsToPads={onAssignChopsToPads}
            onPreviewBuffer={onPreviewBuffer}
            onSliceAudioBuffer={onSliceAudioBuffer}
            onGenerateEqualSlices={onGenerateEqualSlices}
            onDetectTransientSlices={onDetectTransientSlices}
            onLoadSoulBreak={onLoadSoulBreak}
            onPadSelect={onPadSelect}
          />
        )}

        {currentMode === 'MIXER' && (
          <TrackMixerView
            padConfigs={padConfigs}
            selectedPadId={selectedPadId}
            masterVolume={masterVolume}
            onUpdatePadConfig={onUpdatePadConfig}
            onMasterVolumeChange={onMasterVolumeChange}
            onPadSelect={onPadSelect}
            onTriggerPad={onTriggerPad}
          />
        )}

        {currentMode === 'PAD_PERFORM' && (
          <PadPerformView
            selectedPad={selectedPad}
            onTriggerPadWithTune={onTriggerPadWithTune}
          />
        )}

        {currentMode === 'SAMPLER_REC' && (
          <SamplerRecordView
            padConfigs={padConfigs}
            selectedPadId={selectedPadId}
            recorder={recorder}
            onSampleRecorded={onSampleRecorded}
            onTriggerPad={onTriggerPad}
          />
        )}
      </div>

      {/* Bottom Mode Switcher Nav Bar */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-[#12141a] border-t border-[#222836] select-none">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full">
          {navTabs.map((tab) => {
            const isActive = currentMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSetMode(tab.id)}
                type="button"
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-[10px] font-mono font-bold tracking-wider uppercase transition-all duration-75 whitespace-nowrap
                  ${
                    isActive
                      ? 'bg-akai-red text-white shadow-[0_0_10px_rgba(217,20,36,0.5)] border border-rose-500'
                      : 'bg-[#181c26] text-slate-400 hover:text-white hover:bg-[#202534] border border-[#282f40]'
                  }
                `}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
