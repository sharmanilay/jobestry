import { cn } from '@/lib/utils';
import { useState, useRef, forwardRef } from 'react';
import type { ComponentPropsWithoutRef, DragEvent, ChangeEvent } from 'react';

interface FileUploadProps extends Omit<ComponentPropsWithoutRef<'div'>, 'onChange'> {
  label?: string;
  hint?: string;
  error?: string;
  accept?: string;
  maxSize?: number;
  onChange?: (file: File) => void;
  onUploadError?: (error: string) => void;
}

export const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(
  (
    {
      label,
      hint,
      error,
      accept = '.pdf,.doc,.docx,.txt',
      maxSize = 5 * 1024 * 1024,
      onChange,
      onUploadError,
      className,
      ...props
    },
    ref,
  ) => {
    const [isDragging, setIsDragging] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const formatSize = (bytes: number): string => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const validateFile = (file: File): boolean => {
      if (maxSize && file.size > maxSize) {
        onUploadError?.(`File too large. Maximum size is ${formatSize(maxSize)}`);
        return false;
      }

      if (accept) {
        const acceptedTypes = accept.split(',').map(t => t.trim().toLowerCase());
        const fileExt = `.${file.name.split('.').pop()?.toLowerCase()}`;
        const fileMime = file.type.toLowerCase();

        const isAccepted =
          acceptedTypes.some(type => type === fileExt || type === fileMime) ||
          acceptedTypes.some(type => type.startsWith('.') && file.name.toLowerCase().endsWith(type));

        if (!isAccepted) {
          onUploadError?.(`Invalid file type. Accepted: ${accept}`);
          return false;
        }
      }

      return true;
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && validateFile(file)) {
        setFileName(file.name);
        onChange?.(file);
      }
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && validateFile(file)) {
        setFileName(file.name);
        onChange?.(file);
      }
    };

    const handleClick = () => {
      inputRef.current?.click();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        inputRef.current?.click();
      }
    };

    return (
      <div className="w-full">
        {label && <label className="mb-2 block text-sm font-medium text-[#fafaf9]">{label}</label>}

        <div
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative flex flex-col items-center justify-center p-6',
            'cursor-pointer rounded-xl border-2 border-dashed',
            'transition-all duration-200 ease-out',
            isDragging ? 'border-teal-400 bg-teal-900/20' : 'border-[#525252] hover:border-[#737373]',
            error && 'border-red-400',
            className,
          )}
          {...props}>
          <input
            ref={el => {
              inputRef.current = el;
              if (typeof ref === 'function') {
                ref(el);
              } else if (ref) {
                ref.current = el;
              }
            }}
            type="file"
            accept={accept}
            onChange={handleChange}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-3 text-center">
            <div className="rounded-full bg-[#262626] p-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[#a3a3a3]">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>

            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-[#fafaf9]">
                {isDragging ? 'Drop file here' : 'Click or drag file to upload'}
              </p>
              {hint && <p className="text-xs text-[#a3a3a3]">{hint}</p>}
            </div>

            {fileName && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-[#262626] px-3 py-1.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-teal-400">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="text-sm text-[#d4d4d4]">{fileName}</span>
              </div>
            )}

            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          </div>
        </div>
      </div>
    );
  },
);

FileUpload.displayName = 'FileUpload';
