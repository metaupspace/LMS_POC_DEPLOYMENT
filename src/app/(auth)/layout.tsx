import { ToastContainer } from '@/components/ui';
import ConnectionStatus from '@/components/shared/ConnectionStatus';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-background p-md">
      <ConnectionStatus topOffset="0px" />
      {children}
      <ToastContainer />
    </div>
  );
}
