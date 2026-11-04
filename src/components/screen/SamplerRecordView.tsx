import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Circle, Play, AlertCircle, CheckCircle2 } from 'lucide-react';
import { PadConfig } from '../../types/audio';
import { AudioRecorder } from '../../audio/AudioRecorder';

interface SamplerRecordViewProps {
  padConfigs: PadConfig[];
  selectedPadId: number;
  recorder: AudioRecorder | null;
  onSampleRecorded: (padId: number, name: string, buffer: AudioBuffer) => void;
  onTriggerPad: (padId: number) => void;
}

export const SamplerRecordView: React.FC<SamplerRecordViewProps> = ({
  padConfigs,
  selectedPadId,
  recorder,
  onSampleRecorded,
  onTriggerPad,
}) => {
  const [targetPadId, setTargetPadId] = useState<number>(selectedPadId);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordTime, setRecordTime] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setTargetPadId(selectedPadId);
  }, [selectedPadId]);

  const handleStartRecording = async () => {
    if (!recorder) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await recorder.startRecording();
      setIsRecording(true);
      setRecordTime(0);

      const start = Date.now();
      timerRef.current = window.setInterval(() => {
        setRecordTime((Date.now() - start) / 1000);
      }, 50);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Microphone access denied or unavailable.';
      setErrorMsg(msg);
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    if (!recorder || !isRecording) return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    try {
      const buffer = await recorder.stopRecording();
      setIsRecording(false);
      const name = `Vocal Rec ${targetPadId + 1}`;
      onSampleRecorded(targetPadId, name, buffer);
      setSuccessMsg(`Sample recorded & assigned to PAD ${targetPadId + 1}!`);
      onTriggerPad(targetPadId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error decoding recorded audio.';
      setErrorMsg(msg);
      setIsRecording(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d1017] text-slate-200 select-none overflow-y-auto p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#141924] border border-[#222a3d] rounded-lg">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-rose-500/20 border border-rose-500/40 rounded text-rose-400">
            <Mic size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-mono font-bold text-white uppercase">
              LIVE HARDWARE SAMPLER
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              DIRECT MICROPHONE &bull; SAMPLE DIRECTLY INTO PADS
            </span>
          </div>
        </div>

        {/* Target Pad Selector */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-400">ASSIGN TO:</span>
          <select
            value={targetPadId}
            onChange={(e) => setTargetPadId(parseInt(e.target.value))}
            className="bg-[#1b2232] border border-[#2e3952] rounded px-2.5 py-1 text-xs font-mono font-bold text-amber-400 cursor-pointer"
          >
            {padConfigs.map((p) => (
              <option key={p.id} value={p.id}>
                PAD {p.id + 1}: {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Recording Console */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#090b10] border border-[#1e2536] rounded-xl p-6 relative shadow-inner">
        {/* Recording Animation & Timer */}
        <div className="flex flex-col items-center gap-3">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
              isRecording
                ? 'border-red-500 bg-red-950/40 shadow-[0_0_30px_#ef4444] animate-pulse'
                : 'border-[#2c3547] bg-[#121622]'
            }`}
          >
            <Mic size={32} className={isRecording ? 'text-red-400' : 'text-slate-400'} />
          </div>

          {/* Time Display */}
          <div className="flex flex-col items-center">
            <span className="text-3xl font-mono font-black tracking-widest text-white">
              {recordTime.toFixed(2)}s
            </span>
            <span className="text-[10px] font-mono text-slate-400 uppercase mt-0.5">
              {isRecording ? 'RECORDING IN PROGRESS...' : 'SAMPLER STANDBY'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-4 mt-6">
          {!isRecording ? (
            <button
              onClick={handleStartRecording}
              type="button"
              className="flex items-center gap-2 px-6 py-3 bg-akai-red hover:bg-rose-600 active:scale-95 text-white font-mono font-bold text-xs rounded-lg shadow-[0_0_15px_rgba(217,20,36,0.6)] transition-all"
            >
              <Circle size={14} className="fill-white" />
              <span>START RECORDING</span>
            </button>
          ) : (
            <button
              onClick={handleStopRecording}
              type="button"
              className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-white active:scale-95 text-black font-mono font-extrabold text-xs rounded-lg shadow-[0_0_15px_rgba(255,255,255,0.6)] transition-all animate-bounce"
            >
              <Square size={14} className="fill-black" />
              <span>STOP &amp; ASSIGN TO PAD {targetPadId + 1}</span>
            </button>
          )}
        </div>

        {/* Feedback Messages */}
        {errorMsg && (
          <div className="flex items-center gap-2 mt-4 px-3 py-1.5 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-mono rounded">
            <AlertCircle size={14} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 mt-4 px-3 py-1.5 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-mono rounded">
            <CheckCircle2 size={14} />
            <span>{successMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};
