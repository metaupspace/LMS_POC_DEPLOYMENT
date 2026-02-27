'use client';

import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { removeToast, type Toast as ToastType } from '@/store/slices/uiSlice';

// ─── Single Toast Item ──────────────────────────────────

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap = {
  success: 'border-l-success text-success',
  error: 'border-l-error text-error',
  warning: 'border-l-warning text-warning',
  info: 'border-l-blue-500 text-blue-500',
};

function ToastItem({ toast }: { toast: ToastType }) {
  const dispatch = useAppDispatch();
  const Icon = iconMap[toast.type];

  useEffect(() => {
    if (toast.duration <= 0) return;
    const timer = setTimeout(() => {
      dispatch(removeToast(toast.id));
    }, toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, dispatch]);

  return (
    <div
      role="alert"
      className={`
        flex items-start gap-sm rounded-md border-l-4 bg-surface-white p-md shadow-md
        animate-[slideInRight_300ms_ease-out]
        ${colorMap[toast.type]}
      `}
    >
      <Icon className="mt-[2px] h-5 w-5 shrink-0" />
      <p className="flex-1 text-body-md text-text-primary">{toast.message}</p>
      <button
        type="button"
        onClick={() => dispatch(removeToast(toast.id))}
        className="shrink-0 text-text-disabled transition-colors hover:text-text-secondary"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Toast Container ────────────────────────────────────

export default function ToastContainer() {
  const toasts = useAppSelector((s) => s.ui.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-lg right-lg z-[60] flex w-full max-w-sm flex-col gap-sm">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
