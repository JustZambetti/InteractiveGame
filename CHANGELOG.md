# Changelog

All notable changes to this project are documented here.
Entries are organized by development phase, then by commit.

---

## Phase 1 — Foundation
**Goal:** Project scaffold, TypeScript schema, story engine modules, Zustand stores, sample story.

### Commit: `f4c9afa` — Add project design plan document
- Created `DESIGN_PLAN.md` capturing full architecture, data schema, UI/UX spec, and phased development plan.
- Documents the story format decision (JSON + JSONLogic-style conditions over Ink/DSL/eval).
- Captures all design Q&A: directed graph structure, hidden state, state-driven outcomes (not choices), auto-save, animated URL replay, Reigns visual style, 3 save slots.

### Commit: `9c31df8` — Phase 1: project scaffold, types, engine, stores, and sample story
- **Toolchain**: Vite 7 + React 19 + TypeScript + Tailwind CSS v4 (via `@tailwindcss/vite`) + Framer Motion + Zustand + `@use-gesture/react`.
- **`src/types/story.ts`**: Complete TypeScript types for the story schema — conditions (`Condition`, `ConditionOperand`), state definitions (`InitialState`, `StoryState`), all three event types (`ChoiceEvent`, `NarrativeEvent`, `EndingEvent`), type guards, and `HistoryEntry`.
- **Story engine** (pure, side-effect-free modules):
  - `conditionEvaluator.ts` — safe JSONLogic tree-walker, no `eval()`
  - `stateManager.ts` — numeric delta application with min/max clamping; boolean/string direct set
  - `graphTraverser.ts` — resolves the first matching outcome branch for a given choice + state
  - `imagePreloader.ts` — `new Image()` background preloader with dedup cache
  - `pathReplayer.ts` — silently reconstructs full game state from a `choicePath[]` (for URL sharing)
- **Zustand stores**:
  - `gameStore.ts` — runtime state (current event, card phase, hidden story state, history, choice path, active save slot); auto-persisted to `localStorage`
  - `savesStore.ts` — 3 named save slots with save/delete operations; auto-persisted to `localStorage`
- **`public/story.json`**: Demo story "The Lost Heir" — 15 events, 4 state variables (`suspicion`, `trust`, `gold`, `hasKey`), 4 distinct endings, narrative events, epilogue chains, converging paths.
- **Build verified**: `tsc -b && vite build` passes with zero errors or warnings.

---

## Phase 2 — Story Engine Tests + useStoryEngine Hook
**Goal:** Full unit test coverage of all engine modules; `useStoryEngine` hook wiring engine to stores.

<!-- Entries added below as commits land -->
