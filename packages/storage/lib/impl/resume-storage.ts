import { createStorage, StorageEnum } from '../base/index.js';

// Work experience interface
interface WorkExperience {
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
  highlights: string[];
}

// Education interface
interface Education {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  gpa?: string;
  highlights: string[];
}

// Project interface
interface Project {
  name: string;
  description: string;
  technologies: string[];
  url?: string;
  highlights: string[];
}

// Full resume data interface
interface ResumeData {
  rawText: string;
  fileName?: string;
  fileType?: string;
  parsedData: {
    summary?: string;
    experience: WorkExperience[];
    education: Education[];
    skills: string[];
    certifications: string[];
    projects: Project[];
    languages?: string[];
    achievements?: string[];
  };
  lastUpdated: number;
}

const defaultResumeData: ResumeData = {
  rawText: '',
  parsedData: {
    summary: '',
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    projects: [],
    languages: [],
    achievements: [],
  },
  lastUpdated: 0,
};

const storage = createStorage<ResumeData>('jobestry-resume-data', defaultResumeData, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const resumeStorage = {
  ...storage,

  // Update the raw text and timestamp
  updateRawText: async (text: string, fileName?: string, fileType?: string) => {
    await storage.set(current => ({
      ...current,
      rawText: text,
      fileName,
      fileType,
      lastUpdated: Date.now(),
    }));
  },

  // Update parsed data
  updateParsedData: async (parsedData: Partial<ResumeData['parsedData']>) => {
    await storage.set(current => ({
      ...current,
      parsedData: {
        ...current.parsedData,
        ...parsedData,
      },
      lastUpdated: Date.now(),
    }));
  },

  // Add a work experience entry
  addExperience: async (experience: WorkExperience) => {
    await storage.set(current => ({
      ...current,
      parsedData: {
        ...current.parsedData,
        experience: [...current.parsedData.experience, experience],
      },
      lastUpdated: Date.now(),
    }));
  },

  // Remove a work experience entry
  removeExperience: async (index: number) => {
    await storage.set(current => ({
      ...current,
      parsedData: {
        ...current.parsedData,
        experience: current.parsedData.experience.filter((_, i) => i !== index),
      },
      lastUpdated: Date.now(),
    }));
  },

  // Add an education entry
  addEducation: async (education: Education) => {
    await storage.set(current => ({
      ...current,
      parsedData: {
        ...current.parsedData,
        education: [...current.parsedData.education, education],
      },
      lastUpdated: Date.now(),
    }));
  },

  // Update skills
  updateSkills: async (skills: string[]) => {
    await storage.set(current => ({
      ...current,
      parsedData: {
        ...current.parsedData,
        skills,
      },
      lastUpdated: Date.now(),
    }));
  },

  // Add a project
  addProject: async (project: Project) => {
    await storage.set(current => ({
      ...current,
      parsedData: {
        ...current.parsedData,
        projects: [...current.parsedData.projects, project],
      },
      lastUpdated: Date.now(),
    }));
  },

  // Check if resume has been uploaded
  hasResume: async (): Promise<boolean> => {
    const data = await storage.get();
    return !!(data.rawText || data.parsedData.experience.length > 0);
  },

  // Clear all resume data
  clear: async () => {
    await storage.set(defaultResumeData);
  },
};

export type { WorkExperience, Education, Project, ResumeData };
