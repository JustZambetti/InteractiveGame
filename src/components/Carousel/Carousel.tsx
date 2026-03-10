import { useRef, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { HistoryEntry } from '../../types/story';
import { PastCard } from './PastCard';
import { GoToCurrentButton } from '../UI/GoToCurrentButton';

interface CarouselProps {
  history: HistoryEntry[];
  /** The active EventCard (wrapped in its AnimatePresence) — provided by GameScreen. */
  children: ReactNode;
}

// Half the space on each side of a card so it snaps to the center of the viewport.
// Matches EventCard dimensions: 88vw capped at 420px.
const SIDE_PAD = 'calc((100vw - min(88vw, 420px)) / 2)';

export function Carousel({ history, children }: CarouselProps) {
  const scrollRef     = useRef<HTMLDivElement>(null);
  const currentSlotRef = useRef<HTMLDivElement>(null);
  const [showGoToCurrent, setShowGoToCurrent] = useState(false);

  // On first render: jump to the end instantly so the active card is always
  // in view even when resuming a save with many past cards.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, []);

  // When a new history entry is added: smooth-scroll to reveal the new active card.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || history.length === 0) return;
    const timer = setTimeout(() => {
      el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
    }, 80);
    return () => clearTimeout(timer);
  }, [history.length]);

  // Show the "go to current" floating button whenever the active card slot is
  // not visible in the scroll container.
  useEffect(() => {
    const slot = currentSlotRef.current;
    if (!slot) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowGoToCurrent(!entry.isIntersecting),
      { threshold: 0.8 },
    );
    observer.observe(slot);
    return () => observer.disconnect();
  }, []);

  function scrollToCurrent() {
    scrollRef.current?.scrollTo({ left: scrollRef.current.scrollWidth, behavior: 'smooth' });
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        role="region"
        aria-label="Story history"
        className="w-screen overflow-x-auto scrollbar-none"
        style={{ WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory' }}
      >
        {/* Inner flex row — sized to its content. */}
        <div className="flex items-center gap-6 py-6" style={{ width: 'max-content' }}>

          {/* Leading spacer: centers the first card in the viewport. */}
          <div aria-hidden="true" style={{ flexShrink: 0, width: SIDE_PAD }} />

          {/* Past cards — AnimatePresence initial={false} prevents the entire
              history from animating in when loading from a save. Only newly
              appended entries animate. */}
          <AnimatePresence initial={false}>
            {history.map((entry, i) => (
              <motion.div
                key={`${entry.eventId}-${i}`}
                initial={{ opacity: 0, x: 24, scale: 0.92 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="shrink-0"
                style={{ scrollSnapAlign: 'center' }}
              >
                <PastCard entry={entry} />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Active card slot — children is the AnimatePresence + EventCard from GameScreen. */}
          <div
            ref={currentSlotRef}
            className="shrink-0"
            style={{ scrollSnapAlign: 'center' }}
          >
            {children}
          </div>

          {/* Trailing spacer: allows the last card to snap to center. */}
          <div aria-hidden="true" style={{ flexShrink: 0, width: SIDE_PAD }} />
        </div>
      </div>

      {/* Floating button — only when there are past cards and user scrolled away. */}
      <AnimatePresence>
        {showGoToCurrent && history.length > 0 && (
          <GoToCurrentButton onClick={scrollToCurrent} />
        )}
      </AnimatePresence>
    </div>
  );
}
