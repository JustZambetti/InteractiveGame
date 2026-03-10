# Contributing

## Change process

> **Rule of thumb:** document first, commit often, test before merging.

1. **Read `ARCHITECTURE.md`** before touching anything. Understand which layer owns the code you are changing.
2. **Update docs as part of the same PR/commit** — not afterwards. If you add a new engine module, add a row to the Key Files table. If you change the JSON schema, update the Schema section.
3. **Run tests before every commit:**
   ```bash
   npx vitest run
   ```
   All 69 tests must pass. If you add new behaviour, add tests for it.
4. **Commit at logical milestones** — one concern per commit. A working intermediate state is always better than one massive commit.

---

## Adding a new story

1. Edit `public/story.json`. Follow the schema in `ARCHITECTURE.md`.
2. Every choice must have a `condition: null` fallback outcome as its last entry.
3. Run the validator mentally or via the test suite — `storyValidator.test.ts` imports the live file and fails if there are errors or unreachable events.
4. Run `npx vitest run` to confirm no regressions.

### Adding a new stat

1. Add it to `initialState` in `story.json`:
   ```json
   "suspicion": { "value": 0, "min": 0, "max": 100 }
   ```
2. Reference it in conditions as `"$suspicion"`.
3. Apply changes via `stateChanges` in consequence objects.
4. No code changes required — the engine reads `initialState` dynamically.

---

## Adding a new event type

The engine currently recognises three event shapes identified by structural duck-typing in `src/types/story.ts`:

| Guard | Shape |
|-------|-------|
| `isChoiceEvent(e)` | has `choices` array |
| `isNarrativeEvent(e)` | has `nextEventId`, no `choices` |
| `isEndingEvent(e)` | has `endingTitle`, no `choices`, no `nextEventId` |

To add a fourth type:

1. Add a new TypeScript interface to `src/types/story.ts` and add it to the `StoryEvent` union.
2. Add a type-guard function (`isXxxEvent`).
3. Handle the new type in:
   - `src/engine/storyValidator.ts` (validation + BFS reachability)
   - `src/hooks/useStoryEngine.ts` (game loop)
   - `src/engine/pathReplayer.ts` (silent replay)
   - `src/components/EventCard/EventCard.tsx` / `CardFront.tsx` (rendering)
4. Add tests for the new engine behaviour.
5. Update `ARCHITECTURE.md`.

---

## Adding a new condition operator

1. Add the operator to `Condition` type in `src/types/story.ts`.
2. Implement evaluation in `src/engine/conditionEvaluator.ts`.
3. Add state-variable extraction in `src/engine/storyValidator.ts` (`collectStateRefs`).
4. Add unit tests in `src/engine/conditionEvaluator.test.ts`.

---

## Modifying the store

`gameStore.ts` holds **runtime** state — nothing is persisted to localStorage.
`savesStore.ts` holds **save slot** state — persisted via Zustand's `persist` middleware.

- If you add a field to `gameStore`, add a corresponding reset in `resetGame()` and a test in `gameStore.test.ts`.
- If you change `SaveSlot` shape in `savesStore`, bump the `version` field in the `persist` options and add a `migrate` function so existing saves do not break.

---

## Component conventions

- Co-locate sub-components in a folder named after the parent (e.g. `EventCard/CardFront.tsx`).
- Animations use Framer Motion `variants` defined at the top of the file.
- Tailwind classes only — no inline `style=` except for dynamic values that cannot be expressed as classes.
- Accessibility: add `role`, `aria-label`, and `aria-live` where content changes dynamically.

---

## GitHub Pages deployment

See `.github/workflows/deploy.yml`. The workflow builds on every push to `main` and deploys `dist/` to the `gh-pages` branch.

If the app is served from a subdirectory (e.g. `https://user.github.io/repo-name/`), set the `VITE_BASE_URL` Actions variable to `/repo-name/` in **Settings → Secrets and variables → Actions → Variables**.
