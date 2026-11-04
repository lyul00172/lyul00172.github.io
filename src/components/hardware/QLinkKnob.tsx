import React, { useRef, useState, useEffect, useCallback } from 'react';

interface QLinkKnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  defaultValue?: number;
  size?: number; // diameter in pixels (default: 48)
  onChange: (val: number) => void;
  color?: string; // LED ring color
}

export const QLinkKnob: React.FC<QLinkKnobProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  defaultValue,
  size = 46,
  onChange,
  color = '#d91424',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startVal, setStartVal] = useState(0);
  const knobRef = useRef<HTMLDivElement>(null);

  // Normalize value to 0..1
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));

  // Angle from -135deg to +135deg (270 degree rotation)
  const angle = -135 + normalized * 270;

  // SVG Arc calculations for LED ring
  const strokeWidth = 3;
  const radius = size / 2 - 2;
  const circumference = 2 * Math.PI * radius;
  // 270 degrees is 75% of full circle
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - normalized * arcLength;

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setStartY(e.clientY);
    setStartVal(value);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      const deltaY = startY - e.clientY;
      const sensitivity = 150; // pixels for full range
      const range = max - min;
      const change = (deltaY / sensitivity) * range;
      let nextVal = startVal + change;

      // Snap to step
      if (step > 0) {
        nextVal = Math.round(nextVal / step) * step;
      }
      nextVal = Math.max(min, Math.min(max, nextVal));
      onChange(nextVal);
    },
    [isDragging, startY, startVal, min, max, step, onChange]
  );

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // pointer capture fallback
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    const stepSize = step || (max - min) / 100;
    const nextVal = Math.max(min, Math.min(max, value + delta * stepSize));
    onChange(nextVal);
  };

  const handleDoubleClick = () => {
    if (defaultValue !== undefined) {
      onChange(defaultValue);
    } else {
      onChange((min + max) / 2);
    }
  };

  // Format value display
  const displayVal = Number.isInteger(value) ? value : value.toFixed(1);

  return (
    <div className="flex flex-col items-center select-none group">
      {/* Knob Container */}
      <div
        ref={knobRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
        style={{ width: size, height: size }}
        className="relative flex items-center justify-center cursor-ns-resize touch-none"
      >
        {/* LED Ring SVG */}
        <svg
          className="absolute inset-0 transform -rotate-[225deg]"
          width={size}
          height={size}
        >
          {/* Background Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#1c202a"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Active LED Fill Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-75"
          />
        </svg>

        {/* Physical Rotary Cap */}
        <div
          style={{
            width: size - 10,
            height: size - 10,
            transform: `rotate(${angle}deg)`,
          }}
          className={`
            relative rounded-full transition-transform duration-75
            bg-gradient-to-b from-[#3a3f4d] via-[#242833] to-[#16181f]
            border border-[#454c5c]
            shadow-[0_4px_8px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.25),inset_0_-2px_4px_rgba(0,0,0,0.8)]
            ${isDragging ? 'border-akai-red ring-1 ring-akai-red/50' : 'group-hover:border-[#5c657a]'}
          `}
        >
          {/* Indicator Notch / White Pointer Line */}
          <div className="absolute top-1 left-1/2 -translate-x-1/2 w-[2px] h-[7px] bg-slate-100 rounded-full shadow-[0_0_3px_rgba(255,255,255,0.8)]" />

          {/* Knurled Grip Texture on the edge */}
          <div className="absolute inset-1 rounded-full border border-dashed border-white/10 pointer-events-none" />
        </div>

        {/* Tooltip while dragging or hovering */}
        <div
          className={`
            absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5
            bg-[#090b0e] border border-akai-red/40 rounded text-[9px] font-mono font-bold text-white
            pointer-events-none shadow-md z-30 whitespace-nowrap transition-opacity duration-150
            ${isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
          `}
        >
          {displayVal}{unit}
        </div>
      </div>

      {/* Parameter Label */}
      <div className="mt-1 flex flex-col items-center">
        <span className="text-[9px] font-mono uppercase tracking-tight text-slate-400 group-hover:text-slate-200">
          {label}
        </span>
        <span className="text-[8px] font-mono text-slate-500 font-semibold">
          {displayVal}{unit}
        </span>
      </div>
    </div>
  );
};
