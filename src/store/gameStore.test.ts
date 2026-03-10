/**
 * gameStore action tests.
 *
 * The store uses Zustand's `persist` middleware backed by the localStorage shim
 * in setupTests.ts. Each test resets to a blank state via `resetGame()` so
 * tests are fully independent of each other.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from './gameStore';
import type { HistoryEntry } from '../types/story';

const INITIAL_STATE = { trust: 50, gold: 20 };

const SLOT = 1 as const;

const SAMPLE_ENTRY: HistoryEntry = {
  eventId:   'city_gates',
  eventImage: '',
  eventText:  'The gates loom before you.',
  choiceId:   'choice_wait',
  choiceLabel: 'Wait',
  consequenceText: 'You waited.',
  consequenceImage: '',
};

beforeEach(() => {
  useGameStore.getState().resetGame();
});

describe('startGame', () => {
  it('sets all fields from arguments', () => {
    useGameStore.getState().startGame('intro', INITIAL_STATE, SLOT);
    const s = useGameStore.getState();
    expect(s.currentEventId).toBe('intro');
    expect(s.storyState).toEqual(INITIAL_STATE);
    expect(s.activeSaveSlot).toBe(SLOT);
    expect(s.cardPhase).toBe('front');
    expect(s.history).toEqual([]);
    expect(s.choicePath).toEqual([]);
    expect(s.pendingOutcome).toBeNull();
  });

  it('accepts null slotId (replay mode)', () => {
    useGameStore.getState().startGame('intro', INITIAL_STATE, null);
    expect(useGameStore.getState().activeSaveSlot).toBeNull();
    expect(useGameStore.getState().currentEventId).toBe('intro');
  });
});

describe('setCardPhase', () => {
  it('updates cardPhase', () => {
    useGameStore.getState().startGame('intro', INITIAL_STATE, SLOT);
    useGameStore.getState().setCardPhase('flipping');
    expect(useGameStore.getState().cardPhase).toBe('flipping');
  });
});

describe('confirmConsequence', () => {
  it('advances event, appends history, appends choicePath', () => {
    useGameStore.getState().startGame('city_gates', INITIAL_STATE, SLOT);

    useGameStore.getState().confirmConsequence(
      'market_square',
      SAMPLE_ENTRY,
      { trust: 55, gold: 20 },
      'choice_wait',
    );

    const s = useGameStore.getState();
    expect(s.currentEventId).toBe('market_square');
    expect(s.storyState).toEqual({ trust: 55, gold: 20 });
    expect(s.cardPhase).toBe('front');
    expect(s.pendingOutcome).toBeNull();
    expect(s.history).toHaveLength(1);
    expect(s.history[0]).toEqual(SAMPLE_ENTRY);
    expect(s.choicePath).toEqual(['choice_wait']);
  });

  it('accumulates multiple entries in order', () => {
    useGameStore.getState().startGame('a', INITIAL_STATE, SLOT);
    useGameStore.getState().confirmConsequence('b', { ...SAMPLE_ENTRY, eventId: 'a' }, INITIAL_STATE, 'c1');
    useGameStore.getState().confirmConsequence('c', { ...SAMPLE_ENTRY, eventId: 'b' }, INITIAL_STATE, 'c2');
    const s = useGameStore.getState();
    expect(s.choicePath).toEqual(['c1', 'c2']);
    expect(s.history).toHaveLength(2);
  });
});

describe('continueNarrative', () => {
  it('advances event and appends history without touching choicePath', () => {
    useGameStore.getState().startGame('intro', INITIAL_STATE, SLOT);
    const narrativeEntry: HistoryEntry = {
      eventId: 'intro', eventImage: '', eventText: 'Narr.',
    };
    useGameStore.getState().continueNarrative('city_gates', narrativeEntry);

    const s = useGameStore.getState();
    expect(s.currentEventId).toBe('city_gates');
    expect(s.history).toHaveLength(1);
    expect(s.choicePath).toHaveLength(0); // no choice was made
    expect(s.cardPhase).toBe('front');
  });
});

describe('loadFromSave', () => {
  it('restores all save slot fields', () => {
    const savedAt = new Date().toISOString();
    useGameStore.getState().loadFromSave({
      slotId: 2,
      isEmpty: false,
      savedAt,
      eventCount: 3,
      lastEventText: 'last text',
      currentEventId: 'confrontation',
      storyState: { trust: 70, gold: 5 },
      history: [SAMPLE_ENTRY],
      choicePath: ['choice_wait'],
    });

    const s = useGameStore.getState();
    expect(s.currentEventId).toBe('confrontation');
    expect(s.storyState).toEqual({ trust: 70, gold: 5 });
    expect(s.history).toHaveLength(1);
    expect(s.choicePath).toEqual(['choice_wait']);
    expect(s.activeSaveSlot).toBe(2);
    expect(s.cardPhase).toBe('front');
    expect(s.pendingOutcome).toBeNull();
  });
});

describe('loadGameState', () => {
  it('sets game state fields without touching activeSaveSlot', () => {
    useGameStore.getState().startGame('intro', INITIAL_STATE, SLOT);
    useGameStore.getState().loadGameState({
      currentEventId: 'confrontation',
      storyState: { trust: 80, gold: 0 },
      history: [SAMPLE_ENTRY],
      choicePath: ['c1', 'c2'],
    });

    const s = useGameStore.getState();
    expect(s.currentEventId).toBe('confrontation');
    expect(s.storyState).toEqual({ trust: 80, gold: 0 });
    expect(s.choicePath).toEqual(['c1', 'c2']);
    expect(s.cardPhase).toBe('front');
    expect(s.pendingOutcome).toBeNull();
    // activeSaveSlot is unaffected by loadGameState
    expect(s.activeSaveSlot).toBe(SLOT);
  });
});

describe('setActiveSaveSlot', () => {
  it('changes the slot without touching other state', () => {
    useGameStore.getState().startGame('intro', INITIAL_STATE, 1);
    useGameStore.getState().setActiveSaveSlot(3);
    const s = useGameStore.getState();
    expect(s.activeSaveSlot).toBe(3);
    expect(s.currentEventId).toBe('intro'); // unchanged
  });
});

describe('resetGame', () => {
  it('clears all runtime state', () => {
    useGameStore.getState().startGame('intro', INITIAL_STATE, SLOT);
    useGameStore.getState().confirmConsequence('next', SAMPLE_ENTRY, INITIAL_STATE, 'c1');
    useGameStore.getState().resetGame();

    const s = useGameStore.getState();
    expect(s.currentEventId).toBe('');
    expect(s.storyState).toEqual({});
    expect(s.history).toEqual([]);
    expect(s.choicePath).toEqual([]);
    expect(s.activeSaveSlot).toBeNull();
    expect(s.pendingOutcome).toBeNull();
  });
});
