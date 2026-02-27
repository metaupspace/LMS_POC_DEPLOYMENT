'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function LearnerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Learner error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-md text-center">
      <AlertTriangle className="h-12 w-12 text-error" />
      <h2 className="mt-md text-h2 font-semibold text-text-primary">Something went wrong</h2>
      <p className="mt-sm text-body-md text-text-secondary">
        An unexpected error occurred. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-lg rounded-md bg-primary-main px-xl py-md text-body-md font-semibold text-white transition-colors active:bg-primary-hover min-h-[48px] w-full max-w-xs"
      >
        Try Again
      </button>
    </div>
  );
}
