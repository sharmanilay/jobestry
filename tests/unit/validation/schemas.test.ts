import { describe, it, expect } from 'vitest';
import {
  userProfileSchema,
  apiConfigSchema,
  applicationSchema,
  coverLetterRequestSchema,
  generateResponseRequestSchema,
  preferencesSchema,
} from '../../../packages/shared/lib/validation/schemas';

describe('Validation Schemas', () => {
  describe('userProfileSchema', () => {
    it('should validate a correct profile', () => {
      const profile = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        skills: ['JavaScript', 'React'],
      };
      const result = userProfileSchema.safeParse(profile);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const profile = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
      };
      const result = userProfileSchema.safeParse(profile);
      expect(result.success).toBe(false);
    });

    it('should reject empty first name', () => {
      const profile = {
        firstName: '',
        lastName: 'Doe',
        email: 'john@example.com',
      };
      const result = userProfileSchema.safeParse(profile);
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      const profile = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        linkedin: 'https://linkedin.com/in/johndoe',
      };
      const result = userProfileSchema.safeParse(profile);
      expect(result.success).toBe(true);
    });

    it('should reject invalid LinkedIn URL', () => {
      const profile = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        linkedin: 'not-a-url',
      };
      const result = userProfileSchema.safeParse(profile);
      expect(result.success).toBe(false);
    });
  });

  describe('apiConfigSchema', () => {
    it('should validate a full API config', () => {
      const config = {
        selectedProvider: 'gemini',
        gemini: { apiKey: 'AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz123456', usageCount: 0 },
        openai: { apiKey: '', usageCount: 0 },
        claude: { apiKey: '', usageCount: 0 },
      };
      const result = apiConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should use default provider', () => {
      const config = {
        gemini: { apiKey: 'AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz123456', usageCount: 0 },
        openai: { apiKey: '', usageCount: 0 },
        claude: { apiKey: '', usageCount: 0 },
      };
      const result = apiConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.selectedProvider).toBe('gemini');
      }
    });

    it('should accept different providers', () => {
      const config = {
        selectedProvider: 'openai',
        gemini: { apiKey: '', usageCount: 0 },
        openai: { apiKey: 'sk-test1234567890abcdef', usageCount: 0 },
        claude: { apiKey: '', usageCount: 0 },
      };
      const result = apiConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.selectedProvider).toBe('openai');
      }
    });
  });

  describe('applicationSchema', () => {
    it('should validate a correct application', () => {
      const app = {
        url: 'https://example.com/job/123',
        title: 'Software Engineer',
        company: 'Example Corp',
        status: 'saved' as const,
        source: 'manual' as const,
      };
      const result = applicationSchema.safeParse(app);
      expect(result.success).toBe(true);
    });

    it('should reject invalid URL', () => {
      const app = {
        url: 'not-a-url',
        title: 'Software Engineer',
        status: 'saved' as const,
        source: 'manual' as const,
      };
      const result = applicationSchema.safeParse(app);
      expect(result.success).toBe(false);
    });

    it('should reject invalid status', () => {
      const app = {
        url: 'https://example.com/job/123',
        title: 'Software Engineer',
        status: 'invalid' as any,
        source: 'manual' as const,
      };
      const result = applicationSchema.safeParse(app);
      expect(result.success).toBe(false);
    });
  });

  describe('coverLetterRequestSchema', () => {
    it('should validate a correct request', () => {
      const request = {
        jobDescription: 'We are looking for a software engineer...',
      };
      const result = coverLetterRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should reject empty job description', () => {
      const request = {
        jobDescription: '',
      };
      const result = coverLetterRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });
  });

  describe('generateResponseRequestSchema', () => {
    it('should validate a correct request', () => {
      const request = {
        question: 'Why do you want to work here?',
        jobDescription: 'We are looking for...',
        fieldType: 'textarea',
      };
      const result = generateResponseRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('should reject empty question', () => {
      const request = {
        question: '',
      };
      const result = generateResponseRequestSchema.safeParse(request);
      expect(result.success).toBe(false);
    });

    it('should accept optional fields', () => {
      const request = {
        question: 'Tell me about yourself',
      };
      const result = generateResponseRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });
  });

  describe('preferencesSchema', () => {
    it('should use default values', () => {
      const prefs = {};
      const result = preferencesSchema.safeParse(prefs);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tone).toBe('professional');
        expect(result.data.useFirstPerson).toBe(true);
      }
    });

    it('should validate correct preferences', () => {
      const prefs = {
        tone: 'friendly',
        writingStyle: 'casual',
        responseLength: 'short',
      };
      const result = preferencesSchema.safeParse(prefs);
      expect(result.success).toBe(true);
    });
  });
});
