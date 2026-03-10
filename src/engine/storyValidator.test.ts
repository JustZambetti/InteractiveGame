import { describe, it, expect } from 'vitest';
import type { Story } from '../types/story';
import { validateStory } from './storyValidator';
import storyData from '../../public/story.json';

const liveStory = storyData as unknown as Story;

// ── Minimal story fixture helpers ──────────────────────────────────────────

function baseStory(overrides: Partial<Story> = {}): Story {
  return {
    meta: {
      id:           'test',
      title:        'Test Story',
      version:      '1.0',
      startEventId: 'start',
    },
    initialState: {
      trust: { value: 50, min: 0, max: 100 },
    },
    events: {
      start: {
        id: 'start',
        image: '',
        text: 'Begin.',
        choices: [
          {
            id: 'c1',
            label: 'Go',
            outcomes: [
              {
                condition: null,
                consequence: { text: 'You go.', image: '', stateChanges: {} },
                nextEventId: 'end',
              },
            ],
          },
          {
            id: 'c2',
            label: 'Stay',
            outcomes: [
              {
                condition: null,
                consequence: { text: 'You stay.', image: '', stateChanges: {} },
                nextEventId: 'end',
              },
            ],
          },
        ],
      },
      end: {
        id: 'end',
        image: '',
        text: 'The end.',
        endingTitle: 'Fin',
      },
    },
    ...overrides,
  };
}

// ── Validator unit tests ───────────────────────────────────────────────────

describe('validateStory', () => {

  it('accepts a minimal valid story', () => {
    const result = validateStory(baseStory());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('errors when startEventId does not exist', () => {
    const story = baseStory();
    story.meta.startEventId = 'missing';
    const result = validateStory(story);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toMatch(/startEventId.*missing/);
  });

  it('errors when a narrative nextEventId references a missing event', () => {
    const story = baseStory();
    story.events['narr'] = { id: 'narr', image: '', text: 'Narr.', nextEventId: 'ghost' };
    // make it reachable by pointing start → narr
    (story.events['start'] as any).choices[0].outcomes[0].nextEventId = 'narr';
    const result = validateStory(story);
    expect(result.errors.some((e) => e.message.includes('"ghost"'))).toBe(true);
  });

  it('errors when a choice outcome nextEventId references a missing event', () => {
    const story = baseStory();
    (story.events['start'] as any).choices[0].outcomes[0].nextEventId = 'nowhere';
    const result = validateStory(story);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toMatch(/nowhere/);
  });

  it('errors when a choice has no null-condition fallback', () => {
    const story = baseStory();
    (story.events['start'] as any).choices[0].outcomes[0].condition = { '>': ['$trust', 50] };
    const result = validateStory(story);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toMatch(/fallback/);
  });

  it('errors when a condition references an unknown state variable', () => {
    const story = baseStory();
    (story.events['start'] as any).choices[0].outcomes.unshift({
      condition: { '>': ['$unknown_var', 10] },
      consequence: { text: '', image: '', stateChanges: {} },
      nextEventId: 'end',
    });
    const result = validateStory(story);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toMatch(/\$unknown_var/);
  });

  it('validates nested "and" conditions for unknown state refs', () => {
    const story = baseStory();
    (story.events['start'] as any).choices[0].outcomes.unshift({
      condition: { and: [{ '>': ['$trust', 10] }, { '==': ['$phantom', true] }] },
      consequence: { text: '', image: '', stateChanges: {} },
      nextEventId: 'end',
    });
    const result = validateStory(story);
    expect(result.valid).toBe(false);
    expect(result.errors[0].message).toMatch(/\$phantom/);
  });

  it('warns about unreachable events', () => {
    const story = baseStory();
    story.events['orphan'] = {
      id: 'orphan', image: '', text: 'Nobody reaches me.', endingTitle: 'Orphan',
    };
    const result = validateStory(story);
    expect(result.warnings.some((w) => w.eventId === 'orphan')).toBe(true);
  });

  it('accepts a valid story with compound conditions', () => {
    const story = baseStory();
    (story.events['start'] as any).choices[0].outcomes.unshift({
      condition: { and: [{ '>': ['$trust', 60] }, { '==': ['$trust', 70] }] },
      consequence: { text: '', image: '', stateChanges: {} },
      nextEventId: 'end',
    });
    const result = validateStory(story);
    expect(result.valid).toBe(true);
  });

  // ── Live story.json ──────────────────────────────────────────────────────

  it('story.json passes validation with no errors', () => {
    const result = validateStory(liveStory);
    if (!result.valid) {
      console.error('story.json validation errors:', result.errors);
    }
    expect(result.errors).toHaveLength(0);
    expect(result.valid).toBe(true);
  });

  it('story.json has no unreachable events', () => {
    const result = validateStory(liveStory);
    const orphans = result.warnings.filter((w) => w.message.includes('unreachable'));
    if (orphans.length > 0) {
      console.warn('Unreachable events:', orphans.map((o) => o.eventId));
    }
    expect(orphans).toHaveLength(0);
  });

});
