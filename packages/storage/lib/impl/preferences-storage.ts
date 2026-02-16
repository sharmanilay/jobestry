import { createStorage, StorageEnum } from '../base/index.js';

// Tone options for AI responses
type ToneType = 'professional' | 'friendly' | 'enthusiastic' | 'concise';

// Writing style options
type WritingStyleType = 'formal' | 'casual' | 'balanced';

// Response length options
type ResponseLengthType = 'short' | 'medium' | 'detailed';

// User preferences interface
interface UserPreferences {
  enabled: boolean;
  tone: ToneType;
  writingStyle: WritingStyleType;
  responseLength: ResponseLengthType;
  emphasizeSkills: string[];
  avoidTopics: string[];
  includeMetrics: boolean;
  useFirstPerson: boolean;
  customInstructions?: string;
  stylePresetId?: string;
  // User-added domains for the extension to access
  userAllowedDomains: string[];
}

const defaultPreferences: UserPreferences = {
  enabled: true,
  tone: 'professional',
  writingStyle: 'balanced',
  responseLength: 'medium',
  emphasizeSkills: [],
  avoidTopics: [],
  includeMetrics: true,
  useFirstPerson: true,
  customInstructions: '',
  stylePresetId: 'professional',
  userAllowedDomains: [],
};

const storage = createStorage<UserPreferences>('jobestry-user-preferences', defaultPreferences, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

const preferencesStorage = {
  ...storage,

  // Get enabled state
  isEnabled: async (): Promise<boolean> => {
    const prefs = await storage.get();
    return prefs.enabled;
  },

  // Set enabled state
  setEnabled: async (enabled: boolean) => {
    await storage.set(current => ({
      ...current,
      enabled,
    }));
  },

  // Update a single preference
  updatePreference: async <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    await storage.set(current => ({
      ...current,
      [key]: value,
    }));
  },

  // Add a skill to emphasize
  addEmphasizedSkill: async (skill: string) => {
    await storage.set(current => ({
      ...current,
      emphasizeSkills: [...new Set([...current.emphasizeSkills, skill])],
    }));
  },

  // Remove an emphasized skill
  removeEmphasizedSkill: async (skill: string) => {
    await storage.set(current => ({
      ...current,
      emphasizeSkills: current.emphasizeSkills.filter(s => s !== skill),
    }));
  },

  // Add a topic to avoid
  addAvoidTopic: async (topic: string) => {
    await storage.set(current => ({
      ...current,
      avoidTopics: [...new Set([...current.avoidTopics, topic])],
    }));
  },

  // Remove an avoid topic
  removeAvoidTopic: async (topic: string) => {
    await storage.set(current => ({
      ...current,
      avoidTopics: current.avoidTopics.filter(t => t !== topic),
    }));
  },

  // Add a domain to allowed list (user can extend permissions)
  addAllowedDomain: async (domain: string) => {
    // Normalize domain format
    let normalized = domain.trim().toLowerCase();
    // Remove protocol if present
    normalized = normalized.replace(/^https?:\/\//, '').replace(/\/[^/]*$/, '');
    // Add wildcard if not present
    if (!normalized.startsWith('*://') && !normalized.startsWith('*.')) {
      normalized = `*.${normalized}`;
    }

    await storage.set(current => ({
      ...current,
      userAllowedDomains: [...new Set([...current.userAllowedDomains, normalized])],
    }));
  },

  // Remove a domain from allowed list
  removeAllowedDomain: async (domain: string) => {
    await storage.set(current => ({
      ...current,
      userAllowedDomains: current.userAllowedDomains.filter(d => d !== domain),
    }));
  },

  // Reset to defaults
  reset: async () => {
    await storage.set(defaultPreferences);
  },

  setStylePresetId: async (presetId: string) => {
    await storage.set(current => ({
      ...current,
      stylePresetId: presetId,
    }));
  },

  // Get tone description for AI prompts
  getToneDescription: (tone: ToneType): string => {
    const descriptions: Record<ToneType, string> = {
      professional: 'formal and business-appropriate',
      friendly: 'warm and approachable while remaining professional',
      enthusiastic: 'energetic and excited about opportunities',
      concise: 'direct and to-the-point',
    };
    return descriptions[tone];
  },

  // Get style description for AI prompts
  getStyleDescription: (style: WritingStyleType): string => {
    const descriptions: Record<WritingStyleType, string> = {
      formal: 'using formal language and structure',
      casual: 'using conversational but professional language',
      balanced: 'using a mix of formal and approachable language',
    };
    return descriptions[style];
  },
};

export { preferencesStorage };
export type { ToneType, WritingStyleType, ResponseLengthType, UserPreferences };
