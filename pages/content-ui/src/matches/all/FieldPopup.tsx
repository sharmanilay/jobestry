import { useState, useCallback, useEffect } from 'react';

interface FieldPopupProps {
  fieldLabel: string;
  fieldType: string;
  jobDescription: string;
  resumeSummary: string;
  onClose: () => void;
  onGenerate: (notes: string) => Promise<{ success: boolean; response?: string; error?: string }>;
  onApply: (response: string) => void;
}

export const FieldPopup = ({
  fieldLabel,
  fieldType,
  jobDescription,
  resumeSummary,
  onClose,
  onGenerate,
  onApply,
}: FieldPopupProps) => {
  const [notes, setNotes] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResponse, setGeneratedResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate on open if no notes needed for simple fields
  const isSimpleField = ['firstName', 'lastName', 'email', 'phone', 'location', 'linkedin', 'github'].includes(
    fieldType,
  );

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setGeneratedResponse(null);

    try {
      const result = await onGenerate(notes);
      if (result.success && result.response) {
        setGeneratedResponse(result.response);
      } else {
        setError(result.error || 'Failed to generate response');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsGenerating(false);
    }
  }, [notes, onGenerate]);

  const handleApply = useCallback(() => {
    if (generatedResponse) {
      onApply(generatedResponse);
      onClose();
    }
  }, [generatedResponse, onApply, onClose]);

  const handleApplyAndClose = useCallback(() => {
    handleApply();
  }, [handleApply]);

  // Truncate long text for preview
  const truncate = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
    <div className="jobestry-field-popup-overlay" onClick={onClose}>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="jobestry-field-popup" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="jobestry-field-popup-header">
          <h3>✨ Generate: {fieldLabel || fieldType}</h3>
          <button className="jobestry-field-popup-close" onClick={onClose}>
            ×
          </button>
        </div>

        {/* Content */}
        <div className="jobestry-field-popup-content">
          {/* Job Description Preview */}
          <div className="jobestry-field-popup-section">
            <div className="jobestry-field-popup-label">
              📋 Job Description
              {!jobDescription && <span style={{ color: '#f59e0b' }}>(Not detected)</span>}
            </div>
            <div className="jobestry-field-popup-preview">
              {jobDescription ? truncate(jobDescription, 300) : 'No job description found on this page.'}
            </div>
          </div>

          {/* Resume Preview */}
          <div className="jobestry-field-popup-section">
            <div className="jobestry-field-popup-label">
              📄 Your Resume
              {!resumeSummary && <span style={{ color: '#f59e0b' }}>(Not set)</span>}
            </div>
            <div className="jobestry-field-popup-preview">
              {resumeSummary ? truncate(resumeSummary, 200) : 'No resume uploaded. Add one in extension settings.'}
            </div>
          </div>

          {/* Notes Input */}
          {!isSimpleField && (
            <div className="jobestry-field-popup-section">
              <div className="jobestry-field-popup-label">📝 Additional Notes (optional)</div>
              <textarea
                className="jobestry-field-popup-notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="E.g., 'Emphasize my leadership experience' or 'Keep it concise, under 100 words'"
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="jobestry-field-popup-section">
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  color: '#dc2626',
                  fontSize: '13px',
                }}>
                {error}
              </div>
            </div>
          )}

          {/* Generated Response */}
          {generatedResponse && (
            <div className="jobestry-field-popup-section">
              <div className="jobestry-field-popup-label">✅ Generated Response</div>
              <div className="jobestry-field-popup-result">{generatedResponse}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="jobestry-field-popup-footer">
          <button className="jobestry-btn jobestry-btn-secondary" onClick={onClose}>
            Cancel
          </button>

          {!generatedResponse ? (
            <button
              className="jobestry-btn jobestry-btn-primary"
              onClick={handleGenerate}
              disabled={isGenerating}
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              }}>
              {isGenerating ? (
                <>
                  <span className="jobestry-loader jobestry-spin" style={{ width: '14px', height: '14px' }} />
                  Generating...
                </>
              ) : (
                '✨ Generate'
              )}
            </button>
          ) : (
            <>
              <button className="jobestry-btn jobestry-btn-secondary" onClick={handleGenerate} disabled={isGenerating}>
                🔄 Regenerate
              </button>
              <button
                className="jobestry-btn jobestry-btn-primary"
                onClick={handleApplyAndClose}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                }}>
                ✓ Apply to Field
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FieldPopup;
