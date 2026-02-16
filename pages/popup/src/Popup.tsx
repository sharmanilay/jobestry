import '@src/Popup.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { userProfileStorage, resumeStorage, apiConfigStorage, preferencesStorage } from '@extension/storage';
import {
  Button,
  Input,
  Card,
  Badge,
  Tabs,
  TabPanel,
  FileUpload,
  ErrorDisplay,
  LoadingSpinner,
  cn,
} from '@extension/ui';
import { useState, useEffect } from 'react';
import type { UserProfile, ResumeData, ApiConfig } from '@extension/storage';

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const AlertIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

const SettingsIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const KeyIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
    />
  </svg>
);

const UserIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

const DocumentIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const ProgressRing = ({
  progress,
  size = 48,
  strokeWidth = 4,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="progress-ring">
      <circle
        className="text-gray-600"
        stroke="currentColor"
        fill="transparent"
        strokeWidth={strokeWidth}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        className="progress-ring-circle text-teal-400"
        stroke="currentColor"
        fill="transparent"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
    </svg>
  );
};

const StatusSection = ({
  profile,
  resume,
  apiConfig,
}: {
  profile: UserProfile;
  resume: ResumeData;
  apiConfig: ApiConfig;
}) => {
  const hasProfile = !!(profile.firstName && profile.lastName && profile.email);
  const hasResume = !!(resume.rawText || resume.parsedData.experience.length > 0);
  const hasApiKey = !!(apiConfig.gemini?.apiKey || apiConfig.openai?.apiKey || apiConfig.claude?.apiKey);

  const completedSteps = [hasProfile, hasResume, hasApiKey].filter(Boolean).length;
  const progress = Math.round((completedSteps / 3) * 100);
  const isReady = hasProfile && hasResume && hasApiKey;

  return (
    <div className="animate-fade-in mb-4 rounded-xl bg-[#292524] p-4">
      <div className="flex items-center gap-4">
        <div className="relative">
          <ProgressRing progress={progress} />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#fafaf9]">
            {progress}%
          </span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-[#fafaf9]">{isReady ? 'Ready to Auto-Fill!' : 'Setup Progress'}</h3>
          <p className="mt-0.5 text-sm text-[#a8a29e]">
            {isReady ? 'Visit any job application to get started' : `${completedSteps}/3 steps completed`}
          </p>
        </div>
        <Badge variant={isReady ? 'success' : 'warning'} dot>
          {isReady ? 'Active' : 'Setup'}
        </Badge>
      </div>
      {!isReady && (
        <div className="mt-4 space-y-2">
          <StatusItem label="Profile Info" complete={hasProfile} />
          <StatusItem label="Resume Uploaded" complete={hasResume} />
          <StatusItem label="API Key Added" complete={hasApiKey} />
        </div>
      )}
    </div>
  );
};

const StatusItem = ({ label, complete }: { label: string; complete: boolean }) => (
  <div className="flex items-center gap-2 text-sm">
    <div
      className={cn(
        'flex h-5 w-5 items-center justify-center rounded-full',
        complete ? 'bg-emerald-900/30 text-emerald-400' : 'bg-gray-700 text-gray-500',
      )}>
      {complete ? <CheckIcon /> : <span className="h-2 w-2 rounded-full bg-current" />}
    </div>
    <span className={complete ? 'text-[#e7e5e4]' : 'text-[#a8a29e]'}>{label}</span>
  </div>
);

const ProfileTab = ({ profile }: { profile: UserProfile }) => {
  const [formData, setFormData] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [newCustomLabel, setNewCustomLabel] = useState('');
  const [newCustomUrl, setNewCustomUrl] = useState('');

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await userProfileStorage.set(formData);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(profile);

  return (
    <div className="animate-fade-in-up space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="First Name"
          placeholder="John"
          value={formData.firstName}
          onChange={e => setFormData({ ...formData, firstName: e.target.value })}
        />
        <Input
          label="Last Name"
          placeholder="Doe"
          value={formData.lastName}
          onChange={e => setFormData({ ...formData, lastName: e.target.value })}
        />
      </div>
      <Input
        label="Email"
        type="email"
        placeholder="john@example.com"
        value={formData.email}
        onChange={e => setFormData({ ...formData, email: e.target.value })}
      />
      <Input
        label="Phone"
        type="tel"
        placeholder="+1 (555) 123-4567"
        value={formData.phone}
        onChange={e => setFormData({ ...formData, phone: e.target.value })}
      />
      <Input
        label="Location"
        placeholder="San Francisco, CA"
        value={formData.location}
        onChange={e => setFormData({ ...formData, location: e.target.value })}
      />
      <div className="grid grid-cols-3 gap-3">
        <Input
          label="LinkedIn"
          placeholder="https://linkedin.com/in/username"
          value={formData.linkedin || ''}
          onChange={e => setFormData({ ...formData, linkedin: e.target.value })}
        />
        <Input
          label="GitHub"
          placeholder="https://github.com/username"
          value={formData.github || ''}
          onChange={e => setFormData({ ...formData, github: e.target.value })}
        />
        <Input
          label="Portfolio"
          placeholder="https://example.com"
          value={formData.portfolio || ''}
          onChange={e => setFormData({ ...formData, portfolio: e.target.value })}
        />
      </div>
      <div className="space-y-3 rounded-lg border border-[#525252] p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[#e7e5e4]">Custom links</p>
            <p className="text-xs text-[#a8a29e]">Add any extra URLs for autofill</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (!newCustomLabel && !newCustomUrl) return;
              setFormData({
                ...formData,
                customUrls: [...formData.customUrls, { label: newCustomLabel.trim(), url: newCustomUrl.trim() }],
              });
              setNewCustomLabel('');
              setNewCustomUrl('');
            }}>
            Add
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            label="Label"
            placeholder="e.g. Blog"
            value={newCustomLabel}
            onChange={e => setNewCustomLabel(e.target.value)}
          />
          <Input
            label="URL"
            placeholder="https://your-site.com"
            value={newCustomUrl}
            onChange={e => setNewCustomUrl(e.target.value)}
          />
        </div>
        {formData.customUrls.length > 0 && (
          <div className="space-y-2">
            {formData.customUrls.map((item, idx) => (
              <div key={`${item.label}-${idx}`} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <Input
                  label="Label"
                  value={item.label}
                  onChange={e => {
                    const next = [...formData.customUrls];
                    next[idx] = { ...next[idx], label: e.target.value };
                    setFormData({ ...formData, customUrls: next });
                  }}
                />
                <Input
                  label="URL"
                  value={item.url}
                  onChange={e => {
                    const next = [...formData.customUrls];
                    next[idx] = { ...next[idx], url: e.target.value };
                    setFormData({ ...formData, customUrls: next });
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      customUrls: formData.customUrls.filter((_, i) => i !== idx),
                    })
                  }>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="pt-2">
        <Button onClick={handleSave} loading={saving} disabled={!hasChanges} className="w-full">
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </div>
  );
};

const ResumeTab = ({ resume }: { resume: ResumeData }) => {
  const [uploading, setUploading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const extractSkills = (text: string): string[] => {
    const SKILL_KEYWORDS = [
      'javascript',
      'typescript',
      'react',
      'vue',
      'angular',
      'node',
      'python',
      'java',
      'c++',
      'c#',
      'go',
      'ruby',
      'aws',
      'gcp',
      'azure',
      'docker',
      'kubernetes',
      'sql',
      'nosql',
      'graphql',
      'rest',
      'ci/cd',
    ];
    const normalized = text.toLowerCase();
    const skillsSectionMatch = normalized.match(/skills[:-]?\s*([\s\S]{0,400})/);
    const section = skillsSectionMatch ? skillsSectionMatch[1] : normalized;
    const tokens = section
      .replace(/[^a-z0-9+#,.\s-]/g, ' ')
      .split(/[,\n]/)
      .map(s => s.trim())
      .filter(Boolean);
    const fromKeywords = SKILL_KEYWORDS.filter(kw => normalized.includes(kw));
    const fromTokens = tokens.filter(token => token.length > 1 && /[a-z]/.test(token)).slice(0, 30);
    return Array.from(new Set([...fromKeywords, ...fromTokens])).slice(0, 20);
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setParseError(null);
    try {
      let text = '';
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        try {
          const { extractText } = await import('unpdf');
          const arrayBuffer = await file.arrayBuffer();
          const result = await extractText(new Uint8Array(arrayBuffer), { mergePages: true });
          const extractedText: unknown = (result as { text?: unknown }).text;
          if (typeof extractedText === 'string') {
            text = extractedText;
          } else if (Array.isArray(extractedText)) {
            text = extractedText.join('\n\n');
          } else {
            text = String(extractedText || '');
          }
          if (text.trim().length === 0) {
            setParseError('This PDF appears to be image-based. Please use a text-based PDF.');
          }
        } catch (pdfError: unknown) {
          const errorMessage = pdfError instanceof Error ? pdfError.message : 'Unknown error';
          setParseError(`Failed to parse PDF: ${errorMessage}`);
          text = '';
        }
      } else {
        text = await file.text();
      }
      if (text.trim().length > 0) {
        await resumeStorage.updateRawText(text, file.name, file.type);
        const skills = extractSkills(text);
        await resumeStorage.updateParsedData({ skills });
      }
    } catch (error) {
      console.error('Error uploading resume:', error);
      setParseError('Failed to read or parse the file.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="animate-fade-in-up space-y-4">
      <FileUpload
        label="Upload Resume"
        accept=".pdf,.doc,.docx,.txt"
        maxSize={5 * 1024 * 1024}
        onChange={handleFileUpload}
        hint="PDF, DOC, DOCX, or TXT up to 5MB"
      />
      {uploading && <p className="text-sm text-[#a8a29e]">Uploading and parsing...</p>}
      {!resume.fileName && (
        <Card variant="outline" padding="sm">
          <p className="text-sm text-[#e7e5e4]">
            Upload your resume to extract skills and speed up auto-fill suggestions.
          </p>
        </Card>
      )}
      {resume.fileName && (
        <Card variant="outline" padding="sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-teal-900/30 p-2 text-teal-400">
              <DocumentIcon />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#fafaf9]">{resume.fileName}</p>
              <p className="text-xs text-[#a8a29e]">Updated {new Date(resume.lastUpdated).toLocaleDateString()}</p>
            </div>
            <Badge variant="success">Uploaded</Badge>
          </div>
        </Card>
      )}
      {resume.parsedData.skills.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium text-[#e7e5e4]">Detected Skills</h4>
          <div className="flex flex-wrap gap-1.5">
            {resume.parsedData.skills.slice(0, 8).map((skill, i) => (
              <Badge key={i} variant="default">
                {skill}
              </Badge>
            ))}
            {resume.parsedData.skills.length > 8 && (
              <Badge variant="info">+{resume.parsedData.skills.length - 8} more</Badge>
            )}
          </div>
        </div>
      )}
      {parseError && <p className="text-sm text-red-400">{parseError}</p>}
      <details className="rounded-lg border border-[#525252]">
        <summary className="cursor-pointer px-3 py-2 text-sm text-[#e7e5e4] hover:bg-[#44403c]">
          Having trouble with PDF? Click to paste resume text
        </summary>
        <div className="p-3 pt-0">
          <textarea
            className="h-32 w-full resize-none rounded-lg border border-[#525252] bg-[#292524] p-2 text-sm text-[#fafaf9] focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/20"
            placeholder="Paste your resume content here..."
            onBlur={async e => {
              const text = e.target.value.trim();
              if (text.length > 50) {
                await resumeStorage.updateRawText(text, 'pasted-resume.txt', 'text/plain');
                const skills = extractSkills(text);
                await resumeStorage.updateParsedData({ skills });
                setParseError(null);
              }
            }}
          />
          <p className="mt-1 text-xs text-[#a8a29e]">Paste and click outside to save</p>
        </div>
      </details>
      <Button
        variant="ghost"
        className="w-full"
        onClick={() => chrome.runtime.openOptionsPage()}
        disabled={!resume.fileName}>
        Edit Resume Details
      </Button>
    </div>
  );
};

type AIProvider = 'gemini' | 'openai' | 'claude';

const PROVIDERS: { id: AIProvider; name: string; description: string; link: string }[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Free tier available',
    link: 'https://aistudio.google.com/apikey',
  },
  { id: 'openai', name: 'OpenAI', description: 'GPT-4o models', link: 'https://platform.openai.com/api-keys' },
  { id: 'claude', name: 'Anthropic Claude', description: 'Claude 3.5 models', link: 'https://console.anthropic.com/' },
];

const ApiKeyTab = ({ apiConfig }: { apiConfig: ApiConfig }) => {
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(apiConfig.selectedProvider || 'gemini');
  const [apiKey, setApiKey] = useState(apiConfig[selectedProvider]?.apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setApiKey(apiConfig[selectedProvider]?.apiKey || '');
  }, [selectedProvider, apiConfig]);

  const currentProvider = PROVIDERS.find(p => p.id === selectedProvider)!;

  const handleProviderChange = async (provider: AIProvider) => {
    setSelectedProvider(provider);
    await apiConfigStorage.setSelectedProvider(provider);
  };

  const handleSave = async () => {
    const isValid = apiConfigStorage.isValidKeyFormat(selectedProvider, apiKey);
    if (apiKey && !isValid) {
      const errorMsg =
        selectedProvider === 'gemini'
          ? 'Invalid format. Keys start with "AI" and are 30-50 chars.'
          : selectedProvider === 'openai'
            ? 'Invalid format. Keys start with "sk-"'
            : 'Invalid format. Keys start with "sk-ant-"';
      setValidationError(errorMsg);
      return;
    }
    setValidationError(null);
    setSaving(true);
    try {
      await apiConfigStorage.setApiKey(selectedProvider, apiKey);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = apiKey !== (apiConfig[selectedProvider]?.apiKey || '');
  const maskedKey = apiConfigStorage.maskApiKey(apiConfig[selectedProvider]?.apiKey || '');
  const isFormatValid = !apiKey || apiConfigStorage.isValidKeyFormat(selectedProvider, apiKey);
  const hasApiKey = !!(apiConfig.gemini?.apiKey || apiConfig.openai?.apiKey || apiConfig.claude?.apiKey);

  return (
    <div className="animate-fade-in-up space-y-4">
      <div>
        <span className="mb-2 block text-sm font-medium text-[#e7e5e4]">Select AI Provider</span>
        <div className="grid grid-cols-3 gap-2">
          {PROVIDERS.map(provider => {
            const isActive = apiConfig.selectedProvider === provider.id;
            const hasKey = !!apiConfig[provider.id]?.apiKey;
            return (
              <button
                key={provider.id}
                onClick={() => handleProviderChange(provider.id)}
                className={cn(
                  'rounded-lg border p-3 text-left transition-all',
                  isActive ? 'border-teal-400 bg-teal-900/20' : 'border-[#525252] hover:border-[#737373]',
                )}>
                <div className="text-sm font-medium text-[#fafaf9]">{provider.name}</div>
                <div className="mt-1 text-xs">
                  {hasKey ? (
                    <span className="text-emerald-400">Key saved</span>
                  ) : (
                    <span className="text-[#a8a29e]">No key</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {hasApiKey && apiConfig.selectedProvider !== selectedProvider && (
        <div className="rounded-lg border border-amber-800 bg-amber-900/20 p-3">
          <p className="text-sm text-amber-200">
            Switch to <strong>{currentProvider.name}</strong> to configure its API key
          </p>
        </div>
      )}
      <div className="rounded-lg border border-teal-800 bg-teal-900/20 p-4">
        <div className="flex gap-3 text-teal-400">
          <AlertIcon />
          <div className="text-sm">
            <p className="font-medium text-teal-200">{currentProvider.name} API Key</p>
            <p className="mt-1 text-teal-300">
              Get your API key from{' '}
              <a
                href={currentProvider.link}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline">
                {currentProvider.name}
              </a>
            </p>
          </div>
        </div>
      </div>
      <Input
        label={`${currentProvider.name} API Key`}
        type={showKey ? 'text' : 'password'}
        placeholder={`Enter your ${currentProvider.name} API key`}
        value={apiKey}
        onChange={e => setApiKey(e.target.value)}
        icon={
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="text-[#a8a29e] hover:text-[#e7e5e4]"
            tabIndex={-1}>
            {showKey ? (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        }
        iconPosition="right"
      />
      {apiConfig[selectedProvider]?.apiKey && (
        <Card variant="outline" padding="sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#a8a29e]">Current Key</p>
              <p className="font-mono text-sm text-[#e7e5e4]">{maskedKey}</p>
            </div>
            <Badge variant="success" dot>
              Active
            </Badge>
          </div>
          {apiConfig[selectedProvider]?.usageCount > 0 && (
            <p className="mt-2 text-xs text-[#a8a29e]">{apiConfig[selectedProvider]?.usageCount} requests</p>
          )}
        </Card>
      )}
      {!isFormatValid && <p className="text-sm text-red-400">Invalid key format for {currentProvider.name}</p>}
      {validationError && <p className="text-sm text-red-400">{validationError}</p>}
      <Button
        onClick={handleSave}
        loading={saving}
        disabled={!hasChanges || !apiKey || !isFormatValid}
        className="w-full">
        {apiConfig[selectedProvider]?.apiKey ? 'Update API Key' : 'Save API Key'}
      </Button>
      {hasApiKey && (
        <div className="border-t border-[#525252] pt-2">
          <p className="mb-2 text-xs text-[#a8a29e]">Active Provider:</p>
          <div className="flex items-center gap-2">
            <Badge variant={apiConfig.selectedProvider === selectedProvider ? 'success' : 'default'}>
              {PROVIDERS.find(p => p.id === apiConfig.selectedProvider)?.name}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
};

const Popup = () => {
  const profile = useStorage(userProfileStorage);
  const resume = useStorage(resumeStorage);
  const apiConfig = useStorage(apiConfigStorage);
  const preferences = useStorage(preferencesStorage);
  const [activeTab, setActiveTab] = useState('profile');
  const [domainAdded, setDomainAdded] = useState(false);

  const handleAddCurrentDomain = async () => {
    try {
      // Get current tab URL to extract domain
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.url && tab.id) {
        const url = new URL(tab.url);
        const domain = url.hostname;

        // Check if already exists
        const normalizedDomain = `*.${domain}`;
        const exists = preferences.userAllowedDomains.some(
          (d: string) => d === normalizedDomain || d === domain || d === `*.${domain}`,
        );

        if (!exists) {
          await preferencesStorage.addAllowedDomain(domain);
          setDomainAdded(true);
          setTimeout(() => setDomainAdded(false), 3000);

          // Send message to content script to show the floating button
          chrome.tabs.sendMessage(tab.id, { type: 'SHOW_FLOATING_BUTTON' }).catch(() => {
            // Ignore if content script not ready - user can refresh or reload the page
          });
        }
      }
    } catch (e) {
      console.error('Failed to add domain:', e);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: <UserIcon /> },
    { id: 'resume', label: 'Resume', icon: <DocumentIcon /> },
    { id: 'api', label: 'API Key', icon: <KeyIcon /> },
  ];

  return (
    <div className="min-h-[620px] w-[420px] bg-[#1c1917]">
      <div className="p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-gradient text-xl font-bold">Jobestry</h1>
            <p className="text-xs text-[#a8a29e]">Job Application Assistant</p>
          </div>
          <div className="flex items-center gap-2">
            {domainAdded && <span className="text-xs text-emerald-400">Domain added!</span>}
            <button
              onClick={handleAddCurrentDomain}
              className="rounded-lg px-3 py-1.5 text-xs text-[#a8a29e] transition-colors hover:bg-[#44403c] hover:text-[#e7e5e4]"
              title="Add current site to allowed domains">
              + Add Domain
            </button>
            <button
              onClick={() => chrome.runtime.openOptionsPage()}
              className="rounded-lg p-2 text-[#a8a29e] transition-colors hover:bg-[#44403c] hover:text-[#e7e5e4]"
              title="Open settings">
              <SettingsIcon />
            </button>
          </div>
        </div>
        <StatusSection profile={profile} resume={resume} apiConfig={apiConfig} />
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} variant="pills" className="mb-4" />
        <TabPanel tabId="profile" activeTab={activeTab}>
          <ProfileTab profile={profile} />
        </TabPanel>
        <TabPanel tabId="resume" activeTab={activeTab}>
          <ResumeTab resume={resume} />
        </TabPanel>
        <TabPanel tabId="api" activeTab={activeTab}>
          <ApiKeyTab apiConfig={apiConfig} />
        </TabPanel>
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <LoadingSpinner />), ErrorDisplay);
