'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ProtectedRoute } from '@/components/shared';
import NotificationBell from '@/components/shared/NotificationBell';
import PWAInstallPrompt from '@/components/shared/PWAInstallPrompt';
import { BottomNavLearner } from '@/components/learner';
import SideNav from '@/components/shared/SideNav';
import { ToastContainer } from '@/components/ui';
import { useAppSelector } from '@/store/hooks';

const learnerNavItems = [
  { label: 'Home', href: '/learner/home', icon: 'Home' },
  { label: 'Sessions', href: '/learner/sessions', icon: 'CalendarDays' },
  { label: 'My Learning', href: '/learner/learning', icon: 'BookOpen' },
  { label: 'Profile', href: '/learner/profile', icon: 'User' },
];

export default function LearnerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const user = useAppSelector((s) => s.auth.user);

  // Hide nav on test pages (proctored environment)
  const isTestPage = pathname?.includes('/learner/test/');

  if (isTestPage) {
    return (
      <ProtectedRoute allowedRoles={['staff']}>
        {children}
        <ToastContainer />
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['staff']}>
      <div className="min-h-screen bg-surface-background">
        {/* Header — always visible, responsive padding */}
        <header className="fixed left-0 right-0 top-0 z-30 flex h-[56px] items-center justify-between bg-primary-main px-md sm:px-lg lg:px-xl shadow-sm">
          {/* Logo — hidden on desktop where SideNav shows it */}
          <Link href="/learner/home" className="text-h2 font-bold text-white">
            LMS
          </Link>
          {/* Spacer for desktop (SideNav has the logo)
          <div className="hidden lg:block" /> */}

          {/* Right side */}
          <div className="flex items-center gap-md">
            <span className="hidden sm:block text-body-md text-white">
              {user?.name}
            </span>
            <NotificationBell iconClassName="text-white" />
          </div>
        </header>

        <div className="flex pt-[56px]">
          {/* Desktop: Side navigation */}
          <SideNav items={learnerNavItems} className="hidden lg:flex fixed top-[56px] left-0 h-[calc(100vh-56px)]" />

          {/* Main content — responsive padding */}
          <main className="flex-1 min-h-[calc(100vh-56px)] pb-[72px] lg:pb-lg lg:ml-60">
            <div className="p-md sm:p-lg lg:p-xl max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>

        {/* Bottom nav — hidden on desktop */}
        <BottomNavLearner className="lg:hidden" />
        <PWAInstallPrompt />
        <ToastContainer />
      </div>
    </ProtectedRoute>
  );
}
