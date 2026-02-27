'use client';

import { useAppSelector } from '@/store/hooks';
import { Sidebar, TopBar } from '@/components/dashboard';
import { ProtectedRoute } from '@/components/shared';
import { ToastContainer } from '@/components/ui';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const sidebarOpen = useAppSelector((s) => s.ui.sidebarOpen);

  return (
    <ProtectedRoute allowedRoles={['admin', 'manager']}>
      <div className="min-h-screen bg-surface-background">
        <TopBar />
        <Sidebar />

        {/* Main content */}
        <main
          className={`
            pt-[56px] transition-[margin] duration-200
            ${sidebarOpen ? 'lg:ml-[250px]' : 'lg:ml-[72px]'}
          `}
        >
          <div className="p-md lg:p-lg">{children}</div>
        </main>

        <ToastContainer />
      </div>
    </ProtectedRoute>
  );
}
