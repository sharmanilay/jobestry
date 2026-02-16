import { createStorage, StorageEnum } from '../base/index.js';

type ApplicationStatus = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected';

type ApplicationSource = 'manual' | 'detected';

interface TrackedApplication {
  url: string;
  title: string;
  company?: string;
  location?: string;
  status: ApplicationStatus;
  source: ApplicationSource;
  createdAt: number;
  updatedAt: number;
  notes?: string;
}

interface ApplicationsState {
  applications: TrackedApplication[];
}

const DEFAULT_STATE: ApplicationsState = {
  applications: [],
};

const storage = createStorage<ApplicationsState>('jobestry-applications', DEFAULT_STATE, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

const upsertApplication = (state: ApplicationsState, app: TrackedApplication): ApplicationsState => {
  const existingIndex = state.applications.findIndex(a => a.url === app.url);

  if (existingIndex === -1) {
    return {
      applications: [app, ...state.applications],
    };
  }

  const next = [...state.applications];
  next[existingIndex] = {
    ...next[existingIndex],
    ...app,
    createdAt: next[existingIndex].createdAt,
    updatedAt: Date.now(),
  };

  return { applications: next };
};

export const applicationsStorage = {
  ...storage,
  upsert: async (input: {
    url: string;
    title: string;
    company?: string;
    location?: string;
    status?: ApplicationStatus;
    source?: ApplicationSource;
    notes?: string;
  }) => {
    const now = Date.now();
    await storage.set(prev => {
      const normalizedUrl = input.url.trim();
      const app: TrackedApplication = {
        url: normalizedUrl,
        title: input.title.trim() || 'Untitled role',
        company: input.company?.trim() || undefined,
        location: input.location?.trim() || undefined,
        status: input.status ?? 'saved',
        source: input.source ?? 'manual',
        createdAt: now,
        updatedAt: now,
        notes: input.notes?.trim() || undefined,
      };

      return upsertApplication(prev, app);
    });
  },
  updateStatus: async (url: string, status: ApplicationStatus) => {
    await storage.set(prev => {
      const index = prev.applications.findIndex(a => a.url === url);
      if (index === -1) return prev;

      const next = [...prev.applications];
      next[index] = { ...next[index], status, updatedAt: Date.now() };
      return { applications: next };
    });
  },
  remove: async (url: string) => {
    await storage.set(prev => ({
      applications: prev.applications.filter(a => a.url !== url),
    }));
  },
};

export type { ApplicationStatus, ApplicationSource, TrackedApplication, ApplicationsState };
