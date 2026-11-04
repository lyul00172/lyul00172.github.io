export interface SampleData {
  id: string;
  name: string;
  category: 'kick' | 'snare' | 'hihat_closed' | 'hihat_open' | 'clap' | 'percussion' | 'bass' | 'synth' | 'vocal' | 'fx';
  buffer: AudioBuffer | null;
  duration: number; // in seconds
  sourceUrl?: string;
  isCustom?: boolean;
}

export interface PadConfig {
  id: number; // 0 to 15 (Pad 1 to 16)
  name: string;
  sampleId: string;
  color: string; // RGB hex color for pad backlight
  volume: number; // 0 to 1 (default: 0.85)
  pan: number; // -1 to 1 (default: 0)
  pitch: number; // -24 to +24 semitones (default: 0)
  attack: number; // 0 to 2 seconds (default: 0.001)
  decay: number; // 0.01 to 5 seconds (default: 1.0)
  cutoff: number; // 20 to 20000 Hz (default: 20000)
  resonance: number; // 0 to 20 Q (default: 0)
  filterType: BiquadFilterType; // 'lowpass' | 'highpass' | 'bandpass'
  muteGroup: number; // 0 (none), 1 (e.g., hihats choke each other)
  reverse: boolean;
  isMuted: boolean;
  isSolo: boolean;
  sendReverb: number; // 0 to 1
  sendDelay: number; // 0 to 1
  startOffset: number; // 0 to 1 normalized
  endOffset: number; // 0 to 1 normalized
}

export interface StepEvent {
  active: boolean;
  velocity: number; // 0 to 127
  pitchOffset?: number; // for 16-level pitch programming
}

export type SequencerPattern = {
  [padId: number]: StepEvent[]; // array of 16, 32, or 64 steps
};

export interface TrackData {
  id: number;
  name: string;
  type: 'drum' | 'keygroup' | 'plugin' | 'audio';
  pattern: SequencerPattern;
  muted: boolean;
  solo: boolean;
  volume: number;
}

export interface SliceMarker {
  id: number;
  start: number; // 0 to 1 normalized
  end: number; // 0 to 1 normalized
  color: string;
}

export type ChopMode = 'EQUAL' | 'TRANSIENT' | 'MANUAL';

export interface SoundKit {
  id: string;
  name: string;
  category: string;
  pads: {
    name: string;
    category: SampleData['category'];
    color: string;
  }[];
}
