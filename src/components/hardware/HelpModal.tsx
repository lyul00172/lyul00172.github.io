import React from 'react';
import { X, Keyboard, Mic, Sliders, Volume2, Music } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-2xl bg-[#141720] border-2 border-[#2f3546] rounded-2xl p-6 shadow-2xl text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#293040] pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-akai-red text-white font-black rounded-lg">MPC</div>
            <div>
              <h2 className="text-lg font-display font-extrabold text-white">
                AKAI Professional MPC LIVE II
              </h2>
              <p className="text-xs font-mono text-slate-400">
                Interactive Web Studio &bull; Hardware User Guide
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg bg-[#222736] hover:bg-[#2e3549] text-slate-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          {/* 4x4 Pad Keyboard Mapping */}
          <div className="bg-[#0e1017] p-4 rounded-xl border border-[#232938]">
            <div className="flex items-center gap-2 text-amber-400 font-bold mb-3">
              <Keyboard size={16} />
              <span>4x4 PAD KEYBOARD MAPPING</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
              {/* Row 4 */}
              <div className="p-2 bg-[#1b212f] rounded border border-[#2d374d]">1 <span className="block text-[8px] text-slate-400 font-normal">Pad 13</span></div>
              <div className="p-2 bg-[#1b212f] rounded border border-[#2d374d]">2 <span className="block text-[8px] text-slate-400 font-normal">Pad 14</span></div>
              <div className="p-2 bg-[#1b212f] rounded border border-[#2d374d]">3 <span className="block text-[8px] text-slate-400 font-normal">Pad 15</span></div>
              <div className="p-2 bg-[#1b212f] rounded border border-[#2d374d]">4 <span className="block text-[8px] text-slate-400 font-normal">Pad 16</span></div>

              {/* Row 3 */}
              <div className="p-2 bg-[#1b212f] rounded border border-[#2d374d]">Q <span className="block text-[8px] text-slate-400 font-normal">Pad 9</span></div>
              <div className="p-2 bg-[#1b212f] rounded border border-[#2d374d]">W <span className="block text-[8px] text-slate-400 font-normal">Pad 10</span></div>
              <div className="p-2 bg-[#1b212f] rounded border border-[#2d374d]">E <span className="block text-[8px] text-slate-400 font-normal">Pad 11</span></div>
              <div className="p-2 bg-[#1b212f] rounded border border-[#2d374d]">R <span className="block text-[8px] text-slate-400 font-normal">Pad 12</span></div>

              {/* Row 2 */}
              <div className="p-2 bg-[#1b212f] rounded border border-[#2d374d]">A <span className="block text-[8px] text-slate-400 font-normal">Pad 5</span></div>
              <div className="p-2 bg-[#1b212f] rounded border border-[#2d374d]">S <span className="block text-[8px] text-slate-400 font-normal">Pad 6</span></div>
              <div className="p-2 bg-[#1b212f] rounded border border-[#2d374d]">D <span className="block text-[8px] text-slate-400 font-normal">Pad 7</span></div>
              <div className="p-2 bg-[#1b212f] rounded border border-[#2d374d]">F <span className="block text-[8px] text-slate-400 font-normal">Pad 8</span></div>

              {/* Row 1 */}
              <div className="p-2 bg-[#1b212f] rounded border border-[#2d374d]">Z <span className="block text-[8px] text-slate-400 font-normal">Pad 1</span></div>
              <div className="p-2 bg-[#1b212f] rounded border border-[#2d374d]">X <span className="block text-[8px] text-slate-400 font-normal">Pad 2</span></div>
              <div className="p-2 bg-[#1b212f] rounded border border-[#2d374d]">C <span className="block text-[8px] text-slate-400 font-normal">Pad 3</span></div>
              <div className="p-2 bg-[#1b212f] rounded border border-[#2d374d]">V <span className="block text-[8px] text-slate-400 font-normal">Pad 4</span></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Tip: Hold <span className="text-white font-bold">Shift</span> while pressing keys to trigger Full Velocity (127).
            </p>
          </div>

          {/* Transport & Global Shortcuts */}
          <div className="bg-[#0e1017] p-4 rounded-xl border border-[#232938] flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 font-bold mb-3">
                <Music size={16} />
                <span>TRANSPORT SHORTCUTS</span>
              </div>
              <ul className="space-y-2 text-[11px]">
                <li className="flex justify-between border-b border-[#1f2533] pb-1">
                  <span className="text-slate-400">Play / Pause:</span>
                  <span className="font-bold text-white bg-[#1b212f] px-2 py-0.5 rounded">Space</span>
                </li>
                <li className="flex justify-between border-b border-[#1f2533] pb-1">
                  <span className="text-slate-400">Record Live Hits:</span>
                  <span className="font-bold text-white bg-[#1b212f] px-2 py-0.5 rounded">R</span>
                </li>
                <li className="flex justify-between border-b border-[#1f2533] pb-1">
                  <span className="text-slate-400">Tap Tempo:</span>
                  <span className="font-bold text-white bg-[#1b212f] px-2 py-0.5 rounded">T</span>
                </li>
                <li className="flex justify-between border-b border-[#1f2533] pb-1">
                  <span className="text-slate-400">Metronome Click:</span>
                  <span className="font-bold text-white bg-[#1b212f] px-2 py-0.5 rounded">M</span>
                </li>
              </ul>
            </div>

            <div className="mt-4 pt-3 border-t border-[#1f2533]">
              <span className="text-emerald-400 font-bold block mb-1">외부 음원 및 샘플 챠핑 (CHOP &amp; SAMPLES):</span>
              <ul className="text-[10px] text-slate-400 space-y-1">
                <li>• <span className="text-white font-semibold">샘플 챠핑 (CHOP):</span> CHOP 탭에서 바이닐 루프를 4/8/16 등분 또는 피크(트랜지언트) 감지로 썰어 16개 패드에 일괄 분할 배치</li>
                <li>• <span className="text-white font-semibold">패드 위 📁 아이콘:</span> 패드 우상단의 파일 아이콘을 클릭하여 로컬 음원 바로 할당</li>
                <li>• <span className="text-white font-semibold">드래그 앤 드롭:</span> WAV, MP3, FLAC 파일을 원하는 패드로 드래그</li>
                <li>• <span className="text-white font-semibold">BROWSE 화면:</span> 여러 음원 한번에 일괄 할당(Batch Load) 및 미리듣기(Audition) 지원</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            type="button"
            className="px-5 py-2 bg-akai-red hover:bg-rose-600 font-mono font-bold text-xs text-white rounded-lg transition-colors"
          >
            LET'S MAKE MUSIC
          </button>
        </div>
      </div>
    </div>
  );
};
