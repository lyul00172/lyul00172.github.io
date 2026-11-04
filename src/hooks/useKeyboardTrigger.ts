import { useEffect, useState } from 'react';
import { KEYBOARD_MAP } from '../audio/defaultKits';

interface KeyboardTriggerOptions {
  onPadTrigger: (padId: number, velocity: number) => void;
  onPlayToggle: () => void;
  onRecordToggle: () => void;
  onTapTempo: () => void;
  onMetronomeToggle: () => void;
  enabled?: boolean;
}

export function useKeyboardTrigger({
  onPadTrigger,
  onPlayToggle,
  onRecordToggle,
  onTapTempo,
  onMetronomeToggle,
  enabled = true,
}: KeyboardTriggerOptions) {
  const [activeKeys, setActiveKeys] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // Check space for Play/Stop
      if (e.code === 'Space') {
        e.preventDefault();
        onPlayToggle();
        return;
      }

      // Record toggle
      if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onRecordToggle();
        return;
      }

      // Tap tempo
      if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onTapTempo();
        return;
      }

      // Metronome toggle
      if (e.key.toLowerCase() === 'm' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onMetronomeToggle();
        return;
      }

      // Pad triggering
      const key = e.key.toLowerCase();
      if (key in KEYBOARD_MAP) {
        e.preventDefault();
        const padId = KEYBOARD_MAP[key];

        // Trigger pad if not already repeating or on initial down
        if (!e.repeat) {
          // Dynamic velocity: Shift key hits full level (127), else standard high velocity (110)
          const velocity = e.shiftKey ? 127 : 108;
          onPadTrigger(padId, velocity);
          setActiveKeys((prev) => new Set(prev).add(padId));
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key in KEYBOARD_MAP) {
        const padId = KEYBOARD_MAP[key];
        setActiveKeys((prev) => {
          const next = new Set(prev);
          next.delete(padId);
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, onPadTrigger, onPlayToggle, onRecordToggle, onTapTempo, onMetronomeToggle]);

  return { activeKeys };
}
