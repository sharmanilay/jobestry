import { describe, it, expect, vi, beforeEach } from 'vitest';
import { wordCount, extractBulletLines, extractKeywords } from '../../../pages/content-ui/src/matches/all/job-utils';

describe('job-utils', () => {
  describe('wordCount', () => {
    it('should return 0 for empty string', () => {
      expect(wordCount('')).toBe(0);
    });

    it('should return 0 for whitespace only', () => {
      expect(wordCount('   \n\t  ')).toBe(0);
    });

    it('should count single word', () => {
      expect(wordCount('hello')).toBe(1);
    });

    it('should count multiple words', () => {
      expect(wordCount('hello world test')).toBe(3);
    });

    it('should handle extra whitespace', () => {
      expect(wordCount('  hello   world  ')).toBe(2);
    });

    it('should handle newlines and tabs', () => {
      expect(wordCount('hello\nworld\ttest')).toBe(3);
    });
  });

  describe('extractBulletLines', () => {
    it('should return empty array for empty string', () => {
      expect(extractBulletLines('')).toEqual([]);
    });

    it('should extract bullet points', () => {
      const text = `
- First bullet point here is quite long
- Second bullet point here also long
- Third bullet point here also long
      `;
      const result = extractBulletLines(text);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle different bullet styles', () => {
      const text = `
• Bullet one here is long
‣ Bullet two here is long
▪ Bullet three here is long
– Bullet four here is long
— Bullet five here is long
      `;
      const result = extractBulletLines(text);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by length (20-140 chars)', () => {
      const text = `
- Short
- This is a valid bullet point that should be included in the results because it has enough characters
      `;
      const result = extractBulletLines(text);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it('should limit results to max', () => {
      const text = `
- Point one that is valid and has enough characters to pass
- Point two that is valid and has enough characters to pass
- Point three that is valid and has enough characters to pass
- Point four that is valid and has enough characters to pass
- Point five that is valid and has enough characters to pass
      `;
      const result = extractBulletLines(text, 3);
      expect(result).toHaveLength(3);
    });

    it('should fallback to sentences when no bullets', () => {
      const text =
        'This is a longer sentence that is more than forty characters long. Another sentence here also is more than forty characters long and should be included.';
      const result = extractBulletLines(text);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('extractKeywords', () => {
    it('should return empty array for empty string', () => {
      expect(extractKeywords('')).toEqual([]);
    });

    it('should extract single word keywords', () => {
      const text = 'JavaScript React TypeScript Node.js Python';
      const result = extractKeywords(text);
      const resultLower = result.map(k => k.toLowerCase());
      expect(resultLower).toContain('javascript');
      expect(resultLower).toContain('react');
      expect(resultLower).toContain('typescript');
    });

    it('should extract bigrams', () => {
      const text = 'machine learning and data science with python';
      const result = extractKeywords(text);
      const resultLower = result.map(k => k.toLowerCase());
      expect(resultLower).toContain('machine learning');
      expect(resultLower).toContain('data science');
    });

    it('should filter out stop words', () => {
      const text = 'the and but or for with from about';
      const result = extractKeywords(text);
      expect(result).toHaveLength(0);
    });

    it('should filter out numbers only', () => {
      const text = '2024 12345 test 999 more';
      const result = extractKeywords(text);
      expect(result.some(k => k.toLowerCase() === 'test')).toBe(true);
      expect(result.some(k => k === '2024')).toBe(false);
    });

    it('should limit results to max', () => {
      const text =
        'react angular vue svelte javascript typescript python java ruby go rust swift kotlin perl php html css';
      const result = extractKeywords(text, 5);
      expect(result).toHaveLength(5);
    });

    it('should convert to title case', () => {
      const text = 'full stack developer engineer';
      const result = extractKeywords(text);
      expect(result[0]).toMatch(/^[A-Z]/);
    });

    it('should handle technical terms with special chars', () => {
      const text = 'node.js react-native sql rest api';
      const result = extractKeywords(text);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
