import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AudioEngine } from './audio/AudioEngine';
import { AudioRecorder } from './audio/AudioRecorder';
import { MPCChassis } from './components/hardware/MPCChassis';
import { HelpModal } from './components/hardware/HelpModal';
import { useKeyboardTrigger } from './hooks/useKeyboardTrigger';
import { useAudioMeter } from './hooks/useAudioMeter';
import { ScreenMode, PadBank, QLinkParam } from './types/mpc';
import { PadConfig, SampleData, SequencerPattern, SliceMarker } from './types/audio';

export const App: React.FC = () => {
  // Audio Engine Singleton instance
  const engineRef = useRef<AudioEngine | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);

  if (!engineRef.current) {
    engineRef.current = new AudioEngine();
  }
  const engine = engineRef.current;

  // State Management
  const [isEngineReady, setIsEngineReady] = useState(false);
  const [screenMode, setScreenMode] = useState<ScreenMode>('MAIN');
  const [padConfigs, setPadConfigs] = useState<PadConfig[]>(engine.padConfigs);
  const [samples, setSamples] = useState<Map<string, SampleData>>(engine.samples);
  const [pattern, setPattern] = useState<SequencerPattern>(engine.getPattern());
  const [selectedPadId, setSelectedPadId] = useState<number>(0);
  const [activePadTriggers, setActivePadTriggers] = useState<Set<number>>(new Set());
  const [activeBank, setActiveBank] = useState<PadBank>('A');
  const [isFullLevel, setIsFullLevel] = useState<boolean>(false);
  const [is16Level, setIs16Level] = useState<boolean>(false);
  const [isEraseMode, setIsEraseMode] = useState<boolean>(false);

  // Transport State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isOverdubbing, setIsOverdubbing] = useState<boolean>(false);
  const [bpm, setBpm] = useState<number>(90);
  const [swing, setSwing] = useState<number>(54);
  const [totalBars, setTotalBars] = useState<number>(2);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [currentBar, setCurrentBar] = useState<number>(1);
  const [currentBeat, setCurrentBeat] = useState<number>(1);
  const [masterVolume, setMasterVolume] = useState<number>(85);
  const [recGain, setRecGain] = useState<number>(75);
  const [metronomeEnabled, setMetronomeEnabled] = useState<boolean>(true);

  // Q-Link Bank & Help
  const [qlinkBank, setQlinkBank] = useState<number>(0);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // Audio meter
  const { level: audioLevel, peak: audioPeak } = useAudioMeter(engine.analyser, isPlaying);

  // Initialize engine on first mount or user gesture
  const initEngine = useCallback(async () => {
    if (!engine.isReady()) {
      await engine.init();
      setIsEngineReady(true);
      setSamples(new Map(engine.samples));
      setPadConfigs([...engine.padConfigs]);

      // Initialize recorder once AudioContext is available
      const ctx = (engine as unknown as { ctx: AudioContext }).ctx;
      if (ctx && !recorderRef.current) {
        recorderRef.current = new AudioRecorder(ctx);
      }
    }
  }, [engine]);

  // Subscribe to engine sequencer step ticks
  useEffect(() => {
    const unsubStep = engine.onStep((step, bar, beat) => {
      setCurrentStep(step);
      setCurrentBar(bar);
      setCurrentBeat(beat);
    });

    const unsubTrigger = engine.onPadTrigger((padId) => {
      setActivePadTriggers((prev) => new Set(prev).add(padId));
      setTimeout(() => {
        setActivePadTriggers((prev) => {
          const next = new Set(prev);
          next.delete(padId);
          return next;
        });
      }, 120);
    });

    return () => {
      unsubStep();
      unsubTrigger();
    };
  }, [engine]);

  // Pad triggering handler
  const handlePadTrigger = useCallback(
    async (padId: number, velocity?: number) => {
      await initEngine();

      // Erase Mode logic (like real MPC: Erase active + tap pad -> clears that pad's pattern!)
      if (isEraseMode) {
        engine.clearPadPattern(padId);
        setPattern({ ...engine.getPattern() });
        return;
      }

      const vel = isFullLevel ? 127 : (velocity !== undefined ? velocity : 108);
      engine.triggerPad(padId, vel);

      // Light up the pad immediately
      setActivePadTriggers((prev) => new Set(prev).add(padId));
      setTimeout(() => {
        setActivePadTriggers((prev) => {
          const next = new Set(prev);
          next.delete(padId);
          return next;
        });
      }, 120);
    },
    [initEngine, isEraseMode, isFullLevel, engine]
  );

  // 16 Level Pad Triggering
  const handleTriggerPadWithTune = useCallback(
    async (padId: number, semitones: number, velocity: number) => {
      await initEngine();
      engine.triggerPad(padId, velocity, semitones);
    },
    [initEngine, engine]
  );

  // Transport actions
  const handlePlay = useCallback(async () => {
    await initEngine();
    engine.togglePlay();
    setIsPlaying(engine.isPlaying);
    setIsRecording(engine.isRecording);
    setIsOverdubbing(engine.isOverdubbing);
  }, [initEngine, engine]);

  const handlePlayStart = useCallback(async () => {
    await initEngine();
    engine.stop();
    engine.play();
    setIsPlaying(true);
  }, [initEngine, engine]);

  const handleStop = useCallback(() => {
    engine.stop();
    setIsPlaying(false);
    setIsRecording(false);
    setIsOverdubbing(false);
    setCurrentStep(0);
    setCurrentBar(1);
    setCurrentBeat(1);
  }, [engine]);

  const handleRecord = useCallback(async () => {
    await initEngine();
    engine.toggleRecord();
    setIsRecording(engine.isRecording);
    setIsPlaying(engine.isPlaying);
    setIsOverdubbing(false);
  }, [initEngine, engine]);

  const handleOverdub = useCallback(async () => {
    await initEngine();
    engine.toggleOverdub();
    setIsOverdubbing(engine.isOverdubbing);
    setIsPlaying(engine.isPlaying);
    setIsRecording(false);
  }, [initEngine, engine]);

  const handleTapTempo = useCallback(() => {
    const newBpm = engine.tapTempo();
    setBpm(newBpm);
  }, [engine]);

  const handleToggleMetronome = useCallback(() => {
    engine.metronomeEnabled = !engine.metronomeEnabled;
    setMetronomeEnabled(engine.metronomeEnabled);
  }, [engine]);

  const handleUndo = useCallback(() => {
    // Quick undo clears the last pad triggered or reverses
    setPattern({ ...engine.getPattern() });
  }, [engine]);

  // Keyboard mapping hook
  useKeyboardTrigger({
    onPadTrigger: handlePadTrigger,
    onPlayToggle: handlePlay,
    onRecordToggle: handleRecord,
    onTapTempo: handleTapTempo,
    onMetronomeToggle: handleToggleMetronome,
    enabled: true,
  });

  // Pattern manipulation
  const handleToggleStep = useCallback(
    (padId: number, stepIndex: number) => {
      engine.toggleStep(padId, stepIndex);
      setPattern({ ...engine.getPattern() });
    },
    [engine]
  );

  const handleClearPattern = useCallback(() => {
    engine.clearPattern();
    setPattern({ ...engine.getPattern() });
  }, [engine]);

  const handleClearPadPattern = useCallback(
    (padId: number) => {
      engine.clearPadPattern(padId);
      setPattern({ ...engine.getPattern() });
    },
    [engine]
  );

  // Pad Config updates
  const handleUpdatePadConfig = useCallback(
    (padId: number, updated: Partial<PadConfig>) => {
      const current = engine.padConfigs[padId];
      if (current) {
        Object.assign(current, updated);
        setPadConfigs([...engine.padConfigs]);
      }
    },
    [engine]
  );

  // Master Volume
  const handleMasterVolumeChange = useCallback(
    (vol: number) => {
      setMasterVolume(vol);
      engine.setMasterVolume(vol / 100);
    },
    [engine]
  );

  // BPM & Swing
  const handleBpmChange = useCallback(
    (newBpm: number) => {
      setBpm(newBpm);
      engine.setBpm(newBpm);
    },
    [engine]
  );

  const handleSwingChange = useCallback(
    (newSwing: number) => {
      setSwing(newSwing);
      engine.setSwing(newSwing);
    },
    [engine]
  );

  // Audio file drag & drop or upload
  const handleDropAudioFile = useCallback(
    async (file: File, padId: number) => {
      await initEngine();
      try {
        await engine.loadUserAudioFile(file, padId);
        setSamples(new Map(engine.samples));
        setPadConfigs([...engine.padConfigs]);
        handlePadTrigger(padId, 120);
      } catch (err) {
        console.error('Failed to decode user audio file:', err);
      }
    },
    [initEngine, engine, handlePadTrigger]
  );

  // Batch load multiple external audio files across pads
  const handleLoadMultipleFiles = useCallback(
    async (files: File[], startPadId: number) => {
      await initEngine();
      try {
        await engine.loadMultipleAudioFiles(files, startPadId);
        setSamples(new Map(engine.samples));
        setPadConfigs([...engine.padConfigs]);
        handlePadTrigger(startPadId, 120);
      } catch (err) {
        console.error('Failed to load multiple audio files:', err);
      }
    },
    [initEngine, engine, handlePadTrigger]
  );

  // Audition preview AudioBuffer
  const handlePreviewBuffer = useCallback(
    async (buffer: AudioBuffer) => {
      await initEngine();
      engine.previewAudioBuffer(buffer);
    },
    [initEngine, engine]
  );

  // Assign library sample to a pad
  const handleAssignSampleToPad = useCallback(
    (padId: number, sampleId: string) => {
      engine.assignSampleToPad(padId, sampleId);
      setPadConfigs([...engine.padConfigs]);
    },
    [engine]
  );

  // Chop slices assignment across pads
  const handleAssignChopsToPads = useCallback(
    (sourceBuffer: AudioBuffer, baseName: string, slices: SliceMarker[], startPadId: number = 0) => {
      engine.assignChopSlicesToPads(sourceBuffer, baseName, slices, startPadId, 1);
      setSamples(new Map(engine.samples));
      setPadConfigs([...engine.padConfigs]);
    },
    [engine]
  );

  const handleSliceAudioBuffer = useCallback(
    (source: AudioBuffer, start: number, end: number) => {
      return engine.sliceAudioBuffer(source, start, end);
    },
    [engine]
  );

  const handleGenerateEqualSlices = useCallback(
    (count: number) => {
      return engine.createEqualSlices(count);
    },
    [engine]
  );

  const handleDetectTransientSlices = useCallback(
    (buffer: AudioBuffer, count: number, sensitivity: number) => {
      return engine.detectTransientSlices(buffer, count, sensitivity);
    },
    [engine]
  );

  const handleLoadSoulBreak = useCallback(async () => {
    await initEngine();
    const demo = await engine.getSoulBreakSample();
    setSamples(new Map(engine.samples));
    return demo;
  }, [initEngine, engine]);

  // Live microphone sample assignment
  const handleSampleRecorded = useCallback(
    (padId: number, name: string, buffer: AudioBuffer) => {
      engine.setPadAudioBuffer(padId, name, buffer);
      setSamples(new Map(engine.samples));
      setPadConfigs([...engine.padConfigs]);
    },
    [engine]
  );

  // Master Data Dial logic
  const handleDataDialChange = useCallback(
    (delta: number) => {
      if (screenMode === 'MAIN') {
        handleBpmChange(Math.max(40, Math.min(240, bpm + delta)));
      } else if (screenMode === 'SAMPLE_EDIT') {
        const current = engine.padConfigs[selectedPadId];
        if (current) {
          const nextPitch = Math.max(-24, Math.min(24, current.pitch + delta));
          handleUpdatePadConfig(selectedPadId, { pitch: nextPitch });
        }
      } else if (screenMode === 'MIXER') {
        handleMasterVolumeChange(Math.max(0, Math.min(100, masterVolume + delta)));
      }
    },
    [screenMode, bpm, selectedPadId, engine, masterVolume, handleBpmChange, handleUpdatePadConfig, handleMasterVolumeChange]
  );

  const handleDataDialEnter = useCallback(() => {
    handlePadTrigger(selectedPadId);
  }, [handlePadTrigger, selectedPadId]);

  const handleDataDialCursor = useCallback(
    (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
      if (dir === 'UP') {
        setSelectedPadId((prev) => (prev + 4 <= 15 ? prev + 4 : prev));
      } else if (dir === 'DOWN') {
        setSelectedPadId((prev) => (prev - 4 >= 0 ? prev - 4 : prev));
      } else if (dir === 'LEFT') {
        setSelectedPadId((prev) => (prev > 0 ? prev - 1 : 15));
      } else if (dir === 'RIGHT') {
        setSelectedPadId((prev) => (prev < 15 ? prev + 1 : 0));
      }
    },
    []
  );

  // Contextual Q-Link parameters based on active screen mode
  const selectedPad = padConfigs[selectedPadId] || padConfigs[0];

  const qlinkParams = useMemo<QLinkParam[]>(() => {
    if (screenMode === 'SAMPLE_EDIT') {
      return [
        {
          label: 'TUNE',
          value: selectedPad.pitch,
          min: -24,
          max: 24,
          step: 1,
          unit: 'st',
          onChange: (v) => handleUpdatePadConfig(selectedPadId, { pitch: v }),
        },
        {
          label: 'CUTOFF',
          value: selectedPad.cutoff,
          min: 100,
          max: 20000,
          step: 100,
          unit: 'Hz',
          onChange: (v) => handleUpdatePadConfig(selectedPadId, { cutoff: v }),
        },
        {
          label: 'ATTACK',
          value: Math.round(selectedPad.attack * 1000),
          min: 1,
          max: 500,
          step: 5,
          unit: 'ms',
          onChange: (v) => handleUpdatePadConfig(selectedPadId, { attack: v / 1000 }),
        },
        {
          label: 'DECAY',
          value: Math.round(selectedPad.decay * 100),
          min: 5,
          max: 100,
          step: 5,
          unit: '%',
          onChange: (v) => handleUpdatePadConfig(selectedPadId, { decay: v / 100 }),
        },
      ];
    }

    if (screenMode === 'MIXER') {
      return [
        {
          label: 'PAD VOL',
          value: Math.round(selectedPad.volume * 100),
          min: 0,
          max: 100,
          step: 1,
          unit: '%',
          onChange: (v) => handleUpdatePadConfig(selectedPadId, { volume: v / 100 }),
        },
        {
          label: 'PAD PAN',
          value: Math.round(selectedPad.pan * 100),
          min: -100,
          max: 100,
          step: 5,
          unit: '',
          onChange: (v) => handleUpdatePadConfig(selectedPadId, { pan: v / 100 }),
        },
        {
          label: 'REVERB',
          value: Math.round(selectedPad.sendReverb * 100),
          min: 0,
          max: 100,
          step: 5,
          unit: '%',
          onChange: (v) => handleUpdatePadConfig(selectedPadId, { sendReverb: v / 100 }),
        },
        {
          label: 'DELAY',
          value: Math.round(selectedPad.sendDelay * 100),
          min: 0,
          max: 100,
          step: 5,
          unit: '%',
          onChange: (v) => handleUpdatePadConfig(selectedPadId, { sendDelay: v / 100 }),
        },
      ];
    }

    // Default (MAIN, STEP_SEQ, etc.)
    return [
      {
        label: 'TEMPO',
        value: bpm,
        min: 40,
        max: 240,
        step: 1,
        unit: 'BPM',
        onChange: handleBpmChange,
      },
      {
        label: 'SWING',
        value: swing,
        min: 50,
        max: 75,
        step: 1,
        unit: '%',
        onChange: handleSwingChange,
      },
      {
        label: 'MAIN VOL',
        value: masterVolume,
        min: 0,
        max: 100,
        step: 1,
        unit: '%',
        onChange: handleMasterVolumeChange,
      },
      {
        label: 'CLICK VOL',
        value: Math.round(engine.metronomeVolume * 100),
        min: 0,
        max: 100,
        step: 5,
        unit: '%',
        onChange: (v) => {
          engine.metronomeVolume = v / 100;
        },
      },
    ];
  }, [
    screenMode,
    selectedPad,
    selectedPadId,
    bpm,
    swing,
    masterVolume,
    engine,
    handleUpdatePadConfig,
    handleBpmChange,
    handleSwingChange,
    handleMasterVolumeChange,
  ]);

  return (
    <div className="min-h-screen bg-[#07080b] flex flex-col items-center justify-center p-2 md:p-6 text-slate-100">
      {/* Global Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-akai-crimson/10 via-transparent to-transparent opacity-50" />

      {/* Main MPC Live II Hardware Unit */}
      <MPCChassis
        screenMode={screenMode}
        padConfigs={padConfigs}
        samples={samples}
        pattern={pattern}
        selectedPadId={selectedPadId}
        activePadTriggers={activePadTriggers}
        activeBank={activeBank}
        isFullLevel={isFullLevel}
        is16Level={is16Level}
        isEraseMode={isEraseMode}
        isPlaying={isPlaying}
        isRecording={isRecording}
        isOverdubbing={isOverdubbing}
        bpm={bpm}
        swing={swing}
        totalBars={totalBars}
        currentStep={currentStep}
        currentBar={currentBar}
        currentBeat={currentBeat}
        masterVolume={masterVolume}
        recGain={recGain}
        metronomeEnabled={metronomeEnabled}
        isEngineReady={isEngineReady}
        analyser={engine.analyser}
        audioLevel={audioLevel}
        audioPeak={audioPeak}
        recorder={recorderRef.current}
        qlinkParams={qlinkParams}
        qlinkBank={qlinkBank}
        onSetScreenMode={setScreenMode}
        onPadTrigger={handlePadTrigger}
        onPadTriggerWithTune={handleTriggerPadWithTune}
        onPadSelect={setSelectedPadId}
        onSelectBank={setActiveBank}
        onToggleFullLevel={() => setIsFullLevel((prev) => !prev)}
        onToggle16Level={() => {
          setIs16Level((prev) => !prev);
          setScreenMode((prev) => (prev === 'PAD_PERFORM' ? 'MAIN' : 'PAD_PERFORM'));
        }}
        onToggleErase={() => setIsEraseMode((prev) => !prev)}
        onPlay={handlePlay}
        onPlayStart={handlePlayStart}
        onStop={handleStop}
        onRecord={handleRecord}
        onOverdub={handleOverdub}
        onTapTempo={handleTapTempo}
        onToggleMetronome={handleToggleMetronome}
        onUndo={handleUndo}
        onToggleStep={handleToggleStep}
        onClearPattern={handleClearPattern}
        onClearPadPattern={handleClearPadPattern}
        onUpdatePadConfig={handleUpdatePadConfig}
        onMasterVolumeChange={handleMasterVolumeChange}
        onRecGainChange={setRecGain}
        onBpmChange={handleBpmChange}
        onSwingChange={handleSwingChange}
        onDropAudioFile={handleDropAudioFile}
        onLoadMultipleFiles={handleLoadMultipleFiles}
        onPreviewBuffer={handlePreviewBuffer}
        onAssignSampleToPad={handleAssignSampleToPad}
        onAssignChopsToPads={handleAssignChopsToPads}
        onSliceAudioBuffer={handleSliceAudioBuffer}
        onGenerateEqualSlices={handleGenerateEqualSlices}
        onDetectTransientSlices={handleDetectTransientSlices}
        onLoadSoulBreak={handleLoadSoulBreak}
        onSampleRecorded={handleSampleRecorded}
        onToggleQLinkBank={() => setQlinkBank((prev) => (prev + 1) % 4)}
        onDataDialChange={handleDataDialChange}
        onDataDialEnter={handleDataDialEnter}
        onDataDialCursor={handleDataDialCursor}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Keyboard Mapping & User Guide Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
};

export default App;
