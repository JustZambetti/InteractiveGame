import type { Story } from '../types/story';
import { replayPath } from './pathReplayer';

const preloadedUrls = new Set<string>();

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

function resolveUrl(url: string): string {
  return url.startsWith('/') && !url.startsWith('//') ? base + url : url;
}

export function preloadImage(url: string): void {
  if (!url) return;
  const resolved = resolveUrl(url);
  if (preloadedUrls.has(resolved)) return;
  preloadedUrls.add(resolved);
  const img = new Image();
  img.src = resolved;
}

export function preloadImages(urls: string[]): void {
  urls.forEach(preloadImage);
}

/**
 * Bulk-preload every image reachable from a recorded choice path.
 * Used at replay start so images are already in the browser cache when
 * the animated replay reaches each card, eliminating loading flickers.
 */
export function preloadStoryPath(story: Story, choicePath: string[]): void {
  const result = replayPath(story, choicePath);
  const urls: string[] = [];

  for (const entry of result.history) {
    if (entry.eventImage) urls.push(entry.eventImage);
    if (entry.consequenceImage) urls.push(entry.consequenceImage);
  }

  // Also preload the current (final) event image
  const finalEvent = story.events[result.currentEventId];
  if (finalEvent?.image) urls.push(finalEvent.image);

  preloadImages(urls);
}
