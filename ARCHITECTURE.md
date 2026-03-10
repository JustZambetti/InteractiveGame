# Architecture

## Overview

A static single-page application built with React 19, Vite 7, TypeScript, Tailwind CSS v4, Framer Motion, and Zustand. All story content is a single JSON file served as a static asset. There is no backend.

```
Browser
  └─ App.tsx                   # URL parsing, story bootstrap
       ├─ TitleScreen           # Save slot selection / new game
       └─ GameScreen            # Active gameplay loop
            ├─ EventCard        # Animated front/back card
            ├─ Carousel         # Scrollable history strip
            ├─ EndingScreen     # Final screen with share button
            └─ ReplayOverlay    # Replay HUD
```

---

## Data Flow

```
public/story.json
      │
      ▼
  App.tsx  ──(imports)──▶  Story (typed)
      │                        │
      │                   buildInitialState()
      │                        │
      ▼                        ▼
useGameStore (Zustand)  ◀── startGame / loadFromSave
      │
      ├─ currentEventId
      ├─ storyState          (key/value stat map, e.g. { trust: 60 })
      ├─ cardPhase           ('front' | 'flipping' | 'back')
      ├─ pendingOutcome
      ├─ history             (HistoryEntry[])
      ├─ choicePath          (string[])  ← used for URL sharing & replay
      └─ activeSaveSlot      (1 | 2 | 3 | null)

useSavesStore (Zustand + persist)
      └─ slots[1..3]         (SaveSlot metadata + full game snapshot)
```

**Choice resolution sequence:**

1. User clicks a choice → `useStoryEngine.selectChoice()` calls `setCardPhase('flipping')` and stores `pendingOutcome`.
2. `EventCard` detects `cardPhase === 'flipping'` → animates to `CardBack`.
3. User clicks "Continue" on `CardBack` → `useStoryEngine.confirmConsequence()` calls `gameStore.confirmConsequence()`, advancing `currentEventId`, updating `storyState`, appending to `history` and `choicePath`.
4. `cardPhase` resets to `'front'` → `EventCard` renders new event.

---

## Key Files

| Path | Role |
|------|------|
| `public/story.json` | All story content — events, choices, outcomes, conditions |
| `src/types/story.ts` | TypeScript types for all story structures |
| `src/store/gameStore.ts` | Runtime game state (Zustand, no persistence) |
| `src/store/savesStore.ts` | Save slots 1–3 (Zustand + localStorage persist) |
| `src/engine/conditionEvaluator.ts` | Evaluates JSONLogic-style conditions against storyState |
| `src/engine/stateManager.ts` | Applies `stateChanges` to produce a new storyState |
| `src/engine/graphTraverser.ts` | Picks the first matching outcome for a choice |
| `src/engine/pathReplayer.ts` | Reconstructs full game state from a `choicePath[]` |
| `src/engine/storyValidator.ts` | Validates a Story object; used in tests and optionally at startup |
| `src/engine/imagePreloader.ts` | Fires `new Image()` requests to warm the browser cache |
| `src/hooks/useStoryEngine.ts` | React hook — bridge between UI and engine functions |
| `src/hooks/useReplay.ts` | State machine driving animated replay from a `choicePath[]` |
| `src/App.tsx` | Root: URL `?path=` parsing, story/state bootstrap |
| `src/components/GameScreen.tsx` | Main gameplay screen |
| `src/components/EventCard/` | Animated card with front (choices) and back (consequence) |
| `src/components/Carousel/` | Horizontal history strip |
| `src/components/EndingScreen.tsx` | Ending display + share URL generation |
| `src/components/ReplayOverlay.tsx` | Replay progress HUD |
| `src/components/UI/ImageWithShimmer.tsx` | Image with shimmer loading skeleton |
| `src/setupTests.ts` | localStorage shim for Vitest Node environment |
| `vitest.config.ts` | Test runner configuration |

---

## Story JSON Schema

`public/story.json` has three top-level keys:

```jsonc
{
  "meta": {
    "id": "string",
    "title": "string",
    "version": "string",
    "startEventId": "string"   // must match an event key
  },
  "initialState": {
    // each key is a stat name
    "trust": { "value": 50, "min": 0, "max": 100 }
  },
  "events": {
    "event_id": { /* StoryEvent — one of three shapes below */ }
  }
}
```

**Event shapes:**

```jsonc
// Choice event (has `choices`)
{
  "id": "city_gates",
  "image": "path/or/url.jpg",
  "text": "Narrative text shown on card front.",
  "choices": [
    {
      "id": "choice_wait",
      "label": "Wait",
      "outcomes": [
        {
          "condition": { ">": ["$trust", 50] },   // null = unconditional fallback
          "consequence": {
            "text": "Result text.",
            "image": "",
            "stateChanges": { "trust": 5 }        // added to current value
          },
          "nextEventId": "market_square"
        }
        // … last outcome must have condition: null
      ]
    }
  ]
}

// Narrative event (has `nextEventId`, no `choices`)
{
  "id": "intro",
  "image": "",
  "text": "Narration.",
  "nextEventId": "city_gates"
}

// Ending event (has `endingTitle`, no `nextEventId` or `choices`)
{
  "id": "ending_exile",
  "image": "",
  "text": "Epilogue text.",
  "endingTitle": "The Long Road"
}
```

**Condition operators:** `>`, `>=`, `<`, `<=`, `==`, `!=`, `and`, `or`, `not`.
Operands can be `"$statName"` (resolved from storyState) or literal numbers/booleans.

---

## State Persistence

`useSavesStore` uses Zustand's `persist` middleware with the `localStorage` storage adapter.

- **Key:** `interactive-story-saves`
- **Stored:** array of `SaveSlot` objects (metadata + full `HistoryEntry[]` + `choicePath`)
- **gameStore** is **not** persisted — it is always re-hydrated from a save slot or freshly started.

---

## URL Sharing

The share button (on `EndingScreen`) writes `?path=c1,c2,c3,...` to the clipboard.
On load, `App.tsx` detects this query param, calls `startGame` immediately, and passes the `choicePath` to `GameScreen` as `replayChoicePath`. The URL is cleaned via `window.history.replaceState` before first render.

---

## Replay Mechanism

`useReplay` drives a three-phase cycle per step:

1. **selecting** — auto-selects the next choice ID from `choicePath` (or auto-advances narrative events) after `CHOICE_DELAY` ms.
2. **confirming** — waits for `cardPhase === 'back'`, then calls `confirmConsequence` after `CONFIRM_DELAY` ms.
3. **done** — all steps processed; `isDone = true`, overlay shows completion panel.

`skip()` calls `replayPath()` to reconstruct the final state in one shot, bypassing the animation loop.

---

## Testing

```
npx vitest run
```

Tests live in `src/**/*.test.ts` (co-located with source). Six test files, 69 tests:

| File | What it covers |
|------|----------------|
| `engine/conditionEvaluator.test.ts` | All condition operators, nested `and`/`or`/`not` |
| `engine/stateManager.test.ts` | State changes, clamping to min/max |
| `engine/graphTraverser.test.ts` | Outcome selection, fallback ordering |
| `engine/pathReplayer.test.ts` | Full path reconstruction, dead-end detection |
| `engine/storyValidator.test.ts` | All validation rules + live `story.json` checks |
| `store/gameStore.test.ts` | All store actions |

`src/setupTests.ts` provides a localStorage shim so Zustand's persist middleware works in the Node test environment without jsdom.

---

## Build & Deploy

```bash
npm run dev      # dev server
npm run build    # production build → dist/
npm run preview  # preview dist/ locally
npx vitest run   # run all tests once
```

For GitHub Pages deployment see `.github/workflows/deploy.yml`.
Set `VITE_BASE_URL` in the repository's Actions secrets if serving from a subdirectory (e.g. `/repo-name/`).
