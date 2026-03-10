import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { HistoryEntry } from '../../types/story';
import { ImageWithShimmer } from '../UI/ImageWithShimmer';

interface PastCardProps {
  entry: HistoryEntry;
}

const EASE_IN  = 'easeIn'  as const;
const EASE_OUT = 'easeOut' as const;

const faceExitVariants = {
  exit: { scaleX: 0, opacity: 0, transition: { duration: 0.18, ease: EASE_IN } },
};
const faceEnterVariants = {
  initial: { scaleX: 0, opacity: 0 },
  animate: { scaleX: 1, opacity: 1, transition: { duration: 0.18, ease: EASE_OUT } },
};

export function PastCard({ entry }: PastCardProps) {
  const [flipped, setFlipped] = useState(false);
  // Only show the flip affordance when there is actually a consequence to read.
  const hasConsequence = Boolean(entry.choiceLabel || entry.consequenceText);

  function toggle() {
    if (!hasConsequence) return;
    setFlipped((f) => !f);
  }

  return (
    <div
      role={hasConsequence ? 'button' : undefined}
      tabIndex={hasConsequence ? 0 : undefined}
      aria-label={flipped ? 'Flip to event' : 'Flip to see consequence'}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      }}
      className="flex flex-col rounded-2xl overflow-hidden border border-[#3a3028] bg-[#1a1714] shadow-[0_8px_40px_rgba(0,0,0,0.7)]"
      style={{
        padding: 16,
        width: '88vw',
        maxWidth: 420,
        height: '72vh',
        maxHeight: 640,
        cursor: hasConsequence ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      <AnimatePresence mode="wait">
        {!flipped ? (
          <motion.div
            key="front"
            className="flex-1 flex flex-col min-h-0"
            style={{ filter: 'saturate(0.4)', opacity: 0.6 }}
            variants={faceExitVariants}
            exit="exit"
          >
            {/* Event image — top 45% */}
            <div className="shrink-0 overflow-hidden" style={{ height: '45%' }}>
              <ImageWithShimmer src={entry.eventImage} alt="" className="w-full h-full" />
            </div>

            {/* Event text */}
            <div className="flex flex-col flex-1 min-h-0 px-5 pt-4 pb-4">
              <div className="flex-1 overflow-y-auto min-h-0 scrollbar-none">
                <p className="text-[#e8e0d0] font-serif text-[1.05rem] leading-[1.75]">
                  {entry.eventText}
                </p>
              </div>

              {hasConsequence && (
                <p className="shrink-0 text-[#5c4a2a] font-serif text-xs italic mt-3 text-right select-none">
                  tap to see what happened →
                </p>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="back"
            className="flex-1 flex flex-col min-h-0"
            initial={faceEnterVariants.initial}
            animate={faceEnterVariants.animate}
          >
            {/* Consequence image — top 45% */}
            <div className="shrink-0 overflow-hidden" style={{ height: '45%' }}>
              <ImageWithShimmer
                src={entry.consequenceImage ?? ''}
                alt=""
                className="w-full h-full"
              />
            </div>

            {/* Consequence text */}
            <div className="flex flex-col flex-1 min-h-0 px-5 pt-4 pb-4">
              {entry.choiceLabel && (
                <p className="shrink-0 text-[#7a6a4f] font-serif text-xs italic mb-3 select-none">
                  You chose: {entry.choiceLabel}
                </p>
              )}

              <div className="flex-1 overflow-y-auto min-h-0 scrollbar-none mb-3">
                <p className="text-[#e8e0d0] font-serif text-[1.05rem] leading-[1.75] italic">
                  {entry.consequenceText}
                </p>
              </div>

              <p className="shrink-0 text-[#5c4a2a] font-serif text-xs italic text-right select-none">
                ← tap to go back
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
