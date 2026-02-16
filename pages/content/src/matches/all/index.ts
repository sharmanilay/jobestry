import { detectFormFields, extractJobDescription, fillField } from '../../form-detector';
import { jdStorage } from '@extension/storage';
import type { FieldType, DetectedField } from '../../form-detector';

// Module-level state
let detectedFields: DetectedField[] = [];
let jobDescription: string | null = null;
let manualJobDescription: string | null = null;
let isInitialized = false;
let isEnabled = true;

// Check initial enabled state and run content script
chrome.storage.local.get('jobestry-user-preferences', result => {
  const prefs = result['jobestry-user-preferences'];
  if (prefs && prefs.enabled === false) {
    isEnabled = false;
    console.log('[Jobestry] Extension disabled, running in hidden mode');
  }
  initContentScript();
});

const initContentScript = () => {
  // Get the currently focused field from detected fields
  const getFocusedField = (): DetectedField | null => {
    const focused = document.activeElement;
    if (!focused) return null;

    // Check if focused element is one of our detected fields
    return detectedFields.find(f => f.element === focused) || null;
  };

  console.log('[Jobestry] Content script loaded', isEnabled ? '(enabled)' : '(disabled)');

  // If disabled, just set up the storage listener but don't run detection
  if (!isEnabled) {
    console.log('[Jobestry] Running in hidden mode - UI will show when enabled');
    return;
  }

  // Standard field types that use profile data (no AI needed)
  const STANDARD_FIELD_TYPES: FieldType[] = [
    'firstName',
    'lastName',
    'fullName',
    'email',
    'phone',
    'location',
    'linkedin',
    'github',
    'portfolio',
  ];

  // Highlight state (for job description keyword highlighting)
  let highlightOriginalHtml: string | null = null;
  let highlightTargetEl: HTMLElement | null = null;

  const ensureHighlightStyles = () => {
    const styleId = 'jobestry-highlight-style';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
    mark.jobestry-highlight {
      background: rgba(37, 99, 235, 0.18);
      color: inherit;
      padding: 0 0.12em;
      border-radius: 0.35em;
      box-shadow: inset 0 0 0 1px rgba(37, 99, 235, 0.22);
    }
  `;
    document.head.appendChild(style);
  };

  const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const isLikelyJobPage = (): boolean => {
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();

    // URL patterns that indicate job pages
    const jobUrlPatterns = [
      /jobs?/,
      /careers?/,
      /hiring/,
      /employment/,
      /vacancies/,
      /apply/,
      /job-board/,
      /requisition/,
      /position/,
      /opening/,
    ];

    // Title patterns
    const jobTitlePatterns = [/job/, /career/, /hiring/, /employment/, /vacancy/, /position/, /opening/, /recruit/];

    // Check URL
    const urlMatch = jobUrlPatterns.some(pattern => pattern.test(url));
    if (urlMatch) return true;

    // Check title
    const titleMatch = jobTitlePatterns.some(pattern => pattern.test(title));
    if (titleMatch) return true;

    // Check if we're on a known ATS domain
    const atsDomains = [
      'greenhouse',
      'lever',
      'workday',
      'icims',
      'taleo',
      'bamboohr',
      'smartrecruiters',
      'successfactors',
      'linkedin.com/jobs',
      'indeed.com',
      'glassdoor.com',
      'monster.com',
      'ziprecruiter',
      'angel.co',
      'hired.com',
    ];

    const domainMatch = atsDomains.some(domain => url.includes(domain));
    if (domainMatch) return true;

    return false;
  };

  const findJobDescriptionElement = (): HTMLElement | null => {
    const selectors = [
      '.job-description',
      '.job_description',
      '#job-description',
      '#job_description',
      '[data-testid="job-description"]',
      '[class*="jobDescription"]',
      '[class*="job-description"]',
      'article.job',
      '.posting-requirements',
      '.description-container',
      '[class*="descriptionContent"]',
      // Greenhouse
      '#content',
      '.template-job-board',
      // Lever
      '.posting-page',
      '.section-wrapper',
      '.posting-headline',
      // Workday
      '[data-automation-id*="jobDescription"]',
      '.WGDC',
      // ICIMS
      '.iCIMS_JobContent',
      '.iCIMS_MainWrapper',
      // Taleo
      '.requisitionDescriptionInner',
      '.contentPaneOpen',
      // SuccessFactors / SAP
      '.jobdetailsContainer',
      '.jobDetailsSection',
      // BambooHR
      '.BambooHR-ATS-board',
      // SmartRecruiters
      '.srt-text',
      '.job-details',
      // LinkedIn Easy Apply
      '.jobs-description',
      '.jobs-description__content',
      // Indeed
      '#jobDescriptionText',
      '.jobsearch-JobComponent-description',
    ];

    for (const selector of selectors) {
      try {
        const el = document.querySelector(selector);
        if (el instanceof HTMLElement && (el.textContent?.trim().length ?? 0) > 200) {
          return el;
        }
      } catch {
        // ignore invalid selectors
      }
    }

    // Heuristic fallback: pick the best "large text" container
    // Only run if page appears to be job-related
    if (!isLikelyJobPage()) {
      return null;
    }

    const candidates: Array<{ el: HTMLElement; score: number }> = [];
    const containers = document.querySelectorAll('div, section, article, main');

    // Keywords that strongly indicate job content
    const strongKeywords =
      /responsibilities|requirements|qualifications|about the role|what you'll do|what we're looking for|essential functions|job summary|role overview|about the job|job description|position summary|primary responsibilities|daily duties|what you will do|you will be|we are looking for|ideal candidate|minimum qualifications|preferred qualifications|desired skills|required skills|required experience|years of experience/gi;

    // Keywords that might indicate job content
    const mediumKeywords =
      /experience|skills|team|company|opportunity|join|culture|benefits|perks|salary|compensation|remote|hybrid|onsite|location|employment type|full.?time|part.?time|contract/gi;

    // Negative keywords that suggest NOT a job page
    const negativeKeywords =
      /blog|news|article|product|pricing|about us|contact|faq|help|support|terms|privacy|login|signup|register|advertisement|sponsored|review|rating|tutorial|how to|comparison|vs |alternatives/gi;

    containers.forEach(node => {
      if (!(node instanceof HTMLElement)) return;
      const text = node.textContent || '';
      if (text.length < 300 || text.length > 50000) return;

      // Skip if contains negative keywords
      if (negativeKeywords.test(text)) return;

      let score = 0;
      score += (text.match(strongKeywords) || []).length * 15;
      score += (text.match(mediumKeywords) || []).length * 3;

      // Bonus for list items (job descriptions often have bullet points)
      if (node.querySelectorAll('li, ul, ol').length > 3) score += 20;

      // Bonus for section headers
      if (node.querySelectorAll('h1, h2, h3').length > 0) score += 10;

      // Only accept if we have strong indicators
      if (score >= 25) candidates.push({ el: node, score });
    });

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.el ?? null;
  };

  const clearHighlights = () => {
    if (!highlightTargetEl || !highlightOriginalHtml) return;
    highlightTargetEl.innerHTML = highlightOriginalHtml;
    highlightOriginalHtml = null;
    highlightTargetEl = null;
  };

  const applyHighlights = (keywords: string[]) => {
    const sanitized = keywords
      .map(k => k.trim())
      .filter(Boolean)
      .filter(k => k.length >= 2 && k.length <= 40);

    if (sanitized.length === 0) return;
    const el = findJobDescriptionElement();
    if (!el) return;

    ensureHighlightStyles();

    // Reset if already highlighted
    if (highlightTargetEl && highlightOriginalHtml) {
      highlightTargetEl.innerHTML = highlightOriginalHtml;
    }

    highlightTargetEl = el;
    highlightOriginalHtml = el.innerHTML;

    const sorted = [...sanitized].sort((a, b) => b.length - a.length);
    const regex = new RegExp(sorted.map(escapeRegExp).join('|'), 'gi');

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: node => {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        const tag = parent.tagName.toLowerCase();
        if (tag === 'script' || tag === 'style' || tag === 'noscript') return NodeFilter.FILTER_REJECT;
        if (parent.closest('mark.jobestry-highlight')) return NodeFilter.FILTER_REJECT;
        regex.lastIndex = 0;
        return regex.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });

    const nodes: Text[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node instanceof Text) nodes.push(node);
    }

    nodes.forEach(node => {
      const text = node.nodeValue || '';
      regex.lastIndex = 0;
      const matches = [...text.matchAll(regex)];
      if (matches.length === 0) return;

      const frag = document.createDocumentFragment();
      let last = 0;
      matches.forEach(m => {
        const start = m.index ?? 0;
        const matchText = m[0] ?? '';
        if (start > last) frag.appendChild(document.createTextNode(text.slice(last, start)));
        const mark = document.createElement('mark');
        mark.className = 'jobestry-highlight';
        mark.textContent = matchText;
        frag.appendChild(mark);
        last = start + matchText.length;
      });
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      node.replaceWith(frag);
    });
  };

  // Initialize on page load
  const initialize = async () => {
    if (isInitialized) return;
    isInitialized = true;

    console.log('[Jobestry] Initializing form detection');

    // Restore manual JD from storage
    const jdData = await jdStorage.get();
    if (jdData?.manualJobDescription) {
      console.log('[Jobestry] Restored manual JD from storage');
      manualJobDescription = jdData.manualJobDescription;
    }

    // Subscribe to JD changes (e.g. cleared from panel)
    jdStorage.subscribe(() => {
      const data = jdStorage.getSnapshot();
      if (data?.manualJobDescription !== undefined) {
        manualJobDescription = data.manualJobDescription;
        console.log('[Jobestry] Manual JD updated from storage:', !!manualJobDescription);
      }
    });

    // Detect fields after a delay to allow dynamic content to load
    // Use force=true for initial detection to be more aggressive
    console.log('[Jobestry] Scheduling initial detection in 4 seconds...');
    setTimeout(() => {
      console.log('[Jobestry] Running initial detection...');
      detectedFields = detectFormFields();
      jobDescription = extractJobDescription(true); // force=true for initial scan too

      console.log('[Jobestry] Initial detection:', {
        fields: detectedFields.length,
        hasJD: !!jobDescription,
        jdLen: jobDescription?.length || 0,
      });

      // Notify content UI about detected fields
      window.postMessage(
        {
          __jobestry: true,
          type: 'JOBESTRY_FIELDS_DETECTED',
          fields: detectedFields.map(f => ({
            fieldType: f.fieldType,
            label: f.label,
            placeholder: f.placeholder,
            isRequired: f.isRequired,
            hasValue: !!(f.element.value || '').trim(),
            confidence: f.confidence,
          })),
          hasJobDescription: !!jobDescription,
          jobDescriptionText: jobDescription || '',
        },
        '*',
      );
    }, 4000); // Wait 4 seconds for dynamic content
  };

  // Re-detect fields when DOM changes
  const observer = new MutationObserver(mutations => {
    // Check if mutations affect form elements
    const hasFormChanges = mutations.some(m => {
      if (m.type === 'childList') {
        return Array.from(m.addedNodes).some(
          n =>
            n instanceof HTMLElement &&
            (n.querySelector('input, textarea, select') || n.matches('input, textarea, select')),
        );
      }
      return false;
    });

    if (hasFormChanges) {
      // Debounce re-detection
      setTimeout(() => {
        detectedFields = detectFormFields();
        jobDescription = extractJobDescription();
        console.log('[Jobestry] Re-detected fields:', detectedFields.length);

        // Re-inject buttons
        // injectFieldButtons(); // Disabled as we use panel UI now

        window.postMessage(
          {
            __jobestry: true,
            type: 'JOBESTRY_FIELDS_UPDATED',
            fieldCount: detectedFields.length,
            hasJobDescription: !!jobDescription,
            jobDescriptionText: jobDescription || '',
            fields: detectedFields.map(f => ({
              fieldType: f.fieldType,
              label: f.label,
              placeholder: f.placeholder,
              isRequired: f.isRequired,
              hasValue: !!(f.element.value || '').trim(),
              confidence: f.confidence,
            })),
          },
          '*',
        );
      }, 500);
    }
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Auto-fill standard fields
  const autoFillStandardFields = async () => {
    // Refresh the field list to avoid stale references on dynamic pages.
    detectedFields = detectFormFields();

    const isEffectivelyFilled = (field: DetectedField): boolean => {
      const el = field.element;
      if (el instanceof HTMLSelectElement) {
        const value = (el.value || '').trim();
        if (!value) return false;
        const label = (el.selectedOptions?.[0]?.textContent || '').trim().toLowerCase();
        if (!label) return false;
        if (/(select|choose|pick|--)/i.test(label) && (value === '0' || value === '')) return false;
        return true;
      }
      return (el.value || '').trim().length > 0;
    };

    let filledCount = 0;

    for (const field of detectedFields) {
      // Skip already filled fields
      if (isEffectivelyFilled(field)) continue;

      // Skip non-standard fields
      if (!STANDARD_FIELD_TYPES.includes(field.fieldType)) continue;

      try {
        const response = await chrome.runtime.sendMessage({
          type: 'GET_QUICK_FILL',
          fieldType: field.fieldType,
        });

        if (response?.value) {
          const success = fillField(field, response.value);
          if (success) {
            filledCount++;
            field.currentValue = response.value;

            // Visual feedback
            highlightField(field.element, 'success');
          }
        }
      } catch (error) {
        console.error('[Jobestry] Error filling field:', error);
      }
    }

    // Sync UI state (value changes don't trigger DOM mutations).
    window.postMessage(
      {
        __jobestry: true,
        type: 'JOBESTRY_FIELDS_UPDATED',
        fieldCount: detectedFields.length,
        hasJobDescription: !!jobDescription,
        jobDescriptionText: jobDescription || '',
        fields: detectedFields.map(f => ({
          fieldType: f.fieldType,
          label: f.label,
          placeholder: f.placeholder,
          isRequired: f.isRequired,
          hasValue: !!(f.element.value || '').trim(),
          confidence: f.confidence,
        })),
      },
      '*',
    );

    return filledCount;
  };

  // Generate AI response for a field
  const generateAIResponse = async (field: DetectedField, userNotes?: string): Promise<string | null> => {
    const question = field.label || field.placeholder || 'Answer this question';

    try {
      const jdToSend = manualJobDescription || jobDescription || undefined;
      console.log('[Jobestry] Generating AI response for field:', field.label);
      console.log('[Jobestry] Manual JD:', !!manualJobDescription, 'Auto JD:', !!jobDescription);
      console.log('[Jobestry] JD being sent:', jdToSend ? jdToSend.slice(0, 100) + '...' : 'NONE');

      const response = await chrome.runtime.sendMessage({
        type: 'GENERATE_FIELD_RESPONSE',
        fieldIndex: detectedFields.indexOf(field),
        question,
        fieldType: field.fieldType,
        fieldLabel: field.label,
        jobDescription: jdToSend,
        userNotes: userNotes || undefined,
        maxLength: field.maxLength,
        useFastModel: true, // Use flash-lite for per-field generation
      });

      if (response?.success) {
        return response.response;
      } else {
        console.error('[Jobestry] AI generation error:', response?.error);
        return null;
      }
    } catch (error) {
      console.error('[Jobestry] Error generating response:', error);
      return null;
    }
  };

  // Highlight a field with visual feedback
  const highlightField = (element: HTMLElement, type: 'success' | 'pending' | 'error') => {
    const colors = {
      success: 'rgba(16, 185, 129, 0.2)',
      pending: 'rgba(99, 102, 241, 0.2)',
      error: 'rgba(239, 68, 68, 0.2)',
    };

    const originalBackground = element.style.backgroundColor;
    element.style.backgroundColor = colors[type];
    element.style.transition = 'background-color 0.3s ease';

    setTimeout(() => {
      element.style.backgroundColor = originalBackground;
    }, 2000);
  };

  // Message handler from background and content UI
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Jobestry] Received message:', message.type);

    switch (message.type) {
      case 'SAVE_JOB_SHORTCUT': {
        // Get current page info and save job
        const url = window.location.href;
        const title = document.title || 'Untitled Job';

        // Try to extract company name from the page
        let company = '';
        const companySelectors = [
          '[class*="company"]',
          '[class*="Company"]',
          '[data-testid*="company"]',
          '.employer',
          '.company-name',
        ];
        for (const sel of companySelectors) {
          const el = document.querySelector(sel);
          if (el?.textContent) {
            company = el.textContent.trim();
            break;
          }
        }

        // Get job title
        let jobTitle = title;
        const titleSelectors = ['h1', '[class*="title"]', '[class*="Title"]', '[data-testid*="title"]'];
        for (const sel of titleSelectors) {
          const el = document.querySelector(sel);
          if (el?.textContent) {
            jobTitle = el.textContent.trim();
            break;
          }
        }

        // Save to storage via runtime message
        chrome.runtime
          .sendMessage({
            type: 'SAVE_JOB_APPLICATION',
            url,
            title: jobTitle,
            company,
          })
          .then(() => {
            sendResponse({ success: true });
          })
          .catch(err => {
            console.error('[Jobestry] Error saving job:', err);
            sendResponse({ success: false, error: err.message });
          });
        return true; // async
      }

      case 'TOGGLE_SIDEBAR': {
        // Send message to content UI to toggle sidebar
        window.postMessage(
          {
            __jobestry: true,
            type: 'JOBESTRY_TOGGLE_SIDEBAR',
          },
          '*',
        );
        sendResponse({ success: true });
        break;
      }

      case 'QUICK_FILL': {
        // Run autofill for all standard fields
        autoFillStandardFields().then(count => {
          sendResponse({ filledCount: count });
        });
        return true; // Async response
      }

      case 'GENERATE_COVER_LETTER_SHORTCUT': {
        // Send message to content UI to open cover letter view
        window.postMessage(
          {
            __jobestry: true,
            type: 'JOBESTRY_OPEN_COVER_LETTER',
          },
          '*',
        );
        sendResponse({ success: true });
        break;
      }

      case 'FILL_FOCUSED_FIELD': {
        const field = getFocusedField();
        if (field) {
          chrome.runtime
            .sendMessage({
              type: 'GET_QUICK_FILL',
              fieldType: field.fieldType,
            })
            .then(response => {
              if (response?.value) {
                fillField(field, response.value);
                highlightField(field.element, 'success');
              }
            });
        }
        sendResponse({ success: !!field });
        break;
      }

      case 'GENERATE_FOR_FOCUSED_FIELD': {
        const field = getFocusedField();
        if (field) {
          highlightField(field.element, 'pending');
          generateAIResponse(field).then(response => {
            if (response) {
              fillField(field, response);
              highlightField(field.element, 'success');
            } else {
              highlightField(field.element, 'error');
            }
          });
        }
        sendResponse({ success: !!field });
        break;
      }

      case 'AUTO_FILL_ALL': {
        autoFillStandardFields().then(count => {
          sendResponse({ filledCount: count });
        });
        return true; // Async response
      }

      case 'GET_DETECTED_FIELDS': {
        sendResponse({
          fields: detectedFields.map(f => ({
            fieldType: f.fieldType,
            label: f.label,
            placeholder: f.placeholder,
            isRequired: f.isRequired,
            hasValue: !!f.currentValue,
            confidence: f.confidence,
          })),
          hasJobDescription: !!jobDescription,
          jobDescriptionText: jobDescription || '',
        });
        break;
      }

      case 'GET_JOB_DESCRIPTION': {
        sendResponse({
          jobDescription: jobDescription || '',
        });
        break;
      }

      case 'FILL_FIELD_BY_INDEX': {
        const { index, value } = message;
        if (detectedFields[index]) {
          const success = fillField(detectedFields[index], value);
          highlightField(detectedFields[index].element, success ? 'success' : 'error');
          sendResponse({ success });
        } else {
          sendResponse({ success: false, error: 'Field not found' });
        }
        break;
      }

      case 'GENERATE_FOR_FIELD_BY_INDEX': {
        const { index, userNotes } = message;
        if (detectedFields[index]) {
          const field = detectedFields[index];
          highlightField(field.element, 'pending');
          // setFieldButtonLoading(index, true); // Removed: Function not defined

          generateAIResponse(field, userNotes).then(response => {
            // setFieldButtonLoading(index, false); // Removed: Function not defined
            if (response) {
              highlightField(field.element, 'success');
              sendResponse({ success: true, response });
            } else {
              highlightField(field.element, 'error');
              sendResponse({ success: false });
            }
          });
          return true; // Async response
        }
        sendResponse({ success: false, error: 'Field not found' });
        break;
      }

      case 'GET_ALL_FIELDS_FOR_SMART_FILL': {
        // Return all fields with their metadata for smart fill
        sendResponse({
          fields: detectedFields.map((f, i) => ({
            index: i,
            fieldType: f.fieldType,
            label: f.label || f.placeholder || f.fieldType,
            maxLength: f.maxLength,
            isRequired: f.isRequired,
            hasValue: !!f.currentValue,
            isAIField: !STANDARD_FIELD_TYPES.includes(f.fieldType),
          })),
          jobDescription: jobDescription || '',
        });
        break;
      }

      case 'APPLY_SMART_FILL_RESPONSES': {
        // Apply multiple responses from smart fill
        const { responses } = message as { responses: { index: number; value: string }[] };
        let successCount = 0;

        responses.forEach(({ index, value }) => {
          if (detectedFields[index] && value) {
            const success = fillField(detectedFields[index], value);
            if (success) {
              successCount++;
              detectedFields[index].currentValue = value;
              highlightField(detectedFields[index].element, 'success');
            }
          }
        });

        sendResponse({ success: true, filledCount: successCount });
        break;
      }
    }

    return true;
  });

  // Listen for messages from content UI
  window.addEventListener('message', event => {
    if (event.source !== window) return;

    const payload = event.data as unknown;
    if (!payload || typeof payload !== 'object') return;
    if (!('__jobestry' in payload) || (payload as { __jobestry?: unknown }).__jobestry !== true) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { type, ...data } = payload as any;
    if (typeof type !== 'string') return;

    switch (type) {
      case 'JOBESTRY_REQUEST_FILL_ALL':
        autoFillStandardFields().then(count => {
          window.postMessage(
            {
              __jobestry: true,
              type: 'JOBESTRY_FILL_COMPLETE',
              filledCount: count,
            },
            '*',
          );
        });
        break;

      case 'JOBESTRY_REQUEST_GENERATE': {
        const field = detectedFields[data.fieldIndex];
        if (field) {
          highlightField(field.element, 'pending');
          // setFieldButtonLoading(data.fieldIndex, true); // Removed: Function not defined

          generateAIResponse(field, data.userNotes).then(response => {
            // setFieldButtonLoading(data.fieldIndex, false); // Removed: Function not defined
            if (response) {
              fillField(field, response);
              highlightField(field.element, 'success');
              field.currentValue = response;
            }
            window.postMessage(
              {
                __jobestry: true,
                type: 'JOBESTRY_GENERATE_COMPLETE',
                fieldIndex: data.fieldIndex,
                success: !!response,
                response,
              },
              '*',
            );

            // Sync UI filled state.
            window.postMessage(
              {
                __jobestry: true,
                type: 'JOBESTRY_FIELDS_UPDATED',
                fieldCount: detectedFields.length,
                hasJobDescription: !!jobDescription,
                jobDescriptionText: jobDescription || '',
                fields: detectedFields.map(f => ({
                  fieldType: f.fieldType,
                  label: f.label,
                  placeholder: f.placeholder,
                  isRequired: f.isRequired,
                  hasValue: !!(f.element.value || '').trim(),
                  confidence: f.confidence,
                })),
              },
              '*',
            );
          });
        }
        break;
      }

      case 'JOBESTRY_APPLY_RESPONSE': {
        // Apply a batch-generated response to a specific field
        const targetField = detectedFields[data.fieldIndex];
        if (targetField && data.response) {
          const success = fillField(targetField, data.response);
          highlightField(targetField.element, success ? 'success' : 'error');

          if (success) {
            targetField.currentValue = data.response;
          }

          window.postMessage(
            {
              __jobestry: true,
              type: 'JOBESTRY_APPLY_COMPLETE',
              fieldIndex: data.fieldIndex,
              success,
            },
            '*',
          );

          // Sync UI filled state.
          window.postMessage(
            {
              __jobestry: true,
              type: 'JOBESTRY_FIELDS_UPDATED',
              fieldCount: detectedFields.length,
              hasJobDescription: !!jobDescription,
              jobDescriptionText: jobDescription || '',
              fields: detectedFields.map(f => ({
                fieldType: f.fieldType,
                label: f.label,
                placeholder: f.placeholder,
                isRequired: f.isRequired,
                hasValue: !!(f.element.value || '').trim(),
                confidence: f.confidence,
              })),
            },
            '*',
          );
        }
        break;
      }

      case 'JOBESTRY_REQUEST_FIELD_BUTTONS':
        // Re-inject field buttons on request
        // injectFieldButtons(); // Disabled for now as function is missing
        break;

      case 'JOBESTRY_REQUEST_SCAN':
        console.log('[Jobestry] Manual scan requested');

        // Add a small delay to allow dynamic content to settle
        setTimeout(() => {
          detectedFields = detectFormFields();
          // Use force=true for manual refresh - less strict JD detection
          jobDescription = extractJobDescription(true);

          console.log('[Jobestry] Manual scan results:', {
            fields: detectedFields.length,
            hasJD: !!jobDescription,
            jdLength: jobDescription?.length || 0,
          });

          window.postMessage(
            {
              __jobestry: true,
              type: 'JOBESTRY_FIELDS_UPDATED',
              fieldCount: detectedFields.length,
              hasJobDescription: !!jobDescription,
              jobDescriptionText: jobDescription || '',
              fields: detectedFields.map(f => ({
                fieldType: f.fieldType,
                label: f.label,
                placeholder: f.placeholder,
                isRequired: f.isRequired,
                hasValue: !!(f.element.value || '').trim(),
                confidence: f.confidence,
              })),
            },
            '*',
          );
        }, 300);
        break;

      case 'JOBESTRY_CLEAR_MANUAL_JD':
        console.log('[Jobestry] Clearing manual JD');
        manualJobDescription = null;
        break;

      case 'JOBESTRY_SET_HIGHLIGHT': {
        const enabled = Boolean(data.enabled);
        if (!enabled) {
          clearHighlights();
          break;
        }
        const kw = Array.isArray(data.keywords) ? (data.keywords as string[]) : [];
        applyHighlights(kw);
        break;
      }
    }
  });

  // When a user focuses an AI-assisted textarea, hint the sidebar and preselect the field.
  let lastFocusedFieldIndex: number | null = null;
  let lastFocusedFieldAt = 0;

  document.addEventListener(
    'focusin',
    event => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;

      const fieldIndex = detectedFields.findIndex(f => f.element === target);
      if (fieldIndex === -1) return;

      const field = detectedFields[fieldIndex];
      if (field.fieldType !== 'customQuestion' && field.fieldType !== 'coverLetter') return;
      if ((target.value || '').trim().length > 0) return;

      const now = Date.now();
      if (lastFocusedFieldIndex === fieldIndex && now - lastFocusedFieldAt < 800) return;
      lastFocusedFieldIndex = fieldIndex;
      lastFocusedFieldAt = now;

      window.postMessage(
        {
          __jobestry: true,
          type: 'JOBESTRY_FOCUS_FIELD',
          fieldIndex,
          forceOpen: false,
        },
        '*',
      );
    },
    true,
  );

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  // Listen for manual JD from background (context menu)
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'JOBESTRY_MANUAL_JD_SET') {
      console.log('[Jobestry] Manual JD received from context menu');
      manualJobDescription = message.jobDescription;

      // Forward to content UI
      window.postMessage(
        {
          __jobestry: true,
          type: 'JOBESTRY_MANUAL_JD_SET',
          jobDescription: message.jobDescription,
          source: 'manual',
        },
        '*',
      );

      sendResponse({ success: true });
    }

    if (message.type === 'SHOW_FLOATING_BUTTON') {
      console.log('[Jobestry] Showing floating button after domain added');

      // Forward to content UI to show the floating button
      window.postMessage(
        {
          __jobestry: true,
          type: 'JOBESTRY_SHOW_FLOATING_BUTTON',
        },
        '*',
      );

      sendResponse({ success: true });
    }

    if (message.type === 'HIDE_FLOATING_BUTTON') {
      console.log('[Jobestry] Hiding floating button after domain removed');

      // Forward to content UI to hide the floating button
      window.postMessage(
        {
          __jobestry: true,
          type: 'JOBESTRY_HIDE_FLOATING_BUTTON',
        },
        '*',
      );

      sendResponse({ success: true });
    }
    return true; // Keep channel open for async response
  });

  // Listen for enabled state changes
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local') return;
    if (!changes['jobestry-user-preferences']) return;

    const newEnabled = changes['jobestry-user-preferences'].newValue?.enabled;

    if (newEnabled === false) {
      console.log('[Jobestry] Extension disabled via storage change');
      isEnabled = false;
      // Clear detected fields
      detectedFields = [];
      // Remove highlight style
      const styleEl = document.getElementById('jobestry-highlight-style');
      if (styleEl) styleEl.remove();
      // Remove field buttons
      document.querySelectorAll('.jobestry-field-btn').forEach(el => el.remove());
      document.querySelectorAll('.jobestry-field-highlight').forEach(el => el.remove());
    } else if (newEnabled === true) {
      console.log('[Jobestry] Extension enabled via storage change');
      isEnabled = true;
      // Re-detect fields and show UI
      detectedFields = detectFormFields();
      jobDescription = extractJobDescription(true);

      console.log('[Jobestry] Re-detection after enable:', {
        fields: detectedFields.length,
        hasJD: !!jobDescription,
      });

      // Notify content UI about detected fields
      window.postMessage(
        {
          __jobestry: true,
          type: 'JOBESTRY_FIELDS_DETECTED',
          fields: detectedFields.map(f => ({
            fieldType: f.fieldType,
            label: f.label,
            placeholder: f.placeholder,
            isRequired: f.isRequired,
            hasValue: !!(f.element.value || '').trim(),
            confidence: f.confidence,
          })),
          hasJobDescription: !!jobDescription,
          jobDescriptionText: jobDescription || '',
        },
        '*',
      );
    }
  });
};
