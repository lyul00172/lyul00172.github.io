export type ScreenMode = 
  | 'MAIN'
  | 'BROWSE'
  | 'STEP_SEQ'
  | 'GRID'
  | 'SAMPLE_EDIT'
  | 'PAD_PERFORM'
  | 'MIXER'
  | 'SAMPLER_REC'
  | 'PRESETS';

export type PadBank = 'A' | 'B' | 'C' | 'D';

export type SixteenLevelType = 'VELOCITY' | 'TUNE' | 'FILTER' | 'OFF';

export interface TransportState {
  isPlaying: boolean;
  isRecording: boolean;
  isOverdubbing: boolean;
  bpm: number;
  swing: number; // 50 to 75%
  timeSignature: [number, number]; // [4, 4]
  currentBar: number;
  currentBeat: number;
  currentTick: number;
  totalBars: number; // 1, 2, 4, 8
  metronomeEnabled: boolean;
  metronomeVolume: number; // 0 to 1
  countInEnabled: boolean;
}

export interface QLinkParam {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (val: number) => void;
}
