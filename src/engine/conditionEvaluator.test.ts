import { describe, it, expect, vi } from 'vitest';
import { evaluateCondition } from './conditionEvaluator';
import type { StoryState } from '../types/story';

const state: StoryState = {
  suspicion: 40,
  trust: 60,
  gold: 20,
  hasKey: true,
  name: 'hero',
};

describe('evaluateCondition', () => {
  it('returns true for null condition (unconditional fallback)', () => {
    expect(evaluateCondition(null, state)).toBe(true);
  });

  describe('comparison operators', () => {
    it('> with state ref and literal', () => {
      expect(evaluateCondition({ '>': ['$suspicion', 30] }, state)).toBe(true);
      expect(evaluateCondition({ '>': ['$suspicion', 40] }, state)).toBe(false);
      expect(evaluateCondition({ '>': ['$suspicion', 50] }, state)).toBe(false);
    });

    it('>= with state ref and literal', () => {
      expect(evaluateCondition({ '>=': ['$trust', 60] }, state)).toBe(true);
      expect(evaluateCondition({ '>=': ['$trust', 61] }, state)).toBe(false);
      expect(evaluateCondition({ '>=': ['$trust', 59] }, state)).toBe(true);
    });

    it('< with state ref and literal', () => {
      expect(evaluateCondition({ '<': ['$gold', 50] }, state)).toBe(true);
      expect(evaluateCondition({ '<': ['$gold', 20] }, state)).toBe(false);
    });

    it('<= with state ref and literal', () => {
      expect(evaluateCondition({ '<=': ['$gold', 20] }, state)).toBe(true);
      expect(evaluateCondition({ '<=': ['$gold', 19] }, state)).toBe(false);
    });

    it('== with boolean state ref', () => {
      expect(evaluateCondition({ '==': ['$hasKey', true] }, state)).toBe(true);
      expect(evaluateCondition({ '==': ['$hasKey', false] }, state)).toBe(false);
    });

    it('== with string state ref', () => {
      expect(evaluateCondition({ '==': ['$name', 'hero'] }, state)).toBe(true);
      expect(evaluateCondition({ '==': ['$name', 'villain'] }, state)).toBe(false);
    });

    it('!= with state ref', () => {
      expect(evaluateCondition({ '!=': ['$hasKey', false] }, state)).toBe(true);
      expect(evaluateCondition({ '!=': ['$hasKey', true] }, state)).toBe(false);
    });

    it('compares two literals', () => {
      expect(evaluateCondition({ '==': [1, 1] }, state)).toBe(true);
      expect(evaluateCondition({ '==': [1, 2] }, state)).toBe(false);
    });
  });

  describe('logical operators', () => {
    it('and — all conditions true', () => {
      expect(evaluateCondition({
        'and': [
          { '>': ['$suspicion', 30] },
          { '<': ['$trust', 100] },
        ]
      }, state)).toBe(true);
    });

    it('and — one condition false', () => {
      expect(evaluateCondition({
        'and': [
          { '>': ['$suspicion', 30] },
          { '>': ['$trust', 100] },
        ]
      }, state)).toBe(false);
    });

    it('or — one condition true', () => {
      expect(evaluateCondition({
        'or': [
          { '>': ['$suspicion', 99] },
          { '<': ['$trust', 100] },
        ]
      }, state)).toBe(true);
    });

    it('or — all conditions false', () => {
      expect(evaluateCondition({
        'or': [
          { '>': ['$suspicion', 99] },
          { '>': ['$trust', 99] },
        ]
      }, state)).toBe(false);
    });

    it('not — inverts a true condition', () => {
      expect(evaluateCondition({ 'not': { '>': ['$suspicion', 30] } }, state)).toBe(false);
    });

    it('not — inverts a false condition', () => {
      expect(evaluateCondition({ 'not': { '>': ['$suspicion', 99] } }, state)).toBe(true);
    });

    it('nested and/or/not', () => {
      expect(evaluateCondition({
        'and': [
          { 'not': { '==': ['$hasKey', false] } },
          { 'or': [
            { '>': ['$gold', 10] },
            { '>': ['$trust', 90] },
          ]},
        ]
      }, state)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('warns and returns 0 for unknown state variable', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = evaluateCondition({ '>': ['$unknown', 0] }, state);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknown'));
      expect(result).toBe(false); // 0 > 0 is false
      warn.mockRestore();
    });

    it('warns and returns false for unknown operator', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = evaluateCondition({ 'xor': [true, false] } as any, state);
      expect(warn).toHaveBeenCalled();
      expect(result).toBe(false);
      warn.mockRestore();
    });
  });
});
