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
export function initFromSnapshot(
  snapshot: SnsProject[],
  snapshotFetchedAt: number
): ProjectCache {
  return {
    projects: [...snapshot],
    fetchedAt: snapshotFetchedAt,
  };
}

// ─── Granular upsert ────────────────────────────────────────────────────────

/**
 * Return a new cache with specific fields of one project updated.
 * Only the provided fields are written; other fields are left unchanged.
 * If the project is not in the cache yet, it is added (when enough fields are present).
 */
export function upsertProject(
  rootCanisterId: string,
  fields: Partial<SnsProject>,
  currentCache: ProjectCache
): ProjectCache {
  const idx = currentCache.projects.findIndex((p) => p.rootCanisterId === rootCanisterId);
  let projects: SnsProject[];

  if (idx >= 0) {
    projects = [...currentCache.projects];
    projects[idx] = { ...projects[idx], ...fields };
  } else {
    const full = fields as SnsProject;
    if (!full.rootCanisterId || !full.governanceCanisterId || !full.ledgerCanisterId) {
      return currentCache;
    }
    projects = [...currentCache.projects, full];
  }

  return { ...currentCache, projects };
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
