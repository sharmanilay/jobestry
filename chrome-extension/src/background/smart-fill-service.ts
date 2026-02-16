/**
 * Smart Fill Service
 *
 * Generates responses for all form fields in one API call using the
 * faster gemini-2.5-flash-lite model with context caching.
 */

import { buildSystemPrompt as buildSystemPromptFromTemplates } from './prompts';
import { apiConfigStorage, userProfileStorage, resumeStorage, preferencesStorage } from '@extension/storage';
import type { UserProfile, ResumeData } from '@extension/storage';

// Available models
const MODEL_FLASH_LITE = 'gemini-2.5-flash-lite';
const MODEL_FLASH = 'gemini-2.5-flash';

// Field structure for smart fill
interface SmartFillField {
  index: number;
  fieldType: string;
  label: string;
  maxLength?: number;
  isRequired: boolean;
}

// Request type
export interface SmartFillRequest {
  type: 'SMART_FILL';
  fields: SmartFillField[];
  jobDescription: string;
  userNotes?: string;
  stylePreset?: string;
}

// Response type
export interface SmartFillResponse {
  success: boolean;
  responses?: { index: number; content: string; isCoverLetter: boolean }[];
  error?: string;
}

// Single field generation request (for per-field popup)
export interface FieldGenerateRequest {
  type: 'GENERATE_FIELD_RESPONSE';
  fieldIndex: number;
  question: string;
  fieldType: string;
  fieldLabel?: string;
  jobDescription?: string;
  userNotes?: string;
  maxLength?: number;
  useFastModel?: boolean;
}

/**
 * Builds a condensed resume summary optimized for token usage in API calls.
 * Prioritizes raw resume text if available, otherwise uses parsed data.
 *
 * @param profile - User profile data
 * @param resume - Resume data (raw text preferred)
 * @returns Condensed string summary of user's background
 */
const buildResumeSummary = (profile: UserProfile, resume: ResumeData): string => {
  const parts: string[] = [];

  // Name and contact
  if (profile.firstName || profile.lastName) {
    parts.push(`Name: ${profile.firstName} ${profile.lastName}`.trim());
  }
  if (profile.email) parts.push(`Email: ${profile.email}`);
  if (profile.location) parts.push(`Location: ${profile.location}`);

  // If we have raw resume text, include it directly (truncated for token limits)
  if (resume.rawText && resume.rawText.trim().length > 0) {
    // Include up to 3000 chars of raw resume text
    const truncatedResume = resume.rawText.slice(0, 3000);
    parts.push(`\nRESUME:\n${truncatedResume}`);
    return parts.join('\n');
  }

  // Fallback to parsed fields if no raw text
  if (resume.parsedData.summary) {
    parts.push(`Summary: ${resume.parsedData.summary.slice(0, 300)}`);
  }

  if (resume.parsedData.experience.length > 0) {
    const expSummary = resume.parsedData.experience
      .slice(0, 3)
      .map(exp => `${exp.title} at ${exp.company}`)
      .join(', ');
    parts.push(`Experience: ${expSummary}`);
  }

  if (resume.parsedData.skills.length > 0) {
    parts.push(`Skills: ${resume.parsedData.skills.slice(0, 15).join(', ')}`);
  }

  if (resume.parsedData.education.length > 0) {
    const eduSummary = resume.parsedData.education
      .slice(0, 2)
      .map(edu => `${edu.degree} in ${edu.field}`)
      .join(', ');
    parts.push(`Education: ${eduSummary}`);
  }

  return parts.join('\n');
};

// Build detailed context for full generation
const buildDetailedContext = (profile: UserProfile, resume: ResumeData): string => {
  const parts: string[] = [];

  // Profile info
  if (profile.firstName || profile.lastName) {
    parts.push(`Name: ${profile.firstName} ${profile.lastName}`.trim());
  }
  if (profile.email) parts.push(`Email: ${profile.email}`);
  if (profile.phone) parts.push(`Phone: ${profile.phone}`);
  if (profile.location) parts.push(`Location: ${profile.location}`);
  if (profile.linkedin) parts.push(`LinkedIn: ${profile.linkedin}`);
  if (profile.github) parts.push(`GitHub: ${profile.github}`);

  // If we have raw resume text, include it directly (up to 5000 chars for detailed context)
  if (resume.rawText && resume.rawText.trim().length > 0) {
    const truncatedResume = resume.rawText.slice(0, 5000);
    parts.push(`\nFULL RESUME:\n${truncatedResume}`);
    return parts.join('\n');
  }

  // Fallback to parsed fields if no raw text
  if (resume.parsedData.summary) {
    parts.push(`\nProfessional Summary:\n${resume.parsedData.summary}`);
  }

  if (resume.parsedData.experience.length > 0) {
    parts.push('\nWork Experience:');
    resume.parsedData.experience.forEach(exp => {
      parts.push(`- ${exp.title} at ${exp.company} (${exp.startDate} - ${exp.endDate || 'Present'})`);
      if (exp.description) parts.push(`  ${exp.description.slice(0, 200)}`);
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
      parts.push(`- ${proj.name}: ${proj.description.slice(0, 100)}`);
    });
  }

  return parts.join('\n');
};

/**
 * Calls Gemini API with configurable model and options.
 * Used by smart fill service for faster, cost-effective responses.
 *
 * @param apiKey - Gemini API key
 * @param systemPrompt - System instructions
 * @param userPrompt - User prompt/question
 * @param options - Model selection and generation parameters
 * @returns Generated text response
 */
const callGeminiApi = async (
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    responseFormat?: 'text' | 'json';
  } = {},
): Promise<string> => {
  const model = options.model || MODEL_FLASH;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const generationConfig: Record<string, unknown> = {
    temperature: options.temperature ?? 0.7,
    maxOutputTokens: options.maxTokens ?? 1024,
    topP: 0.8,
    topK: 40,
  };

  // Add JSON mode if requested
  if (options.responseFormat === 'json') {
    generationConfig.responseMimeType = 'application/json';
  }

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
      generationConfig,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API request failed');
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No response generated');
  }

  return text;
};

/**
 * Generates a response for a single form field.
 * Optimized for speed using flash-lite model when useFastModel is true.
 * Used by the popup interface for quick field generation.
 *
 * @param request - Field generation request with question and context
 * @returns Response object with generated text or error
 */
export const generateFieldResponse = async (
  request: FieldGenerateRequest,
): Promise<{
  success: boolean;
  response?: string;
  error?: string;
}> => {
  try {
    const [hasApiKey, profile, resume, preferences] = await Promise.all([
      apiConfigStorage.hasApiKey(),
      userProfileStorage.get(),
      resumeStorage.get(),
      preferencesStorage.get(),
    ]);

    if (!hasApiKey) {
      return { success: false, error: 'API key not configured' };
    }

    const resumeSummary = request.useFastModel
      ? buildResumeSummary(profile, resume)
      : buildDetailedContext(profile, resume);

    const systemPrompt = buildSystemPromptFromTemplates({
      tone: preferences.tone,
      writingStyle: preferences.writingStyle,
      responseLength: preferences.responseLength,
      useFirstPerson: preferences.useFirstPerson,
      includeMetrics: preferences.includeMetrics,
      emphasizeSkills: preferences.emphasizeSkills,
      avoidTopics: preferences.avoidTopics,
      customInstructions: preferences.customInstructions,
    });

    let userPrompt = `FIELD: ${request.fieldLabel || request.question}\nTYPE: ${request.fieldType}`;

    if (request.jobDescription) {
      userPrompt += `\n\nJOB DESCRIPTION:\n${request.jobDescription.slice(0, 1500)}`;
    }

    userPrompt += `\n\nCANDIDATE:\n${resumeSummary}`;

    if (request.userNotes) {
      userPrompt += `\n\nUSER NOTES: ${request.userNotes}`;
    }

    if (request.maxLength) {
      userPrompt += `\n\nMAX LENGTH: ${request.maxLength} characters`;
    }

    userPrompt += '\n\nGenerate a response for this field. Return ONLY the response text, no explanations.';

    const model = request.useFastModel ? MODEL_FLASH_LITE : MODEL_FLASH;
    const apiKey = await apiConfigStorage.getApiKey();
    const response = await callGeminiApi(apiKey, systemPrompt, userPrompt, {
      model,
      maxTokens: request.maxLength ? Math.min(request.maxLength / 3, 1024) : 512,
      temperature: 0.7,
    });

    return { success: true, response: response.trim() };
  } catch (error) {
    console.error('[SmartFill] Field generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate response',
    };
  }
};

// Smart fill: Generate all fields in one call
export const smartFill = async (request: SmartFillRequest): Promise<SmartFillResponse> => {
  try {
    const [hasApiKey, profile, resume, preferences] = await Promise.all([
      apiConfigStorage.hasApiKey(),
      userProfileStorage.get(),
      resumeStorage.get(),
      preferencesStorage.get(),
    ]);

    if (!hasApiKey) {
      return { success: false, error: 'API key not configured' };
    }

    const resumeContext = buildDetailedContext(profile, resume);

    // Filter to only AI-generatable fields (not simple profile fields)
    const aiFields = request.fields.filter(
      f =>
        ![
          'firstName',
          'lastName',
          'fullName',
          'email',
          'phone',
          'location',
          'linkedin',
          'github',
          'portfolio',
        ].includes(f.fieldType),
    );

    if (aiFields.length === 0) {
      return { success: true, responses: [] };
    }

    // Build the smart fill prompt
    const systemPrompt = `You are an expert job application assistant. Generate thoughtful, personalized responses for job application fields based on the candidate's resume and the job description.

STYLE:
- Tone: ${preferences.tone}
- Style: ${preferences.writingStyle}
- Use first person
${preferences.emphasizeSkills?.length ? `- Emphasize: ${preferences.emphasizeSkills.join(', ')}` : ''}
${preferences.avoidTopics?.length ? `- Avoid: ${preferences.avoidTopics.join(', ')}` : ''}
${preferences.customInstructions ? `- Instructions: ${preferences.customInstructions}` : ''}

Respond with a JSON object where keys are field indices and values are the generated responses. Example:
{"0": "Response for field 0", "1": "Response for field 1"}`;

    let userPrompt = `JOB DESCRIPTION:\n${request.jobDescription.slice(0, 2000)}\n\n`;
    userPrompt += `CANDIDATE:\n${resumeContext}\n\n`;

    if (request.userNotes) {
      userPrompt += `USER NOTES: ${request.userNotes}\n\n`;
    }

    userPrompt += 'FIELDS TO COMPLETE:\n';
    aiFields.forEach(field => {
      const maxNote = field.maxLength ? ` (max ${field.maxLength} chars)` : '';
      const reqNote = field.isRequired ? ' [REQUIRED]' : '';
      userPrompt += `${field.index}. [${field.fieldType}] ${field.label}${maxNote}${reqNote}\n`;
    });

    userPrompt += '\nGenerate responses for ALL fields above as a JSON object.';

    const apiKey = await apiConfigStorage.getApiKey();
    const response = await callGeminiApi(apiKey, systemPrompt, userPrompt, {
      model: MODEL_FLASH,
      maxTokens: 2048,
      temperature: 0.7,
      responseFormat: 'json',
    });

    // Parse JSON response
    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(response);
    } catch {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response from AI');
      }
    }

    // Convert to response format
    const responses = Object.entries(parsed).map(([indexStr, content]) => {
      const index = parseInt(indexStr, 10);
      const field = request.fields.find(f => f.index === index);
      return {
        index,
        content: String(content),
        isCoverLetter: field?.fieldType === 'coverLetter',
      };
    });

    return { success: true, responses };
  } catch (error) {
    console.error('[SmartFill] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate responses',
    };
  }
};

// Get resume summary for popup display
export const getResumeSummary = async (): Promise<string> => {
  const [profile, resume] = await Promise.all([userProfileStorage.get(), resumeStorage.get()]);
  return buildResumeSummary(profile, resume);
};

export { MODEL_FLASH_LITE, MODEL_FLASH };
