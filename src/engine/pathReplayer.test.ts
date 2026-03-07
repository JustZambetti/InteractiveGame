import { describe, it, expect } from 'vitest';
import { replayPath } from './pathReplayer';
import type { Story } from '../types/story';

// Minimal story for replay testing
const story: Story = {
  meta: {
    id: 'test',
    title: 'Test Story',
    version: '1.0',
    startEventId: 'start',
  },
  initialState: {
    trust: { value: 50, min: 0, max: 100 },
    gold:  { value: 10, min: 0, max: null },
  },
  events: {
    start: {
      id: 'start',
      image: 'start.jpg',
      text: 'Beginning',
      choices: [
        {
          id: 'choice_a',
          label: 'Option A',
          outcomes: [
            {
              condition: { '>': ['$trust', 60] },
              consequence: { text: 'High trust path', image: 'a_high.jpg', stateChanges: { gold: 5 } },
              nextEventId: 'event_rich',
            },
            {
              condition: null,
              consequence: { text: 'Low trust path', image: 'a_low.jpg', stateChanges: { gold: -5 } },
              nextEventId: 'event_poor',
            },
          ],
        },
        {
          id: 'choice_b',
          label: 'Option B',
          outcomes: [
            {
              condition: null,
              consequence: { text: 'B consequence', image: 'b.jpg', stateChanges: { trust: 20 } },
              nextEventId: 'event_middle',
            },
          ],
        },
      ],
    },

    event_middle: {
      id: 'event_middle',
      image: 'middle.jpg',
      text: 'Middle narrative',
      nextEventId: 'event_rich',
    },

    event_rich: {
      id: 'event_rich',
      image: 'rich.jpg',
      text: 'You prospered.',
      choices: [
        {
          id: 'choice_final',
          label: 'Finish',
          outcomes: [
            {
              condition: null,
              consequence: { text: 'The end.', image: 'end.jpg' },
              nextEventId: 'ending',
            },
          ],
        },
        {
          id: 'choice_linger',
          label: 'Linger',
          outcomes: [
            {
              condition: null,
              consequence: { text: 'You stay awhile.', image: 'linger.jpg' },
              nextEventId: 'ending',
            },
          ],
        },
      ],
    },

    event_poor: {
      id: 'event_poor',
      image: 'poor.jpg',
      text: 'You are destitute.',
      endingTitle: 'The Poor Ending',
    },

    ending: {
      id: 'ending',
      image: 'ending.jpg',
      text: 'All is done.',
      endingTitle: 'Victory',
    },
  },
};

describe('replayPath', () => {
  it('returns start event when path is empty', () => {
    const result = replayPath(story, []);
    expect(result.ok).toBe(true);
    expect(result.currentEventId).toBe('start');
    expect(result.history).toHaveLength(0);
    expect(result.storyState).toEqual({ trust: 50, gold: 10 });
  });

  it('replays a single choice and advances state', () => {
    const result = replayPath(story, ['choice_b']);
    expect(result.ok).toBe(true);
    // choice_b → trust +20 → event_middle (narrative, auto-traversed) → event_rich
    expect(result.currentEventId).toBe('event_rich');
    expect(result.storyState.trust).toBe(70);
    // history: start (choice event) + event_middle (narrative event)
    expect(result.history).toHaveLength(2);
  });

  it('auto-traverses narrative events without consuming from choicePath', () => {
    const result = replayPath(story, ['choice_b']);
    // event_middle is a narrative event — it should appear in history but not need a choice
    const narrativeEntry = result.history.find((e) => e.eventId === 'event_middle');
    expect(narrativeEntry).toBeDefined();
    expect(narrativeEntry!.choiceId).toBeUndefined();
  });

  it('applies state-dependent outcome branching correctly', () => {
    // choice_a with default trust=50 (not > 60) → low trust path → event_poor (ending)
    const result = replayPath(story, ['choice_a']);
    expect(result.ok).toBe(true);
    expect(result.currentEventId).toBe('event_poor');
    expect(result.storyState.gold).toBe(5); // 10 - 5
  });

  it('replays a full two-choice path', () => {
    // choice_b → event_middle (auto) → event_rich → choice_final → ending
    const result = replayPath(story, ['choice_b', 'choice_final']);
    expect(result.ok).toBe(true);
    expect(result.currentEventId).toBe('ending');
    expect(result.storyState.trust).toBe(70);
  });

  it('stops at ending events (terminal nodes)', () => {
    // choice_a (gold -5, trust stays 50 so low trust branch) → event_poor (ending)
    const result = replayPath(story, ['choice_a', 'should_not_be_consumed']);
    expect(result.ok).toBe(true);
    expect(result.currentEventId).toBe('event_poor');
  });

  it('builds history correctly for choice events', () => {
    const result = replayPath(story, ['choice_b']);
    const choiceEntry = result.history.find((e) => e.eventId === 'start');
    expect(choiceEntry).toBeDefined();
    expect(choiceEntry!.choiceId).toBe('choice_b');
    expect(choiceEntry!.choiceLabel).toBe('Option B');
    expect(choiceEntry!.consequenceText).toBe('B consequence');
  });

  it('returns ok: false for an unknown event ID in story', () => {
    const badStory: Story = {
      ...story,
      meta: { ...story.meta, startEventId: 'nonexistent' },
    };
    const result = replayPath(badStory, []);
    expect(result.ok).toBe(false);
  });

  it('returns ok: false for an invalid choice ID in path', () => {
    const result = replayPath(story, ['choice_invalid']);
    expect(result.ok).toBe(false);
  });
});
