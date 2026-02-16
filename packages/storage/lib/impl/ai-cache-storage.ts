import { createStorage, StorageEnum } from '../base/index.js';

// Cache entry interface
interface CacheEntry {
  questionHash: string;
  contextHash: string;
  question: string;
  response: string;
  timestamp: number;
  ttl: number; // Time-to-live in milliseconds
  hitCount: number;
}

// Cache storage interface
interface AiCache {
  entries: Record<string, CacheEntry>;
  totalSize: number;
  lastCleanup: number;
}

const MAX_CACHE_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
const GENERIC_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days for generic responses
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

const defaultCache: AiCache = {
  entries: {},
  totalSize: 0,
  lastCleanup: 0,
};

// Simple hash function for cache keys
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

// Normalize text for consistent hashing
const normalizeText = (text: string): string =>
  text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();

const storage = createStorage<AiCache>('jobestry-ai-cache', defaultCache, {
  storageEnum: StorageEnum.Local,
  liveUpdate: false, // No live updates needed for cache
});

export const aiCacheStorage = {
  ...storage,

  // Generate a cache key from question and context
  generateKey: (question: string, context: string): string => {
    const normalizedQuestion = normalizeText(question);
    const contextFingerprint = simpleHash(context.slice(0, 500)); // Use first 500 chars of context
    return `${simpleHash(normalizedQuestion)}-${contextFingerprint}`;
  },

  // Get a cached response
  getCached: async (question: string, context: string): Promise<string | null> => {
    const cache = await storage.get();
    const key = aiCacheStorage.generateKey(question, context);
    const entry = cache.entries[key];

    if (!entry) return null;

    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      // Entry expired, remove it
      await aiCacheStorage.removeEntry(key);
      return null;
    }

    // Update hit count
    await storage.set(current => ({
      ...current,
      entries: {
        ...current.entries,
        [key]: {
          ...entry,
          hitCount: entry.hitCount + 1,
        },
      },
    }));

    return entry.response;
  },

  // Cache a response
  cacheResponse: async (question: string, context: string, response: string, isGeneric: boolean = false) => {
    const key = aiCacheStorage.generateKey(question, context);
    const entrySize = JSON.stringify({ question, response }).length;
    const ttl = isGeneric ? GENERIC_TTL : DEFAULT_TTL;

    const entry: CacheEntry = {
      questionHash: simpleHash(normalizeText(question)),
      contextHash: simpleHash(context.slice(0, 500)),
      question: question.slice(0, 200), // Store truncated question for reference
      response,
      timestamp: Date.now(),
      ttl,
      hitCount: 0,
    };

    await storage.set(current => {
      let newEntries = { ...current.entries, [key]: entry };
      let newSize = current.totalSize + entrySize;

      // Cleanup if needed
      if (newSize > MAX_CACHE_SIZE || Date.now() - current.lastCleanup > CLEANUP_INTERVAL) {
        const cleaned = aiCacheStorage.cleanupEntries(newEntries, newSize);
        newEntries = cleaned.entries;
        newSize = cleaned.size;
      }

      return {
        entries: newEntries,
        totalSize: newSize,
        lastCleanup: Date.now(),
      };
    });
  },

  // Remove a specific entry
  removeEntry: async (key: string) => {
    await storage.set(current => {
      const { [key]: removed, ...remaining } = current.entries;
      const removedSize = removed ? JSON.stringify(removed).length : 0;
      return {
        ...current,
        entries: remaining,
        totalSize: current.totalSize - removedSize,
      };
    });
  },

  // Cleanup old and least-used entries (LRU eviction)
  cleanupEntries: (
    entries: Record<string, CacheEntry>,
    currentSize: number,
  ): { entries: Record<string, CacheEntry>; size: number } => {
    const now = Date.now();
    let newSize = currentSize;

    // First, remove expired entries
    const validEntries = Object.entries(entries).filter(([, entry]) => {
      const isValid = now <= entry.timestamp + entry.ttl;
      if (!isValid) {
        newSize -= JSON.stringify(entry).length;
      }
      return isValid;
    });

    // If still over limit, remove least recently used
    if (newSize > MAX_CACHE_SIZE) {
      const sorted = validEntries.sort((a, b) => {
        // Sort by hit count (ascending) then by timestamp (ascending)
        if (a[1].hitCount !== b[1].hitCount) {
          return a[1].hitCount - b[1].hitCount;
        }
        return a[1].timestamp - b[1].timestamp;
      });

      // Remove entries until under limit
      while (newSize > MAX_CACHE_SIZE * 0.8 && sorted.length > 0) {
        const removed = sorted.shift();
        if (removed) {
          newSize -= JSON.stringify(removed[1]).length;
        }
      }

      return {
        entries: Object.fromEntries(sorted),
        size: newSize,
      };
    }

    return {
      entries: Object.fromEntries(validEntries),
      size: newSize,
    };
  },

  // Get cache statistics
  getStats: async (): Promise<{
    entryCount: number;
    totalSize: number;
    oldestEntry: number;
    totalHits: number;
  }> => {
    const cache = await storage.get();
    const entries = Object.values(cache.entries);

    return {
      entryCount: entries.length,
      totalSize: cache.totalSize,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : 0,
      totalHits: entries.reduce((sum, e) => sum + e.hitCount, 0),
    };
  },

  // Clear all cache
  clear: async () => {
    await storage.set(defaultCache);
  },
};
