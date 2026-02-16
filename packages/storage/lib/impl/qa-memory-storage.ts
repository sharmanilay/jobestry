import { createStorage, StorageEnum } from '../base/index.js';

/**
 * Q&A Memory Storage
 *
 * Stores user's answers to common job application questions for reuse.
 * Enables semantic matching to suggest relevant past answers for similar questions.
 */

// Individual memory entry
interface QAMemoryEntry {
  id: string;
  questionPattern: string; // Normalized question text for matching
  questionHash: string; // For exact matching
  originalQuestion: string; // Original question text
  answer: string; // User's preferred response
  timesUsed: number; // Usage tracking
  lastUsed: number; // Timestamp
  confidence: number; // How well this matches similar questions (0-1)
  tags: string[]; // Categories/tags for better matching
  jobType?: string; // Optional job type context
}

// Full storage structure
interface QAMemory {
  entries: QAMemoryEntry[];
  totalSaved: number;
  lastUpdated: number;
}

const MAX_ENTRIES = 100; // Maximum stored Q&As

const defaultQAMemory: QAMemory = {
  entries: [],
  totalSaved: 0,
  lastUpdated: 0,
};

// Simple hash function for question matching
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

// Normalize question text for matching
const normalizeQuestion = (question: string): string =>
  question
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

// Extract keywords from a question
const extractKeywords = (question: string): string[] => {
  const stopWords = new Set([
    'a',
    'an',
    'the',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'can',
    'to',
    'of',
    'in',
    'for',
    'on',
    'with',
    'at',
    'by',
    'from',
    'or',
    'and',
    'but',
    'if',
    'then',
    'what',
    'why',
    'how',
    'when',
    'where',
    'who',
    'which',
    'your',
    'you',
    'please',
    'describe',
    'explain',
    'tell',
    'us',
    'about',
    'this',
    'that',
  ]);

  const normalized = normalizeQuestion(question);
  const words = normalized.split(' ').filter(w => w.length > 2);

  return words.filter(word => !stopWords.has(word));
};

// Calculate similarity score between two questions
const calculateSimilarity = (question1: string, question2: string): number => {
  const keywords1 = new Set(extractKeywords(question1));
  const keywords2 = new Set(extractKeywords(question2));

  if (keywords1.size === 0 || keywords2.size === 0) return 0;

  // Jaccard similarity
  const intersection = new Set([...keywords1].filter(x => keywords2.has(x)));
  const union = new Set([...keywords1, ...keywords2]);

  return intersection.size / union.size;
};

const storage = createStorage<QAMemory>('jobestry-qa-memory', defaultQAMemory, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const qaMemoryStorage = {
  ...storage,

  // Add or update a Q&A entry
  saveAnswer: async (question: string, answer: string, tags: string[] = [], jobType?: string) => {
    const normalized = normalizeQuestion(question);
    const hash = simpleHash(normalized);

    await storage.set(current => {
      // Check if this exact question already exists
      const existingIndex = current.entries.findIndex(e => e.questionHash === hash);

      if (existingIndex >= 0) {
        // Update existing entry
        const updated = [...current.entries];
        updated[existingIndex] = {
          ...updated[existingIndex],
          answer,
          timesUsed: updated[existingIndex].timesUsed + 1,
          lastUsed: Date.now(),
          tags: [...new Set([...updated[existingIndex].tags, ...tags])],
          jobType: jobType || updated[existingIndex].jobType,
        };

        return {
          ...current,
          entries: updated,
          lastUpdated: Date.now(),
        };
      }

      // Create new entry
      const newEntry: QAMemoryEntry = {
        id: `qa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        questionPattern: normalized,
        questionHash: hash,
        originalQuestion: question.slice(0, 500), // Store truncated original
        answer,
        timesUsed: 1,
        lastUsed: Date.now(),
        confidence: 1.0,
        tags,
        jobType,
      };

      // Add to entries, enforcing max limit
      let entries = [newEntry, ...current.entries];

      // If over limit, remove least used/oldest entries
      if (entries.length > MAX_ENTRIES) {
        entries = entries
          .sort((a, b) => {
            // Sort by times used (descending) then by last used (descending)
            if (b.timesUsed !== a.timesUsed) return b.timesUsed - a.timesUsed;
            return b.lastUsed - a.lastUsed;
          })
          .slice(0, MAX_ENTRIES);
      }

      return {
        entries,
        totalSaved: current.totalSaved + 1,
        lastUpdated: Date.now(),
      };
    });
  },

  // Find similar questions and their answers
  findSimilar: async (question: string, minSimilarity: number = 0.3): Promise<QAMemoryEntry[]> => {
    const memory = await storage.get();
    const normalized = normalizeQuestion(question);
    const hash = simpleHash(normalized);

    const matches: { entry: QAMemoryEntry; similarity: number }[] = [];

    for (const entry of memory.entries) {
      // Check for exact match first
      if (entry.questionHash === hash) {
        return [entry]; // Return exact match immediately
      }

      // Calculate similarity
      const similarity = calculateSimilarity(question, entry.originalQuestion);
      if (similarity >= minSimilarity) {
        matches.push({ entry, similarity });
      }
    }

    // Sort by similarity and return top matches
    return matches
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5)
      .map(m => m.entry);
  },

  // Get cached answer for exact question match
  getExactMatch: async (question: string): Promise<string | null> => {
    const memory = await storage.get();
    const normalized = normalizeQuestion(question);
    const hash = simpleHash(normalized);

    const entry = memory.entries.find(e => e.questionHash === hash);

    if (entry) {
      // Update usage stats
      await qaMemoryStorage.recordUsage(entry.id);
      return entry.answer;
    }

    return null;
  },

  // Record that an entry was used
  recordUsage: async (entryId: string) => {
    await storage.set(current => {
      const index = current.entries.findIndex(e => e.id === entryId);

      if (index < 0) return current;

      const updated = [...current.entries];
      updated[index] = {
        ...updated[index],
        timesUsed: updated[index].timesUsed + 1,
        lastUsed: Date.now(),
      };

      return {
        ...current,
        entries: updated,
        lastUpdated: Date.now(),
      };
    });
  },

  // Delete a specific entry
  deleteEntry: async (entryId: string) => {
    await storage.set(current => ({
      ...current,
      entries: current.entries.filter(e => e.id !== entryId),
      lastUpdated: Date.now(),
    }));
  },

  // Get statistics
  getStats: async (): Promise<{
    totalEntries: number;
    totalSaved: number;
    mostUsed: QAMemoryEntry[];
  }> => {
    const memory = await storage.get();

    return {
      totalEntries: memory.entries.length,
      totalSaved: memory.totalSaved,
      mostUsed: [...memory.entries].sort((a, b) => b.timesUsed - a.timesUsed).slice(0, 5),
    };
  },

  // Clear all memory
  clear: async () => {
    await storage.set(defaultQAMemory);
  },
};

export type { QAMemoryEntry, QAMemory };
