'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { X, Download, ExternalLink } from 'lucide-react';
import PDFViewer from './PDFViewer';

interface ImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  fileName?: string;
  fileType?: string;
}

export default function ImageModal({ isOpen, onClose, imageUrl, fileName, fileType }: ImageModalProps) {
  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !imageUrl) return null;

  // Detect if the file is a PDF — check multiple signals
  const isPDF =
    fileType?.includes('pdf') ||
    fileName?.toLowerCase().endsWith('.pdf') ||
    imageUrl?.toLowerCase().includes('.pdf') ||
    imageUrl?.toLowerCase().includes('/raw/upload/');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 animate-[fadeIn_200ms_ease-out]"
      onClick={onClose}
    >
      {/* Modal content */}
      <div
        className="relative max-w-lg sm:max-w-2xl lg:max-w-4xl max-h-[90vh] w-full mx-sm sm:mx-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between mb-sm">
          <p className="text-white text-body-md truncate max-w-[60%]">
            {fileName || 'Proof of Work'}
          </p>
          <div className="flex items-center gap-xs">
            <a
              href={imageUrl}
              download={fileName}
              className="p-xs bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              title="Download"
            >
              <Download className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </a>
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-xs bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              title="Open in new tab"
            >
              <ExternalLink className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-xs bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              title="Close"
            >
              <X className="h-[18px] w-[18px]" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Content */}
        {isPDF ? (
          <PDFViewer url={imageUrl} />
        ) : (
          <div className="flex items-center justify-center bg-black/20 rounded-md overflow-hidden">
            <Image
              src={imageUrl}
              alt={fileName || 'Proof of Work'}
              width={800}
              height={600}
              className="max-w-full max-h-[80vh] object-contain"
              unoptimized
            />
          </div>
        )}
      </div>
    </div>
  );
}
