'use client';

import { useEffect, useCallback, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { closeModal } from '@/store/slices/uiSlice';

interface ModalProps {
  modalId: string;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  onClose?: () => void;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export default function Modal({
  modalId,
  title,
  children,
  footer,
  maxWidth = 'md',
  onClose,
}: ModalProps) {
  const dispatch = useAppDispatch();
  const activeModal = useAppSelector((s) => s.ui.activeModal);
  const isOpen = activeModal === modalId;

  const handleClose = useCallback(() => {
    dispatch(closeModal());
    onClose?.();
  }, [dispatch, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-overlay animate-[fadeIn_200ms_ease-out]"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`
          relative z-10 flex max-h-[90vh] w-full flex-col rounded-lg
          bg-surface-white shadow-md
          animate-[scaleIn_200ms_ease-out]
          ${maxWidthClasses[maxWidth]}
        `}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between border-b border-border-light px-lg py-md">
            <h2 className="text-h3 text-text-primary">{title}</h2>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-sm p-xs text-text-secondary transition-colors hover:bg-surface-background hover:text-text-primary"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-lg py-lg">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-sm border-t border-border-light px-lg py-md">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
