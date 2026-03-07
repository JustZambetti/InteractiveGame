import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildInitialState, applyStateChanges } from './stateManager';
import type { InitialState, StoryState } from '../types/story';

const initialState: InitialState = {
  suspicion: { value: 0,  min: 0,   max: 100  },
  trust:     { value: 50, min: 0,   max: 100  },
  gold:      { value: 20, min: 0,   max: null },
  hasKey:    { value: false },
  phase:     { value: 'intro' },
};

describe('buildInitialState', () => {
  it('extracts value from each state var definition', () => {
    const state = buildInitialState(initialState);
    expect(state).toEqual({
      suspicion: 0,
      trust: 50,
      gold: 20,
      hasKey: false,
      phase: 'intro',
    });
  });

  it('does not mutate the initial state definition', () => {
    const copy = JSON.parse(JSON.stringify(initialState));
    buildInitialState(initialState);
    expect(initialState).toEqual(copy);
  });
});

describe('applyStateChanges', () => {
  let state: StoryState;

  beforeEach(() => {
    state = buildInitialState(initialState);
  });

  it('adds a positive numeric delta', () => {
    const next = applyStateChanges(state, { suspicion: 20 }, initialState);
    expect(next.suspicion).toBe(20);
  });

  it('subtracts a negative numeric delta', () => {
    const next = applyStateChanges(state, { trust: -10 }, initialState);
    expect(next.trust).toBe(40);
  });

  it('clamps numeric result to max', () => {
    const next = applyStateChanges(state, { trust: 200 }, initialState);
    expect(next.trust).toBe(100);
  });

  it('clamps numeric result to min', () => {
    const next = applyStateChanges(state, { trust: -200 }, initialState);
    expect(next.trust).toBe(0);
  });

  it('does not clamp when max is null (uncapped)', () => {
    const next = applyStateChanges(state, { gold: 9999 }, initialState);
    expect(next.gold).toBe(20 + 9999);
  });

  it('still applies min clamp when max is null', () => {
    const next = applyStateChanges(state, { gold: -9999 }, initialState);
    expect(next.gold).toBe(0);
  });

  it('directly sets a boolean', () => {
    const next = applyStateChanges(state, { hasKey: true }, initialState);
    expect(next.hasKey).toBe(true);
  });

  it('directly sets a string', () => {
    const next = applyStateChanges(state, { phase: 'endgame' }, initialState);
    expect(next.phase).toBe('endgame');
  });

  it('applies multiple changes at once', () => {
    const next = applyStateChanges(
      state,
      { suspicion: 30, gold: -5, hasKey: true },
      initialState
    );
    expect(next.suspicion).toBe(30);
    expect(next.gold).toBe(15);
    expect(next.hasKey).toBe(true);
    expect(next.trust).toBe(50); // unchanged
  });

  it('does not mutate the original state', () => {
    const original = { ...state };
    applyStateChanges(state, { suspicion: 50 }, initialState);
    expect(state).toEqual(original);
  });

  it('warns and skips unknown keys', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const next = applyStateChanges(state, { unknown: 10 }, initialState);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknown'));
    expect(next).not.toHaveProperty('unknown');
    warn.mockRestore();
  });
});
