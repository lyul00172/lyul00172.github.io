import React from 'react';
import { Pad } from './Pad';
import { HardwareButton } from './HardwareButton';
import { PadConfig } from '../../types/audio';
import { PadBank } from '../../types/mpc';

interface PadGridProps {
  padConfigs: PadConfig[];
  activePadTriggers: Set<number>;
  selectedPadId: number;
  activeBank: PadBank;
  isFullLevel: boolean;
  is16Level: boolean;
  isEraseMode: boolean;
  onPadTrigger: (padId: number, velocity: number) => void;
  onPadSelect: (padId: number) => void;
  onSelectBank: (bank: PadBank) => void;
  onToggleFullLevel: () => void;
  onToggle16Level: () => void;
  onToggleErase: () => void;
  onStopAllAudio: () => void;
  onOpenBrowse?: () => void;
  onDropAudioFile: (file: File, padId: number) => void;
}

export const PadGrid: React.FC<PadGridProps> = ({
  padConfigs,
  activePadTriggers,
  selectedPadId,
  activeBank,
  isFullLevel,
  is16Level,
  isEraseMode,
  onPadTrigger,
  onPadSelect,
  onSelectBank,
  onToggleFullLevel,
  onToggle16Level,
  onToggleErase,
  onStopAllAudio,
  onOpenBrowse,
  onDropAudioFile,
}) => {
  // Mapping of display layout to pad IDs and keyboard keys
  // Row 4 (Top): Pads 13, 14, 15, 16 -> IDs: 12, 13, 14, 15
  // Row 3: Pads 9, 10, 11, 12 -> IDs: 8, 9, 10, 11
  // Row 2: Pads 5, 6, 7, 8 -> IDs: 4, 5, 6, 7
  // Row 1 (Bottom): Pads 1, 2, 3, 4 -> IDs: 0, 1, 2, 3

  const rows = [
    [
      { id: 12, num: 13, key: '1' },
      { id: 13, num: 14, key: '2' },
      { id: 14, num: 15, key: '3' },
      { id: 15, num: 16, key: '4' },
    ],
    [
      { id: 8, num: 9, key: 'Q' },
      { id: 9, num: 10, key: 'W' },
      { id: 10, num: 11, key: 'E' },
      { id: 11, num: 12, key: 'R' },
    ],
    [
      { id: 4, num: 5, key: 'A' },
      { id: 5, num: 6, key: 'S' },
      { id: 6, num: 7, key: 'D' },
      { id: 7, num: 8, key: 'F' },
    ],
    [
      { id: 0, num: 1, key: 'Z' },
      { id: 1, num: 2, key: 'X' },
      { id: 2, num: 3, key: 'C' },
      { id: 3, num: 4, key: 'V' },
    ],
  ];

  return (
    <div className="flex flex-col bg-[#14161d] border border-[#262b37] rounded-xl p-3.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8),0_12px_24px_rgba(0,0,0,0.4)]">
      {/* Top Pad Function Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-[#242733] mb-3">
        {/* Bank Selection Buttons (A, B, C, D) */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-mono font-bold text-slate-400 mr-1">BANK</span>
          {(['A', 'B', 'C', 'D'] as PadBank[]).map((bank) => (
            <HardwareButton
              key={bank}
              label={bank}
              size="sm"
              ledColor="amber"
              isLedOn={activeBank === bank}
              isActive={activeBank === bank}
              onClick={() => onSelectBank(bank)}
              className="min-w-[34px] !py-1"
            />
          ))}
        </div>

        {/* Performance Mode Buttons */}
        <div className="flex items-center gap-1.5">
          {onOpenBrowse && (
            <HardwareButton
              label="BROWSE"
              size="sm"
              ledColor="white"
              onClick={onOpenBrowse}
              title="Open Sample Browser & File Uploader"
              className="!py-1"
            />
          )}
          <HardwareButton
            label="FULL LEVEL"
            size="sm"
            ledColor="red"
            isLedOn={isFullLevel}
            isActive={isFullLevel}
            onClick={onToggleFullLevel}
            title="Locks all pad hits to maximum velocity (127)"
            className="!py-1"
          />
          <HardwareButton
            label="16 LEVEL"
            size="sm"
            ledColor="blue"
            isLedOn={is16Level}
            isActive={is16Level}
            onClick={onToggle16Level}
            title="Maps selected pad across all 16 pads chromatically"
            className="!py-1"
          />
          <HardwareButton
            label="ERASE"
            size="sm"
            ledColor="red"
            isLedOn={isEraseMode}
            isActive={isEraseMode}
            onClick={onToggleErase}
            title="Click Erase then tap a pad to clear its pattern"
            className="!py-1"
          />
          <HardwareButton
            label="STOP ALL"
            size="sm"
            ledColor="white"
            variant="danger"
            onClick={onStopAllAudio}
            title="Stop all currently playing audio immediately"
            className="!py-1"
          />
        </div>
      </div>

      {/* 4x4 Pad Matrix */}
      <div className="grid grid-cols-4 gap-2.5">
        {rows.flat().map((item) => {
          const config = padConfigs[item.id];
          if (!config) return null;

          return (
            <Pad
              key={item.id}
              config={config}
              padNumber={item.num}
              shortcutKey={item.key}
              isTriggered={activePadTriggers.has(item.id)}
              isSelected={selectedPadId === item.id}
              isFullLevel={isFullLevel}
              onTrigger={onPadTrigger}
              onSelect={onPadSelect}
              onDropAudioFile={onDropAudioFile}
            />
          );
        })}
      </div>
    </div>
  );
};
