import { Loader2 } from 'lucide-react';

type SpinnerVariant = 'fullscreen' | 'inline' | 'button';

interface LoadingSpinnerProps {
  variant?: SpinnerVariant;
  text?: string;
  className?: string;
}

const sizeMap: Record<SpinnerVariant, string> = {
  fullscreen: 'h-8 w-8',
  inline: 'h-6 w-6',
  button: 'h-4 w-4',
};

export default function LoadingSpinner({
  variant = 'inline',
  text,
  className = '',
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={`flex items-center justify-center gap-sm ${className}`}>
      <Loader2 className={`animate-spin text-primary-main ${sizeMap[variant]}`} />
      {text && <span className="text-body-md text-text-secondary">{text}</span>}
    </div>
  );

  if (variant === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay">
        <div className="rounded-md bg-surface-white p-xl shadow-md">
          {spinner}
        </div>
      </div>
    );
  }

  return spinner;
}
