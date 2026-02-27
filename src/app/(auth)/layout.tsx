import { ToastContainer } from '@/components/ui';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-background p-md">
      {children}
      <ToastContainer />
    </div>
  );
}
