import React from 'react';
import { BrandHeader } from './BrandHeader';
import { SpeakerGrille } from './SpeakerGrille';
import { TransportBar } from './TransportBar';
import { PadGrid } from './PadGrid';
import { QLinkStrip } from './QLinkStrip';
import { DataDial } from './DataDial';
import { ScreenDisplay } from '../screen/ScreenDisplay';
import { HardwareButton } from './HardwareButton';
import { ScreenMode, PadBank, QLinkParam } from '../../types/mpc';
import { PadConfig, SampleData, SequencerPattern, SliceMarker } from '../../types/audio';
import { AudioRecorder } from '../../audio/AudioRecorder';

interface MPCChassisProps {
  screenMode: ScreenMode;
  padConfigs: PadConfig[];
  samples: Map<string, SampleData>;
  pattern: SequencerPattern;
  selectedPadId: number;
  activePadTriggers: Set<number>;
  activeBank: PadBank;
  isFullLevel: boolean;
  is16Level: boolean;
  isEraseMode: boolean;
  isPlaying: boolean;
  isRecording: boolean;
  isOverdubbing: boolean;
  bpm: number;
  swing: number;
  totalBars: number;
  currentStep: number;
  currentBar: number;
  currentBeat: number;
  masterVolume: number;
  recGain: number;
  metronomeEnabled: boolean;
  isEngineReady: boolean;
  analyser: AnalyserNode | null;
  audioLevel: number;
  audioPeak: number;
  recorder: AudioRecorder | null;
  qlinkParams: QLinkParam[];
  qlinkBank: number;
  onSetScreenMode: (mode: ScreenMode) => void;
  onPadTrigger: (padId: number, velocity?: number) => void;
  onPadTriggerWithTune: (padId: number, semitones: number, velocity: number) => void;
  onPadSelect: (padId: number) => void;
  onSelectBank: (bank: PadBank) => void;
  onToggleFullLevel: () => void;
  onToggle16Level: () => void;
  onToggleErase: () => void;
  onPlay: () => void;
  onPlayStart: () => void;
  onStop: () => void;
  onRecord: () => void;
  onOverdub: () => void;
  onTapTempo: () => void;
  onToggleMetronome: () => void;
  onUndo: () => void;
  onToggleStep: (padId: number, stepIndex: number) => void;
  onClearPattern: () => void;
  onClearPadPattern: (padId: number) => void;
  onUpdatePadConfig: (padId: number, updated: Partial<PadConfig>) => void;
  onMasterVolumeChange: (vol: number) => void;
  onRecGainChange: (gain: number) => void;
  onBpmChange: (bpm: number) => void;
  onSwingChange: (swing: number) => void;
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
  onToggleQLinkBank: () => void;
  onDataDialChange: (delta: number) => void;
  onDataDialEnter: () => void;
  onDataDialCursor: (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void;
  onOpenHelp: () => void;
}

export const MPCChassis: React.FC<MPCChassisProps> = ({
  screenMode,
  padConfigs,
  samples,
  pattern,
  selectedPadId,
  activePadTriggers,
  activeBank,
  isFullLevel,
  is16Level,
  isEraseMode,
  isPlaying,
  isRecording,
  isOverdubbing,
  bpm,
  swing,
  totalBars,
  currentStep,
  currentBar,
  currentBeat,
  masterVolume,
  recGain,
  metronomeEnabled,
  isEngineReady,
  analyser,
  audioLevel,
  audioPeak,
  recorder,
  qlinkParams,
  qlinkBank,
  onSetScreenMode,
  onPadTrigger,
  onPadTriggerWithTune,
  onPadSelect,
  onSelectBank,
  onToggleFullLevel,
  onToggle16Level,
  onToggleErase,
  onPlay,
  onPlayStart,
  onStop,
  onRecord,
  onOverdub,
  onTapTempo,
  onToggleMetronome,
  onUndo,
  onToggleStep,
  onClearPattern,
  onClearPadPattern,
  onUpdatePadConfig,
  onMasterVolumeChange,
  onRecGainChange,
  onBpmChange,
  onSwingChange,
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
  onToggleQLinkBank,
  onDataDialChange,
  onDataDialEnter,
  onDataDialCursor,
  onOpenHelp,
}) => {
  return (
    <div className="relative w-full max-w-[1360px] mx-auto my-4 bg-gradient-to-b from-[#1c1f28] via-[#15171e] to-[#101217] rounded-3xl border-2 border-[#2b303d] shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.06),inset_0_1px_1px_rgba(255,255,255,0.12)] overflow-hidden">
      {/* Top Industrial Screws (Hardware realism) */}
      <div className="absolute top-2.5 left-4 w-2.5 h-2.5 rounded-full bg-[#20242f] border border-[#3b4356] flex items-center justify-center opacity-60">
        <div className="w-1.5 h-[1px] bg-[#4a546c] rotate-45" />
      </div>
      <div className="absolute top-2.5 right-4 w-2.5 h-2.5 rounded-full bg-[#20242f] border border-[#3b4356] flex items-center justify-center opacity-60">
        <div className="w-1.5 h-[1px] bg-[#4a546c] -rotate-12" />
      </div>

      {/* Brand Header */}
      <BrandHeader
        masterVolume={masterVolume}
        recGain={recGain}
        isEngineReady={isEngineReady}
        onMasterVolumeChange={onMasterVolumeChange}
        onRecGainChange={onRecGainChange}
        onOpenHelp={onOpenHelp}
      />

      {/* Main Hardware Working Surface */}
      <div className="p-5 flex flex-col xl:flex-row gap-5">
        {/* Left Section: Q-Link Encoders + Quick Screen Navigation */}
        <div className="flex xl:flex-col justify-between items-center gap-3 shrink-0">
          {/* Quick Hardware View Navigation Buttons */}
          <div className="grid grid-cols-3 xl:grid-cols-2 gap-1.5 w-full">
            <HardwareButton
              label="MAIN"
              size="sm"
              ledColor="white"
              isLedOn={screenMode === 'MAIN'}
              isActive={screenMode === 'MAIN'}
              onClick={() => onSetScreenMode('MAIN')}
            />
            <HardwareButton
              label="BROWSE"
              size="sm"
              ledColor="white"
              isLedOn={screenMode === 'BROWSE'}
              isActive={screenMode === 'BROWSE'}
              onClick={() => onSetScreenMode('BROWSE')}
            />
            <HardwareButton
              label="STEP SEQ"
              size="sm"
              ledColor="white"
              isLedOn={screenMode === 'STEP_SEQ'}
              isActive={screenMode === 'STEP_SEQ'}
              onClick={() => onSetScreenMode('STEP_SEQ')}
            />
            <HardwareButton
              label="SAMPLE EDIT"
              size="sm"
              ledColor="white"
              isLedOn={screenMode === 'SAMPLE_EDIT'}
              isActive={screenMode === 'SAMPLE_EDIT'}
              onClick={() => onSetScreenMode('SAMPLE_EDIT')}
            />
            <HardwareButton
              label="MIXER"
              size="sm"
              ledColor="white"
              isLedOn={screenMode === 'MIXER'}
              isActive={screenMode === 'MIXER'}
              onClick={() => onSetScreenMode('MIXER')}
            />
            <HardwareButton
              label="16 LEVEL"
              size="sm"
              ledColor="blue"
              isLedOn={screenMode === 'PAD_PERFORM'}
              isActive={screenMode === 'PAD_PERFORM'}
              onClick={() => onSetScreenMode('PAD_PERFORM')}
            />
            <HardwareButton
              label="SAMPLER"
              size="sm"
              ledColor="red"
              isLedOn={screenMode === 'SAMPLER_REC'}
              isActive={screenMode === 'SAMPLER_REC'}
              onClick={() => onSetScreenMode('SAMPLER_REC')}
            />
          </div>

          {/* 4 Q-Link Encoders */}
          <div className="w-full xl:w-28 flex-1">
            <QLinkStrip
              params={qlinkParams}
              qlinkBank={qlinkBank}
              onToggleBank={onToggleQLinkBank}
            />
          </div>
        </div>

        {/* Center: 7-inch Multitouch Screen Simulation */}
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <ScreenDisplay
            currentMode={screenMode}
            padConfigs={padConfigs}
            samples={samples}
            pattern={pattern}
            selectedPadId={selectedPadId}
            currentStep={currentStep}
            currentBar={currentBar}
            currentBeat={currentBeat}
            isPlaying={isPlaying}
            bpm={bpm}
            swing={swing}
            totalBars={totalBars}
            masterVolume={masterVolume}
            analyser={analyser}
            audioLevel={audioLevel}
            audioPeak={audioPeak}
            recorder={recorder}
            onSetMode={onSetScreenMode}
            onPadSelect={onPadSelect}
            onTriggerPad={onPadTrigger}
            onTriggerPadWithTune={onPadTriggerWithTune}
            onToggleStep={onToggleStep}
            onClearPattern={onClearPattern}
            onClearPadPattern={onClearPadPattern}
            onUpdatePadConfig={onUpdatePadConfig}
            onMasterVolumeChange={onMasterVolumeChange}
            onDropAudioFile={onDropAudioFile}
            onLoadMultipleFiles={onLoadMultipleFiles}
            onPreviewBuffer={onPreviewBuffer}
            onAssignSampleToPad={onAssignSampleToPad}
            onAssignChopsToPads={onAssignChopsToPads}
            onSliceAudioBuffer={onSliceAudioBuffer}
            onGenerateEqualSlices={onGenerateEqualSlices}
            onDetectTransientSlices={onDetectTransientSlices}
            onLoadSoulBreak={onLoadSoulBreak}
            onSampleRecorded={onSampleRecorded}
            onBpmChange={onBpmChange}
            onSwingChange={onSwingChange}
          />

          {/* Transport Bar directly below the screen */}
          <div className="mt-4">
            <TransportBar
              isPlaying={isPlaying}
              isRecording={isRecording}
              isOverdubbing={isOverdubbing}
              bpm={bpm}
              metronomeEnabled={metronomeEnabled}
              onPlay={onPlay}
              onPlayStart={onPlayStart}
              onStop={onStop}
              onRecord={onRecord}
              onOverdub={onOverdub}
              onTapTempo={onTapTempo}
              onToggleMetronome={onToggleMetronome}
              onUndo={onUndo}
            />
          </div>
        </div>

        {/* Right Section: Master Data Dial & 16-Pad 4x4 Grid */}
        <div className="flex flex-col gap-4 shrink-0 xl:w-[420px]">
          {/* Top row: Master Data Dial Jog Wheel & Status Info */}
          <div className="flex items-center justify-around bg-[#14161e] border border-[#272b37] rounded-xl p-3 shadow-inner">
            <DataDial
              onValueChange={onDataDialChange}
              onEnter={onDataDialEnter}
              onCursorMove={onDataDialCursor}
              size={84}
            />

            {/* Hardware Mode Info Box */}
            <div className="flex flex-col gap-2">
              <div className="flex flex-col">
                <span className="text-[9px] font-mono text-slate-400">ACTIVE PAD:</span>
                <span className="text-xs font-mono font-bold text-white">
                  PAD {selectedPadId + 1} ({padConfigs[selectedPadId]?.name})
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-mono text-slate-400">PAD BANK:</span>
                <span className="text-xs font-mono font-bold text-amber-400">
                  BANK {activeBank} (SLOTS {activeBank === 'A' ? '1-16' : activeBank === 'B' ? '17-32' : activeBank === 'C' ? '33-48' : '49-64'})
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-2 h-2 rounded-full ${isFullLevel ? 'bg-rose-500 shadow-[0_0_6px_#ef4444]' : 'bg-[#2b3040]'}`} />
                <span className="text-[8px] font-mono text-slate-400">FULL VELOCITY: {isFullLevel ? 'ON (127)' : 'TOUCH'}</span>
              </div>
            </div>
          </div>

          {/* 16-Pad Grid */}
          <PadGrid
            padConfigs={padConfigs}
            activePadTriggers={activePadTriggers}
            selectedPadId={selectedPadId}
            activeBank={activeBank}
            isFullLevel={isFullLevel}
            is16Level={is16Level}
            isEraseMode={isEraseMode}
            onPadTrigger={onPadTrigger}
            onPadSelect={onPadSelect}
            onSelectBank={onSelectBank}
            onToggleFullLevel={onToggleFullLevel}
            onToggle16Level={onToggle16Level}
            onToggleErase={onToggleErase}
            onOpenBrowse={() => onSetScreenMode('BROWSE')}
            onDropAudioFile={onDropAudioFile}
          />
        </div>
      </div>

      {/* Built-in Stereo Speaker Grille at the bottom edge */}
      <SpeakerGrille isPlaying={isPlaying} audioLevel={audioLevel} />
    </div>
  );
};
