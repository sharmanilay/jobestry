/**
 * Batch Processor for Jobestry
 *
 * Handles batch generation of AI responses for multiple form fields
 * in a single optimized API call, dramatically reducing total fill time.
 */

import { buildSystemPrompt, STYLE_PRESETS } from './prompts';
import {
  apiConfigStorage,
  userProfileStorage,
  resumeStorage,
  preferencesStorage,
  aiCacheStorage,
} from '@extension/storage';
import type { StylePreset } from './prompts';
import type { UserProfile, ResumeData, UserPreferences } from '@extension/storage';

// Types for batch processing
export interface BatchFieldInfo {
  index: number;
  fieldType: string;
  label: string;
  placeholder?: string;
  maxLength?: number;
  isRequired: boolean;
  currentValue?: string;
}

export interface BatchGenerationRequest {
  fields: BatchFieldInfo[];
  jobDescription?: string;
  presetId?: string;
}

export interface BatchFieldResponse {
  index: number;
  response: string;
  cached: boolean;
  error?: string;
}

export interface BatchGenerationResponse {
  success: boolean;
  responses: BatchFieldResponse[];
  totalTime: number;
  error?: string;
}

// Gemini API response type
interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
    };
    finishReason: string;
  }[];
}

// Build context from user data (shared with gemini-service)
const buildUserContext = (profile: UserProfile, resume: ResumeData): string => {
  const parts: string[] = [];

  if (profile.firstName || profile.lastName) {
    parts.push(`Name: ${profile.firstName} ${profile.lastName}`.trim());
  }
  if (profile.email) parts.push(`Email: ${profile.email}`);
  if (profile.phone) parts.push(`Phone: ${profile.phone}`);
  if (profile.location) parts.push(`Location: ${profile.location}`);
  if (profile.linkedin) parts.push(`LinkedIn: ${profile.linkedin}`);
  if (profile.github) parts.push(`GitHub: ${profile.github}`);

  if (resume.parsedData.summary) {
    parts.push(`\nProfessional Summary:\n${resume.parsedData.summary}`);
  }

  if (resume.parsedData.experience.length > 0) {
    parts.push('\nWork Experience:');
    resume.parsedData.experience.forEach(exp => {
      parts.push(`- ${exp.title} at ${exp.company} (${exp.startDate} - ${exp.endDate || 'Present'})`);
      if (exp.description) parts.push(`  ${exp.description}`);
    });
  }

  if (resume.parsedData.education.length > 0) {
    parts.push('\nEducation:');
    resume.parsedData.education.forEach(edu => {
      parts.push(`- ${edu.degree} in ${edu.field} from ${edu.institution}`);
    });
  }

  if (resume.parsedData.skills.length > 0) {
    parts.push(`\nSkills: ${resume.parsedData.skills.join(', ')}`);
  }

  if (resume.parsedData.projects.length > 0) {
    parts.push('\nProjects:');
    resume.parsedData.projects.forEach(proj => {
      parts.push(`- ${proj.name}: ${proj.description}`);
    });
  }

  if (parts.length <= 6 && resume.rawText) {
    parts.push(`\nResume Content:\n${resume.rawText.slice(0, 3000)}`);
  }

  return parts.join('\n');
};

// Comprehensive input sanitization to prevent prompt injection
const sanitizeInput = (input: string): string => {
  if (!input) return '';

  let sanitized = input;

  sanitized = sanitized.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

  return sanitized;
};

// Get preset or return null
const getPresetOrDefaults = (presetId?: string): StylePreset | null => {
  if (!presetId) return null;
  return STYLE_PRESETS.find(p => p.id === presetId) || null;
};

// Build batch system prompt
const buildBatchSystemPrompt = (preferences: UserPreferences, presetId?: string): string => {
  const preset = getPresetOrDefaults(presetId);

  const basePrompt = buildSystemPrompt({
    tone: preset?.tone || preferences.tone,
    writingStyle: preset?.writingStyle || preferences.writingStyle,
    responseLength: preset?.responseLength || preferences.responseLength,
    useFirstPerson: preset?.useFirstPerson ?? preferences.useFirstPerson,
    includeMetrics: preset?.includeMetrics ?? preferences.includeMetrics,
    emphasizeSkills: preferences.emphasizeSkills,
    avoidTopics: preferences.avoidTopics,
    customInstructions: preferences.customInstructions,
  });

  return `${basePrompt}

BATCH RESPONSE INSTRUCTIONS:
You are answering multiple job application questions. For each question, provide a tailored response.

OUTPUT FORMAT (CRITICAL - follow exactly):
Return a JSON array where each element has:
- "index": the question number (matching the input)
- "response": your answer text

Example output:
[
  {"index": 0, "response": "Your answer to question 0..."},
  {"index": 1, "response": "Your answer to question 1..."}
]

IMPORTANT:
- Return ONLY the JSON array, no other text
- Each response should be complete and ready to paste into the form
- Respect any character limits mentioned
- Make answers specific to the candidate and job, not generic`;
};

// Call Gemini API for batch generation
const callGeminiBatchApi = async (apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096, // Higher limit for batch responses
        topP: 0.8,
        topK: 40,
      },
      // Safety settings: Block responses only when harm detection is HIGH confidence
      // This allows helpful AI responses while still blocking genuinely harmful content
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `API error: ${response.status}`;
    throw new Error(errorMessage);
  }

  const data: GeminiResponse = await response.json();

  if (!data.candidates || data.candidates.length === 0) {
    throw new Error('No response generated');
  }

  const candidate = data.candidates[0];
  if (candidate.finishReason === 'SAFETY') {
    throw new Error('Response blocked by safety filters');
  }

  return candidate.content.parts
    .map(p => p.text)
    .join('')
    .trim();
};

// Parse the batch JSON response
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const parseBatchResponse = (rawResponse: string, _expectedCount: number): { index: number; response: string }[] => {
  // Extract JSON from response (handle markdown code blocks)
  let jsonStr = rawResponse;

  // Remove markdown code blocks if present
  const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // Try to find JSON array in the response
  const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    jsonStr = arrayMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonStr);

    if (!Array.isArray(parsed)) {
      throw new Error('Response is not an array');
    }

    return parsed.map(item => ({
      index: typeof item.index === 'number' ? item.index : parseInt(item.index, 10),
      response: String(item.response || ''),
    }));
  } catch (parseError) {
    console.error('[Jobestry Batch] Failed to parse response:', parseError);

    // Fallback: try to extract responses manually
    return [];
  }
};

// Main batch generation function
export const generateBatchResponses = async (request: BatchGenerationRequest): Promise<BatchGenerationResponse> => {
  const startTime = Date.now();

  try {
    // Get API key
    const apiKey = await apiConfigStorage.getApiKey();
    if (!apiKey) {
      return {
        success: false,
        responses: [],
        totalTime: Date.now() - startTime,
        error: 'API key not configured',
      };
    }

    // Filter out fields that already have cached responses
    const uncachedFields: BatchFieldInfo[] = [];
    const cachedResponses: BatchFieldResponse[] = [];
    const cacheContext = request.jobDescription || '';

    for (const field of request.fields) {
      const questionKey = field.label || field.placeholder || `field_${field.index}`;
      const cached = await aiCacheStorage.getCached(questionKey, cacheContext);

      if (cached) {
        cachedResponses.push({
          index: field.index,
          response: cached,
          cached: true,
        });
      } else {
        uncachedFields.push(field);
      }
    }

    // If all responses are cached, return immediately
    if (uncachedFields.length === 0) {
      return {
        success: true,
        responses: cachedResponses,
        totalTime: Date.now() - startTime,
      };
    }

    // Get user data
    const [profile, resume, preferences] = await Promise.all([
      userProfileStorage.get(),
      resumeStorage.get(),
      preferencesStorage.get(),
    ]);

    // Build prompts
    const systemPrompt = buildBatchSystemPrompt(preferences, request.presetId);
    const userContext = buildUserContext(profile, resume);

    // Build batch user prompt
    let userPrompt = `Generate responses for the following job application questions:\n\n`;

    if (request.jobDescription) {
      userPrompt += `<job_context>\n${sanitizeInput(request.jobDescription.slice(0, 5000))}\n</job_context>\n\n`;
    }

    userPrompt += `<user_data>\n${sanitizeInput(userContext)}\n</user_data>\n\n`;
    userPrompt += `<questions>\n`;

    uncachedFields.forEach(field => {
      const question = field.label || field.placeholder || 'Unknown question';
      userPrompt += `[Question ${field.index}]: ${sanitizeInput(question)}`;
      if (field.maxLength) {
        userPrompt += ` (max ${field.maxLength} characters)`;
      }
      if (field.isRequired) {
        userPrompt += ` [REQUIRED]`;
      }
      userPrompt += `\n`;
    });

    userPrompt += `</questions>\n\n`;
    userPrompt += `Respond with a JSON array containing an answer for each question listed above.`;

    // Call API
    const rawResponse = await callGeminiBatchApi(apiKey, systemPrompt, userPrompt);

    // Record usage
    await apiConfigStorage.recordUsage();

    // Parse response
    const parsedResponses = parseBatchResponse(rawResponse, uncachedFields.length);

    // Build response array and cache results
    const freshResponses: BatchFieldResponse[] = [];

    for (const field of uncachedFields) {
      const matchingResponse = parsedResponses.find(r => r.index === field.index);

      if (matchingResponse && matchingResponse.response) {
        // Cache this response
        const questionKey = field.label || field.placeholder || `field_${field.index}`;
        await aiCacheStorage.cacheResponse(questionKey, cacheContext, matchingResponse.response, false);

        freshResponses.push({
          index: field.index,
          response: matchingResponse.response,
          cached: false,
        });
      } else {
        freshResponses.push({
          index: field.index,
          response: '',
          cached: false,
          error: 'No response generated for this field',
        });
      }
    }

    // Combine cached and fresh responses
    const allResponses = [...cachedResponses, ...freshResponses].sort((a, b) => a.index - b.index);

    return {
      success: true,
      responses: allResponses,
      totalTime: Date.now() - startTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await apiConfigStorage.recordError(errorMessage);

    return {
      success: false,
      responses: [],
      totalTime: Date.now() - startTime,
      error: errorMessage,
    };
  }
};

// Export helper for getting estimated batch time
export const estimateBatchTime = (fieldCount: number): number => {
  // Base API call time + small per-field overhead
  const baseTime = 2000; // 2 seconds for API round trip
  const perFieldTime = 200; // 0.2 seconds per field
  return baseTime + fieldCount * perFieldTime;
};
