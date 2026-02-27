import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-background px-md text-center">
      <FileQuestion className="h-20 w-20 text-text-disabled" />
      <h1 className="mt-lg text-[48px] font-bold text-text-primary leading-none">404</h1>
      <h2 className="mt-sm text-h2 font-semibold text-text-secondary">Page Not Found</h2>
      <p className="mt-sm text-body-md text-text-disabled max-w-sm">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-xl inline-flex min-h-[48px] items-center rounded-md bg-primary-main px-xl py-md text-body-md font-semibold text-white transition-colors hover:bg-primary-hover"
      >
        Go Home
      </Link>
    </div>
  );
}
