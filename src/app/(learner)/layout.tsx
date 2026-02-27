'use client';

import Link from 'next/link';
import { ProtectedRoute } from '@/components/shared';
import NotificationBell from '@/components/shared/NotificationBell';
import { BottomNavLearner } from '@/components/learner';
import { ToastContainer } from '@/components/ui';

export default function LearnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['staff']}>
      <div className="min-h-screen bg-surface-background">
        {/* Mobile Header */}
        <header className="fixed left-0 right-0 top-0 z-30 flex h-[56px] items-center justify-between bg-surface-white px-md shadow-sm">
          <Link href="/learner/home" className="text-h3 font-semibold text-primary-main">
            LMS
          </Link>
          <NotificationBell iconClassName="text-text-primary" />
        </header>

        {/* Main content */}
        <main className="pb-[72px] pt-[56px]">
          <div className="p-md">{children}</div>
        </main>

        <BottomNavLearner />
        <ToastContainer />
      </div>
    </ProtectedRoute>
  );
}
