import { createStorage, StorageEnum } from '../base/index.js';

interface JDStorage {
  manualJobDescription: string | null;
  lastUpdated: number;
}

const defaultJD: JDStorage = {
  manualJobDescription: null,
  lastUpdated: 0,
};

const storage = createStorage<JDStorage>('jobestry-manual-jd', defaultJD, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const jdStorage = {
  ...storage,
  setManualJD: async (jd: string) => {
    await storage.set({
      manualJobDescription: jd,
      lastUpdated: Date.now(),
    });
  },
  clearManualJD: async () => {
    await storage.set({
      manualJobDescription: null,
      lastUpdated: Date.now(),
    });
  },
};

export type { JDStorage };
