import { createStorage, StorageEnum } from '../base/index.js';

// User profile data interface
interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
  customUrls: { label: string; url: string }[];
}

const defaultProfile: UserProfile = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  github: '',
  portfolio: '',
  customUrls: [],
};

const storage = createStorage<UserProfile>('jobestry-user-profile', defaultProfile, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const userProfileStorage = {
  ...storage,
  updateField: async <K extends keyof UserProfile>(field: K, value: UserProfile[K]) => {
    await storage.set(current => ({
      ...current,
      [field]: value,
    }));
  },
  addCustomUrl: async (label: string, url: string) => {
    await storage.set(current => ({
      ...current,
      customUrls: [...current.customUrls, { label, url }],
    }));
  },
  removeCustomUrl: async (index: number) => {
    await storage.set(current => ({
      ...current,
      customUrls: current.customUrls.filter((_, i) => i !== index),
    }));
  },
  isComplete: async (): Promise<boolean> => {
    const profile = await storage.get();
    return !!(profile.firstName && profile.lastName && profile.email);
  },
};

export type { UserProfile };
