import type { Story, StoryEvent, Condition, ConditionOperand } from '../types/story';
import { isChoiceEvent, isNarrativeEvent, isEndingEvent } from '../types/story';

export interface ValidationError {
  eventId: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// ── Condition operand helpers ──────────────────────────────────────────────

function collectStateRefs(condition: Condition, refs: Set<string>): void {
  if ('>' in condition  || '>=' in condition ||
      '<' in condition  || '<=' in condition ||
      '==' in condition || '!=' in condition) {
    const operands = Object.values(condition)[0] as [ConditionOperand, ConditionOperand];
    for (const op of operands) {
      if (typeof op === 'string' && op.startsWith('$')) refs.add(op.slice(1));
    }
  } else if ('and' in condition || 'or' in condition) {
    const children = Object.values(condition)[0] as Condition[];
    for (const child of children) collectStateRefs(child, refs);
  } else if ('not' in condition) {
    collectStateRefs((condition as { not: Condition }).not, refs);
  }
}

// ── Main validator ─────────────────────────────────────────────────────────

export function validateStory(story: Story): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const eventIds = new Set(Object.keys(story.events));
  const stateKeys = new Set(Object.keys(story.initialState));

  function err(eventId: string, message: string) {
    errors.push({ eventId, message });
  }
  function warn(eventId: string, message: string) {
    warnings.push({ eventId, message });
  }
  function checkRef(eventId: string, refId: string, context: string) {
    if (!eventIds.has(refId)) {
      err(eventId, `${context} references unknown event "${refId}"`);
    }
  }

  // 1. startEventId must exist
  if (!eventIds.has(story.meta.startEventId)) {
    err('meta', `startEventId "${story.meta.startEventId}" does not exist in events`);
  }

  // 2. Validate each event
  for (const event of Object.values(story.events) as StoryEvent[]) {
    if (isNarrativeEvent(event)) {
      checkRef(event.id, event.nextEventId, 'nextEventId');
    }

    if (isChoiceEvent(event)) {
      for (const choice of event.choices) {
        let hasFallback = false;

        for (const outcome of choice.outcomes) {
          // nextEventId must exist
          checkRef(event.id, outcome.nextEventId,
            `Choice "${choice.id}" outcome nextEventId`);

          // condition null = fallback
          if (outcome.condition === null) hasFallback = true;

          // state variable references must exist
          if (outcome.condition !== null) {
            const refs = new Set<string>();
            collectStateRefs(outcome.condition, refs);
            for (const ref of refs) {
              if (!stateKeys.has(ref)) {
                err(event.id,
                  `Choice "${choice.id}" condition references unknown state variable "$${ref}"`);
              }
            }
          }
        }

        if (!hasFallback) {
          err(event.id,
            `Choice "${choice.id}" has no null-condition fallback outcome — ` +
            'some state combinations will produce no outcome');
        }
      }
    }

    if (isEndingEvent(event)) {
      // Ending events must not have nextEventId or choices
      if ('nextEventId' in event) {
        warn(event.id, 'Ending event has a nextEventId (it will never be followed)');
      }
    }
  }

  // 3. Reachability — BFS from startEventId
  const reachable = new Set<string>();
  const queue = [story.meta.startEventId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (reachable.has(id)) continue;
    reachable.add(id);

    const event = story.events[id];
    if (!event) continue;

    if (isNarrativeEvent(event) && eventIds.has(event.nextEventId)) {
      queue.push(event.nextEventId);
    }
    if (isChoiceEvent(event)) {
      for (const choice of event.choices) {
        for (const outcome of choice.outcomes) {
          if (eventIds.has(outcome.nextEventId)) queue.push(outcome.nextEventId);
        }
      }
    }
  }

  for (const id of eventIds) {
    if (!reachable.has(id)) {
      warn(id, 'Event is unreachable from startEventId');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
