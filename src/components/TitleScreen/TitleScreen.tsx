import { motion } from 'framer-motion';
import type { Story } from '../../types/story';
import { useSavesStore } from '../../store/savesStore';
import { SaveSlotCard } from './SaveSlotCard';

interface TitleScreenProps {
  story: Story;
  onNewGame: (slotId: 1 | 2 | 3) => void;
  onResume: (slotId: 1 | 2 | 3) => void;
}

export function TitleScreen({ story, onNewGame, onResume }: TitleScreenProps) {
  const { slots, deleteSlot } = useSavesStore();

  return (
    <div className="min-h-dvh flex flex-col bg-[#0f0e0d] overflow-y-auto">
      {/* Cover image */}
      <motion.div
        className="relative w-full shrink-0 overflow-hidden"
        style={{ height: '38vh', minHeight: 200 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {story.meta.coverImage ? (
          <img
            src={story.meta.coverImage}
            alt={story.meta.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-[#1a1714]" />
        )}
        {/* Bottom vignette */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#0f0e0d] to-transparent pointer-events-none" />
      </motion.div>

      {/* Title */}
      <motion.div
        className="px-6 -mt-8 mb-8 text-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <h1 className="text-[#d4b87a] font-serif text-3xl tracking-wide">
          {story.meta.title}
        </h1>
        {story.meta.author && (
          <p className="text-[#5c4a2a] font-serif text-sm italic mt-1">
            by {story.meta.author}
          </p>
        )}
      </motion.div>

      {/* Save slots */}
      <motion.div
        className="flex flex-col gap-4 px-6 pb-10"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.28 }}
      >
        {slots.map((slot) => (
          <SaveSlotCard
            key={slot.slotId}
            slot={slot}
            onNewGame={() => onNewGame(slot.slotId)}
            onResume={() => onResume(slot.slotId)}
            onDelete={() => deleteSlot(slot.slotId)}
          />
        ))}
      </motion.div>
    </div>
  );
}
