import React, { useState, useRef } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface DataDialProps {
  onValueChange: (delta: number) => void;
  onEnter: () => void;
  onCursorMove: (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => void;
  size?: number;
}

export const DataDial: React.FC<DataDialProps> = ({
  onValueChange,
  onEnter,
  onCursorMove,
  size = 100,
}) => {
  const [angle, setAngle] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const dialRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setStartY(e.clientY);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaY = startY - e.clientY;
    if (Math.abs(deltaY) > 8) {
      const step = deltaY > 0 ? 1 : -1;
      setAngle((prev) => prev + step * 18);
      onValueChange(step);
      setStartY(e.clientY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // fallback
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const step = e.deltaY > 0 ? -1 : 1;
    setAngle((prev) => prev + step * 18);
    onValueChange(step);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Outer Housing with Cursor Buttons */}
      <div className="relative flex items-center justify-center p-2 bg-[#181a22] border border-[#2d3240] rounded-full shadow-[0_8px_20px_rgba(0,0,0,0.7),inset_0_2px_4px_rgba(255,255,255,0.06)]">
        {/* Cursor Up */}
        <button
          onClick={() => onCursorMove('UP')}
          title="Cursor Up"
          className="absolute -top-1.5 left-1/2 -translate-x-1/2 p-1 text-slate-400 hover:text-white active:text-akai-red transition-colors"
        >
          <ChevronUp size={14} />
        </button>

        {/* Cursor Down */}
        <button
          onClick={() => onCursorMove('DOWN')}
          title="Cursor Down"
          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 p-1 text-slate-400 hover:text-white active:text-akai-red transition-colors"
        >
          <ChevronDown size={14} />
        </button>

        {/* Cursor Left */}
        <button
          onClick={() => onCursorMove('LEFT')}
          title="Cursor Left"
          className="absolute top-1/2 -left-1.5 -translate-y-1/2 p-1 text-slate-400 hover:text-white active:text-akai-red transition-colors"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Cursor Right */}
        <button
          onClick={() => onCursorMove('RIGHT')}
          title="Cursor Right"
          className="absolute top-1/2 -right-1.5 -translate-y-1/2 p-1 text-slate-400 hover:text-white active:text-akai-red transition-colors"
        >
          <ChevronRight size={14} />
        </button>

        {/* The Big Knurled Jog Wheel */}
        <div
          ref={dialRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          style={{
            width: size,
            height: size,
            transform: `rotate(${angle}deg)`,
          }}
          className={`
            relative rounded-full cursor-grab active:cursor-grabbing select-none touch-none
            bg-gradient-to-tr from-[#1f222b] via-[#323746] to-[#262a35]
            border-2 border-[#4b5266]
            shadow-[0_6px_16px_rgba(0,0,0,0.8),inset_0_2px_3px_rgba(255,255,255,0.25),inset_0_-4px_8px_rgba(0,0,0,0.9)]
            transition-shadow
          `}
        >
          {/* Outer Knurling notches (12 grip tick marks) */}
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              style={{
                transform: `rotate(${i * 30}deg)`,
              }}
              className="absolute inset-0 flex justify-center pointer-events-none"
            >
              <div className="w-[3px] h-[7px] bg-[#1a1c22] rounded-full border-t border-white/20 mt-1" />
            </div>
          ))}

          {/* Finger Indentation / Dimple (Iconic MPC Jog wheel dimple) */}
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-gradient-to-b from-[#14161c] to-[#242833] border border-[#181a20] shadow-inner" />

          {/* Center Push-To-Enter Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEnter();
            }}
            title="Push to ENTER"
            className="absolute inset-5 rounded-full bg-gradient-to-b from-[#2e3340] to-[#1c1f26] border border-[#444a5c] flex items-center justify-center text-[10px] font-mono font-bold text-slate-300 hover:text-white active:scale-95 active:bg-[#16181f] shadow-md z-10 transition-transform"
          >
            ENTER
          </button>
        </div>
      </div>

      <span className="text-[9px] font-mono tracking-wider uppercase text-slate-400 mt-2 font-bold">
        DATA DIAL
      </span>
    </div>
  );
};
