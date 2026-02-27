'use client';

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';
import Image from 'next/image';
import { Upload, X, File, Image as ImageIcon } from 'lucide-react';

interface FileUploadProps {
  accept?: string;
  maxSizeMB?: number;
  onFileSelect: (_file: File) => void;
  onRemove?: () => void;
  progress?: number; // 0-100
  previewUrl?: string;
  fileName?: string;
  error?: string;
  className?: string;
}

export default function FileUpload({
  accept,
  maxSizeMB = 2,
  onFileSelect,
  onRemove,
  progress,
  previewUrl,
  fileName,
  error: externalError,
  className = '',
}: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const displayError = externalError || error;

  const validate = useCallback(
    (file: File): boolean => {
      setError('');
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File size must be under ${maxSizeMB}MB`);
        return false;
      }
      if (accept) {
        const allowed = accept.split(',').map((a) => a.trim());
        const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
        const matchesMime = allowed.some((a) => file.type.match(a.replace('*', '.*')));
        const matchesExt = allowed.includes(ext);
        if (!matchesMime && !matchesExt) {
          setError('File type not allowed');
          return false;
        }
      }
      return true;
    },
    [accept, maxSizeMB]
  );

  const handleFile = useCallback(
    (file: File) => {
      if (validate(file)) onFileSelect(file);
    },
    [validate, onFileSelect]
  );

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Preview State ─────────────────────────────────────

  if (previewUrl || fileName) {
    const isImage = previewUrl && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(previewUrl);
    return (
      <div className={`rounded-md border border-border-light bg-surface-white p-md ${className}`}>
        <div className="flex items-center gap-md">
          {isImage ? (
            <Image
              src={previewUrl}
              alt="Preview"
              width={48}
              height={48}
              className="h-[48px] w-[48px] rounded-sm object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-[48px] w-[48px] items-center justify-center rounded-sm bg-surface-background">
              <File className="h-5 w-5 text-text-secondary" />
            </div>
          )}
          <span className="flex-1 truncate text-body-md text-text-primary">
            {fileName || previewUrl}
          </span>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-sm p-xs text-text-secondary transition-colors hover:bg-surface-background hover:text-error"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        {typeof progress === 'number' && progress < 100 && (
          <div className="mt-sm h-[4px] w-full overflow-hidden rounded-full bg-surface-background">
            <div
              className="h-full rounded-full bg-primary-main transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  // ── Upload Zone ───────────────────────────────────────

  return (
    <div className={className}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`
          flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed
          px-lg py-2xl transition-colors
          ${dragOver ? 'border-primary-main bg-primary-light' : 'border-border-light bg-surface-white hover:border-text-disabled'}
        `}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') fileRef.current?.click();
        }}
      >
        <div className="mb-sm flex h-[48px] w-[48px] items-center justify-center rounded-full bg-primary-light">
          {accept?.includes('image') ? (
            <ImageIcon className="h-5 w-5 text-primary-main" />
          ) : (
            <Upload className="h-5 w-5 text-primary-main" />
          )}
        </div>
        <p className="text-body-md font-medium text-text-primary">
          Drop file here or <span className="text-primary-main">browse</span>
        </p>
        <p className="mt-xs text-caption text-text-secondary">
          Max size: {maxSizeMB}MB
          {accept && ` | ${accept}`}
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        aria-hidden="true"
      />

      {displayError && (
        <p className="mt-xs text-caption text-error" role="alert">
          {displayError}
        </p>
      )}
    </div>
  );
}
