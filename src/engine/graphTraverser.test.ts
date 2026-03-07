import { describe, it, expect, vi } from 'vitest';
import { resolveOutcome, resolveOutcomeChanges } from './graphTraverser';
import type { ChoiceEvent, StoryState } from '../types/story';

const event: ChoiceEvent = {
  id: 'event_test',
  image: 'img.jpg',
  text: 'Test event',
  choices: [
    {
      id: 'choice_brave',
      label: 'Be brave',
      outcomes: [
        {
          condition: { '>': ['$suspicion', 50] },
          consequence: {
            text: 'High suspicion consequence',
            image: 'high.jpg',
            stateChanges: { trust: -20 },
          },
          nextEventId: 'event_ambush',
        },
        {
          condition: null,
          consequence: {
            text: 'Default consequence',
            image: 'default.jpg',
            stateChanges: { trust: 10 },
          },
          nextEventId: 'event_success',
        },
      ],
    },
    {
      id: 'choice_flee',
      label: 'Flee',
      outcomes: [
        {
          condition: null,
          consequence: {
            text: 'You run away.',
            image: 'flee.jpg',
          },
          nextEventId: 'event_forest',
        },
      ],
    },
  ],
};

describe('resolveOutcome', () => {
  it('returns first matching outcome when condition is true', () => {
    const state: StoryState = { suspicion: 60, trust: 50 };
    const result = resolveOutcome(event, 'choice_brave', state);
    expect(result).not.toBeNull();
    expect(result!.consequenceText).toBe('High suspicion consequence');
    expect(result!.nextEventId).toBe('event_ambush');
  });

  it('falls through to null-condition fallback when first condition fails', () => {
    const state: StoryState = { suspicion: 30, trust: 50 };
    const result = resolveOutcome(event, 'choice_brave', state);
    expect(result).not.toBeNull();
    expect(result!.consequenceText).toBe('Default consequence');
    expect(result!.nextEventId).toBe('event_success');
  });

  it('resolves a choice with a single null-condition outcome', () => {
    const state: StoryState = { suspicion: 0, trust: 50 };
    const result = resolveOutcome(event, 'choice_flee', state);
    expect(result).not.toBeNull();
    expect(result!.nextEventId).toBe('event_forest');
  });

  it('returns null and warns for unknown choice ID', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const state: StoryState = { suspicion: 0 };
    const result = resolveOutcome(event, 'choice_nonexistent', state);
    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('choice_nonexistent'));
    warn.mockRestore();
  });

  it('returns null and warns when no outcome matches', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Construct an event with no fallback null condition
    const badEvent = {
      ...event,
      choices: [{
        id: 'choice_bad',
        label: 'Bad',
        outcomes: [{
          condition: { '>': ['$suspicion', 99] } as const,
          consequence: { text: 'Unreachable', image: 'x.jpg' },
          nextEventId: 'somewhere',
        }],
      }],
    } as unknown as ChoiceEvent;
    const result = resolveOutcome(badEvent, 'choice_bad', { suspicion: 0 });
    expect(result).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('resolveOutcomeChanges', () => {
  it('returns stateChanges from the matching outcome', () => {
    const state: StoryState = { suspicion: 60, trust: 50 };
    const changes = resolveOutcomeChanges(event, 'choice_brave', state);
    expect(changes).toEqual({ trust: -20 });
  });

  it('returns empty object when outcome has no stateChanges', () => {
    const state: StoryState = { suspicion: 0 };
    const changes = resolveOutcomeChanges(event, 'choice_flee', state);
    expect(changes).toEqual({});
  });

  it('returns empty object for unknown choice ID', () => {
    const changes = resolveOutcomeChanges(event, 'choice_unknown', {});
    expect(changes).toEqual({});
  });
});
