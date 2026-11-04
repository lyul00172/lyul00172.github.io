import React from 'react';

interface SpeakerGrilleProps {
  isPlaying: boolean;
  audioLevel?: number; // 0 to 100 for subtle vibration animation
}

export const SpeakerGrille: React.FC<SpeakerGrilleProps> = ({ isPlaying, audioLevel = 0 }) => {
  // Calculate subtle dynamic glow/vibration based on audio level
  const pulseScale = isPlaying ? 1 + (audioLevel / 100) * 0.04 : 1;

  return (
    <div className="relative w-full h-12 bg-gradient-to-b from-[#13151a] via-[#0f1114] to-[#0a0b0d] border-t-2 border-[#262933] flex items-center justify-between px-8 shadow-[inset_0_4px_8px_rgba(0,0,0,0.8)] overflow-hidden">
      {/* Left Stereo Speaker Mesh */}
      <div className="flex items-center gap-3">
        {/* Left Woofer & Tweeter */}
        <div
          style={{ transform: `scale(${pulseScale})` }}
          className="relative w-8 h-8 rounded-full bg-[#181a20] border border-[#2b303d] flex items-center justify-center shadow-inner transition-transform duration-75"
        >
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#0f1013] to-[#252833] border border-black/80 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#0a0b0e]" />
          </div>
        </div>

        {/* Acoustic Grille Perforations */}
        <div className="hidden sm:grid grid-cols-12 gap-1 opacity-40">
          {Array.from({ length: 36 }).map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-[#353b49] shadow-inner" />
          ))}
        </div>
      </div>

      {/* Center Bass Radiator & Akai Professional Inset Badge */}
      <div className="flex flex-col items-center justify-center px-4 py-1 bg-[#16181f] border border-[#2c3140] rounded-md shadow-[0_2px_4px_rgba(0,0,0,0.7)]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-akai-red" />
          <span className="text-[10px] font-display font-extrabold tracking-widest text-slate-200">
            STEREO MONITOR SYSTEM
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-akai-red" />
        </div>
        <span className="text-[8px] font-mono text-slate-500 uppercase tracking-tight">
          BUILT-IN ACTIVE DUAL MONITORS &amp; RADIATOR
        </span>
      </div>

      {/* Right Stereo Speaker Mesh */}
      <div className="flex items-center gap-3">
        {/* Acoustic Grille Perforations */}
        <div className="hidden sm:grid grid-cols-12 gap-1 opacity-40">
          {Array.from({ length: 36 }).map((_, i) => (
            <div key={i} className="w-1 h-1 rounded-full bg-[#353b49] shadow-inner" />
          ))}
        </div>

        {/* Right Woofer & Tweeter */}
        <div
          style={{ transform: `scale(${pulseScale})` }}
          className="relative w-8 h-8 rounded-full bg-[#181a20] border border-[#2b303d] flex items-center justify-center shadow-inner transition-transform duration-75"
        >
          <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#0f1013] to-[#252833] border border-black/80 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#0a0b0e]" />
          </div>
        </div>
      </div>

      {/* Metallic bottom rim */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#454c5e]/40 to-transparent pointer-events-none" />
    </div>
  );
};
