import { z } from 'zod';

export const userProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100, 'First name is too long'),
  lastName: z.string().min(1, 'Last name is required').max(100, 'Last name is too long'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')),
  github: z.string().url('Invalid GitHub URL').optional().or(z.literal('')),
  portfolio: z.string().url('Invalid portfolio URL').optional().or(z.literal('')),
  skills: z.array(z.string()).optional(),
});

export const apiConfigSchema = z.object({
  selectedProvider: z.enum(['gemini', 'openai', 'claude']).default('gemini'),
  gemini: z.object({
    apiKey: z.string(),
    usageCount: z.number().default(0),
  }),
  openai: z.object({
    apiKey: z.string(),
    usageCount: z.number().default(0),
  }),
  claude: z.object({
    apiKey: z.string(),
    usageCount: z.number().default(0),
  }),
});

export const applicationSchema = z.object({
  url: z.string().url('Invalid URL'),
  title: z.string().min(1, 'Title is required').max(200),
  company: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(['saved', 'applied', 'interview', 'offer', 'rejected']),
  source: z.enum(['manual', 'detected']),
  notes: z.string().optional(),
});

export const coverLetterRequestSchema = z.object({
  jobDescription: z.string().min(1, 'Job description is required').max(50000),
  userNotes: z.string().optional(),
  presetId: z.string().optional(),
});

export const generateResponseRequestSchema = z.object({
  question: z.string().min(1, 'Question is required').max(10000),
  jobDescription: z.string().optional(),
  fieldType: z.string().optional(),
  fieldLabel: z.string().optional(),
  maxLength: z.number().optional(),
  presetId: z.string().optional(),
});

export const preferencesSchema = z.object({
  tone: z.enum(['professional', 'confident', 'friendly', 'concise']).default('professional'),
  writingStyle: z.enum(['formal', 'casual', 'academic', 'creative']).default('formal'),
  responseLength: z.enum(['short', 'medium', 'long']).default('medium'),
  useFirstPerson: z.boolean().default(true),
  includeMetrics: z.boolean().default(true),
  emphasizeSkills: z.array(z.string()).optional(),
  avoidTopics: z.array(z.string()).optional(),
  customInstructions: z.string().optional(),
});

export const stylePresetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  tone: z.enum(['professional', 'confident', 'friendly', 'concise']).optional(),
  writingStyle: z.enum(['formal', 'casual', 'academic', 'creative']).optional(),
  responseLength: z.enum(['short', 'medium', 'long']).optional(),
  useFirstPerson: z.boolean().optional(),
  includeMetrics: z.boolean().optional(),
});

export type UserProfileInput = z.infer<typeof userProfileSchema>;
export type ApiConfigInput = z.infer<typeof apiConfigSchema>;
export type ApplicationInput = z.infer<typeof applicationSchema>;
export type CoverLetterRequestInput = z.infer<typeof coverLetterRequestSchema>;
export type GenerateResponseRequestInput = z.infer<typeof generateResponseRequestSchema>;
export type PreferencesInput = z.infer<typeof preferencesSchema>;
export type StylePresetInput = z.infer<typeof stylePresetSchema>;
