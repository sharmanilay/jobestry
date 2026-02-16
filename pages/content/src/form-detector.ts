/**
 * Form Field Detector
 *
 * This module detects and classifies form fields on job application pages.
 * It uses multiple strategies:
 * - Pattern matching on labels, placeholders, and field names
 * - Heuristic analysis of surrounding context
 * - Selector matching for common job sites
 * - Field type inference from input types and attributes
 */

// Field types that can be detected
type FieldType =
  | 'firstName'
  | 'lastName'
  | 'fullName'
  | 'email'
  | 'phone'
  | 'location'
  | 'linkedin'
  | 'github'
  | 'portfolio'
  | 'resume'
  | 'resumeUpload'
  | 'coverLetter'
  | 'coverLetterUpload'
  | 'fileUpload'
  | 'salary'
  | 'startDate'
  | 'yearsExperience'
  | 'workAuthorization'
  | 'canRelocate'
  | 'referral'
  | 'gender'
  | 'veteranStatus'
  | 'disability'
  | 'customQuestion'
  | 'unknown';

// Detected field interface
interface DetectedField {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  fieldType: FieldType;
  confidence: number;
  label?: string;
  placeholder?: string;
  isRequired: boolean;
  maxLength?: number;
  currentValue: string;
  // New fields for enhanced detection
  inputType?: 'text' | 'select' | 'radio' | 'checkbox' | 'textarea' | 'date';
  options?: SelectOption[]; // For dropdowns and radio groups
  isMultiple?: boolean; // For multi-select or checkbox groups
}

// Option interface for dropdowns and radio buttons
interface SelectOption {
  value: string;
  label: string;
  selected?: boolean;
}

// Radio/checkbox group interface
interface FieldGroup {
  name: string;
  fieldType: FieldType;
  label?: string;
  isRequired: boolean;
  options: SelectOption[];
  currentValue: string[];
  elements: HTMLInputElement[];
}

// Pattern definitions for field detection
const fieldPatterns: Record<FieldType, RegExp[]> = {
  firstName: [
    /first[\s_-]?name/i,
    /firstname/i,
    /fname/i,
    /given[\s_-]?name/i,
    /givenname/i,
    /forename/i,
    /^first$/i,
    /name[\s_-]?first/i,
    /legal[\s_-]?first[\s_-]?name/i,
    /preferred[\s_-]?first[\s_-]?name/i,
  ],
  lastName: [
    /last[\s_-]?name/i,
    /lastname/i,
    /lname/i,
    /surname/i,
    /family[\s_-]?name/i,
    /familyname/i,
    /^last$/i,
    /name[\s_-]?last/i,
    /legal[\s_-]?last[\s_-]?name/i,
  ],
  fullName: [
    /full[\s_-]?name/i,
    /fullname/i,
    /^name$/i,
    /your[\s_-]?name/i,
    /applicant[\s_-]?name/i,
    /legal[\s_-]?name/i,
    /complete[\s_-]?name/i,
    /candidate[\s_-]?name/i,
  ],
  email: [
    /e-?mail/i,
    /email[\s_-]?address/i,
    /emailaddress/i,
    /e-mail\s*address/i,
    /contact[\s_-]?email/i,
    /primary[\s_-]?email/i,
    /work[\s_-]?email/i,
  ],
  phone: [
    /phone/i,
    /telephone/i,
    /tel/i,
    /mobile/i,
    /cell/i,
    /contact[\s_-]?number/i,
    /phone[\s_-]?number/i,
    /mobile[\s_-]?number/i,
    /cell[\s_-]?phone/i,
    /primary[\s_-]?phone/i,
    /daytime[\s_-]?phone/i,
  ],
  location: [
    /location/i,
    /city/i,
    /address/i,
    /city[\s_-]?state/i,
    /state[\s_-]?province/i,
    /country/i,
    /where[\s_-]?.*located/i,
    /current[\s_-]?location/i,
    /zip[\s_-]?code/i,
    /postal[\s_-]?code/i,
    /region/i,
    /province/i,
    /current[\s_-]?city/i,
    /residence/i,
    /street[\s_-]?address/i,
  ],
  linkedin: [/linkedin/i, /linked[\s_-]?in/i, /linkedin[\s_-]?profile/i, /linkedin[\s_-]?url/i, /linkedin\.com/i],
  github: [
    /github/i,
    /git[\s_-]?hub/i,
    /github[\s_-]?profile/i,
    /github[\s_-]?url/i,
    /github\.com/i,
    /code[\s_-]?repository/i,
  ],
  portfolio: [
    /portfolio/i,
    /website/i,
    /personal[\s_-]?site/i,
    /personal[\s_-]?url/i,
    /portfolio[\s_-]?url/i,
    /website[\s_-]?url/i,
    /personal[\s_-]?website/i,
    /blog/i,
    /homepage/i,
    /other[\s_-]?url/i,
    /additional[\s_-]?url/i,
  ],
  resume: [
    /resume/i,
    /cv/i,
    /curriculum[\s_-]?vitae/i,
    /upload[\s_-]?resume/i,
    /attach[\s_-]?resume/i,
    /resume[\s_-]?file/i,
  ],
  resumeUpload: [
    /resume/i,
    /cv/i,
    /curriculum[\s_-]?vitae/i,
    /upload[\s_-]?resume/i,
    /attach[\s_-]?resume/i,
    /resume[\s_-]?file/i,
    /resume[\s_-]?upload/i,
    /upload[\s_-]?your[\s_-]?resume/i,
    /attach[\s_-]?cv/i,
  ],
  coverLetter: [
    /cover[\s_-]?letter/i,
    /letter[\s_-]?of[\s_-]?interest/i,
    /motivation[\s_-]?letter/i,
    /additional[\s_-]?information/i,
    /anything[\s_-]?else/i,
    /supplementary/i,
    /message[\s_-]?to[\s_-]?(the[\s_-]?)?(hiring|recruiter|team|employer)/i,
    /tell[\s_-]?us[\s_-]?(more[\s_-]?)?about[\s_-]?(yourself|you)/i,
    /why[\s_-]?should[\s_-]?we[\s_-]?hire[\s_-]?you/i,
    /why[\s_-]?are[\s_-]?you[\s_-]?interested/i,
    /optional[\s_-]?message/i,
    /personal[\s_-]?statement/i,
    /supporting[\s_-]?statement/i,
    /cover[\s_-]?note/i,
  ],
  coverLetterUpload: [
    /cover[\s_-]?letter/i,
    /upload[\s_-]?cover[\s_-]?letter/i,
    /attach[\s_-]?cover[\s_-]?letter/i,
    /cover[\s_-]?letter[\s_-]?file/i,
    /motivation[\s_-]?letter/i,
  ],
  fileUpload: [
    /upload/i,
    /attach/i,
    /file/i,
    /document/i,
    /attachment/i,
    /supporting[\s_-]?document/i,
    /additional[\s_-]?document/i,
    /other[\s_-]?file/i,
    /portfolio[\s_-]?file/i,
    /work[\s_-]?sample/i,
    /transcript/i,
    /certificate/i,
  ],
  salary: [
    /salary/i,
    /compensation/i,
    /expected[\s_-]?pay/i,
    /desired[\s_-]?salary/i,
    /pay[\s_-]?expectation/i,
    /salary[\s_-]?expectation/i,
    /salary[\s_-]?requirement/i,
    /current[\s_-]?salary/i,
    /expected[\s_-]?compensation/i,
  ],
  startDate: [
    /start[\s_-]?date/i,
    /available[\s_-]?date/i,
    /when.*start/i,
    /earliest[\s_-]?start/i,
    /availability/i,
    /date[\s_-]?available/i,
    /can[\s_-]?you[\s_-]?start/i,
    /when[\s_-]?can[\s_-]?you[\s_-]?start/i,
    /available[\s_-]?from/i,
    /join[\s_-]?date/i,
  ],
  yearsExperience: [
    /years?[\s_-]?(of[\s_-]?)?experience/i,
    /experience[\s_-]?years?/i,
    /how[\s_-]?many[\s_-]?years/i,
    /total[\s_-]?experience/i,
    /\d+[\s_-]?\+?[\s_-]?years/i,
    /experience[\s_-]?level/i,
  ],
  workAuthorization: [
    /authorized?.*work/i,
    /work[\s_-]?authorization/i,
    /visa[\s_-]?status/i,
    /sponsorship/i,
    /eligible.*work/i,
    /legally.*work/i,
    /require[\s_-]?sponsorship/i,
    /work[\s_-]?permit/i,
    /employment[\s_-]?eligibility/i,
    /right[\s_-]?to[\s_-]?work/i,
    /visa[\s_-]?sponsorship/i,
    /need[\s_-]?sponsorship/i,
    /immigration[\s_-]?status/i,
  ],
  canRelocate: [
    /relocat/i,
    /willing[\s_-]?to[\s_-]?move/i,
    /open[\s_-]?to[\s_-]?relocation/i,
    /can[\s_-]?you[\s_-]?relocate/i,
    /relocation[\s_-]?preference/i,
  ],
  referral: [
    /hear[\s_-]?about/i,
    /how[\s_-]?.*find/i,
    /referr/i,
    /source/i,
    /where[\s_-]?.*learn/i,
    /how[\s_-]?did[\s_-]?you[\s_-]?(hear|find|learn)/i,
    /referred[\s_-]?by/i,
    /employee[\s_-]?referral/i,
    /job[\s_-]?source/i,
  ],
  gender: [/gender/i, /sex/i, /gender[\s_-]?identity/i, /pronouns/i],
  veteranStatus: [
    /veteran/i,
    /military/i,
    /armed[\s_-]?forces/i,
    /service[\s_-]?member/i,
    /protected[\s_-]?veteran/i,
    /military[\s_-]?service/i,
  ],
  disability: [/disability/i, /disabled/i, /handicap/i, /special[\s_-]?needs/i, /accommodation/i, /ada/i],
  customQuestion: [], // Catch-all for textareas with questions
  unknown: [],
};

// Get label text for an input element - comprehensive detection for all form patterns
const getLabelText = (element: HTMLElement): string | null => {
  const candidates: { text: string; priority: number }[] = [];

  const addCandidate = (text: string | null | undefined, priority: number) => {
    if (text && text.trim().length > 1 && text.trim().length < 500) {
      const normalized = text.trim().toLowerCase();
      // Filter out generic placeholder-like text
      if (
        !['select', 'search', 'type here', 'enter', 'choose', 'select...', 'search...', 'combobox', 'textbox'].includes(
          normalized,
        )
      ) {
        candidates.push({ text: text.trim(), priority });
      }
    }
  };

  // ========== TIER 1: DIRECT ASSOCIATIONS (Priority 90-100) ==========

  // 1.1 Standard HTML label with `for` attribute
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) addCandidate(label.textContent, 100);
  }

  // 1.2 Parent label element wrapping the input
  const parentLabel = element.closest('label');
  if (parentLabel) {
    const clone = parentLabel.cloneNode(true) as HTMLElement;
    clone.querySelectorAll('input, textarea, select, button').forEach(el => el.remove());
    addCandidate(clone.textContent, 100);
  }

  // 1.3 aria-labelledby (can reference multiple elements)
  const ariaLabelledBy = element.getAttribute('aria-labelledby');
  if (ariaLabelledBy) {
    for (const id of ariaLabelledBy.split(/\s+/).filter(Boolean)) {
      const labelEl = document.getElementById(id);
      if (labelEl) addCandidate(labelEl.textContent, 95);
    }
  }

  // 1.4 aria-label (filter out generic ones)
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) addCandidate(ariaLabel, 90);

  // ========== TIER 2: ARIA & DATA ATTRIBUTES (Priority 75-85) ==========

  // 2.1 aria-describedby
  const ariaDescribedBy = element.getAttribute('aria-describedby');
  if (ariaDescribedBy) {
    for (const id of ariaDescribedBy.split(/\s+/).filter(Boolean)) {
      const descEl = document.getElementById(id);
      if (descEl) addCandidate(descEl.textContent, 60);
    }
  }

  // 2.2 Data attributes
  const dataAttrs = ['data-label', 'data-field-label', 'data-title', 'data-name', 'data-field-name', 'data-question'];
  for (const attr of dataAttrs) {
    addCandidate(element.getAttribute(attr), 80);
  }

  // ========== TIER 3: SIBLING ELEMENTS (Priority 70-85) ==========

  // 3.1 Immediate preceding sibling
  const prevSibling = element.previousElementSibling;
  if (prevSibling) {
    if (prevSibling.tagName === 'LABEL' || prevSibling.getAttribute('class')?.toLowerCase().includes('label')) {
      addCandidate(prevSibling.textContent, 85);
    } else if (['SPAN', 'DIV', 'P'].includes(prevSibling.tagName)) {
      addCandidate(prevSibling.textContent, 70);
    }
  }

  // ========== TIER 4: PARENT CONTAINER TRAVERSAL (Priority 40-75) ==========

  let currentNode: HTMLElement | null = element;
  for (let depth = 0; depth < 7; depth++) {
    if (!currentNode) break;

    const parentEl: HTMLElement | null = currentNode.parentElement;
    if (!parentEl) break;

    // 4.1 Check all preceding siblings of current node for labels
    let sibling = currentNode.previousElementSibling;
    while (sibling) {
      // Check for text elements inside the sibling
      const textElements = sibling.querySelectorAll('p, span, div, label, h1, h2, h3, h4, h5, h6, legend');
      textElements.forEach(textEl => {
        if (!textEl.querySelector('input, textarea, select')) {
          addCandidate(textEl.textContent, 75 - depth * 5);
        }
      });

      // Check the sibling container itself
      if (['P', 'SPAN', 'DIV', 'LABEL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LEGEND'].includes(sibling.tagName)) {
        if (!sibling.querySelector('input, textarea, select')) {
          addCandidate(sibling.textContent, 75 - depth * 5);
        }
      }

      sibling = sibling.previousElementSibling;
    }

    // 4.2 Check for label-like elements in parent
    const labelSelectors = [
      'label',
      '[class*="label" i]',
      '[class*="Label"]',
      '[class*="title" i]',
      '[class*="Title"]',
      '[class*="question" i]',
      '[class*="Question"]',
      '[class*="prompt" i]',
      '[class*="field-name" i]',
      '[class*="field-label" i]',
      '[id*="label" i]',
      'legend',
    ];
    for (const selector of labelSelectors) {
      try {
        parentEl.querySelectorAll(selector).forEach(labelEl => {
          if (labelEl !== element && !labelEl.contains(element) && !element.contains(labelEl)) {
            if (!labelEl.querySelector('input, textarea, select')) {
              addCandidate(labelEl.textContent, 70 - depth * 5);
            }
          }
        });
      } catch {
        /* invalid selector */
      }
    }

    // 4.3 Check for heading elements
    parentEl
      .querySelectorAll(':scope > h1, :scope > h2, :scope > h3, :scope > h4, :scope > h5, :scope > h6')
      .forEach(heading => {
        addCandidate(heading.textContent, 65 - depth * 5);
      });

    currentNode = parentEl;
  }

  // ========== TIER 5: VISUAL/SPATIAL DETECTION (Priority 35-50) ==========

  const elementRect = element.getBoundingClientRect();
  if (elementRect.width > 0 && elementRect.height > 0) {
    const nearbyLabels: { text: string; distance: number }[] = [];

    document.querySelectorAll('p, span, div, label, h1, h2, h3, h4, h5, h6, legend').forEach(textEl => {
      if (textEl.contains(element) || textEl === element) return;
      if (textEl.querySelector('input, textarea, select')) return;

      const text = textEl.textContent?.trim();
      if (!text || text.length < 3 || text.length > 300) return;

      const textRect = textEl.getBoundingClientRect();
      if (textRect.width === 0 || textRect.height === 0) return;

      // Check if above (within 150px) and horizontally aligned
      const isAbove =
        textRect.bottom <= elementRect.top + 10 &&
        textRect.bottom >= elementRect.top - 150 &&
        Math.abs(textRect.left - elementRect.left) < 200;

      // Check if to the left
      const isLeft =
        textRect.right <= elementRect.left + 10 &&
        textRect.right >= elementRect.left - 300 &&
        Math.abs(textRect.top - elementRect.top) < 50;

      if (isAbove || isLeft) {
        const distance = isAbove
          ? elementRect.top - textRect.bottom + Math.abs(textRect.left - elementRect.left) * 0.1
          : elementRect.left - textRect.right + Math.abs(textRect.top - elementRect.top) * 0.5;
        nearbyLabels.push({ text, distance });
      }
    });

    nearbyLabels.sort((a, b) => a.distance - b.distance);
    for (let i = 0; i < Math.min(3, nearbyLabels.length); i++) {
      addCandidate(nearbyLabels[i].text, 50 - i * 10);
    }
  }

  // ========== TIER 6: FALLBACKS (Priority 15-30) ==========

  // 6.1 Placeholder
  addCandidate(element.getAttribute('placeholder'), 25);

  // 6.2 data-testid converted to readable text
  const testId = element.getAttribute('data-testid');
  if (testId) {
    const readable = testId
      .replace(/^input-/, '')
      .replace(/[-_. ]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, c => c.toUpperCase());
    addCandidate(readable, 20);
  }

  // 6.3 Name attribute
  const name = element.getAttribute('name');
  if (name && !/^[a-zA-Z0-9]{8,}$/.test(name)) {
    // Skip random hashes
    const readable = name
      .replace(/[-_[\].]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, c => c.toUpperCase());
    addCandidate(readable, 15);
  }

  // ========== RETURN BEST CANDIDATE ==========

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0].text;
};

// Get all text hints about a field
const getFieldHints = (element: HTMLElement): string => {
  const hints: string[] = [];

  // Collect various attributes
  const attrs = ['name', 'id', 'placeholder', 'aria-label', 'autocomplete', 'data-field', 'data-name'];
  attrs.forEach(attr => {
    const value = element.getAttribute(attr);
    if (value) hints.push(value);
  });

  // Get label text
  const label = getLabelText(element);
  if (label) hints.push(label);

  // Check for nearby legend (in fieldset)
  const fieldset = element.closest('fieldset');
  if (fieldset) {
    const legend = fieldset.querySelector('legend');
    if (legend) hints.push(legend.textContent || '');
  }

  return hints.join(' ').toLowerCase();
};

// Match hints against patterns
const matchFieldType = (hints: string): { type: FieldType; confidence: number } => {
  let bestMatch: { type: FieldType; confidence: number } = { type: 'unknown', confidence: 0 };

  for (const [fieldType, patterns] of Object.entries(fieldPatterns)) {
    if (fieldType === 'unknown' || fieldType === 'customQuestion') continue;

    for (const pattern of patterns) {
      if (pattern.test(hints)) {
        const confidence = pattern.source.length / hints.length;
        if (confidence > bestMatch.confidence) {
          bestMatch = { type: fieldType as FieldType, confidence: Math.min(confidence, 1) };
        }
      }
    }
  }

  return bestMatch;
};

const inferFieldTypeFromElement = (element: HTMLElement): { type: FieldType; confidence: number } => {
  const autocomplete = element.getAttribute('autocomplete')?.toLowerCase() || '';

  const autocompleteMap: Record<string, FieldType> = {
    'given-name': 'firstName',
    'family-name': 'lastName',
    name: 'fullName',
    'name-family': 'lastName',
    'name-given': 'firstName',
    email: 'email',
    tel: 'phone',
    'tel-national': 'phone',
    'tel-country-code': 'phone',
    'address-level1': 'location',
    'address-level2': 'location',
    'address-line1': 'location',
    url: 'portfolio',
  };

  if (autocomplete && autocompleteMap[autocomplete]) {
    return { type: autocompleteMap[autocomplete], confidence: 1 };
  }

  return matchFieldType(getFieldHints(element));
};

const getElementPlaceholder = (element: HTMLElement): string | undefined => {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.placeholder || undefined;
  }

  return undefined;
};

const getElementMaxLength = (element: HTMLElement): number | undefined => {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.maxLength > 0 ? element.maxLength : undefined;
  }

  return undefined;
};

// Check if element is visible
const isVisible = (element: HTMLElement): boolean => {
  const rect = element.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;

  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }

  return true;
};

const getSearchRoots = (): ParentNode[] => {
  const roots: ParentNode[] = [document];

  // Include open shadow roots (best-effort, capped for performance).
  try {
    const rootEl = document.documentElement;
    if (rootEl) {
      const walker = document.createTreeWalker(rootEl, NodeFilter.SHOW_ELEMENT);
      const MAX_NODES = 2500;
      let visited = 0;

      while (walker.nextNode() && visited < MAX_NODES) {
        visited++;
        const node = walker.currentNode;
        if (!(node instanceof HTMLElement)) continue;
        const shadow = node.shadowRoot;
        if (shadow) roots.push(shadow);
      }
    }
  } catch {
    // ignore
  }

  // Include same-origin iframes (best-effort).
  document.querySelectorAll('iframe').forEach(frame => {
    try {
      const doc = frame.contentDocument;
      if (doc) roots.push(doc);
    } catch {
      // ignore cross-origin
    }
  });

  return roots;
};

const queryAllElements = <T extends Element>(selector: string): T[] => {
  const found: T[] = [];
  const roots = getSearchRoots();

  roots.forEach(root => {
    try {
      root.querySelectorAll(selector).forEach(el => found.push(el as T));
    } catch {
      // ignore invalid selectors / inaccessible roots
    }
  });

  return Array.from(new Set(found));
};

/**
 * Detects all fillable form fields on the current page.
 *
 * Scans the page (including shadow DOM and iframes) for input fields,
 * textareas, and select elements. Uses pattern matching and heuristics
 * to classify field types and extract labels.
 *
 * @returns Array of detected fields with type, confidence, and metadata
 */
const detectFormFields = (): DetectedField[] => {
  const fields: DetectedField[] = [];
  const selector =
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea, select';

  const elements = queryAllElements<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selector);

  elements.forEach(element => {
    if (!isVisible(element)) return;

    const { type, confidence } = inferFieldTypeFromElement(element);

    // For textareas, check if it's a custom question field
    let fieldType = type;
    if (element.tagName === 'TEXTAREA' && type === 'unknown') {
      const label = getLabelText(element);
      if (label && label.length > 20) {
        // Likely a question field
        fieldType = 'customQuestion';
      }
    }

    const detectedField: DetectedField = {
      element,
      fieldType,
      confidence: fieldType === 'unknown' ? 0 : confidence,
      label: getLabelText(element) || undefined,
      placeholder: getElementPlaceholder(element),
      isRequired: element.required || element.getAttribute('aria-required') === 'true',
      maxLength: getElementMaxLength(element),
      currentValue: element.value,
    };

    fields.push(detectedField);
  });

  // Also detect file upload inputs
  const fileInputs = queryAllElements<HTMLInputElement>('input[type="file"]');
  fileInputs.forEach(element => {
    if (!isVisible(element)) return;

    const hints = getFieldHints(element);
    const lowerHints = hints.toLowerCase();

    // Determine specific file type
    let fieldType: FieldType = 'fileUpload';
    if (lowerHints.includes('resume') || lowerHints.includes('cv') || lowerHints.includes('curriculum')) {
      fieldType = 'resumeUpload';
    } else if (lowerHints.includes('cover') || lowerHints.includes('letter') || lowerHints.includes('motivation')) {
      fieldType = 'coverLetterUpload';
    }

    const detectedField: DetectedField = {
      element: element as unknown as HTMLInputElement,
      fieldType,
      confidence: 0.9,
      label: getLabelText(element) || undefined,
      placeholder: undefined,
      isRequired: element.required || element.getAttribute('aria-required') === 'true',
      maxLength: undefined,
      currentValue: element.files?.length ? element.files[0].name : '',
      inputType: 'text', // Mark as special type
    };

    fields.push(detectedField);
  });

  return fields;
};

// Detect radio button and checkbox groups
const detectFieldGroups = (): FieldGroup[] => {
  const groups: Map<string, FieldGroup> = new Map();

  // Find all radio buttons and checkboxes
  const inputs = queryAllElements<HTMLInputElement>('input[type="radio"], input[type="checkbox"]');

  inputs.forEach(input => {
    if (!isVisible(input)) return;

    const name = input.name;
    if (!name) return;

    if (!groups.has(name)) {
      const hints = getFieldHints(input);
      const { type } = matchFieldType(hints);

      groups.set(name, {
        name,
        fieldType: type,
        label: getLabelText(input) || findGroupLabel(input) || undefined,
        isRequired: input.required,
        options: [],
        currentValue: [],
        elements: [],
      });
    }

    const group = groups.get(name)!;
    const optionLabel = getLabelText(input) || input.value;

    group.options.push({
      value: input.value,
      label: optionLabel,
      selected: input.checked,
    });

    if (input.checked) {
      group.currentValue.push(input.value);
    }

    group.elements.push(input);
  });

  return Array.from(groups.values());
};

// Find the label for a group of inputs (fieldset legend, nearby heading, etc.)
const findGroupLabel = (element: HTMLElement): string | null => {
  // Check for fieldset legend
  const fieldset = element.closest('fieldset');
  if (fieldset) {
    const legend = fieldset.querySelector('legend');
    if (legend) return legend.textContent?.trim() || null;
  }

  // Check for parent with label-like class
  const parent = element.closest('[class*="group"], [class*="field"], [role="group"]');
  if (parent) {
    const labelEl = parent.querySelector('.label, [class*="label"], h4, h5, h6');
    if (labelEl) return labelEl.textContent?.trim() || null;
  }

  return null;
};

// Get options from a select element
const getSelectOptions = (select: HTMLSelectElement): SelectOption[] =>
  Array.from(select.options).map(opt => ({
    value: opt.value,
    label: opt.textContent?.trim() || opt.value,
    selected: opt.selected,
  }));

// Find best matching option for a value (fuzzy matching)
const findBestOption = (options: SelectOption[], targetValue: string): string | null => {
  if (!targetValue) return null;

  const normalizedTarget = targetValue.toLowerCase().trim();

  // Exact match first
  const exactMatch = options.find(
    opt => opt.value.toLowerCase() === normalizedTarget || opt.label.toLowerCase() === normalizedTarget,
  );
  if (exactMatch) return exactMatch.value;

  // Partial match
  const partialMatch = options.find(
    opt =>
      opt.label.toLowerCase().includes(normalizedTarget) ||
      normalizedTarget.includes(opt.label.toLowerCase()) ||
      opt.value.toLowerCase().includes(normalizedTarget),
  );
  if (partialMatch) return partialMatch.value;

  // Token match (e.g., "San Francisco, CA" -> "CA")
  const tokens = normalizedTarget
    .split(/[,\n]/g)
    .map(t => t.trim())
    .filter(Boolean)
    .filter(t => t !== normalizedTarget);

  for (const token of tokens) {
    const tokenExact = options.find(opt => opt.value.toLowerCase() === token || opt.label.toLowerCase() === token);
    if (tokenExact) return tokenExact.value;

    const tokenPartial = options.find(
      opt => opt.label.toLowerCase().includes(token) || opt.value.toLowerCase().includes(token),
    );
    if (tokenPartial) return tokenPartial.value;
  }

  // Common yes/no mapping
  if (['yes', 'true', '1'].includes(normalizedTarget)) {
    const yesOption = options.find(opt => /yes|true|1/i.test(opt.value) || /yes|true|1/i.test(opt.label));
    if (yesOption) return yesOption.value;
  }

  if (['no', 'false', '0'].includes(normalizedTarget)) {
    const noOption = options.find(opt => /no|false|0/i.test(opt.value) || /no|false|0/i.test(opt.label));
    if (noOption) return noOption.value;
  }

  return null;
};

// Fill a select element with best matching value
const fillSelectField = (select: HTMLSelectElement, value: string): boolean => {
  try {
    const options = getSelectOptions(select);
    const bestMatch = findBestOption(options, value);

    if (bestMatch !== null) {
      select.value = bestMatch;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    return false;
  } catch (error) {
    console.error('[Jobestry] Error filling select:', error);
    return false;
  }
};

// Fill a radio button group
const fillRadioGroup = (group: FieldGroup, value: string): boolean => {
  try {
    const bestMatch = findBestOption(group.options, value);

    if (bestMatch !== null) {
      const input = group.elements.find(el => el.value === bestMatch);
      if (input) {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('[Jobestry] Error filling radio group:', error);
    return false;
  }
};

// Fill checkbox(es) based on value
const fillCheckboxGroup = (group: FieldGroup, values: string | string[]): boolean => {
  try {
    const targetValues = Array.isArray(values) ? values : [values];
    let filled = false;

    for (const value of targetValues) {
      const bestMatch = findBestOption(group.options, value);

      if (bestMatch !== null) {
        const input = group.elements.find(el => el.value === bestMatch);
        if (input) {
          input.checked = true;
          input.dispatchEvent(new Event('change', { bubbles: true }));
          filled = true;
        }
      }
    }

    return filled;
  } catch (error) {
    console.error('[Jobestry] Error filling checkbox group:', error);
    return false;
  }
};

/**
 * Fills a form field with the provided value.
 *
 * Handles different field types (input, textarea, select) and triggers
 * appropriate events to notify React and other frameworks of the change.
 * Uses native value setters when available for better framework compatibility.
 *
 * @param field - The detected field to fill
 * @param value - The value to fill the field with
 * @returns True if field was filled successfully, false otherwise
 */
const fillField = (field: DetectedField, value: string): boolean => {
  try {
    const element = field.element;

    if (element instanceof HTMLSelectElement) {
      return fillSelectField(element, value);
    }

    // For React/controlled inputs, prefer the native setter.
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value',
    )?.set;

    if (element instanceof HTMLInputElement && nativeInputValueSetter) {
      nativeInputValueSetter.call(element, value);
    } else if (element instanceof HTMLTextAreaElement && nativeTextAreaValueSetter) {
      nativeTextAreaValueSetter.call(element, value);
    } else {
      element.value = value;
    }

    // Trigger events to notify frameworks
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));

    return true;
  } catch (error) {
    console.error('[Jobestry] Error filling field:', error);
    return false;
  }
};

/**
 * Extract job description from the current page
 *
 * @param force - If true, uses more relaxed heuristics (useful for manual refresh)
 * @returns Job description text or null if not found
 */
const extractJobDescription = (force: boolean = false): string | null => {
  // Detect platform from URL
  const url = window.location.href;
  const urlObj = new URL(url);
  const hostname = urlObj.hostname.toLowerCase();
  const pathname = urlObj.pathname.toLowerCase();

  const detectPlatform = (): string => {
    // Greenhouse
    if (hostname === 'greenhouse.io' || hostname.endsWith('.greenhouse.io')) return 'greenhouse';
    if (pathname.includes('/jobs?gh_')) return 'greenhouse';

    // Lever
    if (hostname === 'lever.co' || hostname.endsWith('.lever.co')) return 'lever';

    // Workday
    if (hostname === 'myworkdayjobs.com' || hostname.endsWith('.myworkdayjobs.com')) return 'workday';

    // Ashby
    if (hostname === 'ashbyhq.com' || hostname.endsWith('.ashbyhq.com')) return 'ashby';

    // LinkedIn jobs
    if (hostname === 'linkedin.com' || hostname.endsWith('.linkedin.com')) {
      if (pathname.startsWith('/jobs')) return 'linkedin';
    }

    // Indeed
    if (hostname === 'indeed.com' || hostname.endsWith('.indeed.com')) return 'indeed';

    // iCIMS
    if (hostname === 'icims.com' || hostname.endsWith('.icims.com')) return 'icims';

    // Taleo
    if (hostname === 'taleo.net' || hostname.endsWith('.taleo.net')) return 'taleo';

    // BambooHR
    if (hostname === 'bamboohr.com' || hostname.endsWith('.bamboohr.com')) return 'bamboohr';

    // SmartRecruiters
    if (hostname === 'smartrecruiters.com' || hostname.endsWith('.smartrecruiters.com')) return 'smartrecruiters';

    return 'unknown';
  };

  const platform = detectPlatform();

  // Platform-specific selectors (ordered by reliability)
  const platformSelectors: Record<string, string[]> = {
    ashby: [
      'section[data-automation-id="job-description"]',
      '.job-posting-content',
      '.ashby-job-posting',
      'article.job-posting',
      '[class*="job-description"]',
      '[class*="posting-details"]',
      '[class*="job-post"]',
      'main section',
    ],
    greenhouse: [
      '#content',
      '.template-job-board',
      '.job-post',
      '.job-details',
      'article[id*="job"]',
      '[class*="job-board"]',
      '[class*="job-post"]',
      '[class*="job-details"]',
    ],
    lever: [
      '.posting-page',
      '.section-wrapper',
      '.posting-content',
      '.job-posting',
      '.posting-description',
      '[data-webcare-id]',
      '[class*="posting-"]',
    ],
    linkedin: [
      '.jobs-description__content',
      '.jobs-details__main-content',
      '.job-view-layout',
      '[data-job-details]',
      '.jobs-position-details__content',
    ],
    indeed: ['#jobDescriptionText', '.jobsearch-JobComponent-description', '.job-details', '[class*="JobDescription"]'],
    workday: [
      '[data-automation-id="jobDescription"]',
      '.WGDC',
      '[class*="job-description"]',
      '[class*="jobDescription"]',
      '#jobDetails',
    ],
    icims: ['.iCIMS_JobContent', '.iCIMS_MainWrapper', '[class*="job-description"]', '#jobDetailContent'],
    taleo: ['.requisitionDescriptionInner', '.contentPaneOpen', '[class*="requisition"]', '#requisitionDescription'],
    bamboohr: ['.BambooHR-ATS-board', '[class*="job-description"]', '[class*="position-details"]'],
    smartrecruiters: ['.srt-text', '.job-details', '[class*="job-description"]', '#jobDescription'],
  };

  // Generic fallback selectors
  const genericSelectors = [
    '[role="main"]',
    'main article',
    'main section',
    '.main-content',
    '.content-wrapper',
    'article[role="article"]',
    '.job-description',
    '#job-description',
    '[class*="job-description"]',
    '[class*="description-content"]',
  ];

  // Get selectors for this platform, plus generics as fallback
  const selectors = [...(platformSelectors[platform] || []), ...genericSelectors];

  // Try each selector in order
  for (const selector of selectors) {
    try {
      const element = document.querySelector(selector);
      if (element && element.textContent && element.textContent.trim().length > 200) {
        return element.textContent.trim();
      }
    } catch {
      // Invalid selector, skip
    }
  }

  // Last resort: find largest text block with job keywords
  if (force || platform === 'unknown') {
    const jobKeywords =
      /job|position|role|requirement|qualification|responsibilit|experience|skill|benefits|salary|apply|employ/i;

    const containers = document.querySelectorAll('div, section, article, main');
    let bestText = '';
    let bestScore = 0;

    containers.forEach(container => {
      const text = container.textContent || '';
      if (text.length < 300 || text.length > 60000) return;

      // Skip if mostly links (navigation)
      const links = container.querySelectorAll('a');
      const linksText = Array.from(links)
        .map(a => a.textContent || '')
        .join('');
      if (linksText.length / text.length > 0.4) return;

      // Score based on length and keyword presence
      let score = text.length / 100;
      if (jobKeywords.test(text)) score += 20;

      if (score > bestScore) {
        bestScore = score;
        bestText = text;
      }
    });

    if (bestText) {
      return bestText.trim();
    }
  }

  return null;
};

export type { FieldType, DetectedField, SelectOption, FieldGroup };
export {
  getFieldHints,
  inferFieldTypeFromElement,
  detectFormFields,
  detectFieldGroups,
  fillField,
  fillSelectField,
  fillRadioGroup,
  fillCheckboxGroup,
  findBestOption,
  getSelectOptions,
  extractJobDescription,
};
