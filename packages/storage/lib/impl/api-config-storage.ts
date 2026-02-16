import { createStorage, StorageEnum } from '../base/index.js';

type AIProvider = 'gemini' | 'openai' | 'claude';

interface ProviderConfig {
  apiKey: string;
  keyAddedAt?: number;
  keyLastUsed?: number;
  keyLastError?: string;
  usageCount: number;
}

interface ApiConfig {
  selectedProvider: AIProvider;
  gemini: ProviderConfig;
  openai: ProviderConfig;
  claude: ProviderConfig;
}

const defaultApiConfig: ApiConfig = {
  selectedProvider: 'gemini',
  gemini: { apiKey: '', usageCount: 0 },
  openai: { apiKey: '', usageCount: 0 },
  claude: { apiKey: '', usageCount: 0 },
};

const storage = createStorage<ApiConfig>('jobestry-api-config', defaultApiConfig, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const apiConfigStorage = {
  ...storage,

  getSelectedProvider: async (): Promise<AIProvider> => {
    const config = await storage.get();
    return config.selectedProvider;
  },

  setSelectedProvider: async (provider: AIProvider) => {
    await storage.set(current => ({
      ...current,
      selectedProvider: provider,
    }));
  },

  setApiKey: async (provider: AIProvider, key: string) => {
    await storage.set(current => ({
      ...current,
      [provider]: {
        apiKey: key,
        keyAddedAt: Date.now(),
        keyLastError: undefined,
        usageCount: current[provider]?.usageCount ?? 0,
      },
    }));
  },

  getApiKey: async (provider?: AIProvider): Promise<string> => {
    const config = await storage.get();
    const selectedProvider = provider || config.selectedProvider;
    if (!config[selectedProvider]) {
      return '';
    }
    return config[selectedProvider].apiKey;
  },

  hasApiKey: async (provider?: AIProvider): Promise<boolean> => {
    const config = await storage.get();
    const selectedProvider = provider || config.selectedProvider;
    if (!config[selectedProvider]) {
      return false;
    }
    return !!config[selectedProvider].apiKey;
  },

  getAllProviderKeys: async (): Promise<Record<AIProvider, boolean>> => {
    const config = await storage.get();
    return {
      gemini: !!config.gemini.apiKey,
      openai: !!config.openai.apiKey,
      claude: !!config.claude.apiKey,
    };
  },

  recordUsage: async (provider?: AIProvider) => {
    const config = await storage.get();
    const selectedProvider = provider || config.selectedProvider;
    await storage.set(current => ({
      ...current,
      [selectedProvider]: {
        ...current[selectedProvider],
        keyLastUsed: Date.now(),
        usageCount: current[selectedProvider].usageCount + 1,
      },
    }));
  },

  recordError: async (error: string, provider?: AIProvider) => {
    const config = await storage.get();
    const selectedProvider = provider || config.selectedProvider;
    await storage.set(current => ({
      ...current,
      [selectedProvider]: {
        ...current[selectedProvider],
        keyLastError: error,
      },
    }));
  },

  clearApiKey: async (provider?: AIProvider) => {
    const config = await storage.get();
    const selectedProvider = provider || config.selectedProvider;
    await storage.set(current => ({
      ...current,
      [selectedProvider]: { apiKey: '', usageCount: 0 },
    }));
  },

  isValidKeyFormat: (provider: AIProvider, key: string): boolean => {
    if (!key) return false;
    switch (provider) {
      case 'gemini':
        return key.length >= 30 && key.length <= 50 && key.startsWith('AI');
      case 'openai':
        return key.startsWith('sk-') && key.length >= 40;
      case 'claude':
        return key.startsWith('sk-ant-') && key.length >= 50;
      default:
        return false;
    }
  },

  maskApiKey: (key: string): string => {
    if (key.length <= 8) return '••••••••';
    return `${key.slice(0, 4)}${'•'.repeat(key.length - 8)}${key.slice(-4)}`;
  },
};

export type { AIProvider, ProviderConfig, ApiConfig };
