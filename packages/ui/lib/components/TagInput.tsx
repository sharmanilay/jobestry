import { cn } from '../utils';
import { useState, useCallback } from 'react';
import type { KeyboardEvent, ChangeEvent } from 'react';

export interface TagInputProps {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
  disabled?: boolean;
}

/**
 * TagInput - A reusable component for managing a list of tags/items.
 * Used for skills to emphasize, topics to avoid, etc.
 */
export const TagInput = ({
  tags,
  onAdd,
  onRemove,
  placeholder = 'Add item...',
  maxTags = 10,
  className,
  disabled = false,
}: TagInputProps) => {
  const [inputValue, setInputValue] = useState('');

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  const handleAdd = useCallback(() => {
    const trimmed = inputValue.trim();
    if (trimmed && !tags.includes(trimmed) && tags.length < maxTags) {
      onAdd(trimmed);
      setInputValue('');
    }
  }, [inputValue, tags, maxTags, onAdd]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
        // Remove last tag on backspace when input is empty
        onRemove(tags[tags.length - 1]);
      }
    },
    [handleAdd, inputValue, tags, onRemove],
  );

  return (
    <div className={cn('tag-input-container', className)}>
      <div className="tag-input-tags">
        {tags.map(tag => (
          <span key={tag} className="tag-input-tag">
            {tag}
            {!disabled && (
              <button
                type="button"
                className="tag-input-remove"
                onClick={() => onRemove(tag)}
                aria-label={`Remove ${tag}`}>
                ×
              </button>
            )}
          </span>
        ))}
        {!disabled && tags.length < maxTags && (
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleAdd}
            placeholder={tags.length === 0 ? placeholder : ''}
            className="tag-input-field"
            aria-label="Add tag"
          />
        )}
      </div>
      {tags.length >= maxTags && <span className="tag-input-limit">Maximum {maxTags} items</span>}
      <style>{`
        .tag-input-container {
          width: 100%;
        }
        
        .tag-input-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          padding: 8px;
          border: 1px solid var(--color-border, #e2e8f0);
          border-radius: 8px;
          background: var(--color-bg-input, #fff);
          min-height: 42px;
          align-items: center;
        }
        
        .tag-input-tags:focus-within {
          border-color: var(--color-primary, #6366f1);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        
        .tag-input-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 500;
          animation: tag-pop-in 0.15s ease-out;
        }
        
        @keyframes tag-pop-in {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        
        .tag-input-remove {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.8);
          cursor: pointer;
          padding: 0;
          font-size: 14px;
          line-height: 1;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.15s ease;
        }
        
        .tag-input-remove:hover {
          background: rgba(255, 255, 255, 0.2);
          color: white;
        }
        
        .tag-input-field {
          flex: 1;
          min-width: 60px;
          border: none;
          outline: none;
          font-size: 13px;
          background: transparent;
          padding: 4px 0;
        }
        
        .tag-input-field::placeholder {
          color: var(--color-text-muted, #94a3b8);
        }
        
        .tag-input-limit {
          display: block;
          margin-top: 4px;
          font-size: 11px;
          color: var(--color-text-muted, #94a3b8);
        }
      `}</style>
    </div>
  );
};

export default TagInput;
