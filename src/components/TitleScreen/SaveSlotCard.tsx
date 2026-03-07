import { useState } from 'react';
import type { SaveSlot } from '../../store/savesStore';

interface SaveSlotCardProps {
  slot: SaveSlot;
  onNewGame: () => void;
  onResume: () => void;
  onDelete: () => void;
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
}

export function SaveSlotCard({ slot, onNewGame, onResume, onDelete }: SaveSlotCardProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="border border-[#5c4a2a] rounded-xl bg-[#1a1714] overflow-hidden">
      {/* Slot label */}
      <div className="px-4 pt-3 pb-0">
        <span className="text-[#7a6035] font-serif text-xs tracking-widest uppercase">
          Save {slot.slotId}
        </span>
      </div>

      {/* Content */}
      <div className="px-4 pt-2 pb-4">
        {confirming ? (
          /* ── Delete confirmation ── */
          <div className="flex flex-col gap-3">
            <p className="text-[#c8b896] font-serif text-sm italic">
              Delete this save? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirming(false)}
                className="
                  flex-1 min-h-[44px] font-serif text-sm text-[#c8b896]
                  bg-[#251e15] border border-[#5c4a2a] rounded-lg
                  hover:bg-[#2e2419] active:scale-[0.98] transition-all duration-150
                "
              >
                Cancel
              </button>
              <button
                onClick={() => { onDelete(); setConfirming(false); }}
                className="
                  flex-1 min-h-[44px] font-serif text-sm text-[#c87070]
                  bg-[#251e15] border border-[#7a3030] rounded-lg
                  hover:bg-[#301e1e] active:scale-[0.98] transition-all duration-150
                "
              >
                Delete
              </button>
            </div>
          </div>
        ) : slot.isEmpty ? (
          /* ── Empty slot ── */
          <div className="flex flex-col gap-3">
            <p className="text-[#4a3f30] font-serif text-sm italic">Empty</p>
            <button
              onClick={onNewGame}
              className="
                w-full min-h-[48px] font-serif text-sm text-[#c8b896]
                bg-[#251e15] border border-[#5c4a2a] rounded-lg
                hover:bg-[#2e2419] hover:border-[#7a6035]
                active:scale-[0.98] transition-all duration-150
              "
            >
              New Game
            </button>
          </div>
        ) : (
          /* ── Filled slot ── */
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-[#c8b896] font-serif text-sm leading-snug line-clamp-2">
                {slot.lastEventText}
              </p>
              <p className="text-[#5c4a2a] font-serif text-xs mt-1">
                {slot.eventCount} {slot.eventCount === 1 ? 'event' : 'events'}
                {' · '}
                {formatRelativeTime(slot.savedAt)}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={onResume}
                className="
                  flex-1 min-h-[48px] font-serif text-sm text-[#c8b896]
                  bg-[#251e15] border border-[#5c4a2a] rounded-lg
                  hover:bg-[#2e2419] hover:border-[#7a6035]
                  active:scale-[0.98] transition-all duration-150
                "
              >
                Resume
              </button>
              <button
                onClick={() => setConfirming(true)}
                className="
                  min-h-[48px] px-4 font-serif text-sm text-[#7a5050]
                  bg-[#251e15] border border-[#5c4a2a] rounded-lg
                  hover:bg-[#2e1e1e] hover:border-[#7a3030]
                  active:scale-[0.98] transition-all duration-150
                "
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
