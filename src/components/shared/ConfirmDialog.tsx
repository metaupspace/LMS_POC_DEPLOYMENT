interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmDialog({
  isOpen, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  variant = 'default', onConfirm, onCancel, isLoading,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const btnClass = {
    danger: 'bg-red-500 hover:bg-red-600',
    warning: 'bg-yellow-500 hover:bg-yellow-600',
    default: 'bg-primary-main hover:bg-primary-hover',
  }[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-gray-500 mt-2">{message}</p>
        <div className="flex gap-3 mt-6">
          <button onClick={onCancel} disabled={isLoading}
            className="flex-1 py-2 border border-gray-200 rounded-md text-sm hover:bg-gray-50">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} disabled={isLoading}
            className={`flex-1 py-2 text-white rounded-md text-sm ${btnClass} disabled:opacity-50`}>
            {isLoading ? 'Loading...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
