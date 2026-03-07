import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Story } from '../types/story';
import { isEndingEvent } from '../types/story';
import { useStoryEngine } from '../hooks/useStoryEngine';
import { useGameStore } from '../store/gameStore';
import { EventCard } from './EventCard/EventCard';
import { Carousel } from './Carousel/Carousel';

interface GameScreenProps {
  story: Story;
  /** Set when starting a fresh game on a specific slot. Null when resuming. */
  newGameSlotId: 1 | 2 | 3 | null;
  onReturnToTitle: () => void;
}

const EASE_IN = 'easeIn' as const;
const EASE_OUT = 'easeOut' as const;

const cardAdvanceVariants = {
  initial: { x: 80, opacity: 0, scale: 0.95 },
  animate: {
    x: 0, opacity: 1, scale: 1,
    transition: { duration: 0.32, ease: EASE_OUT },
  },
  exit: {
    x: -60, opacity: 0, scale: 0.9,
    transition: { duration: 0.22, ease: EASE_IN },
  },
};

export function GameScreen({ story, newGameSlotId, onReturnToTitle }: GameScreenProps) {
  const engine = useStoryEngine(story);
  const setCardPhase = useGameStore((s) => s.setCardPhase);

  // Start a fresh game when a new slot is provided (fires only on mount).
  useEffect(() => {
    if (newGameSlotId !== null) {
      engine.startNewGame(newGameSlotId);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!engine.currentEvent) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <p className="text-[#4a3f30] font-serif italic">Loading…</p>
      </div>
    );
  }

  // ── Ending screen ──────────────────────────────────────────────────────────
  if (isEndingEvent(engine.currentEvent)) {
    const ending = engine.currentEvent;
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-8 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
          className="flex flex-col items-center gap-6 text-center"
          style={{ width: '88vw', maxWidth: 420 }}
        >
          <div
            className="w-full overflow-hidden rounded-xl border border-[#5c4a2a]"
            style={{ height: 260 }}
          >
            <img
              src={ending.image}
              alt={ending.endingTitle}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="w-12 h-px bg-[#5c4a2a]" />

          <h2 className="text-[#d4b87a] font-serif text-2xl tracking-wide">
            {ending.endingTitle}
          </h2>

          <p className="text-[#c8b896] font-serif text-base leading-[1.8] italic">
            {ending.text}
          </p>

          <div className="flex flex-col gap-3 w-full pt-2">
            <button
              onClick={onReturnToTitle}
              className="
                w-full min-h-[52px] font-serif text-sm text-[#c8b896]
                bg-[#251e15] border border-[#5c4a2a] rounded-lg
                hover:bg-[#2e2419] hover:border-[#7a6035]
                active:scale-[0.98] transition-all duration-150
              "
            >
              Play Again
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Game screen with carousel ──────────────────────────────────────────────
  return (
    <div className="relative min-h-dvh flex flex-col justify-center overflow-hidden">
      {/* Menu button — returns to title screen */}
      <button
        onClick={onReturnToTitle}
        aria-label="Return to title"
        className="
          absolute top-4 right-4 z-20
          w-10 h-10 flex items-center justify-center
          text-[#5c4a2a] hover:text-[#a07820]
          transition-colors duration-150
        "
      >
        <svg width="20" height="14" viewBox="0 0 20 14" fill="none" aria-hidden="true">
          <rect y="0"  width="20" height="2" rx="1" fill="currentColor" />
          <rect y="6"  width="14" height="2" rx="1" fill="currentColor" />
          <rect y="12" width="20" height="2" rx="1" fill="currentColor" />
        </svg>
      </button>

      <Carousel history={engine.history}>
        <AnimatePresence mode="wait">
          <motion.div
            key={engine.currentEvent.id}
            variants={cardAdvanceVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <EventCard
              event={engine.currentEvent}
              cardPhase={engine.cardPhase}
              pendingOutcome={engine.pendingOutcome}
              onSelectChoice={engine.selectChoice}
              onConfirmConsequence={engine.confirmConsequence}
              onContinueNarrative={engine.continueNarrative}
              onSetCardPhase={setCardPhase}
            />
          </motion.div>
        </AnimatePresence>
      </Carousel>
    </div>
  );
}
