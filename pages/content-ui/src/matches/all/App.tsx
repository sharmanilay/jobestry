import { extractBulletLines, extractKeywords, getCurrentJobInfo, wordCount } from './job-utils';
import { generateCoverLetterPDF } from './pdf-generator';
import { ViewErrorBoundary } from '@extension/ui/lib/components/ErrorBoundary';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';

type ViewId = 'highlight' | 'autofill' | 'insight' | 'cover' | 'chat' | 'track';

interface DetectedFieldInfo {
  fieldType: string;
  label?: string;
  placeholder?: string;
  isRequired: boolean;
  hasValue: boolean;
  confidence: number;
}

interface ReadyStatus {
  hasProfile: boolean;
  hasApiKey: boolean;
  isReady: boolean;
}

interface StylePreset {
  id: string;
  name: string;
  description: string;
}

type ThemeState = { theme?: 'light' | 'dark'; isLight?: boolean };

type ApplicationStatus = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected';
type ApplicationSource = 'manual' | 'detected';

type TrackedApplication = {
  url: string;
  title: string;
  company?: string;
  location?: string;
  status: ApplicationStatus;
  source: ApplicationSource;
  createdAt: number;
  updatedAt: number;
  notes?: string;
};

type ApplicationsState = { applications: TrackedApplication[] };

type ErrorType = 'api_key' | 'rate_limit' | 'network' | 'safety' | 'unknown';

interface AppError {
  type: ErrorType;
  title: string;
  message: string;
  action?: 'settings' | 'retry';
}

type ImproveMode =
  | 'shorten'
  | 'expand'
  | 'positive'
  | 'humor'
  | 'creative'
  | 'professional'
  | 'conversational'
  | 'human_touch'
  | 'custom';

interface JobInsights {
  fitScore?: number;
  summary?: string;
  strengths?: string[];
  gaps?: string[];
  keywords?: string[];
  interviewQuestions?: string[];
}

const DEFAULT_PRESETS: StylePreset[] = [
  { id: 'professional', name: 'Professional', description: 'Formal and business-appropriate' },
  { id: 'confident', name: 'Confident', description: 'Bold and achievement-focused' },
  { id: 'friendly', name: 'Friendly', description: 'Warm and approachable' },
  { id: 'concise', name: 'Concise', description: 'Direct and to-the-point' },
];

const STORAGE_SIDEBAR_OPEN = 'jobestry-sidebar-open';
const STORAGE_SIDEBAR_WIDTH = 'jobestry-sidebar-width';
const STORAGE_SIDEBAR_VIEW = 'jobestry-sidebar-view';
const STORAGE_THEME = 'theme-storage-key';
const STORAGE_MANUAL_JD = 'jobestry-manual-jd';
const STORAGE_APPLICATIONS = 'jobestry-applications';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const classifyError = (errorMessage: string): AppError => {
  const lower = errorMessage.toLowerCase();

  if (lower.includes('api key not configured') || lower.includes('invalid api key')) {
    return {
      type: 'api_key',
      title: 'API Key Required',
      message: 'Add your Gemini API key in settings to enable AI features.',
      action: 'settings',
    };
  }

  if (lower.includes('rate limit') || lower.includes('quota') || lower.includes('429')) {
    return {
      type: 'rate_limit',
      title: 'Rate Limited',
      message: 'Too many requests. Wait a moment and try again.',
      action: 'retry',
    };
  }

  if (lower.includes('network') || lower.includes('fetch') || lower.includes('connection')) {
    return {
      type: 'network',
      title: 'Network Error',
      message: 'Could not connect to the AI service. Check your connection and retry.',
      action: 'retry',
    };
  }

  if (lower.includes('safety') || lower.includes('blocked')) {
    return {
      type: 'safety',
      title: 'Content Blocked',
      message: 'The response was blocked by safety filters. Try rephrasing.',
      action: 'retry',
    };
  }

  return {
    type: 'unknown',
    title: 'Something Went Wrong',
    message: errorMessage || 'An unexpected error occurred. Please try again.',
    action: 'retry',
  };
};

const Icon = ({ children }: { children: ReactNode }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{children}</span>
);

const ChevronLeftIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const SettingsIcon = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const CopyIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

const DownloadIcon = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>
);

const StarIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.68 5.17a1 1 0 00.95.69h5.433c.969 0 1.371 1.24.588 1.81l-4.395 3.192a1 1 0 00-.364 1.118l1.679 5.17c.3.922-.755 1.688-1.54 1.118l-4.394-3.192a1 1 0 00-1.175 0l-4.394 3.192c-.785.57-1.84-.196-1.54-1.118l1.68-5.17a1 1 0 00-.365-1.118L2.98 10.597c-.783-.57-.38-1.81.588-1.81h5.434a1 1 0 00.95-.69l1.68-5.17z"
    />
  </svg>
);

const FormIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const InsightIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
    />
  </svg>
);

const MailIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8m-18 0a2 2 0 012-2h14a2 2 0 012 2m-18 0v10a2 2 0 002 2h14a2 2 0 002-2V8"
    />
  </svg>
);

const ChatIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 10h.01M12 10h.01M16 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const TrackIcon = () => (
  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v14l4-2 4 2 4-2 4 2V7a2 2 0 00-2-2h-2"
    />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5a3 3 0 006 0" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export default function App() {
  const [isLight, setIsLight] = useState(true);
  const [manualJobDescription, setManualJobDescription] = useState<string | null>(null);
  const [applicationsState, setApplicationsState] = useState<ApplicationsState>({ applications: [] });

  const [isOpen, setIsOpen] = useState(false);
  const [showFloatingButton, setShowFloatingButton] = useState(true);
  const [activeView, setActiveView] = useState<ViewId>('highlight');
  const [drawerWidth, setDrawerWidth] = useState(460);
  const [isResizing, setIsResizing] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showLauncherHint, setShowLauncherHint] = useState(false);

  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(0);
  const launcherHintTimerRef = useRef<number | null>(null);

  const [fields, setFields] = useState<DetectedFieldInfo[]>([]);
  const [focusedFieldIndex, setFocusedFieldIndex] = useState<number | null>(null);
  const [autoJobDescription, setAutoJobDescription] = useState('');
  const [readyStatus, setReadyStatus] = useState<ReadyStatus | null>(null);

  const [isFillingStandard, setIsFillingStandard] = useState(false);
  const [loadingFieldIndex, setLoadingFieldIndex] = useState<number | null>(null);

  const [selectedPreset, setSelectedPreset] = useState('professional');
  const [presets, setPresets] = useState<StylePreset[]>(DEFAULT_PRESETS);
  const [showPresetDropdown, setShowPresetDropdown] = useState(false);

  const [error, setError] = useState<AppError | null>(null);

  const [highlightEnabled, setHighlightEnabled] = useState(false);

  const [coverLetter, setCoverLetter] = useState('');
  const [coverLetterHistory, setCoverLetterHistory] = useState<string[]>([]);
  const [isGeneratingCoverLetter, setIsGeneratingCoverLetter] = useState(false);
  const [isImprovingCoverLetter, setIsImprovingCoverLetter] = useState(false);
  const [isEditingCoverLetter, setIsEditingCoverLetter] = useState(false);
  const [improveMenuOpen, setImproveMenuOpen] = useState(false);
  const [customImproveInstruction, setCustomImproveInstruction] = useState('');
  const [coverLetterNotes, setCoverLetterNotes] = useState('');
  const [coverLetterStylePreset, setCoverLetterStylePreset] = useState(selectedPreset);
  const [showCoverLetterStyleDropdown, setShowCoverLetterStyleDropdown] = useState(false);

  const [insights, setInsights] = useState<JobInsights | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);

  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const [fieldNotes, setFieldNotes] = useState<Record<number, string>>({});
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});

  const [manualJDEditing, setManualJDEditing] = useState(false);
  const [manualJDText, setManualJDText] = useState('');
  const [currentAppNotes, setCurrentAppNotes] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const improveMenuRef = useRef<HTMLDivElement | null>(null);
  const presetMenuRef = useRef<HTMLDivElement | null>(null);
  const coverLetterStyleMenuRef = useRef<HTMLDivElement | null>(null);
  const focusedFieldCardRef = useRef<HTMLDivElement | null>(null);

  const effectiveJobDescription = useMemo(() => {
    const auto = autoJobDescription.trim();
    const manual = manualJobDescription?.trim();

    // Prefer auto-detected JD when available (from page refresh/scan)
    // Only use manual as fallback when auto is empty
    if (auto.length > 50) return auto;
    if (manual) return manual;
    return auto;
  }, [manualJobDescription, autoJobDescription]);

  const jdSource: 'manual' | 'auto' | 'none' =
    autoJobDescription.trim().length > 50 ? 'auto' : manualJobDescription?.trim() ? 'manual' : 'none';

  const hasJobDescription = effectiveJobDescription.length > 50;

  console.log('[Jobestry UI] JD State:', {
    jdSource,
    hasJobDescription,
    effectiveLen: effectiveJobDescription.length,
    autoLen: autoJobDescription.length,
  });

  const jobInfo = useMemo(() => getCurrentJobInfo(effectiveJobDescription), [effectiveJobDescription]);

  const keywords = useMemo(() => extractKeywords(effectiveJobDescription, 14), [effectiveJobDescription]);
  const bulletLines = useMemo(() => extractBulletLines(effectiveJobDescription, 8), [effectiveJobDescription]);
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const currentApp = useMemo(
    () => applicationsState.applications.find(app => app.url === jobInfo.url),
    [applicationsState.applications, jobInfo.url],
  );

  useEffect(() => {
    setCurrentAppNotes(currentApp?.notes || '');
  }, [currentApp?.notes, currentApp?.url]);

  const safeSendMessage = useCallback(async <T,>(message: Record<string, unknown>): Promise<T | null> => {
    if (!chrome?.runtime?.id) return null;
    try {
      return await chrome.runtime.sendMessage(message);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Extension context invalidated')) return null;
      throw err;
    }
  }, []);

  // Restore theme + persisted assistant state (manual JD, applications)
  useEffect(() => {
    const normalizeTheme = (value: unknown): boolean => {
      const v = value as ThemeState | undefined;
      return typeof v?.isLight === 'boolean' ? v.isLight : true;
    };

    const normalizeManualJD = (value: unknown): string | null => {
      const v = value as { manualJobDescription?: unknown } | undefined;
      const jd = v?.manualJobDescription;
      return typeof jd === 'string' && jd.trim().length > 0 ? jd : null;
    };

    const normalizeApps = (value: unknown): ApplicationsState => {
      const v = value as { applications?: unknown } | undefined;
      const apps = v?.applications;
      return Array.isArray(apps) ? { applications: apps as TrackedApplication[] } : { applications: [] };
    };

    chrome.storage.local
      .get([STORAGE_THEME, STORAGE_MANUAL_JD, STORAGE_APPLICATIONS])
      .then(result => {
        setIsLight(normalizeTheme(result[STORAGE_THEME]));
        setManualJobDescription(normalizeManualJD(result[STORAGE_MANUAL_JD]));
        setApplicationsState(normalizeApps(result[STORAGE_APPLICATIONS]));
      })
      .catch(() => undefined);

    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local') return;

      if (changes[STORAGE_THEME]) {
        setIsLight(normalizeTheme(changes[STORAGE_THEME].newValue));
      }
      if (changes[STORAGE_MANUAL_JD]) {
        setManualJobDescription(normalizeManualJD(changes[STORAGE_MANUAL_JD].newValue));
      }
      if (changes[STORAGE_APPLICATIONS]) {
        setApplicationsState(normalizeApps(changes[STORAGE_APPLICATIONS].newValue));
      }
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  // Restore UI preferences (width + last view) but never auto-open the sidebar
  useEffect(() => {
    chrome.storage.local
      .get([STORAGE_SIDEBAR_WIDTH, STORAGE_SIDEBAR_VIEW])
      .then(result => {
        const savedWidth = result[STORAGE_SIDEBAR_WIDTH];
        const savedView = result[STORAGE_SIDEBAR_VIEW];

        if (typeof savedWidth === 'number') setDrawerWidth(clamp(savedWidth, 360, 760));
        if (
          typeof savedView === 'string' &&
          (['highlight', 'autofill', 'insight', 'cover', 'chat', 'track'] as const).includes(savedView as ViewId)
        ) {
          setActiveView(savedView as ViewId);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    chrome.storage.local.set({ [STORAGE_SIDEBAR_OPEN]: isOpen }).catch(() => undefined);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setShowLauncherHint(false);
    if (launcherHintTimerRef.current !== null) {
      window.clearTimeout(launcherHintTimerRef.current);
      launcherHintTimerRef.current = null;
    }
  }, [isOpen]);

  useEffect(() => {
    chrome.storage.local.set({ [STORAGE_SIDEBAR_VIEW]: activeView }).catch(() => undefined);
  }, [activeView]);

  // Persist width only when not actively resizing
  useEffect(() => {
    if (isResizing) return;
    chrome.storage.local.set({ [STORAGE_SIDEBAR_WIDTH]: drawerWidth }).catch(() => undefined);
  }, [drawerWidth, isResizing]);

  // When a manual JD is set via context menu, prefer the Highlight view
  // but do not auto-open the sidebar; let the user open it via the launcher.
  useEffect(() => {
    if (jdSource === 'manual' && isOpen) {
      setActiveView('highlight');
    }
  }, [jdSource, isOpen]);

  // Dismiss improve menu on outside click
  useEffect(() => {
    if (!improveMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (improveMenuRef.current?.contains(target)) return;
      setImproveMenuOpen(false);
    };
    window.addEventListener('mousedown', onDown, true);
    return () => window.removeEventListener('mousedown', onDown, true);
  }, [improveMenuOpen]);

  // Dismiss preset menu on outside click
  useEffect(() => {
    if (!showPresetDropdown) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (presetMenuRef.current?.contains(target)) return;
      setShowPresetDropdown(false);
    };
    window.addEventListener('mousedown', onDown, true);
    return () => window.removeEventListener('mousedown', onDown, true);
  }, [showPresetDropdown]);

  // Dismiss cover letter style menu on outside click
  useEffect(() => {
    if (!showCoverLetterStyleDropdown) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (coverLetterStyleMenuRef.current?.contains(target)) return;
      setShowCoverLetterStyleDropdown(false);
    };
    window.addEventListener('mousedown', onDown, true);
    return () => window.removeEventListener('mousedown', onDown, true);
  }, [showCoverLetterStyleDropdown]);

  // Close transient menus when switching views or closing
  useEffect(() => {
    setShowPresetDropdown(false);
    setImproveMenuOpen(false);
    setShowCoverLetterStyleDropdown(false);
  }, [activeView, isOpen]);

  // Check readiness
  useEffect(() => {
    safeSendMessage<ReadyStatus>({ type: 'CHECK_READY' })
      .then(res => res && setReadyStatus(res))
      .catch(() => undefined);
  }, [safeSendMessage]);

  // Load presets
  useEffect(() => {
    safeSendMessage<{ presets?: StylePreset[]; currentPresetId?: string }>({ type: 'GET_STYLE_PRESETS' })
      .then(res => {
        if (res?.presets?.length) setPresets(res.presets);
        if (res?.currentPresetId) {
          setSelectedPreset(res.currentPresetId);
          setCoverLetterStylePreset(res.currentPresetId);
        }
      })
      .catch(() => undefined);
  }, [safeSendMessage]);

  // Sync cover letter style preset when selected preset changes
  useEffect(() => {
    setCoverLetterStylePreset(selectedPreset);
  }, [selectedPreset]);

  const handleSelectPreset = useCallback(
    async (presetId: string) => {
      setSelectedPreset(presetId);
      try {
        await safeSendMessage({ type: 'SET_STYLE_PRESET', presetId });
      } catch {
        // ignore
      }
    },
    [safeSendMessage],
  );

  // Listen for content-script signals (fields/JD + completion events)
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window) return;
      const payload = event.data as unknown;
      if (!payload || typeof payload !== 'object') return;
      if (!('__jobestry' in payload) || (payload as { __jobestry?: unknown }).__jobestry !== true) return;

      const { type, ...data } = payload as Record<string, unknown>;

      switch (type) {
        case 'JOBESTRY_FIELDS_DETECTED':
        case 'JOBESTRY_FIELDS_UPDATED': {
          const jdText = typeof data.jobDescriptionText === 'string' ? data.jobDescriptionText : '';
          console.log('[Jobestry UI] Received JD:', {
            hasJD: data.hasJobDescription,
            jdLen: jdText.length,
            jdPreview: jdText.slice(0, 1000),
          });
          setIsScanning(false);
          if (Array.isArray(data.fields)) {
            setFields(data.fields as DetectedFieldInfo[]);
          }
          if (typeof data.jobDescriptionText === 'string') {
            console.log('[Jobestry UI] Setting autoJobDescription, len:', data.jobDescriptionText.length);
            setAutoJobDescription(data.jobDescriptionText);
          }
          break;
        }
        case 'JOBESTRY_FILL_COMPLETE':
          setIsFillingStandard(false);
          break;
        case 'JOBESTRY_TOGGLE_SIDEBAR':
          if (isOpen) {
            setIsClosing(true);
            setTimeout(() => {
              setIsOpen(false);
              setIsClosing(false);
            }, 200);
          } else {
            setIsClosing(false);
            setIsOpen(true);
            if (focusedFieldIndex !== null) setActiveView('autofill');
          }
          break;
        case 'JOBESTRY_OPEN_COVER_LETTER':
          setIsClosing(false);
          setIsOpen(true);
          setActiveView('cover');
          break;
        case 'JOBESTRY_GENERATE_COMPLETE':
          setLoadingFieldIndex(null);
          break;
        case 'JOBESTRY_SHOW_FLOATING_BUTTON':
          console.log('[Jobestry UI] Showing floating button');
          break;
        case 'JOBESTRY_HIDE_FLOATING_BUTTON':
          console.log('[Jobestry UI] Hiding floating button');
          setIsOpen(false);
          setShowFloatingButton(false);
          break;
        case 'JOBESTRY_FOCUS_FIELD': {
          const fieldIndex = typeof data.fieldIndex === 'number' ? data.fieldIndex : null;
          const forceOpen = data.forceOpen === true;
          if (forceOpen) {
            setIsClosing(false);
            setIsOpen(true);
          }
          if (isOpen || forceOpen) {
            setActiveView('autofill');
          }
          setFocusedFieldIndex(fieldIndex);
          setShowPresetDropdown(false);
          setImproveMenuOpen(false);

          const shouldAutoGenerate = data.autoGenerate === true;

          if (fieldIndex !== null && !isOpen && !forceOpen) {
            setShowLauncherHint(true);
            if (launcherHintTimerRef.current !== null) window.clearTimeout(launcherHintTimerRef.current);
            launcherHintTimerRef.current = window.setTimeout(() => {
              setShowLauncherHint(false);
              launcherHintTimerRef.current = null;
            }, 3500);
          }

          if (fieldIndex !== null && shouldAutoGenerate && (isOpen || forceOpen)) {
            setLoadingFieldIndex(fieldIndex);
            setTimeout(() => {
              window.postMessage(
                {
                  __jobestry: true,
                  type: 'JOBESTRY_REQUEST_GENERATE',
                  fieldIndex,
                  presetId: selectedPreset,
                  userNotes: fieldNotes[fieldIndex] || undefined,
                },
                '*',
              );
            }, 80);
          }
          break;
        }
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [fieldNotes, focusedFieldIndex, isOpen, selectedPreset]);

  // Highlight toggle -> content script
  useEffect(() => {
    if (!highlightEnabled) {
      window.postMessage({ __jobestry: true, type: 'JOBESTRY_SET_HIGHLIGHT', enabled: false }, '*');
      return;
    }

    window.postMessage({ __jobestry: true, type: 'JOBESTRY_SET_HIGHLIGHT', enabled: true, keywords }, '*');
  }, [highlightEnabled, keywords]);

  useEffect(() => {
    if (!isOpen) return;
    if (activeView !== 'autofill') return;
    if (focusedFieldIndex === null) return;
    focusedFieldCardRef.current?.scrollIntoView({
      block: 'nearest',
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
    });
  }, [activeView, focusedFieldIndex, isOpen, prefersReducedMotion]);

  // Drawer resize behavior
  useEffect(() => {
    if (!isResizing) return;

    const onMove = (e: PointerEvent) => {
      const delta = resizeStartXRef.current - e.clientX;
      const next = clamp(resizeStartWidthRef.current + delta, 360, 760);
      setDrawerWidth(next);
    };

    const onUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [isResizing]);

  const onResizeStart = (e: ReactPointerEvent<HTMLDivElement>) => {
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = drawerWidth;
    setIsResizing(true);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  };

  const handleCollapse = useCallback(() => {
    if (isClosing) return;
    setShowPresetDropdown(false);
    setImproveMenuOpen(false);
    setShowLauncherHint(false);

    if (launcherHintTimerRef.current !== null) {
      window.clearTimeout(launcherHintTimerRef.current);
      launcherHintTimerRef.current = null;
    }

    if (isResizing) {
      setIsResizing(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    setIsClosing(true);
    window.setTimeout(
      () => {
        setIsOpen(false);
        setIsClosing(false);
      },
      prefersReducedMotion ? 1 : 160,
    );
  }, [isClosing, isResizing, prefersReducedMotion]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (improveMenuOpen) {
        setImproveMenuOpen(false);
        return;
      }
      if (showPresetDropdown) {
        setShowPresetDropdown(false);
        return;
      }
      handleCollapse();
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [handleCollapse, improveMenuOpen, isOpen, showPresetDropdown]);

  const handleOpenSettings = useCallback(() => {
    safeSendMessage({ type: 'OPEN_OPTIONS' }).catch(() =>
      window.open(chrome.runtime.getURL('options/index.html'), '_blank'),
    );
  }, [safeSendMessage]);

  const handleRefreshScan = useCallback(() => {
    // Show loading state
    setIsScanning(true);
    setFields([]);
    setAutoJobDescription('');

    // Send scan request to content script
    window.postMessage({ __jobestry: true, type: 'JOBESTRY_REQUEST_SCAN' }, '*');

    // Reset scanning state after a timeout (in case content script doesn't respond)
    setTimeout(() => {
      setIsScanning(false);
    }, 3000);
  }, []);

  const handleAutoFillAll = useCallback(() => {
    setIsFillingStandard(true);
    window.postMessage({ __jobestry: true, type: 'JOBESTRY_REQUEST_FILL_ALL' }, '*');
  }, []);

  const handleGenerateForField = useCallback(
    (fieldIndex: number) => {
      setLoadingFieldIndex(fieldIndex);
      window.postMessage(
        {
          __jobestry: true,
          type: 'JOBESTRY_REQUEST_GENERATE',
          fieldIndex,
          presetId: selectedPreset,
          userNotes: fieldNotes[fieldIndex] || undefined,
        },
        '*',
      );
    },
    [fieldNotes, selectedPreset],
  );

  const handleGenerateCoverLetter = useCallback(async () => {
    if (!hasJobDescription) {
      setError(
        classifyError('No job description detected. Paste one in Highlight or select text → “Set as Job Description”.'),
      );
      setActiveView('highlight');
      return;
    }

    setIsGeneratingCoverLetter(true);
    setError(null);

    try {
      const res = await safeSendMessage<{ success?: boolean; response?: string; error?: string }>({
        type: 'GENERATE_COVER_LETTER',
        jobDescription: effectiveJobDescription,
        presetId: selectedPreset,
      });

      if (res?.success && res.response) {
        if (coverLetter.trim()) setCoverLetterHistory(prev => [coverLetter, ...prev].slice(0, 10));
        setCoverLetter(res.response);
      } else {
        setError(classifyError(res?.error || 'Failed to generate cover letter'));
      }
    } catch (err) {
      setError(classifyError(err instanceof Error ? err.message : 'Failed to generate cover letter'));
    } finally {
      setIsGeneratingCoverLetter(false);
    }
  }, [coverLetter, effectiveJobDescription, hasJobDescription, safeSendMessage, selectedPreset]);

  const handleImproveCoverLetter = useCallback(
    async (mode: ImproveMode, instruction?: string) => {
      if (!coverLetter.trim()) return;

      setIsImprovingCoverLetter(true);
      setError(null);
      setImproveMenuOpen(false);

      try {
        const res = await safeSendMessage<{ success?: boolean; response?: string; error?: string }>({
          type: 'IMPROVE_COVER_LETTER',
          coverLetter,
          jobDescription: hasJobDescription ? effectiveJobDescription : undefined,
          presetId: selectedPreset,
          mode,
          instruction,
        });

        if (res?.success && res.response) {
          setCoverLetterHistory(prev => [coverLetter, ...prev].slice(0, 10));
          setCoverLetter(res.response);
        } else {
          setError(classifyError(res?.error || 'Failed to improve cover letter'));
        }
      } catch (err) {
        setError(classifyError(err instanceof Error ? err.message : 'Failed to improve cover letter'));
      } finally {
        setIsImprovingCoverLetter(false);
      }
    },
    [coverLetter, effectiveJobDescription, hasJobDescription, safeSendMessage, selectedPreset],
  );

  const handleUndoCoverLetter = useCallback(() => {
    setCoverLetterHistory(prev => {
      if (prev.length === 0) return prev;
      const [next, ...rest] = prev;
      setCoverLetter(next);
      return rest;
    });
  }, []);

  const handleCopyCoverLetter = useCallback(() => {
    navigator.clipboard.writeText(coverLetter).catch(() => undefined);
  }, [coverLetter]);

  const handleDownloadCoverLetterPDF = useCallback(async () => {
    if (!coverLetter.trim()) return;
    const profile = await safeSendMessage<{
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      location?: string;
    }>({ type: 'GET_PROFILE' });

    generateCoverLetterPDF({
      content: coverLetter,
      applicantName: profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : '',
      applicantEmail: profile?.email || '',
      applicantPhone: profile?.phone || '',
      applicantLocation: profile?.location || '',
      jobTitle: jobInfo.title || 'Position',
      companyName: jobInfo.company || 'Company',
    });
  }, [coverLetter, jobInfo.company, jobInfo.title, safeSendMessage]);

  const handleGenerateInsights = useCallback(async () => {
    if (!hasJobDescription) {
      setError(
        classifyError('No job description detected. Paste one in Highlight or select text → “Set as Job Description”.'),
      );
      setActiveView('highlight');
      return;
    }

    setIsGeneratingInsights(true);
    setError(null);

    try {
      const res = await safeSendMessage<{ success?: boolean; insights?: JobInsights; error?: string }>({
        type: 'GENERATE_JOB_INSIGHTS',
        jobDescription: effectiveJobDescription,
        presetId: selectedPreset,
      });

      if (res?.success && res.insights) {
        setInsights(res.insights);
      } else {
        setError(classifyError(res?.error || 'Failed to generate insights'));
      }
    } catch (err) {
      setError(classifyError(err instanceof Error ? err.message : 'Failed to generate insights'));
    } finally {
      setIsGeneratingInsights(false);
    }
  }, [effectiveJobDescription, hasJobDescription, safeSendMessage, selectedPreset]);

  const handleChatSubmit = useCallback(async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      const res = await safeSendMessage<{ success: boolean; response?: string; error?: string }>({
        type: 'AI_CHAT',
        question: userMessage,
        jobDescription: hasJobDescription ? effectiveJobDescription : undefined,
        stylePreset: selectedPreset,
      });

      const aiResponse = res?.response;
      if (res?.success && aiResponse) {
        setChatMessages(prev => [...prev, { role: 'ai', content: aiResponse }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'ai', content: `Error: ${res?.error || 'Failed to get response'}` }]);
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'ai', content: 'Error: Failed to communicate with AI' }]);
    } finally {
      setIsChatLoading(false);
    }
  }, [chatInput, effectiveJobDescription, hasJobDescription, isChatLoading, safeSendMessage, selectedPreset]);

  const standardFieldTypes = useMemo(
    () => ['firstName', 'lastName', 'fullName', 'email', 'phone', 'location', 'linkedin', 'github', 'portfolio'],
    [],
  );

  const standardFields = useMemo(
    () => fields.filter(f => standardFieldTypes.includes(f.fieldType)),
    [fields, standardFieldTypes],
  );
  // AI fields include custom questions, cover letters, and other detected fields (for AI generation)
  const aiFields = useMemo(
    () => fields.filter(f => !standardFieldTypes.includes(f.fieldType)),
    [fields, standardFieldTypes],
  );
  const otherFields = useMemo(
    () =>
      fields.filter(
        f =>
          !standardFieldTypes.includes(f.fieldType) &&
          f.fieldType !== 'customQuestion' &&
          f.fieldType !== 'coverLetter',
      ),
    [fields, standardFieldTypes],
  );

  const filledCount = useMemo(() => fields.filter(f => f.hasValue).length, [fields]);

  const onSaveManualJD = useCallback(async () => {
    const value = manualJDText.trim();
    if (!value) return;
    await chrome.storage.local.set({
      [STORAGE_MANUAL_JD]: { manualJobDescription: value, lastUpdated: Date.now() },
    });
    setManualJDEditing(false);
    setManualJDText('');
  }, [manualJDText]);

  const onClearManualJD = useCallback(async () => {
    await chrome.storage.local.set({
      [STORAGE_MANUAL_JD]: { manualJobDescription: null, lastUpdated: Date.now() },
    });
    setManualJDEditing(false);
    setManualJDText('');
  }, []);

  const persistApplications = useCallback((next: ApplicationsState) => {
    chrome.storage.local.set({ [STORAGE_APPLICATIONS]: next }).catch(() => undefined);
  }, []);

  const updateApplications = useCallback(
    (updater: (prev: ApplicationsState) => ApplicationsState) => {
      setApplicationsState(prev => {
        const next = updater(prev);
        persistApplications(next);
        return next;
      });
    },
    [persistApplications],
  );

  const upsertApplication = useCallback(
    (input: {
      url: string;
      title: string;
      company?: string;
      location?: string;
      status: ApplicationStatus;
      source: ApplicationSource;
    }) => {
      const now = Date.now();
      updateApplications(prev => {
        const existingIndex = prev.applications.findIndex(app => app.url === input.url);
        if (existingIndex === -1) {
          const nextApp: TrackedApplication = {
            url: input.url,
            title: input.title,
            company: input.company,
            location: input.location,
            status: input.status,
            source: input.source,
            createdAt: now,
            updatedAt: now,
          };
          return { applications: [nextApp, ...prev.applications] };
        }

        const nextApps = [...prev.applications];
        nextApps[existingIndex] = {
          ...nextApps[existingIndex],
          title: input.title,
          company: input.company,
          location: input.location,
          status: input.status,
          source: input.source,
          updatedAt: now,
        };
        return { applications: nextApps };
      });
    },
    [updateApplications],
  );

  const updateApplicationStatus = useCallback(
    (url: string, status: ApplicationStatus) => {
      const now = Date.now();
      updateApplications(prev => ({
        applications: prev.applications.map(app => (app.url === url ? { ...app, status, updatedAt: now } : app)),
      }));
    },
    [updateApplications],
  );

  const removeApplication = useCallback(
    (url: string) => {
      updateApplications(prev => ({ applications: prev.applications.filter(app => app.url !== url) }));
    },
    [updateApplications],
  );

  const updateApplicationNotes = useCallback(
    (url: string, notes: string) => {
      const normalized = notes.trim();
      const now = Date.now();
      updateApplications(prev => ({
        applications: prev.applications.map(app =>
          app.url === url ? { ...app, notes: normalized.length > 0 ? normalized : undefined, updatedAt: now } : app,
        ),
      }));
    },
    [updateApplications],
  );

  const exportApplicationsCsv = useCallback(() => {
    const csvEscape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const header = ['Title', 'Company', 'Location', 'URL', 'Status', 'Updated At', 'Notes'];
    const rows = applicationsState.applications.map(app => {
      const updated = new Date(app.updatedAt).toISOString();
      return [
        app.title || '',
        app.company || '',
        app.location || '',
        app.url || '',
        app.status || '',
        updated,
        app.notes || '',
      ]
        .map(csvEscape)
        .join(',');
    });

    const csv = [header.map(csvEscape).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jobestry-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [applicationsState.applications]);

  const onSaveCurrentJob = useCallback(
    (status: ApplicationStatus = 'saved') => {
      upsertApplication({
        url: jobInfo.url,
        title: jobInfo.title || 'Untitled role',
        company: jobInfo.company,
        location: jobInfo.location,
        status,
        source: 'detected',
      });
      setActiveView('track');
    },
    [jobInfo.company, jobInfo.location, jobInfo.title, jobInfo.url, upsertApplication],
  );

  const navItems: Array<{ id: ViewId; label: string; icon: ReactNode }> = [
    { id: 'highlight', label: 'Highlight', icon: <StarIcon /> },
    { id: 'autofill', label: 'Autofill', icon: <FormIcon /> },
    { id: 'insight', label: 'Insight', icon: <InsightIcon /> },
    { id: 'cover', label: 'Cover', icon: <MailIcon /> },
    { id: 'chat', label: 'Chat', icon: <ChatIcon /> },
    { id: 'track', label: 'Track', icon: <TrackIcon /> },
  ];

  const viewTitle: Record<ViewId, string> = {
    highlight: 'Highlight',
    autofill: 'Autofill',
    insight: 'Insight',
    cover: 'Cover Letter',
    chat: 'Chat',
    track: 'Track',
  };

  const coverWords = wordCount(coverLetter);
  const idealCoverMin = 220;
  const idealCoverMax = 340;
  const coverLenLabel =
    coverWords === 0 ? '' : coverWords < idealCoverMin ? 'Short' : coverWords > idealCoverMax ? 'Long' : 'Ideal';

  const currentPreset = presets.find(p => p.id === selectedPreset);

  const renderError = () => {
    if (!error) return null;
    return (
      <div
        style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.22)',
          borderRadius: 12,
          padding: '10px 12px',
          marginBottom: 12,
        }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{error.title}</div>
        <div style={{ fontSize: 12, color: isLight ? '#334155' : '#cbd5e1' }}>{error.message}</div>
        {error.action === 'settings' && (
          <div style={{ marginTop: 10 }}>
            <button className="jobestry-btn jobestry-btn-primary" onClick={handleOpenSettings}>
              Open Settings
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderHighlightView = () => (
    <>
      {renderError()}

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: isLight ? '#0f172a' : '#f8fafc' }}>
          {jobInfo.title || 'Job'}
        </div>
        <div style={{ fontSize: 12, color: isLight ? '#64748b' : '#94a3b8' }}>
          {[jobInfo.company, jobInfo.location].filter(Boolean).join(' • ') || jobInfo.url}
        </div>
      </div>

      <div className="jobestry-divider" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>Job description</div>
          <div style={{ fontSize: 11, color: isLight ? '#64748b' : '#94a3b8' }}>
            {jdSource === 'manual' ? 'Manual' : jdSource === 'auto' ? 'Auto-detected' : 'Not detected'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!manualJDEditing ? (
            <button
              className="jobestry-btn jobestry-btn-secondary jobestry-btn-sm"
              onClick={() => {
                setManualJDEditing(true);
                setManualJDText(manualJobDescription?.trim() || effectiveJobDescription || '');
              }}>
              Edit
            </button>
          ) : (
            <>
              <button
                className="jobestry-btn jobestry-btn-secondary jobestry-btn-sm"
                onClick={() => setManualJDEditing(false)}>
                Cancel
              </button>
              <button className="jobestry-btn jobestry-btn-primary jobestry-btn-sm" onClick={onSaveManualJD}>
                Save
              </button>
            </>
          )}
        </div>
      </div>

      {manualJDEditing ? (
        <div style={{ marginTop: 10 }}>
          <textarea
            value={manualJDText}
            onChange={e => setManualJDText(e.target.value)}
            placeholder="Paste the job description here…"
            style={{
              width: '100%',
              minHeight: 140,
              resize: 'vertical',
              padding: 12,
              borderRadius: 12,
              border: `1px solid ${isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.14)'}`,
              background: isLight ? 'rgba(248,250,252,0.8)' : 'rgba(15,23,42,0.4)',
              color: isLight ? '#0f172a' : '#f8fafc',
              fontSize: 12,
              lineHeight: 1.55,
              outline: 'none',
            }}
          />
          {jdSource === 'manual' && (
            <div style={{ marginTop: 10 }}>
              <button className="jobestry-btn jobestry-btn-secondary" onClick={onClearManualJD}>
                Clear manual JD
              </button>
            </div>
          )}
          <div style={{ marginTop: 10, fontSize: 11, color: isLight ? '#64748b' : '#94a3b8' }}>
            Tip: you can also select the JD text on the page → right click → “Set as Job Description”.
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 10 }}>
          {hasJobDescription ? (
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                background: isLight ? 'rgba(248,250,252,0.8)' : 'rgba(15,23,42,0.4)',
                border: `1px solid ${isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.12)'}`,
                maxHeight: 140,
                overflow: 'auto',
                fontSize: 12,
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
              }}>
              {effectiveJobDescription}
            </div>
          ) : (
            <div className="jobestry-empty-state">Paste a job description here or open a job posting page.</div>
          )}
        </div>
      )}

      <div className="jobestry-divider" />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>Keywords</div>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11,
            color: isLight ? '#475569' : '#cbd5e1',
          }}>
          <input
            type="checkbox"
            checked={highlightEnabled}
            onChange={e => setHighlightEnabled(e.target.checked)}
            style={{ accentColor: 'var(--jobestry-brand-600)' }}
          />
          Highlight on page
        </label>
      </div>

      <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {keywords.length === 0 ? (
          <span style={{ fontSize: 12, color: isLight ? '#94a3b8' : '#94a3b8' }}>
            Add a job description to extract keywords.
          </span>
        ) : (
          keywords.map(k => (
            <span key={k} className="jobestry-chip">
              {k}
            </span>
          ))
        )}
      </div>

      {bulletLines.length > 0 && (
        <>
          <div className="jobestry-divider" />
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Role highlights</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bulletLines.slice(0, 6).map((line, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  background: isLight ? 'rgba(15,23,42,0.03)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${isLight ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.10)'}`,
                  fontSize: 12,
                  lineHeight: 1.5,
                }}>
                {line}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );

  const renderAutofillView = () => (
    <>
      {renderError()}

      {!readyStatus?.isReady ? (
        <div
          style={{
            padding: 12,
            borderRadius: 12,
            background: 'rgba(245,158,11,0.10)',
            border: '1px solid rgba(245,158,11,0.22)',
          }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Complete setup</div>
          <div style={{ fontSize: 12, color: isLight ? '#334155' : '#cbd5e1', marginBottom: 10 }}>
            {!readyStatus?.hasProfile && 'Add your profile info. '}
            {!readyStatus?.hasApiKey && 'Add your Gemini API key. '}
          </div>
          <button className="jobestry-btn jobestry-btn-primary" onClick={handleOpenSettings}>
            Open Settings
          </button>
        </div>
      ) : fields.length === 0 ? (
        <div className="jobestry-empty-state">
          No application fields detected yet. Try refreshing the page or click scan.
        </div>
      ) : (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              marginBottom: 10,
            }}>
            <div style={{ fontSize: 12, color: isLight ? '#64748b' : '#94a3b8' }}>
              Filled {filledCount}/{fields.length}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="jobestry-btn jobestry-btn-secondary jobestry-btn-sm"
                onClick={handleRefreshScan}
                disabled={isScanning}
                title="Scan page">
                <Icon>
                  {isScanning ? (
                    <svg
                      className="animate-spin"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <RefreshIcon />
                  )}
                </Icon>
              </button>
              <button
                className="jobestry-btn jobestry-btn-secondary jobestry-btn-sm"
                onClick={() => setActiveView('cover')}
                title="Cover letter">
                <Icon>
                  <MailIcon />
                </Icon>
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 12, position: 'relative' }} ref={presetMenuRef}>
            <button
              className="jobestry-btn jobestry-btn-secondary"
              onClick={() => setShowPresetDropdown(v => !v)}
              style={{ width: '100%', justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontWeight: 700 }}>Style</span>
                <span style={{ color: isLight ? '#64748b' : '#94a3b8', fontSize: 12 }}>
                  {currentPreset?.name || 'Professional'}
                </span>
              </span>
              <ChevronDownIcon />
            </button>

            {showPresetDropdown && (
              <div
                className="jobestry-animate-in"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  borderRadius: 12,
                  border: `1px solid ${isLight ? 'rgba(15,23,42,0.10)' : 'rgba(255,255,255,0.14)'}`,
                  background: isLight ? 'rgba(255,255,255,0.96)' : 'rgba(2,6,23,0.96)',
                  boxShadow: isLight ? '0 16px 40px rgba(15,23,42,0.12)' : '0 16px 40px rgba(0,0,0,0.45)',
                  overflow: 'hidden',
                  zIndex: 20,
                }}>
                {presets.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      handleSelectPreset(preset.id);
                      setShowPresetDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '10px 12px',
                      background:
                        selectedPreset === preset.id
                          ? isLight
                            ? 'rgba(37,99,235,0.10)'
                            : 'rgba(37,99,235,0.18)'
                          : 'transparent',
                      color: isLight ? '#0f172a' : '#f8fafc',
                    }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{preset.name}</div>
                    <div style={{ fontSize: 11, color: isLight ? '#64748b' : '#94a3b8' }}>{preset.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <button
              className="jobestry-btn jobestry-btn-primary"
              onClick={handleAutoFillAll}
              disabled={isFillingStandard}
              style={{ flex: 1 }}>
              {isFillingStandard ? 'Filling…' : 'Fill standard fields'}
            </button>
            <button
              className="jobestry-btn jobestry-btn-secondary"
              onClick={() => onSaveCurrentJob(currentApp?.status || 'saved')}>
              Save job
            </button>
          </div>

          {standardFields.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                Standard fields ({standardFields.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {standardFields.slice(0, 16).map((f, idx) => (
                  <span key={`${idx}-${f.fieldType}`} className="jobestry-chip">
                    {(f.label || f.fieldType).slice(0, 28)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {aiFields.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                AI-assisted fields ({aiFields.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {aiFields.map(field => {
                  const idx = fields.findIndex(f => f === field);
                  const isLoading = loadingFieldIndex === idx;
                  const isFocused = focusedFieldIndex === idx;
                  return (
                    <div
                      key={`${idx}-${field.fieldType}`}
                      ref={isFocused ? focusedFieldCardRef : undefined}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        background: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(15,23,42,0.40)',
                        border: isFocused
                          ? `2px solid ${isLight ? 'rgba(37,99,235,0.45)' : 'rgba(37,99,235,0.55)'}`
                          : `1px solid ${isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.12)'}`,
                        boxShadow: isFocused
                          ? isLight
                            ? '0 14px 32px rgba(37,99,235,0.16)'
                            : '0 14px 32px rgba(0,0,0,0.45)'
                          : undefined,
                        transform: isFocused ? 'translateY(-1px)' : undefined,
                        transition: 'box-shadow 0.18s ease, border-color 0.18s ease, transform 0.18s ease',
                      }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                            {field.label || field.placeholder || field.fieldType}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: field.hasValue ? 'var(--jobestry-success-600)' : isLight ? '#94a3b8' : '#94a3b8',
                            }}>
                            {field.hasValue ? 'Filled' : field.isRequired ? 'Required' : 'Optional'}
                          </div>
                        </div>
                        <button
                          className="jobestry-btn jobestry-btn-primary jobestry-btn-sm"
                          onClick={() => handleGenerateForField(idx)}
                          disabled={isLoading}>
                          {isLoading ? 'Generating…' : 'Generate'}
                        </button>
                      </div>

                      <div style={{ marginTop: 10 }}>
                        <button
                          style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            fontSize: 11,
                            color: isLight ? 'var(--jobestry-brand-700)' : '#93c5fd',
                            textDecoration: 'underline',
                          }}
                          onClick={() => setExpandedNotes(prev => ({ ...prev, [idx]: !prev[idx] }))}>
                          {expandedNotes[idx] ? 'Hide notes' : 'Add notes'}
                        </button>
                        {expandedNotes[idx] && (
                          <textarea
                            value={fieldNotes[idx] || ''}
                            onChange={e => setFieldNotes(prev => ({ ...prev, [idx]: e.target.value }))}
                            placeholder="Custom instructions for this field…"
                            style={{
                              width: '100%',
                              marginTop: 8,
                              minHeight: 70,
                              resize: 'vertical',
                              padding: 10,
                              borderRadius: 12,
                              border: `1px solid ${isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.14)'}`,
                              background: isLight ? 'rgba(248,250,252,0.9)' : 'rgba(2,6,23,0.35)',
                              color: isLight ? '#0f172a' : '#f8fafc',
                              fontSize: 12,
                              outline: 'none',
                            }}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {otherFields.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Other fields ({otherFields.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {otherFields.slice(0, 10).map((f, idx) => (
                  <div key={`${idx}-${f.fieldType}`} style={{ fontSize: 12, color: isLight ? '#64748b' : '#94a3b8' }}>
                    {f.label || f.placeholder || f.fieldType}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );

  const renderInsightView = () => (
    <>
      {renderError()}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700 }}>AI insights</div>
        <button
          className="jobestry-btn jobestry-btn-primary jobestry-btn-sm"
          onClick={handleGenerateInsights}
          disabled={isGeneratingInsights}>
          {isGeneratingInsights ? 'Generating…' : 'Generate'}
        </button>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: isLight ? '#64748b' : '#94a3b8' }}>
        Uses your resume + this job description to produce a fit score, gaps, and interview prep.
      </div>

      <div className="jobestry-divider" />

      {insights ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {typeof insights.fitScore === 'number' && (
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                border: `1px solid ${isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.12)'}`,
              }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Fit score</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    flex: 1,
                    height: 10,
                    borderRadius: 999,
                    background: isLight ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.10)',
                    overflow: 'hidden',
                  }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${clamp(insights.fitScore, 0, 100)}%`,
                      background: 'var(--jobestry-gradient)',
                    }}
                  />
                </div>
                <div style={{ fontWeight: 800, fontSize: 12 }}>{clamp(insights.fitScore, 0, 100)}%</div>
              </div>
            </div>
          )}

          {insights.summary && (
            <div
              style={{
                padding: 12,
                borderRadius: 12,
                background: isLight ? 'rgba(15,23,42,0.03)' : 'rgba(255,255,255,0.06)',
              }}>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Summary</div>
              <div style={{ fontSize: 12, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{insights.summary}</div>
            </div>
          )}

          {insights.keywords?.length ? (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Keywords to include</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {insights.keywords.slice(0, 16).map(k => (
                  <span key={k} className="jobestry-chip">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {insights.strengths?.length ? (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Strengths to emphasize</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.55 }}>
                {insights.strengths.slice(0, 6).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {insights.gaps?.length ? (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Potential gaps</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.55 }}>
                {insights.gaps.slice(0, 6).map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {insights.interviewQuestions?.length ? (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Likely interview questions</div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.55 }}>
                {insights.interviewQuestions.slice(0, 6).map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="jobestry-empty-state">Click “Generate” to get tailored insights for this role.</div>
      )}
    </>
  );

  const renderCoverLetterView = () => (
    <>
      {renderError()}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>Cover letter</div>
          <div style={{ fontSize: 11, color: isLight ? '#64748b' : '#94a3b8' }}>
            {jobInfo.title ? `For ${jobInfo.title}` : 'Generate and improve in seconds'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="jobestry-btn jobestry-btn-secondary jobestry-btn-sm"
            onClick={() => setIsEditingCoverLetter(v => !v)}
            disabled={!coverLetter.trim()}>
            {isEditingCoverLetter ? 'Done' : 'Edit'}
          </button>
          <button
            className="jobestry-btn jobestry-btn-secondary jobestry-btn-sm"
            onClick={handleUndoCoverLetter}
            disabled={coverLetterHistory.length === 0}>
            Undo
          </button>
        </div>
      </div>

      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ position: 'relative' }} ref={coverLetterStyleMenuRef}>
          <button
            className="jobestry-btn jobestry-btn-secondary"
            onClick={() => setShowCoverLetterStyleDropdown(v => !v)}
            style={{ width: '100%', justifyContent: 'space-between' }}>
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontWeight: 700 }}>Style</span>
              <span style={{ color: isLight ? '#64748b' : '#94a3b8', fontSize: 12 }}>
                {presets.find(p => p.id === coverLetterStylePreset)?.name || 'Professional'}
              </span>
            </span>
            <ChevronDownIcon />
          </button>

          {showCoverLetterStyleDropdown && (
            <div
              className="jobestry-animate-in"
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                right: 0,
                borderRadius: 12,
                border: `1px solid ${isLight ? 'rgba(15,23,42,0.10)' : 'rgba(255,255,255,0.14)'}`,
                background: isLight ? 'rgba(255,255,255,0.96)' : 'rgba(2,6,23,0.96)',
                boxShadow: isLight ? '0 16px 40px rgba(15,23,42,0.12)' : '0 16px 40px rgba(0,0,0,0.45)',
                overflow: 'hidden',
                zIndex: 20,
              }}>
              {presets.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setCoverLetterStylePreset(preset.id);
                    setShowCoverLetterStyleDropdown(false);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '10px 12px',
                    background:
                      coverLetterStylePreset === preset.id
                        ? isLight
                          ? 'rgba(37,99,235,0.10)'
                          : 'rgba(37,99,235,0.18)'
                        : 'transparent',
                    color: isLight ? '#0f172a' : '#f8fafc',
                  }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{preset.name}</div>
                  <div style={{ fontSize: 11, color: isLight ? '#64748b' : '#94a3b8' }}>{preset.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: isLight ? '#334155' : '#e2e8f0' }}>
            Additional notes (optional)
          </div>
          <textarea
            value={coverLetterNotes}
            onChange={e => setCoverLetterNotes(e.target.value)}
            placeholder="E.g., Mention my startup experience, emphasize remote work flexibility..."
            style={{
              width: '100%',
              minHeight: 70,
              resize: 'vertical',
              padding: 10,
              borderRadius: 12,
              border: `1px solid ${isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.14)'}`,
              background: isLight ? 'rgba(248,250,252,0.9)' : 'rgba(2,6,23,0.35)',
              color: isLight ? '#0f172a' : '#f8fafc',
              fontSize: 12,
              outline: 'none',
            }}
          />
        </div>

        <button
          className="jobestry-btn jobestry-btn-primary"
          onClick={handleGenerateCoverLetter}
          disabled={isGeneratingCoverLetter}
          style={{ width: '100%' }}>
          {isGeneratingCoverLetter ? 'Generating…' : coverLetter.trim() ? 'Regenerate' : 'Generate'}
        </button>
      </div>

      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 11, color: isLight ? '#64748b' : '#94a3b8' }}>
          {coverWords > 0 ? (
            <>
              {coverWords} words{' '}
              <span
                style={{
                  color:
                    coverLenLabel === 'Ideal'
                      ? 'var(--jobestry-success-600)'
                      : coverLenLabel
                        ? 'var(--jobestry-warning-600)'
                        : undefined,
                }}>
                ({coverLenLabel || '—'})
              </span>
            </>
          ) : (
            '—'
          )}
        </div>
        <div style={{ fontSize: 11, color: isLight ? '#94a3b8' : '#94a3b8' }}>
          Ideal {idealCoverMin}–{idealCoverMax}
        </div>
      </div>

      <div style={{ marginTop: 12, position: 'relative' }} ref={improveMenuRef}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="jobestry-btn jobestry-btn-secondary"
            disabled={!coverLetter.trim() || isImprovingCoverLetter}
            onClick={() => setImproveMenuOpen(v => !v)}
            style={{ flex: 1, justifyContent: 'space-between' }}>
            <span>Improve with AI</span>
            <ChevronDownIcon />
          </button>
          <button
            className="jobestry-btn jobestry-btn-secondary"
            onClick={handleCopyCoverLetter}
            disabled={!coverLetter.trim()}>
            <CopyIcon />
          </button>
          <button
            className="jobestry-btn jobestry-btn-secondary"
            onClick={handleDownloadCoverLetterPDF}
            disabled={!coverLetter.trim()}>
            <DownloadIcon />
          </button>
        </div>

        {improveMenuOpen && (
          <div
            className="jobestry-animate-in"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              right: 0,
              borderRadius: 14,
              border: `1px solid ${isLight ? 'rgba(15,23,42,0.10)' : 'rgba(255,255,255,0.14)'}`,
              background: isLight ? 'rgba(255,255,255,0.96)' : 'rgba(2,6,23,0.96)',
              boxShadow: isLight ? '0 16px 40px rgba(15,23,42,0.12)' : '0 16px 40px rgba(0,0,0,0.45)',
              padding: 8,
              zIndex: 30,
            }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                className="jobestry-btn jobestry-btn-secondary"
                onClick={() => handleImproveCoverLetter('shorten')}>
                Shorten
              </button>
              <button
                className="jobestry-btn jobestry-btn-secondary"
                onClick={() => handleImproveCoverLetter('expand')}>
                Expand
              </button>
              <button
                className="jobestry-btn jobestry-btn-secondary"
                onClick={() => handleImproveCoverLetter('positive')}>
                Positive
              </button>
              <button className="jobestry-btn jobestry-btn-secondary" onClick={() => handleImproveCoverLetter('humor')}>
                Humor
              </button>
              <button
                className="jobestry-btn jobestry-btn-secondary"
                onClick={() => handleImproveCoverLetter('creative')}>
                Creative
              </button>
              <button
                className="jobestry-btn jobestry-btn-secondary"
                onClick={() => handleImproveCoverLetter('professional')}>
                Professional
              </button>
              <button
                className="jobestry-btn jobestry-btn-secondary"
                onClick={() => handleImproveCoverLetter('conversational')}>
                Conversational
              </button>
              <button
                className="jobestry-btn jobestry-btn-secondary"
                onClick={() => handleImproveCoverLetter('human_touch')}>
                Human touch
              </button>
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: isLight ? '#334155' : '#e2e8f0' }}>
                Custom instruction
              </div>
              <textarea
                value={customImproveInstruction}
                onChange={e => setCustomImproveInstruction(e.target.value)}
                placeholder="E.g., “Make it more metrics-driven and concise.”"
                style={{
                  width: '100%',
                  minHeight: 70,
                  resize: 'vertical',
                  padding: 10,
                  borderRadius: 12,
                  border: `1px solid ${isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.14)'}`,
                  background: isLight ? 'rgba(248,250,252,0.9)' : 'rgba(2,6,23,0.35)',
                  color: isLight ? '#0f172a' : '#f8fafc',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button
                  className="jobestry-btn jobestry-btn-secondary"
                  onClick={() => setImproveMenuOpen(false)}
                  style={{ flex: 1 }}>
                  Close
                </button>
                <button
                  className="jobestry-btn jobestry-btn-primary"
                  onClick={() => handleImproveCoverLetter('custom', customImproveInstruction)}
                  disabled={!customImproveInstruction.trim()}
                  style={{ flex: 1 }}>
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        {isGeneratingCoverLetter || isImprovingCoverLetter ? (
          <div
            style={{
              padding: 14,
              borderRadius: 14,
              background: isLight ? 'rgba(15,23,42,0.03)' : 'rgba(255,255,255,0.06)',
              textAlign: 'center',
            }}>
            {isGeneratingCoverLetter ? 'Generating…' : 'Improving…'}
          </div>
        ) : coverLetter.trim() ? (
          isEditingCoverLetter ? (
            <textarea
              value={coverLetter}
              onChange={e => setCoverLetter(e.target.value)}
              style={{
                width: '100%',
                minHeight: 220,
                resize: 'vertical',
                padding: 12,
                borderRadius: 14,
                border: `2px solid ${isLight ? 'rgba(37,99,235,0.45)' : 'rgba(37,99,235,0.55)'}`,
                background: isLight ? 'rgba(248,250,252,0.9)' : 'rgba(2,6,23,0.35)',
                color: isLight ? '#0f172a' : '#f8fafc',
                fontSize: 12,
                lineHeight: 1.6,
                outline: 'none',
              }}
            />
          ) : (
            <div
              style={{
                padding: 12,
                borderRadius: 14,
                background: isLight ? 'rgba(248,250,252,0.9)' : 'rgba(2,6,23,0.35)',
                border: `1px solid ${isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.12)'}`,
                fontSize: 12,
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                maxHeight: 360,
                overflow: 'auto',
              }}>
              {coverLetter}
            </div>
          )
        ) : (
          <div className="jobestry-empty-state">
            Generate a cover letter, then use “Improve with AI” to tune tone and length.
          </div>
        )}
      </div>
    </>
  );

  const renderChatView = () => (
    <>
      {renderError()}
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Chat</div>

      <div
        style={{
          borderRadius: 14,
          border: `1px solid ${isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.12)'}`,
          background: isLight ? 'rgba(255,255,255,0.70)' : 'rgba(15,23,42,0.35)',
          padding: 12,
          height: 320,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
        {chatMessages.length === 0 ? (
          <div
            style={{ textAlign: 'center', color: isLight ? '#94a3b8' : '#94a3b8', fontSize: 12, padding: '24px 8px' }}>
            Ask anything about the role. I’ll use your resume and the job description for context.
          </div>
        ) : (
          chatMessages.map((m, idx) => (
            <div
              key={idx}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '92%',
                padding: '10px 12px',
                borderRadius: 14,
                background:
                  m.role === 'user'
                    ? 'var(--jobestry-gradient)'
                    : isLight
                      ? 'rgba(15,23,42,0.05)'
                      : 'rgba(255,255,255,0.08)',
                color: m.role === 'user' ? '#fff' : isLight ? '#0f172a' : '#f8fafc',
                whiteSpace: 'pre-wrap',
                fontSize: 12,
                lineHeight: 1.55,
              }}>
              {m.content}
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
        <input
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          placeholder="Ask a question…"
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleChatSubmit();
            }
          }}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 12,
            border: `1px solid ${isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.14)'}`,
            background: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(2,6,23,0.35)',
            color: isLight ? '#0f172a' : '#f8fafc',
            fontSize: 12,
            outline: 'none',
          }}
        />
        <button
          className="jobestry-btn jobestry-btn-primary"
          onClick={handleChatSubmit}
          disabled={isChatLoading || !chatInput.trim()}>
          {isChatLoading ? '…' : 'Send'}
        </button>
      </div>
    </>
  );

  const renderTrackView = () => {
    const notesDirty = currentApp ? currentAppNotes.trim() !== (currentApp.notes ?? '').trim() : false;

    return (
      <>
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Tracking</div>
            <div style={{ fontSize: 11, color: isLight ? '#64748b' : '#94a3b8' }}>
              Save roles and keep statuses up to date.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="jobestry-btn jobestry-btn-secondary jobestry-btn-sm"
              onClick={exportApplicationsCsv}
              disabled={applicationsState.applications.length === 0}>
              Export CSV
            </button>
            <button
              className="jobestry-btn jobestry-btn-primary jobestry-btn-sm"
              onClick={() => onSaveCurrentJob('saved')}>
              Save this job
            </button>
          </div>
        </div>

        {currentApp && (
          <div
            style={{
              padding: 12,
              borderRadius: 14,
              background: isLight ? 'rgba(37,99,235,0.08)' : 'rgba(37,99,235,0.14)',
              border: '1px solid rgba(37,99,235,0.18)',
              marginBottom: 12,
            }}>
            <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>This page is saved</div>
            <div style={{ fontSize: 12, color: isLight ? '#334155' : '#e2e8f0', marginBottom: 10 }}>
              Status: <span style={{ fontWeight: 800 }}>{currentApp.status}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(['saved', 'applied', 'interview', 'offer', 'rejected'] as const).map(s => (
                <button
                  key={s}
                  className="jobestry-btn jobestry-btn-secondary jobestry-btn-sm"
                  onClick={() => updateApplicationStatus(currentApp.url, s)}
                  style={
                    currentApp.status === s
                      ? { background: 'rgba(37,99,235,0.14)', color: 'var(--jobestry-brand-700)' }
                      : undefined
                  }>
                  {s}
                </button>
              ))}
              <button
                className="jobestry-btn jobestry-btn-secondary jobestry-btn-sm"
                onClick={() => removeApplication(currentApp.url)}>
                Remove
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 800 }}>Notes</div>
                {notesDirty && (
                  <div style={{ fontSize: 11, color: 'var(--jobestry-warning-600)', fontWeight: 700 }}>Unsaved</div>
                )}
              </div>
              <textarea
                value={currentAppNotes}
                onChange={e => setCurrentAppNotes(e.target.value)}
                placeholder="Recruiter name, follow-up date, or anything you want to remember…"
                style={{
                  width: '100%',
                  minHeight: 84,
                  resize: 'vertical',
                  padding: 10,
                  borderRadius: 12,
                  border: `1px solid ${isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.14)'}`,
                  background: isLight ? 'rgba(255,255,255,0.85)' : 'rgba(2,6,23,0.35)',
                  color: isLight ? '#0f172a' : '#f8fafc',
                  fontSize: 12,
                  outline: 'none',
                }}
              />
              <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                <button
                  className="jobestry-btn jobestry-btn-secondary jobestry-btn-sm"
                  onClick={() => setCurrentAppNotes(currentApp.notes || '')}
                  disabled={!notesDirty}>
                  Reset
                </button>
                <button
                  className="jobestry-btn jobestry-btn-primary jobestry-btn-sm"
                  onClick={() => updateApplicationNotes(currentApp.url, currentAppNotes)}
                  disabled={!notesDirty}>
                  Save notes
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {applicationsState.applications.length === 0 ? (
            <div className="jobestry-empty-state">No saved applications yet.</div>
          ) : (
            applicationsState.applications.slice(0, 30).map(app => (
              <div
                key={app.url}
                style={{
                  padding: 12,
                  borderRadius: 14,
                  border: `1px solid ${isLight ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.12)'}`,
                  background: isLight ? 'rgba(255,255,255,0.75)' : 'rgba(15,23,42,0.35)',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                      {app.title}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: isLight ? '#64748b' : '#94a3b8',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                      {[app.company, app.location].filter(Boolean).join(' • ') || app.url}
                    </div>
                    {app.notes && (
                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 11,
                          color: isLight ? '#475569' : '#cbd5e1',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}>
                        {app.notes}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span
                      className={`jobestry-badge ${app.status === 'applied' ? 'jobestry-badge-success' : 'jobestry-badge-warning'}`}>
                      {app.status}
                    </span>
                    <button
                      className="jobestry-btn jobestry-btn-secondary jobestry-btn-sm"
                      onClick={() => window.open(app.url, '_blank')}>
                      Open
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </>
    );
  };

  const renderView = () => {
    switch (activeView) {
      case 'highlight':
        return renderHighlightView();
      case 'autofill':
        return renderAutofillView();
      case 'insight':
        return renderInsightView();
      case 'cover':
        return renderCoverLetterView();
      case 'chat':
        return renderChatView();
      case 'track':
        return renderTrackView();
    }
  };

  const headerBadge = (
    <span className={`jobestry-badge ${readyStatus?.isReady ? 'jobestry-badge-success' : 'jobestry-badge-warning'}`}>
      <span className={`jobestry-status-dot ${readyStatus?.isReady ? 'ready' : 'not-ready'}`} />
      {readyStatus?.isReady ? 'Ready' : 'Setup'}
    </span>
  );

  const jdBadge =
    jdSource === 'none' ? null : (
      <span
        className={`jobestry-badge ${jdSource === 'manual' ? 'jobestry-badge-info' : 'jobestry-badge-success'}`}
        title={effectiveJobDescription.slice(0, 200)}>
        {jdSource === 'manual' ? 'JD' : 'JD'}
      </span>
    );

  const rootClassName = isLight ? '' : 'dark';

  const drawerStyle = useMemo(
    () =>
      ({
        ['--jobestry-drawer-width']: `${drawerWidth}px`,
      }) as CSSProperties,
    [drawerWidth],
  );

  return (
    <div id="jobestry-widget-root" className={rootClassName}>
      {showFloatingButton && (
        <button
          className="jobestry-sidenav-toggle"
          style={{
            position: 'fixed',
            right: '20px',
            bottom: '20px',
            width: '50px',
            height: '50px',
            borderRadius: '50%',
            background: '#22c55e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            border: 'none',
            zIndex: 99999999,
            pointerEvents: 'auto',
          }}
          onClick={() => {
            setIsClosing(false);
            setIsOpen(true);
            if (focusedFieldIndex !== null) setActiveView('autofill');
          }}
          title="Open Jobestry">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        </button>
      )}
      {isOpen && (
        <div
          className={`jobestry-drawer ${isResizing ? 'resizing' : ''} ${isClosing ? 'closing' : ''}`}
          style={drawerStyle}>
          <div className="jobestry-drawer-main">
            <div className="jobestry-resize-handle" onPointerDown={onResizeStart} title="Drag to resize" />

            <div className="jobestry-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                    <span
                      style={{
                        background: 'var(--jobestry-gradient)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}>
                      Jobestry
                    </span>{' '}
                    <span style={{ fontWeight: 800, color: isLight ? '#0f172a' : '#f8fafc' }}>
                      {viewTitle[activeView]}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    {headerBadge}
                    {jdBadge}
                    {fields.length > 0 && (
                      <span className="jobestry-badge jobestry-badge-success" title="Detected fields">
                        {fields.length} fields
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  className="jobestry-btn jobestry-btn-secondary jobestry-btn-sm"
                  onClick={handleRefreshScan}
                  disabled={isScanning}
                  title="Scan page">
                  {isScanning ? (
                    <svg
                      className="animate-spin"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <RefreshIcon />
                  )}
                </button>
                <button
                  className="jobestry-btn jobestry-btn-secondary jobestry-btn-sm"
                  onClick={handleOpenSettings}
                  title="Settings">
                  <SettingsIcon />
                </button>
                <button
                  className="jobestry-btn jobestry-btn-secondary jobestry-btn-sm"
                  onClick={handleCollapse}
                  title={isOpen ? 'Collapse' : 'Expand'}>
                  {isOpen ? <ChevronRightIcon /> : <ChevronLeftIcon />}
                </button>
              </div>
            </div>

            <div className="jobestry-drawer-content">
              <ViewErrorBoundary viewName={viewTitle[activeView]}>{renderView()}</ViewErrorBoundary>
            </div>
          </div>

          <div className="jobestry-rail" aria-label="Jobestry navigation">
            {navItems.map(item => (
              <button
                key={item.id}
                className={`jobestry-nav-btn ${activeView === item.id ? 'active' : ''}`}
                onClick={() => setActiveView(item.id)}
                title={item.label}>
                <Icon>{item.icon}</Icon>
                <span style={{ fontWeight: 700 }}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
