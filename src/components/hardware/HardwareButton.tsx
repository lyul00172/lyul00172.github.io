import React from 'react';

interface HardwareButtonProps {
  label: string;
  subLabel?: string;
  ledColor?: 'red' | 'green' | 'amber' | 'blue' | 'white';
  isLedOn?: boolean;
  isActive?: boolean;
  variant?: 'default' | 'accent' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  className?: string;
  title?: string;
  icon?: React.ReactNode;
}

export const HardwareButton: React.FC<HardwareButtonProps> = ({
  label,
  subLabel,
  ledColor = 'red',
  isLedOn = false,
  isActive = false,
  size = 'md',
  onClick,
  className = '',
  title,
  icon,
}) => {
  const getLedGlow = () => {
    if (!isLedOn) return 'bg-[#2a2d36] shadow-inner';
    switch (ledColor) {
      case 'red':
        return 'bg-[#ff2233] shadow-[0_0_8px_#ff2233]';
      case 'green':
        return 'bg-[#10b981] shadow-[0_0_8px_#10b981]';
      case 'amber':
        return 'bg-[#f59e0b] shadow-[0_0_8px_#f59e0b]';
      case 'blue':
        return 'bg-[#00d2ff] shadow-[0_0_8px_#00d2ff]';
      case 'white':
        return 'bg-white shadow-[0_0_8px_#ffffff]';
      default:
        return 'bg-[#ff2233] shadow-[0_0_8px_#ff2233]';
    }
  };

  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-[10px]',
    md: 'px-3 py-2 text-[11px]',
    lg: 'px-4 py-2.5 text-xs',
  };

  return (
    <button
      onClick={onClick}
      title={title || label}
      type="button"
      className={`
        group relative flex flex-col items-center justify-center font-display font-semibold tracking-wider uppercase
        rounded-[4px] border border-[#303440] transition-all duration-75 select-none
        bg-gradient-to-b from-[#2a2e38] to-[#1c1f26]
        text-slate-300 hover:text-white hover:border-[#424858]
        active:translate-y-[1px] active:bg-[#181a20] active:shadow-inner
        shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.12)]
        ${isActive ? 'border-akai-red/60 text-white from-[#342428] to-[#20181c]' : ''}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {/* LED Indicator Dot */}
      {ledColor && (
        <span
          className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full transition-all duration-150 ${getLedGlow()}`}
        />
      )}

      {/* Button Content */}
      <div className="flex items-center gap-1.5 z-10">
        {icon && <span className="opacity-80 group-hover:opacity-100">{icon}</span>}
        <span>{label}</span>
      </div>

      {subLabel && (
        <span className="text-[8px] font-mono font-normal text-slate-400 mt-0.5 tracking-tighter">
          {subLabel}
        </span>
      )}
    </button>
  );
};
