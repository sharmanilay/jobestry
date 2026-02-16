import 'webextension-polyfill';
import { generateBatchResponses } from './batch-processor';
import {
  generateResponse,
  generateCoverLetter,
  improveCoverLetter,
  generateJobInsights,
  getQuickFillValue,
  getStylePresets,
  setStylePreset,
  invalidateContextCache,
} from './gemini-service';
import { generateFieldResponse, smartFill, getResumeSummary } from './smart-fill-service';
import { userProfileStorage, apiConfigStorage, jdStorage, applicationsStorage } from '@extension/storage';
import type { BatchGenerationRequest } from './batch-processor';
import type {
  GenerateResponseRequest,
  GenerateCoverLetterRequest,
  ImproveCoverLetterRequest,
  GenerateJobInsightsRequest,
} from './gemini-service';
import type { FieldGenerateRequest, SmartFillRequest } from './smart-fill-service';
import type { AIProvider } from '@extension/storage';
// import './context-menu'; // Removed to consolidate logic

// Message types
type MessageType =
  | GenerateResponseRequest
  | GenerateCoverLetterRequest
  | ImproveCoverLetterRequest
  | GenerateJobInsightsRequest
  | (BatchGenerationRequest & { type: 'GENERATE_BATCH' })
  | FieldGenerateRequest
  | SmartFillRequest
  | { type: 'GET_QUICK_FILL'; fieldType: string }
  | { type: 'CHECK_READY' }
  | { type: 'GET_PROFILE' }
  | { type: 'GET_RESUME_SUMMARY' }
  | { type: 'AI_CHAT'; question: string; jobDescription?: string; stylePreset?: string }
  | { type: 'GET_STYLE_PRESETS' }
  | { type: 'SET_STYLE_PRESET'; presetId: string }
  | { type: 'OPEN_OPTIONS' }
  | { type: 'GET_PROVIDER' }
  | { type: 'SET_PROVIDER'; provider: AIProvider }
  | { type: 'GET_PROVIDER_KEYS' }
  | { type: 'SAVE_JOB_APPLICATION'; url: string; title: string; company?: string }
  | { type: 'ENHANCE_RESUME'; resumeText: string };

// Initialize
// Background service worker loaded

// Check readiness on startup
const checkReadiness = async () => {
  const [profile, hasApiKey] = await Promise.all([userProfileStorage.get(), apiConfigStorage.hasApiKey()]);

  const hasProfile = !!(profile.firstName && profile.lastName && profile.email);

  return { hasProfile, hasApiKey, isReady: hasProfile && hasApiKey };
};

checkReadiness();

// Message handler
chrome.runtime.onMessage.addListener((message: MessageType, sender, sendResponse) => {
  const handleMessage = async (): Promise<unknown> => {
    switch (message.type) {
      case 'GENERATE_RESPONSE': {
        const result = await generateResponse(message as GenerateResponseRequest);
        return result;
      }

      case 'GENERATE_COVER_LETTER': {
        const result = await generateCoverLetter(message as GenerateCoverLetterRequest);
        return result;
      }

      case 'IMPROVE_COVER_LETTER': {
        const result = await improveCoverLetter(message as ImproveCoverLetterRequest);
        return result;
      }

      case 'GENERATE_JOB_INSIGHTS': {
        const result = await generateJobInsights(message as GenerateJobInsightsRequest);
        return result;
      }

      case 'GENERATE_BATCH': {
        const batchMessage = message as BatchGenerationRequest & { type: 'GENERATE_BATCH' };
        const result = await generateBatchResponses({
          fields: batchMessage.fields,
          jobDescription: batchMessage.jobDescription,
          presetId: batchMessage.presetId,
        });
        return result;
      }

      case 'GENERATE_FIELD_RESPONSE': {
        // Per-field generation from popup (uses flash-lite)
        const result = await generateFieldResponse(message as FieldGenerateRequest);
        return result;
      }

      case 'SMART_FILL': {
        // One-shot smart fill for all fields
        const result = await smartFill(message as SmartFillRequest);
        return result;
      }

      case 'GET_RESUME_SUMMARY': {
        const summary = await getResumeSummary();
        return { summary };
      }

      case 'AI_CHAT': {
        // Quick AI chat with full context (uses flash-lite for speed)
        const result = await generateFieldResponse({
          type: 'GENERATE_FIELD_RESPONSE',
          fieldIndex: -1,
          question: message.question,
          fieldType: 'chat',
          fieldLabel: 'AI Chat',
          jobDescription: message.jobDescription,
          userNotes: undefined,
          useFastModel: true,
        } as FieldGenerateRequest);
        return result;
      }

      case 'GET_QUICK_FILL': {
        const value = await getQuickFillValue(message.fieldType);
        return { value };
      }

      case 'CHECK_READY': {
        return checkReadiness();
      }

      case 'GET_PROFILE': {
        const profile = await userProfileStorage.get();
        return profile;
      }

      case 'GET_STYLE_PRESETS': {
        return getStylePresets();
      }

      case 'SET_STYLE_PRESET': {
        return setStylePreset(message.presetId);
      }

      case 'OPEN_OPTIONS': {
        await chrome.runtime.openOptionsPage();
        return { success: true };
      }

      case 'GET_PROVIDER': {
        const provider = await apiConfigStorage.getSelectedProvider();
        return { provider };
      }

      case 'SET_PROVIDER': {
        await apiConfigStorage.setSelectedProvider(message.provider);
        return { success: true, provider: message.provider };
      }

      case 'SAVE_JOB_APPLICATION': {
        await applicationsStorage.upsert({
          url: message.url,
          title: message.title,
          company: message.company,
          status: 'saved',
          source: 'detected',
        });
        return { success: true };
      }

      case 'ENHANCE_RESUME': {
        try {
          const provider = await apiConfigStorage.getSelectedProvider();
          const apiKey = await apiConfigStorage.getApiKey(provider);

          if (!apiKey) {
            return { success: false, error: 'No API key configured' };
          }

          const prompt = `You are a professional resume writer. Improve and enhance the following resume content to make it more impactful, ATS-friendly, and professional. Keep the same sections but make the descriptions more achievement-oriented and quantified where possible.

Current Resume:
${message.resumeText}

Provide an enhanced version of this resume that:
1. Uses action verbs and quantified achievements
2. Removes redundancy and filler words
3. Optimizes for ATS (Applicant Tracking Systems)
4. Maintains the same structure and sections
5. Makes each bullet point more impactful

Enhanced Resume:`;

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 8192,
                },
              }),
            },
          );

          const data = await response.json();

          if (!response.ok) {
            console.error('[Jobestry] Enhance resume API error:', data);
            return { success: false, error: data.error?.message || 'Failed to enhance resume' };
          }

          const enhancedResume = data.candidates?.[0]?.content?.parts?.[0]?.text;

          if (enhancedResume) {
            return { success: true, enhancedResume };
          }

          return { success: false, error: 'No enhancement generated' };
        } catch (error) {
          console.error('[Jobestry] Error enhancing resume:', error);
          return { success: false, error: String(error) };
        }
      }

      case 'GET_PROVIDER_KEYS': {
        const keys = await apiConfigStorage.getAllProviderKeys();
        return { keys };
      }

      default:
        return { error: 'Unknown message type' };
    }
  };

  handleMessage()
    .then(sendResponse)
    .catch(error => {
      console.error('[Jobestry] Message handler error:', error);
      sendResponse({ error: error.message });
    });

  // Return true to indicate async response
  return true;
});

// Open side panel on action click (optional)
chrome.action.onClicked.addListener(async tab => {
  // If popup is set, this won't trigger
  // But we can use this for side panel if needed
  if (tab.id) {
    try {
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch {
      // Side panel might not be supported or already open
      // Silently fail - side panel is optional
    }
  }
});

// Context menu for quick actions
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu items
  chrome.contextMenus.create({
    id: 'jobestry-fill-field',
    title: 'Fill with Jobestry',
    contexts: ['editable'],
  });

  chrome.contextMenus.create({
    id: 'jobestry-generate-response',
    title: 'Generate AI Response',
    contexts: ['editable'],
  });

  // NEW: Manual JD Selection
  chrome.contextMenus.create({
    id: 'jobestry-set-jd',
    title: 'Set as Job Description',
    contexts: ['selection'],
  });

  // Extension installed/updated - Context menus created
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  switch (info.menuItemId) {
    case 'jobestry-fill-field':
      // Send message to content script to fill the focused field
      chrome.tabs.sendMessage(tab.id, { type: 'FILL_FOCUSED_FIELD' });
      break;

    case 'jobestry-generate-response':
      // Send message to content script to generate response
      chrome.tabs.sendMessage(tab.id, { type: 'GENERATE_FOR_FOCUSED_FIELD' });
      break;

    case 'jobestry-set-jd':
      // Handle Manual JD Selection
      if (info.selectionText) {
        // Save to storage for persistence
        await jdStorage.setManualJD(info.selectionText);

        chrome.tabs
          .sendMessage(tab.id, {
            type: 'JOBESTRY_MANUAL_JD_SET',
            jobDescription: info.selectionText,
            source: 'manual',
          })
          .catch(() => {
            // Silently fail - tab might have closed
          });
      }
      break;
  }
});

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (!tab?.id) return;

  switch (command) {
    case 'toggle-sidebar':
      chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' }).catch(() => {});
      break;

    case 'quick-fill':
      chrome.tabs.sendMessage(tab.id, { type: 'QUICK_FILL' }).catch(() => {});
      break;

    case 'generate-cover-letter':
      chrome.tabs.sendMessage(tab.id, { type: 'GENERATE_COVER_LETTER_SHORTCUT' }).catch(() => {});
      break;

    case 'save-job':
      chrome.tabs.sendMessage(tab.id, { type: 'SAVE_JOB_SHORTCUT' }).catch(() => {});
      break;
  }
});

// Keep service worker alive for longer operations
const keepAlive = () => {
  setInterval(() => {
    // Ping to keep alive
  }, 25000);
};

keepAlive();

// Invalidate context cache when profile or resume is updated
const STORAGE_KEYS_TO_WATCH = ['jobestry-user-profile', 'jobestry-resume', 'jobestry-preferences'];

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;

  const changedKeys = Object.keys(changes);
  const shouldInvalidate = changedKeys.some(key => STORAGE_KEYS_TO_WATCH.includes(key));

  if (shouldInvalidate) {
    console.log('[Jobestry] Storage changed, invalidating context cache:', changedKeys);
    invalidateContextCache();
  }
});
