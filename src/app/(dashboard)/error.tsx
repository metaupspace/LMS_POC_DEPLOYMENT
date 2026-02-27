'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-lg text-center">
      <AlertTriangle className="h-16 w-16 text-error" />
      <h2 className="mt-lg text-h2 font-semibold text-text-primary">Something went wrong</h2>
      <p className="mt-sm text-body-md text-text-secondary max-w-md">
        An unexpected error occurred while loading this page. Please try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-lg rounded-md bg-primary-main px-xl py-md text-body-md font-semibold text-white transition-colors hover:bg-primary-hover min-h-[44px]"
      >
        Try Again
      </button>
    </div>
  );
}
