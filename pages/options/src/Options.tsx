import '@src/Options.css';
import { useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import {
  apiConfigStorage,
  preferencesStorage,
  resumeStorage,
  userProfileStorage,
  coverLetterTemplateStorage,
  applicationsStorage,
} from '@extension/storage';
import { ErrorDisplay, LoadingSpinner } from '@extension/ui';
import { useEffect, useState, useCallback } from 'react';
import type { ApplicationStatus } from '@extension/storage';

interface StylePreset {
  id: string;
  name: string;
  description: string;
}

type SettingsTab =
  | 'general'
  | 'resume'
  | 'style'
  | 'cover-letter'
  | 'skills'
  | 'profile'
  | 'applications'
  | 'hotkeys'
  | 'domains';

const STATUS_OPTIONS: { value: ApplicationStatus; label: string; color: string }[] = [
  { value: 'saved', label: 'Saved', color: '#3b82f6' },
  { value: 'applied', label: 'Applied', color: '#22c55e' },
  { value: 'interview', label: 'Interview', color: '#a855f7' },
  { value: 'offer', label: 'Offer', color: '#14b8a6' },
  { value: 'rejected', label: 'Rejected', color: '#ef4444' },
];

const isMac = navigator.platform.toLowerCase().includes('mac');
const modKey = isMac ? 'Cmd' : 'Ctrl';

const Options = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const profile = useStorage(userProfileStorage);
  const resume = useStorage(resumeStorage);
  const apiConfig = useStorage(apiConfigStorage);
  const preferences = useStorage(preferencesStorage);
  const coverLetterTemplateData = useStorage(coverLetterTemplateStorage);
  const applications = useStorage(applicationsStorage);

  const [presets, setPresets] = useState<StylePreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState('professional');
  const [customInstructions, setCustomInstructions] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [editingResumeText, setEditingResumeText] = useState(false);
  const [resumeText, setResumeText] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newAvoidTopic, setNewAvoidTopic] = useState('');
  const [coverLetterTemplate, setCoverLetterTemplate] = useState('');
  const [coverLetterTemplateEnabled, setCoverLetterTemplateEnabled] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);

  const hasProfile = !!(profile.firstName && profile.lastName && profile.email);
  const hasResume = !!(resume.rawText || resume.parsedData.experience.length > 0);
  const hasApiKey = apiConfig.gemini?.apiKey || apiConfig.openai?.apiKey || apiConfig.claude?.apiKey;

  useEffect(() => {
    setCustomInstructions(preferences.customInstructions || '');
  }, [preferences.customInstructions]);

  useEffect(() => {
    setResumeText(resume.rawText || '');
  }, [resume.rawText]);

  useEffect(() => {
    setCoverLetterTemplate(coverLetterTemplateData.template || '');
    setCoverLetterTemplateEnabled(coverLetterTemplateData.enabled || false);
  }, [coverLetterTemplateData]);

  useEffect(() => {
    const loadPresets = async () => {
      try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_STYLE_PRESETS' });
        if (response?.presets) {
          setPresets(response.presets);
        }
        if (response?.currentPresetId) {
          setSelectedPreset(response.currentPresetId);
        }
      } catch (error) {
        console.log('[Jobestry Options] Error loading presets:', error);
      }
    };
    loadPresets();
  }, []);

  const handlePresetChange = async (presetId: string) => {
    setSelectedPreset(presetId);
    try {
      await chrome.runtime.sendMessage({ type: 'SET_STYLE_PRESET', presetId });
      showSaveStatus();
    } catch (error) {
      console.log('[Jobestry Options] Error saving preset:', error);
    }
  };

  const handleAddSkill = useCallback(async () => {
    if (!newSkill.trim()) return;
    await preferencesStorage.addEmphasizedSkill(newSkill.trim());
    setNewSkill('');
    showSaveStatus();
  }, [newSkill]);

  const handleRemoveSkill = useCallback(async (skill: string) => {
    await preferencesStorage.removeEmphasizedSkill(skill);
    showSaveStatus();
  }, []);

  const handleAddAvoidTopic = useCallback(async () => {
    if (!newAvoidTopic.trim()) return;
    await preferencesStorage.addAvoidTopic(newAvoidTopic.trim());
    setNewAvoidTopic('');
    showSaveStatus();
  }, [newAvoidTopic]);

  const handleRemoveAvoidTopic = useCallback(async (topic: string) => {
    await preferencesStorage.removeAvoidTopic(topic);
    showSaveStatus();
  }, []);

  const handleCustomInstructionsBlur = useCallback(async () => {
    await preferencesStorage.updatePreference('customInstructions', customInstructions);
    showSaveStatus();
  }, [customInstructions]);

  const handleSaveResumeText = useCallback(async () => {
    await resumeStorage.updateRawText(resumeText, resume.fileName, resume.fileType);
    setEditingResumeText(false);
    showSaveStatus();
  }, [resumeText, resume.fileName, resume.fileType]);

  const handleEnhanceResume = useCallback(async () => {
    if (!resume.rawText || isEnhancing) return;

    setIsEnhancing(true);
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'ENHANCE_RESUME',
        resumeText: resume.rawText,
      });

      if (response?.success && response.enhancedResume) {
        setResumeText(response.enhancedResume);
        setEditingResumeText(true);
        showSaveStatus();
      } else if (response?.error) {
        console.error('[Jobestry] Error enhancing resume:', response.error);
      }
    } catch (error) {
      console.error('[Jobestry] Error enhancing resume:', error);
    } finally {
      setIsEnhancing(false);
    }
  }, [resume.rawText, isEnhancing]);

  const handleSaveCoverLetterTemplate = useCallback(async () => {
    await coverLetterTemplateStorage.updateTemplate(coverLetterTemplate);
    showSaveStatus();
  }, [coverLetterTemplate]);

  const handleToggleCoverLetterTemplate = useCallback(async () => {
    await coverLetterTemplateStorage.setEnabled(!coverLetterTemplateEnabled);
    setCoverLetterTemplateEnabled(!coverLetterTemplateEnabled);
    showSaveStatus();
  }, [coverLetterTemplateEnabled]);

  const handleUpdateAppStatus = useCallback(async (url: string, status: ApplicationStatus) => {
    await applicationsStorage.updateStatus(url, status);
    showSaveStatus();
  }, []);

  const handleDeleteApplication = useCallback(async (url: string) => {
    await applicationsStorage.remove(url);
    showSaveStatus();
  }, []);

  const handleExportApplications = useCallback(() => {
    const apps = applications.applications;
    if (apps.length === 0) return;

    const header = ['Title', 'Company', 'Location', 'Status', 'URL', 'Notes', 'Created', 'Updated'];
    const rows = apps.map(app => [
      app.title,
      app.company || '',
      app.location || '',
      app.status,
      app.url,
      app.notes || '',
      new Date(app.createdAt).toLocaleDateString(),
      new Date(app.updatedAt).toLocaleDateString(),
    ]);

    const csvContent = [
      header.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jobestry-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [applications.applications]);

  const filteredApplications = applications.applications.filter(app => {
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
    const matchesSearch =
      !searchQuery ||
      app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.location?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const showSaveStatus = () => {
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <section className="section-wrapper animate-in">
            <div className="section-header-row">
              <div>
                <h2 className="section-title">
                  <span className="section-title-icon">📊</span>Setup Status
                </h2>
                <p className="section-subtitle">Complete these items to enable auto-fill and AI writing</p>
              </div>
              {saveStatus === 'saved' && <span className="save-indicator">Changes saved</span>}
            </div>
            <div className="status-grid">
              <div className="status-card">
                <div className={`status-icon ${hasProfile ? 'success' : 'warning'}`}>{hasProfile ? '✓' : '!'}</div>
                <div className="status-content">
                  <h4>Profile Details</h4>
                  <p>{hasProfile ? `${profile.firstName} ${profile.lastName}` : 'Not configured'}</p>
                </div>
              </div>
              <div className="status-card">
                <div className={`status-icon ${hasResume ? 'success' : 'warning'}`}>{hasResume ? '✓' : '!'}</div>
                <div className="status-content">
                  <h4>Resume</h4>
                  <p>{resume.fileName || 'No file uploaded'}</p>
                </div>
              </div>
              <div className="status-card">
                <div className={`status-icon ${hasApiKey ? 'success' : 'warning'}`}>{hasApiKey ? '✓' : '!'}</div>
                <div className="status-content">
                  <h4>API Key</h4>
                  <p>{hasApiKey ? 'Connected' : 'Not configured'}</p>
                </div>
              </div>
            </div>
          </section>
        );

      case 'resume':
        return (
          <section className="section-wrapper animate-in">
            <div className="section-header-row">
              <div>
                <h2 className="section-title">
                  <span className="section-title-icon">📄</span>Resume Content
                </h2>
                <p className="section-subtitle">This is what the AI uses to generate responses. Edit if needed.</p>
              </div>
              {resume.rawText && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  {editingResumeText ? (
                    <>
                      <button className="btn btn-primary" onClick={handleSaveResumeText}>
                        Save Changes
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => {
                          setEditingResumeText(false);
                          setResumeText(resume.rawText);
                        }}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="btn btn-secondary"
                        onClick={handleEnhanceResume}
                        disabled={isEnhancing || !hasApiKey}
                        title={!hasApiKey ? 'Add an API key to enable AI enhancement' : ''}>
                        {isEnhancing ? 'Enhancing...' : '✨ Enhance with AI'}
                      </button>
                      <button className="btn btn-secondary" onClick={() => setEditingResumeText(true)}>
                        Edit
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="card">
              {resume.rawText ? (
                editingResumeText ? (
                  <textarea
                    className="form-textarea"
                    value={resumeText}
                    onChange={e => setResumeText(e.target.value)}
                    style={{ minHeight: '300px', fontFamily: 'inherit' }}
                  />
                ) : (
                  <div className="resume-raw-text">{resume.rawText}</div>
                )
              ) : (
                <div className="resume-empty">
                  <div className="resume-empty-icon">📋</div>
                  <p>No resume uploaded yet. Upload one in the popup to see its content here.</p>
                </div>
              )}
            </div>
          </section>
        );

      case 'style':
        return (
          <section className="section-wrapper animate-in">
            <div className="section-header-row">
              <h2 className="section-title">
                <span className="section-title-icon">✍️</span>Writing Style
              </h2>
            </div>
            <div className="card-grid">
              <div className="card">
                <div className="form-group">
                  <span className="form-label">Style Preset</span>
                  <p className="form-hint">Choose how AI responses should sound</p>
                  <select
                    className="form-select"
                    value={selectedPreset}
                    onChange={e => handlePresetChange(e.target.value)}>
                    {presets.map(preset => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name}
                      </option>
                    ))}
                  </select>
                </div>
                {presets.find(p => p.id === selectedPreset) && (
                  <p style={{ fontSize: '13px', color: '#a8a29e', margin: '12px 0 0' }}>
                    {presets.find(p => p.id === selectedPreset)?.description}
                  </p>
                )}
              </div>
              <div className="card">
                <div className="form-group">
                  <span className="form-label">Custom Instructions</span>
                  <p className="form-hint">Give the AI specific rules to follow</p>
                  <textarea
                    className="form-textarea"
                    value={customInstructions}
                    onChange={e => setCustomInstructions(e.target.value)}
                    onBlur={handleCustomInstructionsBlur}
                    placeholder="E.g., Always emphasize my startup experience..."
                  />
                </div>
              </div>
            </div>
          </section>
        );

      case 'cover-letter':
        return (
          <section className="section-wrapper animate-in">
            <div className="section-header-row">
              <div>
                <h2 className="section-title">
                  <span className="section-title-icon">📝</span>Cover Letter Template
                </h2>
                <p className="section-subtitle">Set a template format that AI will always follow</p>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={coverLetterTemplateEnabled}
                  onChange={handleToggleCoverLetterTemplate}
                  style={{ accentColor: '#14b8a6' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#fafaf9' }}>Enable Template</span>
              </label>
            </div>
            <div className="card">
              <div className="form-group">
                <span className="form-label">Template Format</span>
                <p className="form-hint">
                  Use placeholders like {'{company}'}, {'{position}'}, {'{your_name}'}
                </p>
                <textarea
                  className="form-textarea"
                  value={coverLetterTemplate}
                  onChange={e => setCoverLetterTemplate(e.target.value)}
                  onBlur={handleSaveCoverLetterTemplate}
                  placeholder="Dear Hiring Manager,\n\nI am writing..."
                  style={{ minHeight: '200px', fontFamily: 'monospace', fontSize: '13px' }}
                  disabled={!coverLetterTemplateEnabled}
                />
                {coverLetterTemplateEnabled && (
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '10px',
                      background: '#44403c',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#e7e5e4',
                    }}>
                    <strong>Tip:</strong> Leave sections blank for AI to generate.
                  </div>
                )}
              </div>
            </div>
          </section>
        );

      case 'skills':
        return (
          <section className="section-wrapper animate-in">
            <div className="section-header-row">
              <h2 className="section-title">
                <span className="section-title-icon">🎯</span>AI Focus & Filters
              </h2>
            </div>
            <div className="card-grid">
              <div className="card">
                <div className="form-group">
                  <span className="form-label">Skills to Emphasize</span>
                  <p className="form-hint">The AI will highlight these when relevant</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Type a skill..."
                      value={newSkill}
                      onChange={e => setNewSkill(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddSkill()}
                    />
                    <button className="btn btn-primary" onClick={handleAddSkill}>
                      Add
                    </button>
                  </div>
                  {(preferences.emphasizeSkills?.length ?? 0) > 0 && (
                    <div className="tags-container">
                      {preferences.emphasizeSkills?.map((skill, i) => (
                        <span key={i} className="tag">
                          {skill}
                          <button className="tag-remove" onClick={() => handleRemoveSkill(skill)}>
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="card">
                <div className="form-group">
                  <span className="form-label">Topics to Avoid</span>
                  <p className="form-hint">The AI will not mention these</p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Type a topic..."
                      value={newAvoidTopic}
                      onChange={e => setNewAvoidTopic(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddAvoidTopic()}
                    />
                    <button className="btn btn-primary" onClick={handleAddAvoidTopic}>
                      Add
                    </button>
                  </div>
                  {(preferences.avoidTopics?.length ?? 0) > 0 && (
                    <div className="tags-container">
                      {preferences.avoidTopics?.map((topic, i) => (
                        <span key={i} className="tag">
                          {topic}
                          <button className="tag-remove" onClick={() => handleRemoveAvoidTopic(topic)}>
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        );

      case 'profile':
        return (
          <section className="section-wrapper animate-in">
            <div className="section-header-row">
              <div>
                <h2 className="section-title">
                  <span className="section-title-icon">👤</span>Profile Summary
                </h2>
                <p className="section-subtitle">Quick view of your auto-fill information</p>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => window.open(chrome.runtime.getURL('popup/index.html'), '_blank')}>
                Edit Profile
              </button>
            </div>
            <div className="card">
              <div className="grid-3">
                <div>
                  <span className="form-label" style={{ marginBottom: '4px' }}>
                    Name
                  </span>
                  <p style={{ margin: 0, color: '#e7e5e4' }}>
                    {profile.firstName || profile.lastName ? `${profile.firstName} ${profile.lastName}`.trim() : '—'}
                  </p>
                </div>
                <div>
                  <span className="form-label" style={{ marginBottom: '4px' }}>
                    Email
                  </span>
                  <p style={{ margin: 0, color: '#e7e5e4' }}>{profile.email || '—'}</p>
                </div>
                <div>
                  <span className="form-label" style={{ marginBottom: '4px' }}>
                    Phone
                  </span>
                  <p style={{ margin: 0, color: '#e7e5e4' }}>{profile.phone || '—'}</p>
                </div>
                <div>
                  <span className="form-label" style={{ marginBottom: '4px' }}>
                    Location
                  </span>
                  <p style={{ margin: 0, color: '#e7e5e4' }}>{profile.location || '—'}</p>
                </div>
                <div>
                  <span className="form-label" style={{ marginBottom: '4px' }}>
                    LinkedIn
                  </span>
                  <p style={{ margin: 0, color: '#e7e5e4' }}>{profile.linkedin || '—'}</p>
                </div>
                <div>
                  <span className="form-label" style={{ marginBottom: '4px' }}>
                    GitHub
                  </span>
                  <p style={{ margin: 0, color: '#e7e5e4' }}>{profile.github || '—'}</p>
                </div>
              </div>
            </div>
          </section>
        );

      case 'applications':
        return (
          <section className="section-wrapper animate-in">
            <div className="section-header-row">
              <div>
                <h2 className="section-title">
                  <span className="section-title-icon">📋</span>Job Applications
                </h2>
                <p className="section-subtitle">Track and manage your job applications</p>
              </div>
              <button
                className="btn btn-secondary"
                onClick={handleExportApplications}
                disabled={applications.applications.length === 0}>
                Export CSV
              </button>
            </div>
            <div className="applications-filters">
              <input
                type="text"
                className="form-input"
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ maxWidth: '300px' }}
              />
              <select
                className="form-select"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as ApplicationStatus | 'all')}
                style={{ maxWidth: '180px' }}>
                <option value="all">All Status</option>
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {filteredApplications.length === 0 ? (
              <div className="card">
                <div className="resume-empty">
                  <div className="resume-empty-icon">📋</div>
                  <p>No applications found. Save jobs from the sidebar to track them here.</p>
                </div>
              </div>
            ) : (
              <div className="applications-table-wrapper">
                <table className="applications-table">
                  <thead>
                    <tr>
                      <th>Job Title</th>
                      <th>Company</th>
                      <th>Location</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApplications.map(app => (
                      <tr key={app.url}>
                        <td>
                          <div className="app-title">{app.title}</div>
                          <div className="app-url">{app.url}</div>
                        </td>
                        <td>{app.company || '—'}</td>
                        <td>{app.location || '—'}</td>
                        <td>
                          <select
                            className="status-select"
                            value={app.status}
                            onChange={e => handleUpdateAppStatus(app.url, e.target.value as ApplicationStatus)}
                            style={{ borderColor: STATUS_OPTIONS.find(s => s.value === app.status)?.color }}>
                            {STATUS_OPTIONS.map(opt => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>{new Date(app.createdAt).toLocaleDateString()}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn btn-ghost btn-sm" onClick={() => window.open(app.url, '_blank')}>
                              Open
                            </button>
                            <button
                              className="btn btn-ghost btn-sm btn-danger"
                              onClick={() => handleDeleteApplication(app.url)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="applications-summary">
              <span>{applications.applications.length} total</span>
              <span>•</span>
              <span>{applications.applications.filter(a => a.status === 'applied').length} applied</span>
              <span>•</span>
              <span>{applications.applications.filter(a => a.status === 'interview').length} interviews</span>
              <span>•</span>
              <span>{applications.applications.filter(a => a.status === 'offer').length} offers</span>
            </div>
          </section>
        );

      case 'hotkeys':
        return (
          <section className="section-wrapper animate-in">
            <div className="section-header-row">
              <div>
                <h2 className="section-title">
                  <span className="section-title-icon">⌨️</span>Keyboard Shortcuts
                </h2>
                <p className="section-subtitle">Speed up your workflow with keyboard shortcuts</p>
              </div>
            </div>

            <div className="card" style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#fafaf9' }}>
                Extension Shortcuts
              </h3>
              <p style={{ fontSize: '13px', color: '#a8a29e', marginBottom: '16px' }}>
                These shortcuts work on any page. Customize them in Chrome's shortcuts settings.
              </p>
              <div className="hotkeys-list">
                <div className="hotkey-row">
                  <div className="hotkey-action">Toggle Jobestry sidebar</div>
                  <div className="hotkey-keys">
                    <kbd>{modKey}</kbd>+<kbd>Shift</kbd>+<kbd>K</kbd>
                  </div>
                </div>
                <div className="hotkey-row">
                  <div className="hotkey-action">Quick fill all fields</div>
                  <div className="hotkey-keys">
                    <kbd>{modKey}</kbd>+<kbd>Shift</kbd>+<kbd>F</kbd>
                  </div>
                </div>
                <div className="hotkey-row">
                  <div className="hotkey-action">Generate cover letter</div>
                  <div className="hotkey-keys">
                    <kbd>{modKey}</kbd>+<kbd>Shift</kbd>+<kbd>L</kbd>
                  </div>
                </div>
                <div className="hotkey-row">
                  <div className="hotkey-action">Save job to tracker</div>
                  <div className="hotkey-keys">
                    <kbd>{modKey}</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd>
                  </div>
                </div>
              </div>
              <button
                className="btn btn-secondary"
                style={{ marginTop: '16px' }}
                onClick={() => chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}>
                Customize Shortcuts in Chrome
              </button>
            </div>

            <div className="card">
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: '#fafaf9' }}>
                In-App Shortcuts
              </h3>
              <p style={{ fontSize: '13px', color: '#a8a29e', marginBottom: '16px' }}>
                These shortcuts work within the Jobestry panel.
              </p>
              <div className="hotkeys-list">
                <div className="hotkey-row">
                  <div className="hotkey-action">Close sidebar / Close menus</div>
                  <div className="hotkey-keys">
                    <kbd>Esc</kbd>
                  </div>
                </div>
                <div className="hotkey-row">
                  <div className="hotkey-action">Submit forms / Add tags</div>
                  <div className="hotkey-keys">
                    <kbd>Enter</kbd>
                  </div>
                </div>
                <div className="hotkey-row">
                  <div className="hotkey-action">Remove last tag (when input empty)</div>
                  <div className="hotkey-keys">
                    <kbd>Backspace</kbd>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );

      case 'domains':
        return (
          <section className="section-wrapper animate-in">
            <div className="section-header-row">
              <div>
                <h2 className="section-title">
                  <span className="section-title-icon">🌐</span>Active Domains
                </h2>
                <p className="section-subtitle">
                  Jobestry is active on these domains. Removing a domain will hide the floating button on that site.
                </p>
              </div>
            </div>

            {preferences.userAllowedDomains.length === 0 ? (
              <div className="card">
                <p style={{ color: '#a8a29e', textAlign: 'center', padding: '24px' }}>
                  No domains added yet. Visit a job site and click "+ Add Domain" in the popup to enable Jobestry.
                </p>
              </div>
            ) : (
              <div className="card">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {preferences.userAllowedDomains.map(domain => (
                    <div
                      key={domain}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        background: '#292524',
                        borderRadius: '8px',
                        border: '1px solid #525252',
                      }}>
                      <span style={{ fontFamily: 'monospace', color: '#e7e5e4' }}>{domain}</span>
                      <button
                        onClick={async () => {
                          await preferencesStorage.removeAllowedDomain(domain);
                          // Try to notify content script on that domain to hide the floating button
                          try {
                            const tabs = await chrome.tabs.query({});
                            const domainPattern = domain.replace('*.', '');
                            const matchingTab = tabs.find(t => t.url?.includes(domainPattern));
                            if (matchingTab?.id) {
                              chrome.tabs.sendMessage(matchingTab.id, { type: 'HIDE_FLOATING_BUTTON' }).catch(() => {});
                            }
                          } catch {
                            console.log('[Jobestry] Could not notify tab to hide floating button');
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#a8a29e',
                          cursor: 'pointer',
                          padding: '8px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(239, 68, 68, 0.2)';
                          (e.currentTarget as HTMLElement).style.color = '#ef4444';
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
                          (e.currentTarget as HTMLElement).style.color = '#a8a29e';
                        }}
                        title="Remove domain">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        );
    }
  };

  return (
    <div className="options-page">
      <div className="options-container">
        <header className="options-header">
          <div className="header-left">
            <div>
              <h1 className="logo-text">Jobestry Settings</h1>
              <p className="header-subtitle">Configure your job application assistant</p>
            </div>
          </div>
          <div className="header-actions">
            <button
              className="btn btn-secondary"
              onClick={() => window.open(chrome.runtime.getURL('popup/index.html'), '_blank')}>
              Open Popup
            </button>
          </div>
        </header>

        <div className="settings-tabs">
          <button className={`tab ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>
            General
          </button>
          <button className={`tab ${activeTab === 'resume' ? 'active' : ''}`} onClick={() => setActiveTab('resume')}>
            Resume Context
          </button>
          <button className={`tab ${activeTab === 'style' ? 'active' : ''}`} onClick={() => setActiveTab('style')}>
            Writing Style
          </button>
          <button
            className={`tab ${activeTab === 'cover-letter' ? 'active' : ''}`}
            onClick={() => setActiveTab('cover-letter')}>
            Cover Letter
          </button>
          <button className={`tab ${activeTab === 'skills' ? 'active' : ''}`} onClick={() => setActiveTab('skills')}>
            Skills
          </button>
          <button className={`tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            Profile
          </button>
          <button
            className={`tab ${activeTab === 'applications' ? 'active' : ''}`}
            onClick={() => setActiveTab('applications')}>
            Applications{' '}
            {applications.applications.length > 0 && (
              <span className="tab-badge">{applications.applications.length}</span>
            )}
          </button>
          <button className={`tab ${activeTab === 'hotkeys' ? 'active' : ''}`} onClick={() => setActiveTab('hotkeys')}>
            Hotkeys
          </button>
          <button className={`tab ${activeTab === 'domains' ? 'active' : ''}`} onClick={() => setActiveTab('domains')}>
            Domains
          </button>
        </div>

        {renderTabContent()}
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Options, <LoadingSpinner />), ErrorDisplay);
