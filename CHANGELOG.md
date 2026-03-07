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

## Phase 5 — Title Screen & Save Slots
**Goal:** Title screen with 3 save slots, screen routing, return-to-title flow.

### Commit: `(pending)` — Phase 5: title screen, save slots, screen routing

**`src/components/TitleScreen/SaveSlotCard.tsx`**
- Three states: empty (New Game button), filled (Resume + Delete buttons), confirming-delete (inline Cancel/Delete confirmation — no modal needed).
- `formatRelativeTime` renders human-friendly timestamps ("just now", "5m ago", "3h ago", "2d ago", or locale date).
- Filled slot shows: last event text (2-line clamp), event count, relative save time.
- Delete button styled in muted red; destructive action requires inline confirmation before firing.

**`src/components/TitleScreen/TitleScreen.tsx`**
- Cover image (38vh, bottom-edge vignette), story title + author, staggered entrance animations (cover 0s, title 0.15s delay, slots 0.28s delay).
- Receives `onNewGame(slotId)` and `onResume(slotId)` callbacks; delegates delete to `useSavesStore` directly.
- Fully scrollable for small screens.

**`src/App.tsx`**
- Screen routing: `'title' | 'game'` state, initialised from `currentEventId` so in-progress games resume directly without showing the title screen.
- `handleNewGame(slotId)`: sets `newGameSlotId`, navigates to game.
- `handleResume(slotId)`: calls `loadFromSave` on the store, navigates to game.
- `handleReturnToTitle`: calls `resetGame()` (clears runtime state; save data in `savesStore` is unaffected), navigates to title.
- `AnimatePresence mode="wait"` with opacity fade (0.3s) between title and game.

**`src/components/GameScreen.tsx`**
- Removed Phase 3/4 auto-start. Now receives `newGameSlotId: 1 | 2 | 3 | null` prop; calls `engine.startNewGame(newGameSlotId)` on mount only if not null (resume path leaves store untouched).
- Added `onReturnToTitle` prop wired to a minimal hamburger SVG button (top-right, `z-20`).
- Ending screen "Play Again" button now calls `onReturnToTitle` instead of `startNewGame`, returning the player to the save slot selector.

---

## Phase 4 — Carousel
**Goal:** Horizontal scrollable carousel showing past event cards alongside the active card.

### Commit: `(pending)` — Phase 4: carousel with past cards and auto-scroll

**`src/components/Carousel/PastCard.tsx`**
- Read-only card showing a past event: event image (top 45%), truncated story text (4-line clamp), and the choice label the player made (↳ label, italic, truncated).
- Sized at ~58% of the active card: `clamp(130px, 46vw, 215px)` × `clamp(185px, 42vh, 370px)`.
- Visually distinct from active: `opacity: 0.45`, `filter: saturate(0.35)`, `pointer-events: none`, `user-select: none`.

**`src/components/Carousel/Carousel.tsx`**
- Horizontally scrollable flex row: past cards on the left, active card slot on the right.
- `useLayoutEffect` jumps instantly to the end on mount — ensures the active card is always visible when the game loads or a save is resumed, with no visible scroll.
- `useEffect` watching `history.length` triggers a smooth scroll to the end 80ms after a new card is added (delay lets the past card entrance animation start first).
- `AnimatePresence initial={false}` on past cards: existing history loaded from a save renders without animation; only newly appended entries animate in (`opacity 0→1`, `x 24→0`, `scale 0.92→1`, 0.28s).
- Accepts `children` for the active card slot, keeping card advance animation logic in `GameScreen`.

**`src/components/GameScreen.tsx`**
- Replaced centered `AnimatePresence` layout with `<Carousel history={engine.history}>`.
- Active `EventCard` + its `AnimatePresence` (card advance slide) passed as children to `Carousel`.
- Card advance exit animation tightened: `x: -60` (was -80), `duration: 0.22` (was 0.24) to feel snappier alongside the past card appearing.

---

## Phase 3 — Core Card UI
**Goal:** EventCard with flip animation, CardFront/CardBack components, GameScreen wiring, ending screen.

### Commit: `(pending)` — Phase 3: core card UI components and GameScreen

**`src/components/UI/ImageWithShimmer.tsx`**
- Renders an image with a shimmer skeleton while loading (CSS `@keyframes shimmer` + `animate-pulse`).
- Fades the image in on `onLoad` via opacity transition.
- Shows a "No image" fallback on `onError`.
- Applies a bottom-edge gradient vignette to blend the image into the card body.

**`src/components/EventCard/CardFront.tsx`**
- Renders the front face of an event card: image (via `ImageWithShimmer`), story text, and action buttons.
- Choice event variant: two side-by-side choice buttons. Tapping a button highlights it (125ms visual feedback) then calls `onSelectChoice`. Buttons are disabled during the flip.
- Narrative event variant: a single centered "Continue" button calls `onContinueNarrative`.
- Text area is `overflow-y-auto` with hidden scrollbars for long story text.

**`src/components/EventCard/CardBack.tsx`**
- Renders the back face: consequence image, "You chose: …" label, consequence text (italic), and a "Continue →" button.

**`src/components/EventCard/EventCard.tsx`**
- Flip animation: uses Framer Motion `AnimatePresence mode="wait"` with `scaleX: 0 → 1` half-flip transitions (0.18s each). Front collapses to edge, back expands from edge — reliable cross-browser card flip without CSS `preserve-3d`.
- Local `faceShowing` state syncs from the persisted `cardPhase` store value, so refreshing the page on the back face restores the correct face.
- `onExitComplete` callback advances the store from `'flipping'` to `'back'` after the exit animation finishes, keeping the Continue button non-interactive during the animation.

**`src/components/GameScreen.tsx`**
- Card advance animation: `AnimatePresence mode="wait"` with `key={currentEvent.id}`. New card slides in from right (x: 80 → 0, opacity 0→1, scale 0.95→1); old card exits left (x: 0→-80, scale 1→0.9).
- Phase 3 auto-start: if `currentEventId` is empty, calls `startNewGame(1)` automatically (replaced by TitleScreen in Phase 4).
- Ending screen: dedicated layout with ending image, divider, title, text, and "Play Again" button. Animated in with `y: 20 → 0`.

**`src/App.tsx`**
- Fetches `/story.json` on mount; shows a loading state and error fallback.
- Renders `GameScreen` once story is loaded.

**`src/index.css`**
- Added `@keyframes shimmer` for the loading skeleton sweep.
- Added `.scrollbar-none` utility for hidden scrollbars.

---

## Phase 2 — Story Engine Tests + useStoryEngine Hook
**Goal:** Full unit test coverage of all engine modules; `useStoryEngine` hook wiring engine to stores.

### Commit: `(pending)` — Phase 2: engine unit tests and useStoryEngine hook

**Vitest setup:**
- Added `vitest` and `@vitest/ui` as dev dependencies.
- Created `vitest.config.ts` (separate from `vite.config.ts`) with `environment: 'node'` and `include: ['src/**/*.test.ts']`.
- Added `test` and `test:watch` npm scripts.

**Engine unit tests — 48 tests, 4 suites, all passing:**
- `conditionEvaluator.test.ts` (18 tests): all comparison operators (`>`, `>=`, `<`, `<=`, `==`, `!=`), logical operators (`and`, `or`, `not`), nested compound conditions, two-literal comparison, unknown state variable warning, unknown operator warning.
- `stateManager.test.ts` (13 tests): `buildInitialState` extraction and immutability, `applyStateChanges` positive/negative delta, max clamp, min clamp, uncapped numeric, boolean direct set, string direct set, multi-field changes, immutability of input, unknown key warning.
- `graphTraverser.test.ts` (8 tests): first condition match, null-condition fallback, single-outcome choice, unknown choice ID, no-match warning, `resolveOutcomeChanges` matching/missing/empty cases.
- `pathReplayer.test.ts` (9 tests): empty path, single choice with state advance, automatic narrative event traversal, state-dependent branching, full two-choice path, stopping at ending events, history correctness, invalid event ID, invalid choice ID.

**Type improvements:**
- `graphTraverser.ts`: extracted `OutcomeResult` type (pure consequence data) to decouple it from the store's `ResolvedOutcome`.
- `gameStore.ts`: `ResolvedOutcome` now includes `choiceId` and `choiceLabel` (full pending state for the card back face); added `loadFromSave` action.

**`src/hooks/useStoryEngine.ts`:**
- Orchestrates the full game loop: `selectChoice` → flip → `confirmConsequence` → advance → auto-save.
- `selectChoice(choiceId)`: resolves outcome branch, preloads consequence image immediately, sets `cardPhase = 'flipping'`, stores `pendingOutcome`.
- `confirmConsequence()`: applies `stateChanges` (with clamping), records `HistoryEntry`, advances `currentEventId`, triggers auto-save.
- `continueNarrative()`: advances narrative events, records history, triggers auto-save.
- `startNewGame(slotId)`: initialises fresh state from story's `initialState`, assigns save slot.
- `loadSave(slotId)`: restores full state from a `SaveSlot`.
- Lookahead preload: on every `currentEventId` change, preloads all reachable consequence and next-event images.
- Returns `{ currentEvent, cardPhase, isEnding, isNarrative, isChoice, selectChoice, confirmConsequence, continueNarrative, startNewGame, loadSave }`.
