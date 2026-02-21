import type { SnsProject } from "sns-assets";

/** TTL after which the data is considered stale (triggers "refresh" hint) */
export const CACHE_STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface ProjectCache {
  projects: SnsProject[];
  /** Timestamp of the last successful full fetch from the network */
  fetchedAt: number;
}

// ─── Bootstrap from snapshot ────────────────────────────────────────────────

/**
 * Create an initial in-memory cache from the bundled snapshot.
 * No persistence — data lives only for the duration of the session.
 */
export function initFromSnapshot(snapshot: SnsProject[], snapshotFetchedAt: number): ProjectCache {
  return {
    projects: [...snapshot],
    fetchedAt: snapshotFetchedAt,
  };
}

// ─── Append new project ────────────────────────────────────────────────────

/**
 * Return a new cache with the given project appended.
 * If a project with the same rootCanisterId already exists, returns the same reference (no-op).
 */
export function appendProject(project: SnsProject, currentCache: ProjectCache): ProjectCache {
  const exists = currentCache.projects.some((p) => p.rootCanisterId === project.rootCanisterId);
  if (exists) return currentCache;
  console.log(`[cache] appending NEW project: ${project.rootCanisterId}`);
  return { ...currentCache, projects: [...currentCache.projects, project] };
}

/**
 * Return a new cache with fetchedAt set to now.
 */
export function markFetchComplete(currentCache: ProjectCache): ProjectCache {
  return { ...currentCache, fetchedAt: Date.now() };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

export function cacheAgeMs(cache: ProjectCache): number {
  return Date.now() - cache.fetchedAt;
}

export function isCacheStale(cache: ProjectCache): boolean {
  return cacheAgeMs(cache) > CACHE_STALE_MS;
}
