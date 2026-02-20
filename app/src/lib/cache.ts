import type { SnsProject, SourceMode } from "./types";

const CACHE_KEY = "sns_projects_v1";

/** TTL after which the cache is considered stale (shown as warning) */
export const CACHE_STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface ProjectCache {
  projects: SnsProject[];
  fetchedAt: number; // Date.now()
  source: SourceMode;
}

export function loadCache(): ProjectCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ProjectCache;
  } catch {
    return null;
  }
}

export function saveCache(projects: SnsProject[], source: SourceMode): ProjectCache {
  const cache: ProjectCache = { projects, fetchedAt: Date.now(), source };
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  return cache;
}

export function clearCache(): void {
  localStorage.removeItem(CACHE_KEY);
}

export function cacheAgeMs(cache: ProjectCache): number {
  return Date.now() - cache.fetchedAt;
}

export function isCacheStale(cache: ProjectCache): boolean {
  return cacheAgeMs(cache) > CACHE_STALE_MS;
}
