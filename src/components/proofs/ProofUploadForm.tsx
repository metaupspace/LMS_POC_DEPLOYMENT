'use client';

import { useState, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { Button, FileUpload } from '@/components/ui';

interface ProofUploadFormProps {
  onUpload: (_file: File) => Promise<void>;
  onSkip?: () => void;
  isUploading?: boolean;
  accept?: string;
  maxSizeMB?: number;
  className?: string;
}

export default function ProofUploadForm({
  onUpload,
  onSkip,
  isUploading = false,
  accept = 'image/*,.pdf',
  maxSizeMB = 2,
  className = '',
}: ProofUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = useCallback((selectedFile: File) => {
    setFile(selectedFile);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!file) return;
    await onUpload(file);
    setFile(null);
  }, [file, onUpload]);

  return (
    <div className={`space-y-md ${className}`}>
      <div className="flex items-center gap-sm">
        <Upload className="h-5 w-5 text-primary-main" />
        <h3 className="text-body-lg font-semibold text-text-primary">
          Upload Proof of Work
        </h3>
      </div>

      <FileUpload
        accept={accept}
        maxSizeMB={maxSizeMB}
        onFileSelect={handleFileSelect}
      />

      {file && (
        <Button
          variant="primary"
          size="lg"
          isBlock
          isLoading={isUploading}
          onClick={handleUpload}
          className="min-h-[44px]"
        >
          Upload
        </Button>
      )}

      {onSkip && (
        <Button
          variant="ghost"
          size="md"
          isBlock
          onClick={onSkip}
          disabled={isUploading}
          className="min-h-[44px]"
        >
          Skip for now
        </Button>
      )}
    </div>
  );
}
