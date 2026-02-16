import { createStorage, StorageEnum } from '../base/index.js';

// Cover letter template interface
interface CoverLetterTemplate {
  template: string;
  enabled: boolean;
}

const defaultTemplate: CoverLetterTemplate = {
  template: '',
  enabled: false,
};

const storage = createStorage<CoverLetterTemplate>('jobestry-cover-letter-template', defaultTemplate, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const coverLetterTemplateStorage = {
  ...storage,

  // Update template
  updateTemplate: async (template: string) => {
    await storage.set(current => ({
      ...current,
      template: template.trim(),
    }));
  },

  // Enable/disable template
  setEnabled: async (enabled: boolean) => {
    await storage.set(current => ({
      ...current,
      enabled,
    }));
  },

  // Get template if enabled
  getActiveTemplate: async (): Promise<string | null> => {
    const data = await storage.get();
    if (data.enabled && data.template.trim()) {
      return data.template.trim();
    }
    return null;
  },
};

export type { CoverLetterTemplate };
