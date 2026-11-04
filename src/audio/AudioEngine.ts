import { PadConfig, SampleData, SequencerPattern, StepEvent, SliceMarker } from '../types/audio';
import { SampleGenerator } from './SampleGenerator';
import { DEFAULT_PAD_CONFIGS } from './defaultKits';

export type StepCallback = (step: number, bar: number, beat: number) => void;
export type PadTriggerCallback = (padId: number, velocity: number) => void;

interface ActiveVoice {
  padId: number;
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  muteGroup: number;
  startTime: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private sampleGen: SampleGenerator | null = null;
  
  // Audio Nodes
  private masterGain: GainNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  public analyser: AnalyserNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayGain: GainNode | null = null;

  // Sound bank & Sample buffers
  public samples: Map<string, SampleData> = new Map();
  public padConfigs: PadConfig[] = [];
  private activeVoices: ActiveVoice[] = [];

  // Sequencer & Timing
  public isPlaying: boolean = false;
  public isRecording: boolean = false;
  public isOverdubbing: boolean = false;
  public bpm: number = 90;
  public swing: number = 54; // 54% classic MPC groove
  public totalBars: number = 2; // 2 bars (32 steps default)
  public metronomeEnabled: boolean = true;
  public metronomeVolume: number = 0.5;

  private currentStepIndex: number = 0;
  private nextStepTime: number = 0;
  private lookaheadMs: number = 25.0; // scheduling timer interval
  private scheduleAheadTime: number = 0.1; // 100ms lookahead
  private timerId: number | null = null;
  private pattern: SequencerPattern = {};

  // Listeners
  private onStepListeners: StepCallback[] = [];
  private onPadTriggerListeners: PadTriggerCallback[] = [];

  constructor() {
    this.padConfigs = JSON.parse(JSON.stringify(DEFAULT_PAD_CONFIGS));
    this.initDefaultPattern();
  }

  /**
   * Initializes or resumes the Web Audio context on user gesture
   */
  public async init(): Promise<void> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });
      this.sampleGen = new SampleGenerator(this.ctx);

      this.setupMasterGraph();
      await this.loadDefaultSamples();
    }

    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public isReady(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  public getContextState(): AudioContextState | 'uninitialized' {
    return this.ctx ? this.ctx.state : 'uninitialized';
  }

  /**
   * Builds the master audio routing chain:
   * Channels -> Master Gain -> Limiter/Compressor -> Analyser -> Speakers
   * Plus Reverb and Delay return buses
   */
  private setupMasterGraph(): void {
    if (!this.ctx) return;

    // Master Compressor / Limiter
    this.masterCompressor = this.ctx.createDynamicsCompressor();
    this.masterCompressor.threshold.setValueAtTime(-1.0, 0);
    this.masterCompressor.knee.setValueAtTime(4, 0);
    this.masterCompressor.ratio.setValueAtTime(12, 0);
    this.masterCompressor.attack.setValueAtTime(0.003, 0);
    this.masterCompressor.release.setValueAtTime(0.1, 0);

    // Master Analyser
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.8;

    // Master Volume Gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, 0);

    // Connect Master bus
    this.masterGain.connect(this.masterCompressor);
    this.masterCompressor.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Reverb Bus (Algorithmic / Synthetic impulse response)
    this.reverbNode = this.ctx.createConvolver();
    this.reverbNode.buffer = this.buildReverbImpulse(1.6, 2.2);
    this.reverbGain = this.ctx.createGain();
    this.reverbGain.gain.setValueAtTime(0.45, 0);
    this.reverbNode.connect(this.reverbGain);
    this.reverbGain.connect(this.masterGain);

    // Delay Bus (Stereo Ping-Pong / Filtered Delay)
    this.delayNode = this.ctx.createDelay(1.0);
    this.delayNode.delayTime.setValueAtTime((60 / this.bpm) * 0.5, 0); // 8th note delay
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.setValueAtTime(0.35, 0);
    this.delayGain = this.ctx.createGain();
    this.delayGain.gain.setValueAtTime(0.4, 0);

    const delayFilter = this.ctx.createBiquadFilter();
    delayFilter.type = 'lowpass';
    delayFilter.frequency.setValueAtTime(2800, 0);

    this.delayNode.connect(delayFilter);
    delayFilter.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    delayFilter.connect(this.delayGain);
    this.delayGain.connect(this.masterGain);
  }

  /**
   * Generates a realistic stereo reverb impulse response
   */
  private buildReverbImpulse(duration: number, decay: number): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext not ready');
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const impulse = this.ctx.createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const factor = Math.exp(-t * decay);
      left[i] = (Math.random() * 2 - 1) * factor;
      right[i] = (Math.random() * 2 - 1) * factor;
    }
    return impulse;
  }

  /**
   * Generates all pristine default samples into the library
   */
  public async loadDefaultSamples(): Promise<void> {
    if (!this.sampleGen) return;

    const definitions: { id: string; name: string; category: SampleData['category']; gen: () => Promise<AudioBuffer> }[] = [
      { id: 'kick_main', name: 'MPC 808 Kick', category: 'kick', gen: () => this.sampleGen!.generateKick('boom-bap') },
      { id: 'snare_main', name: 'Tight Crisp Snare', category: 'snare', gen: () => this.sampleGen!.generateSnare('acoustic') },
      { id: 'rimshot_main', name: 'Vintage Wood Rim', category: 'percussion', gen: () => this.sampleGen!.generateRimshot() },
      { id: 'clap_main', name: 'Analog Hand Clap', category: 'clap', gen: () => this.sampleGen!.generateClap() },
      { id: 'hat_closed', name: 'Roland 808 CHat', category: 'hihat_closed', gen: () => this.sampleGen!.generateClosedHat() },
      { id: 'hat_open', name: 'Roland 808 OHat', category: 'hihat_open', gen: () => this.sampleGen!.generateOpenHat() },
      { id: 'shaker_main', name: 'Studio Shaker', category: 'percussion', gen: () => this.sampleGen!.generateShaker() },
      { id: 'sub_bass', name: '808 Sub C2', category: 'bass', gen: () => this.sampleGen!.generate808Sub(65.41) },
      { id: 'tom_low', name: 'Sub Low Tom', category: 'percussion', gen: () => this.sampleGen!.generateTom(85) },
      { id: 'tom_mid', name: 'Mid Acoustic Tom', category: 'percussion', gen: () => this.sampleGen!.generateTom(130) },
      { id: 'tom_high', name: 'High Snappy Tom', category: 'percussion', gen: () => this.sampleGen!.generateTom(180) },
      { id: 'crash_main', name: 'Bright Crash 16"', category: 'percussion', gen: () => this.sampleGen!.generateCrash() },
      { id: 'ride_main', name: 'K-Custom Ride Bell', category: 'percussion', gen: () => this.sampleGen!.generateRide() },
      { id: 'rhodes_chord', name: 'Rhodes Cm9 Key', category: 'synth', gen: () => this.sampleGen!.generateRhodesChord() },
      { id: 'synth_stab', name: 'Analog Brass Lead', category: 'synth', gen: () => this.sampleGen!.generateSynthStab() },
      { id: 'vocal_hey', name: 'Vocal "Hey!" Hit', category: 'vocal', gen: () => this.sampleGen!.generateVocalChant() },
    ];

    for (const def of definitions) {
      const buffer = await def.gen();
      this.samples.set(def.id, {
        id: def.id,
        name: def.name,
        category: def.category,
        buffer,
        duration: buffer.duration,
      });
    }
  }

  /**
   * Sets up a groovy default hip-hop / boom-bap drum pattern to play out-of-the-box!
   */
  private initDefaultPattern(): void {
    const totalSteps = 32; // 2 bars
    this.pattern = {};

    for (let pad = 0; pad < 16; pad++) {
      this.pattern[pad] = Array.from({ length: totalSteps }, () => ({
        active: false,
        velocity: 100,
      }));
    }

    // Classic Boom Bap Drum Groove:
    // Kick (Pad 0): Steps 0, 10, 16, 26, 28
    [0, 10, 16, 26, 28].forEach((s) => {
      this.pattern[0][s] = { active: true, velocity: 115 };
    });

    // Snare (Pad 1): Steps 4, 12, 20, 28 (on the 2 and 4 beats)
    [4, 12, 20, 28].forEach((s) => {
      this.pattern[1][s] = { active: true, velocity: 110 };
    });

    // Closed Hat (Pad 4): Every even step (8th notes) + some 16ths
    for (let s = 0; s < 32; s += 2) {
      const isAccent = s % 4 === 0;
      this.pattern[4][s] = { active: true, velocity: isAccent ? 95 : 75 };
    }
    // Add swing ghost hat hits
    [7, 15, 23, 31].forEach((s) => {
      this.pattern[4][s] = { active: true, velocity: 60 };
    });

    // Open Hat (Pad 5): Step 14, 30
    [14, 30].forEach((s) => {
      this.pattern[5][s] = { active: true, velocity: 85 };
    });

    // Hand Clap (Pad 3): Layered on step 12 and 28
    [12, 28].forEach((s) => {
      this.pattern[3][s] = { active: true, velocity: 80 };
    });

    // Shaker (Pad 6): Continuous rhythm
    [2, 6, 10, 14, 18, 22, 26, 30].forEach((s) => {
      this.pattern[6][s] = { active: true, velocity: 65 };
    });

    // 808 Sub (Pad 7): On bar 1 and bar 2
    [0, 16, 22].forEach((s) => {
      this.pattern[7][s] = { active: true, velocity: 105 };
    });

    // Rhodes Chord (Pad 13): Lush chord on 1st beat of each bar
    [0, 16].forEach((s) => {
      this.pattern[13][s] = { active: true, velocity: 90 };
    });

    // Vocal "Hey!" (Pad 15): Accent on bar 2 beat 4
    [28].forEach((s) => {
      this.pattern[15][s] = { active: true, velocity: 100 };
    });
  }

  /**
   * Main Pad Trigger Method:
   * Handles low latency voice playback, velocity, pitch shifting, filter, envelopes, and choke groups
   */
  public triggerPad(padId: number, velocity: number = 100, customPitchOffset: number = 0, time?: number): void {
    if (!this.ctx) {
      this.init().then(() => this.triggerPad(padId, velocity, customPitchOffset, time));
      return;
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const pad = this.padConfigs[padId];
    if (!pad || pad.isMuted) return;

    const sample = this.samples.get(pad.sampleId);
    if (!sample || !sample.buffer) return;

    const startTime = time !== undefined ? time : this.ctx.currentTime;

    // Choke Group Handling (e.g. Hi-Hat Open stopped when Hi-Hat Closed plays)
    if (pad.muteGroup > 0) {
      this.activeVoices.forEach((voice) => {
        if (voice.muteGroup === pad.muteGroup) {
          try {
            voice.gainNode.gain.cancelScheduledValues(startTime);
            voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, startTime);
            voice.gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.015);
            voice.source.stop(startTime + 0.02);
          } catch {
            // Voice already finished
          }
        }
      });
      this.activeVoices = this.activeVoices.filter((v) => v.muteGroup !== pad.muteGroup);
    }

    // Voice Node Graph
    const source = this.ctx.createBufferSource();
    let audioBuffer = sample.buffer;

    // Handle sample reverse
    if (pad.reverse) {
      audioBuffer = this.createReversedBuffer(sample.buffer);
    }
    source.buffer = audioBuffer;

    // Pitch calculation (pad.pitch + custom pitch offset like 16-level tune)
    const totalSemitones = pad.pitch + customPitchOffset;
    source.playbackRate.setValueAtTime(Math.pow(2, totalSemitones / 12), startTime);

    // Filter Node (Cutoff, Resonance, Type)
    const filter = this.ctx.createBiquadFilter();
    filter.type = pad.filterType || 'lowpass';
    filter.frequency.setValueAtTime(Math.min(20000, Math.max(20, pad.cutoff)), startTime);
    filter.Q.setValueAtTime(pad.resonance, startTime);

    // Gain / Envelope Node (Volume, Velocity, Attack, Decay)
    const voiceGain = this.ctx.createGain();
    const normalizedVel = Math.max(0.05, Math.min(1.0, velocity / 127));
    const targetVol = pad.volume * normalizedVel;

    voiceGain.gain.setValueAtTime(0.0001, startTime);
    // Attack
    voiceGain.gain.exponentialRampToValueAtTime(targetVol, startTime + Math.max(0.002, pad.attack));
    // Decay
    const sustainTime = startTime + Math.max(0.002, pad.attack);
    voiceGain.gain.exponentialRampToValueAtTime(0.0001, sustainTime + Math.max(0.05, pad.decay * audioBuffer.duration));

    // Pan Node
    const panner = this.ctx.createStereoPanner();
    panner.pan.setValueAtTime(Math.min(1, Math.max(-1, pad.pan)), startTime);

    // Connect Voice Graph
    source.connect(filter);
    filter.connect(voiceGain);
    voiceGain.connect(panner);

    // Direct Dry to Master Gain
    panner.connect(this.masterGain!);

    // Reverb Send
    if (pad.sendReverb > 0 && this.reverbNode) {
      const sendRevGain = this.ctx.createGain();
      sendRevGain.gain.setValueAtTime(pad.sendReverb, startTime);
      panner.connect(sendRevGain);
      sendRevGain.connect(this.reverbNode);
    }

    // Delay Send
    if (pad.sendDelay > 0 && this.delayNode) {
      const sendDelGain = this.ctx.createGain();
      sendDelGain.gain.setValueAtTime(pad.sendDelay, startTime);
      panner.connect(sendDelGain);
      sendDelGain.connect(this.delayNode);
    }

    // Start playback taking into account startOffset & endOffset
    const duration = audioBuffer.duration;
    const offset = (pad.startOffset || 0) * duration;
    const playLength = ((pad.endOffset || 1) - (pad.startOffset || 0)) * duration;

    source.start(startTime, offset, playLength > 0 ? playLength : undefined);

    // Register active voice for choke groups
    this.activeVoices.push({
      padId,
      source,
      gainNode: voiceGain,
      muteGroup: pad.muteGroup,
      startTime,
    });

    // Notify UI listener
    this.notifyPadTrigger(padId, velocity);

    // If recording live, record event into pattern!
    if (this.isPlaying && (this.isRecording || this.isOverdubbing)) {
      this.recordLiveHit(padId, velocity, customPitchOffset);
    }
  }

  /**
   * Helper to reverse buffer for reverse pad mode
   */
  private createReversedBuffer(buffer: AudioBuffer): AudioBuffer {
    if (!this.ctx) return buffer;
    const rev = this.ctx.createBuffer(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
    for (let c = 0; c < buffer.numberOfChannels; c++) {
      const src = buffer.getChannelData(c);
      const dest = rev.getChannelData(c);
      for (let i = 0; i < buffer.length; i++) {
        dest[i] = src[buffer.length - 1 - i];
      }
    }
    return rev;
  }

  /**
   * Live recording pad hit into sequencer pattern with quantize
   */
  private recordLiveHit(padId: number, velocity: number, pitchOffset: number = 0): void {
    const currentStep = this.currentStepIndex;
    if (!this.pattern[padId]) {
      this.pattern[padId] = Array.from({ length: this.totalBars * 16 }, () => ({ active: false, velocity: 100 }));
    }
    this.pattern[padId][currentStep] = {
      active: true,
      velocity,
      pitchOffset,
    };
  }

  /**
   * Play / Stop / Record Controls
   */
  public async play(): Promise<void> {
    await this.init();
    if (this.isPlaying) return;

    this.isPlaying = true;
    this.nextStepTime = this.ctx!.currentTime + 0.05;
    this.currentStepIndex = 0;

    this.startScheduler();
  }

  public stop(): void {
    this.isPlaying = false;
    this.isRecording = false;
    this.isOverdubbing = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.currentStepIndex = 0;
    this.notifyStep(0, 1, 1);
  }

  public togglePlay(): void {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.play();
    }
  }

  public toggleRecord(): void {
    this.isRecording = !this.isRecording;
    if (this.isRecording) {
      this.isOverdubbing = false;
      if (!this.isPlaying) {
        this.play();
      }
    }
  }

  public toggleOverdub(): void {
    this.isOverdubbing = !this.isOverdubbing;
    if (this.isOverdubbing) {
      this.isRecording = false;
      if (!this.isPlaying) {
        this.play();
      }
    }
  }

  /**
   * High Precision Web Audio Lookahead Scheduler
   */
  private startScheduler(): void {
    const schedule = () => {
      if (!this.isPlaying || !this.ctx) return;

      while (this.nextStepTime < this.ctx.currentTime + this.scheduleAheadTime) {
        this.scheduleStep(this.currentStepIndex, this.nextStepTime);
        this.advanceStep();
      }

      this.timerId = window.setTimeout(schedule, this.lookaheadMs);
    };

    schedule();
  }

  private advanceStep(): void {
    const secondsPerBeat = 60.0 / this.bpm;
    const stepDuration = 0.25 * secondsPerBeat; // 16th note

    // Apply MPC Swing to odd 16th notes (steps 1, 3, 5, 7, etc.)
    const isOddStep = this.currentStepIndex % 2 !== 0;
    const swingFactor = (this.swing - 50) / 100.0; // 50% = 0, 75% = 0.25
    const swingOffset = isOddStep ? stepDuration * swingFactor * 1.3 : 0;

    this.nextStepTime += stepDuration + swingOffset;

    const totalSteps = this.totalBars * 16;
    this.currentStepIndex = (this.currentStepIndex + 1) % totalSteps;
  }

  private scheduleStep(step: number, time: number): void {
    // 1. Play Metronome Click if enabled
    if (this.metronomeEnabled && step % 4 === 0) {
      const isDownbeat = step % 16 === 0;
      this.playMetronomeClick(time, isDownbeat);
    }

    // 2. Trigger active pattern pads for this step
    for (let padId = 0; padId < 16; padId++) {
      const steps = this.pattern[padId];
      if (steps && steps[step] && steps[step].active) {
        const event = steps[step];
        this.triggerPad(padId, event.velocity, event.pitchOffset || 0, time);
      }
    }

    // 3. Dispatch UI notification in sync with AudioContext time
    const bar = Math.floor(step / 16) + 1;
    const beat = (Math.floor((step % 16) / 4)) + 1;
    const delayMs = Math.max(0, (time - this.ctx!.currentTime) * 1000);

    setTimeout(() => {
      if (this.isPlaying) {
        this.notifyStep(step, bar, beat);
      }
    }, delayMs);
  }

  /**
   * Metronome Click generator
   */
  private playMetronomeClick(time: number, isDownbeat: boolean): void {
    if (!this.ctx || this.metronomeVolume <= 0) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    // Downbeat = 1600Hz high woodblock click; Regular beat = 800Hz
    osc.frequency.setValueAtTime(isDownbeat ? 1600 : 800, time);

    const clickVol = (isDownbeat ? 0.8 : 0.45) * this.metronomeVolume;
    gain.gain.setValueAtTime(clickVol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.035);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(time);
    osc.stop(time + 0.04);
  }

  /**
   * User Audio File Upload / Drag-and-Drop Sample Decoder
   */
  public async loadUserAudioFile(file: File, padId: number): Promise<SampleData> {
    await this.init();
    if (!this.ctx) throw new Error('Audio Context not initialized');

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);

    const sampleId = `user_${Date.now()}_${padId}`;
    const cleanName = file.name.replace(/\.[^/.]+$/, '').slice(0, 14);

    const sampleData: SampleData = {
      id: sampleId,
      name: cleanName,
      category: 'percussion',
      buffer: audioBuffer,
      duration: audioBuffer.duration,
      isCustom: true,
    };

    this.samples.set(sampleId, sampleData);

    // Assign directly to pad
    this.padConfigs[padId].sampleId = sampleId;
    this.padConfigs[padId].name = cleanName;

    return sampleData;
  }

  /**
   * Decode an external audio file without immediately assigning to a pad (for Browser preview)
   */
  public async decodeAudioFile(file: File): Promise<SampleData> {
    await this.init();
    if (!this.ctx) throw new Error('Audio Context not initialized');

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);

    const sampleId = `lib_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const cleanName = file.name.replace(/\.[^/.]+$/, '').slice(0, 16);

    const sampleData: SampleData = {
      id: sampleId,
      name: cleanName,
      category: 'percussion',
      buffer: audioBuffer,
      duration: audioBuffer.duration,
      isCustom: true,
    };

    this.samples.set(sampleId, sampleData);
    return sampleData;
  }

  /**
   * Assign an existing library sample to a specific pad
   */
  public assignSampleToPad(padId: number, sampleId: string): void {
    const sample = this.samples.get(sampleId);
    if (!sample || !this.padConfigs[padId]) return;

    this.padConfigs[padId].sampleId = sampleId;
    this.padConfigs[padId].name = sample.name;
  }

  /**
   * Audition / Preview any AudioBuffer directly through master output
   */
  public previewAudioBuffer(buffer: AudioBuffer, volume: number = 0.85, startRatio: number = 0, endRatio: number = 1): void {
    if (!this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);

    source.connect(gain);
    gain.connect(this.masterGain);

    const safeStartRatio = Math.max(0, Math.min(0.999, startRatio));
    const safeEndRatio = Math.max(safeStartRatio + 0.001, Math.min(1, endRatio));
    const offset = safeStartRatio * buffer.duration;
    const playLength = (safeEndRatio - safeStartRatio) * buffer.duration;

    source.start(this.ctx.currentTime, offset, playLength > 0 ? playLength : undefined);
  }

  /**
   * Batch load multiple external audio files across consecutive pads
   */
  public async loadMultipleAudioFiles(files: File[], startPadId: number = 0): Promise<SampleData[]> {
    await this.init();
    const loaded: SampleData[] = [];

    for (let i = 0; i < files.length; i++) {
      const padIdx = (startPadId + i) % 16;
      const sample = await this.loadUserAudioFile(files[i], padIdx);
      loaded.push(sample);
    }

    return loaded;
  }

  /**
   * Helper to create N equal division slice markers
   */
  public createEqualSlices(count: number = 16): SliceMarker[] {
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308',
      '#84cc16', '#10b981', '#06b6d4', '#0ea5e9',
      '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
      '#d946ef', '#ec4899', '#f43f5e', '#d91424',
    ];
    const slices: SliceMarker[] = [];
    const step = 1.0 / count;

    for (let i = 0; i < count; i++) {
      slices.push({
        id: i,
        start: i * step,
        end: (i + 1) * step,
        color: colors[i % colors.length],
      });
    }

    return slices;
  }

  /**
   * Automatic Transient Peak Detection for Sample Slicing
   * Analyzes energy slope to pinpoint acoustic attacks & beats
   */
  public detectTransientSlices(buffer: AudioBuffer, maxSlices: number = 16, sensitivity: number = 0.28): SliceMarker[] {
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#eab308',
      '#84cc16', '#10b981', '#06b6d4', '#0ea5e9',
      '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
      '#d946ef', '#ec4899', '#f43f5e', '#d91424',
    ];

    const data = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const blockSize = Math.floor(sampleRate * 0.01); // 10ms blocks
    const totalBlocks = Math.floor(data.length / blockSize);

    // 1. Calculate RMS energy per block
    const energies: number[] = new Array(totalBlocks);
    for (let b = 0; b < totalBlocks; b++) {
      let sum = 0;
      const start = b * blockSize;
      for (let i = 0; i < blockSize; i++) {
        const val = data[start + i];
        sum += val * val;
      }
      energies[b] = Math.sqrt(sum / blockSize);
    }

    // 2. Detect peaks with minimum distance between transients (e.g. 140ms)
    const minBlockDist = Math.floor((0.14 * sampleRate) / blockSize);
    const transientPoints: number[] = [0]; // always start at 0

    let lastTransientBlock = 0;
    for (let b = 2; b < totalBlocks - 2; b++) {
      const diff = energies[b] - energies[b - 1];
      const isLocalMax = energies[b] > energies[b - 1] && energies[b] > energies[b + 1];

      if (diff > sensitivity && isLocalMax && (b - lastTransientBlock) >= minBlockDist) {
        const ratio = (b * blockSize) / data.length;
        if (ratio < 0.98) {
          transientPoints.push(ratio);
          lastTransientBlock = b;
          if (transientPoints.length >= maxSlices) break;
        }
      }
    }

    // If transient detection found fewer than 4 slices, fall back to equal division
    if (transientPoints.length < 4) {
      return this.createEqualSlices(maxSlices);
    }

    // 3. Build SliceMarker intervals
    const slices: SliceMarker[] = [];
    for (let i = 0; i < transientPoints.length; i++) {
      const start = transientPoints[i];
      const end = i < transientPoints.length - 1 ? transientPoints[i + 1] : 1.0;
      slices.push({
        id: i,
        start,
        end,
        color: colors[i % colors.length],
      });
    }

    return slices;
  }

  /**
   * Cuts a physical sub-AudioBuffer slice with gentle micro-fades to avoid audio clicks
   */
  public sliceAudioBuffer(source: AudioBuffer, startRatio: number, endRatio: number): AudioBuffer {
    if (!this.ctx) throw new Error('AudioContext not ready');

    const startSample = Math.max(0, Math.floor(startRatio * source.length));
    const endSample = Math.min(source.length, Math.floor(endRatio * source.length));
    const sliceLength = Math.max(128, endSample - startSample);

    const sliceBuffer = this.ctx.createBuffer(source.numberOfChannels, sliceLength, source.sampleRate);
    const fadeSamples = Math.min(Math.floor(sliceLength * 0.1), Math.floor(source.sampleRate * 0.003)); // 3ms fade

    for (let ch = 0; ch < source.numberOfChannels; ch++) {
      const src = source.getChannelData(ch);
      const dest = sliceBuffer.getChannelData(ch);

      for (let i = 0; i < sliceLength; i++) {
        let sample = src[startSample + i] || 0;

        // Micro fade-in
        if (i < fadeSamples) {
          sample *= (i / fadeSamples);
        }
        // Micro fade-out
        else if (i > sliceLength - fadeSamples) {
          sample *= ((sliceLength - i) / fadeSamples);
        }

        dest[i] = sample;
      }
    }

    return sliceBuffer;
  }

  /**
   * Assigns Chop slices across 16 pads with automatic Choke / Mute Group
   */
  public assignChopSlicesToPads(
    sourceBuffer: AudioBuffer,
    baseName: string,
    slices: SliceMarker[],
    startPadId: number = 0,
    muteGroup: number = 1
  ): SampleData[] {
    const loaded: SampleData[] = [];
    const count = Math.min(16, slices.length);

    for (let i = 0; i < count; i++) {
      const slice = slices[i];
      const padId = (startPadId + i) % 16;
      const slicedBuffer = this.sliceAudioBuffer(sourceBuffer, slice.start, slice.end);

      const sampleId = `chop_${Date.now()}_${padId}`;
      const chopName = `${baseName.slice(0, 8)} ${String(i + 1).padStart(2, '0')}`;

      const sampleData: SampleData = {
        id: sampleId,
        name: chopName,
        category: 'percussion',
        buffer: slicedBuffer,
        duration: slicedBuffer.duration,
        isCustom: true,
      };

      this.samples.set(sampleId, sampleData);

      // Assign to Pad with Mute Group (Choke) so playing one chop cuts the previous one
      this.padConfigs[padId].sampleId = sampleId;
      this.padConfigs[padId].name = chopName;
      this.padConfigs[padId].color = slice.color;
      this.padConfigs[padId].muteGroup = muteGroup;
      this.padConfigs[padId].startOffset = 0;
      this.padConfigs[padId].endOffset = 1;

      loaded.push(sampleData);
    }

    return loaded;
  }

  /**
   * Generates or fetches a demo vintage soul break sample for instant chopping
   */
  public async getSoulBreakSample(): Promise<SampleData> {
    await this.init();
    const existing = this.samples.get('soul_break_demo');
    if (existing && existing.buffer) return existing;

    if (!this.sampleGen) throw new Error('SampleGenerator not initialized');
    const buffer = await this.sampleGen.generateSoulBreakSample();

    const sampleData: SampleData = {
      id: 'soul_break_demo',
      name: 'Soul Vinyl Break',
      category: 'percussion',
      buffer,
      duration: buffer.duration,
      isCustom: true,
    };

    this.samples.set('soul_break_demo', sampleData);
    return sampleData;
  }

  /**
   * Assign AudioBuffer directly to a pad (e.g. from Microphone recording)
   */
  public setPadAudioBuffer(padId: number, name: string, buffer: AudioBuffer): SampleData {
    const sampleId = `rec_${Date.now()}_${padId}`;
    const sampleData: SampleData = {
      id: sampleId,
      name: name.slice(0, 14),
      category: 'vocal',
      buffer,
      duration: buffer.duration,
      isCustom: true,
    };

    this.samples.set(sampleId, sampleData);
    this.padConfigs[padId].sampleId = sampleId;
    this.padConfigs[padId].name = name.slice(0, 14);

    return sampleData;
  }

  /**
   * Tap Tempo calculation
   */
  private tapTimes: number[] = [];
  public tapTempo(): number {
    const now = performance.now();
    this.tapTimes.push(now);

    // Keep only last 4 taps
    if (this.tapTimes.length > 4) {
      this.tapTimes.shift();
    }

    if (this.tapTimes.length >= 2) {
      let totalDiff = 0;
      for (let i = 1; i < this.tapTimes.length; i++) {
        totalDiff += this.tapTimes[i] - this.tapTimes[i - 1];
      }
      const avgDiff = totalDiff / (this.tapTimes.length - 1);
      const calculatedBpm = Math.round(60000 / avgDiff);
      this.bpm = Math.min(240, Math.max(40, calculatedBpm));
      if (this.delayNode) {
        this.delayNode.delayTime.setValueAtTime((60 / this.bpm) * 0.5, 0);
      }
    }
    return this.bpm;
  }

  /**
   * Pattern Step manipulation
   */
  public getPattern(): SequencerPattern {
    return this.pattern;
  }

  public toggleStep(padId: number, stepIndex: number): void {
    if (!this.pattern[padId]) {
      this.pattern[padId] = Array.from({ length: this.totalBars * 16 }, () => ({ active: false, velocity: 100 }));
    }
    const current = this.pattern[padId][stepIndex];
    if (current) {
      current.active = !current.active;
    } else {
      this.pattern[padId][stepIndex] = { active: true, velocity: 100 };
    }
  }

  public setStepVelocity(padId: number, stepIndex: number, velocity: number): void {
    if (this.pattern[padId] && this.pattern[padId][stepIndex]) {
      this.pattern[padId][stepIndex].velocity = velocity;
    }
  }

  public clearPattern(): void {
    const totalSteps = this.totalBars * 16;
    for (let pad = 0; pad < 16; pad++) {
      this.pattern[pad] = Array.from({ length: totalSteps }, () => ({
        active: false,
        velocity: 100,
      }));
    }
  }

  public clearPadPattern(padId: number): void {
    if (this.pattern[padId]) {
      this.pattern[padId].forEach((step) => {
        step.active = false;
      });
    }
  }

  /**
   * Master & Parameter Setters
   */
  public setMasterVolume(vol: number): void {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1.2, vol)), this.ctx.currentTime);
    }
  }

  public setBpm(newBpm: number): void {
    this.bpm = Math.max(40, Math.min(260, newBpm));
    if (this.delayNode && this.ctx) {
      this.delayNode.delayTime.setValueAtTime((60 / this.bpm) * 0.5, this.ctx.currentTime);
    }
  }

  public setSwing(newSwing: number): void {
    this.swing = Math.max(50, Math.min(75, newSwing));
  }

  public setTotalBars(bars: number): void {
    this.totalBars = bars;
    const totalSteps = bars * 16;
    for (let pad = 0; pad < 16; pad++) {
      if (!this.pattern[pad]) {
        this.pattern[pad] = [];
      }
      while (this.pattern[pad].length < totalSteps) {
        this.pattern[pad].push({ active: false, velocity: 100 });
      }
      if (this.pattern[pad].length > totalSteps) {
        this.pattern[pad] = this.pattern[pad].slice(0, totalSteps);
      }
    }
  }

  /**
   * Event Listeners
   */
  public onStep(cb: StepCallback): () => void {
    this.onStepListeners.push(cb);
    return () => {
      this.onStepListeners = this.onStepListeners.filter((l) => l !== cb);
    };
  }

  public onPadTrigger(cb: PadTriggerCallback): () => void {
    this.onPadTriggerListeners.push(cb);
    return () => {
      this.onPadTriggerListeners = this.onPadTriggerListeners.filter((l) => l !== cb);
    };
  }

  private notifyStep(step: number, bar: number, beat: number): void {
    this.onStepListeners.forEach((cb) => cb(step, bar, beat));
  }

  private notifyPadTrigger(padId: number, velocity: number): void {
    this.onPadTriggerListeners.forEach((cb) => cb(padId, velocity));
  }
}
