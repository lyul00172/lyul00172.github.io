import React, { useState, useRef } from 'react';
import { PadConfig } from '../../types/audio';
import { Volume2, VolumeX, FolderOpen } from 'lucide-react';

interface PadProps {
  config: PadConfig;
  padNumber: number; // 1 to 16
  shortcutKey: string;
  isTriggered: boolean;
  isSelected: boolean;
  isFullLevel: boolean;
  onTrigger: (padId: number, velocity: number) => void;
  onSelect: (padId: number) => void;
  onDropAudioFile?: (file: File, padId: number) => void;
}

export const Pad: React.FC<PadProps> = ({
  config,
  padNumber,
  shortcutKey,
  isTriggered,
  isSelected,
  isFullLevel,
  onTrigger,
  onSelect,
  onDropAudioFile,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const padRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    // If clicking upload button or its icon, don't trigger pad
    const target = e.target as HTMLElement;
    if (target.closest('.pad-upload-btn')) return;

    e.preventDefault();
    onSelect(config.id);

    // Calculate velocity based on click Y coordinate within the pad (unless Full Level is on)
    let velocity = 127;
    if (!isFullLevel && padRef.current) {
      const rect = padRef.current.getBoundingClientRect();
      const relativeY = (e.clientY - rect.top) / rect.height; // 0 (top) to 1 (bottom)
      // Top hits harder: 127 down to 75
      velocity = Math.round(127 - relativeY * 45);
    }

    onTrigger(config.id, velocity);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.includes('audio') || file.name.match(/\.(wav|mp3|ogg|flac|aiff|m4a)$/i)) {
        if (onDropAudioFile) {
          onDropAudioFile(file, config.id);
        }
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      if (onDropAudioFile) {
        onDropAudioFile(file, config.id);
      }
      e.target.value = ''; // Reset for re-selection
    }
  };

  // Pad RGB lighting styles
  const baseColor = config.color || '#3b82f6';
  const isCustomSample = config.sampleId.startsWith('user_') || config.sampleId.startsWith('lib_') || config.sampleId.startsWith('rec_');

  const glowStyle = isTriggered
    ? {
        boxShadow: `0 0 28px ${baseColor}, inset 0 0 16px ${baseColor}`,
        borderColor: baseColor,
        backgroundColor: '#262a36',
      }
    : isSelected
    ? {
        boxShadow: `0 0 12px ${baseColor}88, inset 0 0 6px ${baseColor}44`,
        borderColor: baseColor,
      }
    : {
        borderColor: '#262934',
      };

  return (
    <div
      ref={padRef}
      onPointerDown={handlePointerDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={glowStyle}
      className={`
        relative aspect-square rounded-lg border-2 select-none cursor-pointer touch-none
        transition-all duration-75 flex flex-col justify-between p-2.5
        bg-gradient-to-b from-[#252934] via-[#1c1f27] to-[#15171d]
        shadow-[0_6px_12px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.15),inset_0_-3px_5px_rgba(0,0,0,0.6)]
        hover:from-[#2d323f] hover:to-[#191b22]
        active:translate-y-[2px] active:scale-[0.985] group
        ${isDragOver ? 'ring-2 ring-white border-dashed bg-akai-red/20' : ''}
      `}
    >
      {/* Hidden File Input for this Pad */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.wav,.mp3,.ogg,.flac,.aiff,.m4a"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Corner RGB Underglow bar */}
      <div
        style={{ backgroundColor: baseColor }}
        className={`
          absolute top-0 left-0 right-0 h-[3px] rounded-t-lg transition-all duration-100
          ${isTriggered ? 'opacity-100 shadow-[0_0_10px_currentColor]' : 'opacity-60'}
        `}
      />

      {/* Top Header: Pad ID, Custom Audio Badge & Quick Upload Button & Keyboard Key */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-1.5 pointer-events-none">
          <span className="text-[10px] font-mono font-bold tracking-wider text-slate-300">
            PAD {padNumber.toString().padStart(2, '0')}
          </span>
          {isCustomSample && (
            <span className="text-[7px] font-mono font-bold px-1 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
              EXT
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Quick External File Picker Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            title="Upload audio file to this pad (WAV/MP3)"
            className="pad-upload-btn opacity-40 group-hover:opacity-100 hover:scale-110 p-0.5 rounded bg-black/50 hover:bg-akai-red text-slate-300 hover:text-white transition-all pointer-events-auto"
          >
            <FolderOpen size={10} />
          </button>

          {/* Keyboard shortcut key indicator */}
          <span className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-[9px] font-mono font-bold text-slate-400 uppercase pointer-events-none">
            {shortcutKey}
          </span>
        </div>
      </div>

      {/* Center: Sample Name */}
      <div className="flex flex-col items-center justify-center pointer-events-none z-10 px-0.5">
        <span
          className={`
            text-[12px] font-display font-bold text-center tracking-tight truncate w-full transition-colors
            ${isTriggered ? 'text-white' : 'text-slate-200'}
          `}
        >
          {config.name}
        </span>

        {/* Choke group or tuning indicator */}
        <div className="flex items-center gap-1.5 mt-0.5">
          {config.muteGroup > 0 && (
            <span className="text-[8px] font-mono px-1 rounded bg-[#d91424]/30 text-rose-300 border border-rose-500/20">
              MUTE {config.muteGroup}
            </span>
          )}
          {config.pitch !== 0 && (
            <span className="text-[8px] font-mono text-cyan-400">
              {config.pitch > 0 ? `+${config.pitch}` : config.pitch}st
            </span>
          )}
        </div>
      </div>

      {/* Bottom Footer: Status Indicators */}
      <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 pointer-events-none z-10">
        {/* Drag Drop Helper / Mute status */}
        <div className="flex items-center gap-1">
          {config.isMuted ? (
            <VolumeX size={10} className="text-red-400" />
          ) : (
            <Volume2 size={10} className="opacity-40" />
          )}
          <span className="opacity-60 truncate max-w-[65px]">
            {Math.round(config.volume * 100)}%
          </span>
        </div>

        {/* Pad Color Pill Indicator */}
        <div
          style={{ backgroundColor: baseColor }}
          className={`w-2 h-2 rounded-full transition-transform ${isTriggered ? 'scale-125' : 'opacity-70'}`}
        />
      </div>

      {/* Drag & Drop Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 bg-akai-red/90 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center p-2 z-20 text-white font-mono font-bold text-center text-xs pointer-events-none shadow-2xl">
          <FolderOpen size={18} className="mb-1 animate-bounce" />
          <span>ASSIGN TO PAD {padNumber}</span>
          <span className="text-[8px] opacity-90 mt-0.5">WAV / MP3 / FLAC / OGG</span>
        </div>
      )}
    </div>
  );
};
