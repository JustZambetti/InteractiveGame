/**
 * Global test setup — runs before every test file via vitest.config.ts setupFiles.
 * Provides a minimal localStorage shim so Zustand's persist middleware
 * works in Node without a browser or jsdom.
 */

const store: Record<string, string> = {};

const localStorageMock: Storage = {
  getItem:    (key)        => store[key] ?? null,
  setItem:    (key, value) => { store[key] = String(value); },
  removeItem: (key)        => { delete store[key]; },
  clear:      ()           => { Object.keys(store).forEach((k) => delete store[k]); },
  get length() { return Object.keys(store).length; },
  key: (i) => Object.keys(store)[i] ?? null,
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});
