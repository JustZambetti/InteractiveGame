import { useCallback, useEffect } from 'react';
import type { Story } from '../types/story';
import { isChoiceEvent, isNarrativeEvent, isEndingEvent } from '../types/story';
import { useGameStore } from '../store/gameStore';
import { useSavesStore } from '../store/savesStore';
import { resolveOutcome, resolveOutcomeChanges } from '../engine/graphTraverser';
import { applyStateChanges, buildInitialState } from '../engine/stateManager';
import { preloadImages } from '../engine/imagePreloader';

// ---------------------------------------------------------------------------
// Preload all images reachable from the current event
// ---------------------------------------------------------------------------

function preloadAhead(story: Story, eventId: string) {
  const event = story.events[eventId];
  if (!event) return;

  if (isChoiceEvent(event)) {
    const urls: string[] = [];
    for (const choice of event.choices) {
      for (const outcome of choice.outcomes) {
        if (outcome.consequence.image) urls.push(outcome.consequence.image);
        const next = story.events[outcome.nextEventId];
        if (next?.image) urls.push(next.image);
      }
    }
    preloadImages(urls);
  } else if (isNarrativeEvent(event)) {
    const next = story.events[event.nextEventId];
    if (next?.image) preloadImages([next.image]);
  }
}

// ---------------------------------------------------------------------------
// Auto-save helper
// ---------------------------------------------------------------------------

function triggerAutoSave(
  story: Story,
  saves: ReturnType<typeof useSavesStore.getState>,
  game: ReturnType<typeof useGameStore.getState>
) {
  if (game.activeSaveSlot === null) return;
  const currentEvent = story.events[game.currentEventId];
  const lastEventText = currentEvent ? currentEvent.text.slice(0, 60) : '';
  saves.saveToSlot(game.activeSaveSlot, {
    currentEventId: game.currentEventId,
    storyState: game.storyState,
    history: game.history,
    choicePath: game.choicePath,
    lastEventText,
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useStoryEngine(story: Story) {
  const game = useGameStore();
  const saves = useSavesStore();

  const currentEvent = story.events[game.currentEventId] ?? null;

  // Preload on mount and whenever the current event changes
  useEffect(() => {
    if (game.currentEventId) {
      preloadAhead(story, game.currentEventId);
    }
  }, [story, game.currentEventId]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // selectChoice — called when the player taps a choice button.
  // Resolves the outcome (by evaluating conditions against current state),
  // stores it as pendingOutcome, and kicks off the card flip animation.
  // State changes are NOT applied here — they wait until confirmConsequence
  // so the consequence is visible to the player before the state mutates.
  // -------------------------------------------------------------------------
  const selectChoice = useCallback((choiceId: string) => {
    if (!currentEvent || !isChoiceEvent(currentEvent)) return;

    const choice = currentEvent.choices.find((c) => c.id === choiceId);
    if (!choice) return;

    const outcome = resolveOutcome(currentEvent, choiceId, game.storyState);
    if (!outcome) return;

    // Preload consequence image immediately so it's ready when card flips
    if (outcome.consequenceImage) preloadImages([outcome.consequenceImage]);

    game.setCardPhase('flipping');
    game.setPendingOutcome({
      choiceId,
      choiceLabel: choice.label,
      consequenceText: outcome.consequenceText,
      consequenceImage: outcome.consequenceImage,
      nextEventId: outcome.nextEventId,
    });
  }, [currentEvent, game]);

  // -------------------------------------------------------------------------
  // confirmConsequence — called when the player taps Continue on the back face.
  // Applies state changes, records history, advances to next event, auto-saves.
  // -------------------------------------------------------------------------
  const confirmConsequence = useCallback(() => {
    if (!currentEvent || !isChoiceEvent(currentEvent) || !game.pendingOutcome) return;

    const { choiceId, choiceLabel, consequenceText, consequenceImage, nextEventId } = game.pendingOutcome;

    const changes = resolveOutcomeChanges(currentEvent, choiceId, game.storyState);
    const newState = applyStateChanges(game.storyState, changes, story.initialState);

    const entry = {
      eventId: currentEvent.id,
      eventImage: currentEvent.image,
      eventText: currentEvent.text,
      choiceId,
      choiceLabel,
      consequenceText,
      consequenceImage,
    };

    game.confirmConsequence(nextEventId, entry, newState, choiceId);

    const freshGame = useGameStore.getState();
    triggerAutoSave(story, saves, freshGame);
  }, [currentEvent, game, story, saves]);

  // -------------------------------------------------------------------------
  // continueNarrative — called when the player taps Continue on a narrative event.
  // -------------------------------------------------------------------------
  const continueNarrative = useCallback(() => {
    if (!currentEvent || !isNarrativeEvent(currentEvent)) return;

    const entry = {
      eventId: currentEvent.id,
      eventImage: currentEvent.image,
      eventText: currentEvent.text,
    };

    game.continueNarrative(currentEvent.nextEventId, entry);

    const freshGame = useGameStore.getState();
    triggerAutoSave(story, saves, freshGame);
  }, [currentEvent, game, story, saves]);

  // -------------------------------------------------------------------------
  // startNewGame — initialise a fresh run on a given save slot
  // -------------------------------------------------------------------------
  const startNewGame = useCallback((slotId: 1 | 2 | 3) => {
    const initialState = buildInitialState(story.initialState);
    game.startGame(story.meta.startEventId, initialState, slotId);
  }, [story, game]);

  // -------------------------------------------------------------------------
  // loadSave — resume from a save slot
  // -------------------------------------------------------------------------
  const loadSave = useCallback((slotId: 1 | 2 | 3) => {
    const slot = saves.slots.find((s) => s.slotId === slotId);
    if (!slot || slot.isEmpty) return;
    game.loadFromSave(slot);
  }, [saves, game]);

  return {
    currentEvent,
    cardPhase: game.cardPhase,
    pendingOutcome: game.pendingOutcome,
    history: game.history,
    storyState: game.storyState,
    isEnding: currentEvent ? isEndingEvent(currentEvent) : false,
    isNarrative: currentEvent ? isNarrativeEvent(currentEvent) : false,
    isChoice: currentEvent ? isChoiceEvent(currentEvent) : false,
    selectChoice,
    confirmConsequence,
    continueNarrative,
    startNewGame,
    loadSave,
  };
}
