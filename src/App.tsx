import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Story } from './types/story';
import storyData from '../public/story.json';
import { useGameStore } from './store/gameStore';
import { useSavesStore } from './store/savesStore';
import { TitleScreen } from './components/TitleScreen/TitleScreen';
import { GameScreen } from './components/GameScreen';

const story = storyData as unknown as Story;

type Screen = 'title' | 'game';

export default function App() {
  const currentEventId = useGameStore((s) => s.currentEventId);
  const resetGame = useGameStore((s) => s.resetGame);
  const loadFromSave = useGameStore((s) => s.loadFromSave);
  const { slots } = useSavesStore();

  // Start on the game screen if a session was already in progress.
  const [screen, setScreen] = useState<Screen>(() =>
    currentEventId ? 'game' : 'title'
  );
  // Tracks which slot to initialise when starting a fresh game.
  const [newGameSlotId, setNewGameSlotId] = useState<1 | 2 | 3 | null>(null);

  function handleNewGame(slotId: 1 | 2 | 3) {
    setNewGameSlotId(slotId);
    setScreen('game');
  }

  function handleResume(slotId: 1 | 2 | 3) {
    const slot = slots.find((s) => s.slotId === slotId);
    if (slot && !slot.isEmpty) {
      loadFromSave(slot);
    }
    setNewGameSlotId(null);
    setScreen('game');
  }

  function handleReturnToTitle() {
    resetGame();
    setNewGameSlotId(null);
    setScreen('title');
  }

  return (
    <AnimatePresence mode="wait">
      {screen === 'title' ? (
        <motion.div
          key="title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <TitleScreen
            story={story}
            onNewGame={handleNewGame}
            onResume={handleResume}
          />
        </motion.div>
      ) : (
        <motion.div
          key="game"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <GameScreen
            story={story}
            newGameSlotId={newGameSlotId}
            onReturnToTitle={handleReturnToTitle}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
