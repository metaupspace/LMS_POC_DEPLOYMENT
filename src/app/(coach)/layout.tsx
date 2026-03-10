'use client';

import Link from 'next/link';
import { ProtectedRoute } from '@/components/shared';
import NotificationBell from '@/components/shared/NotificationBell';
import PWAInstallPrompt from '@/components/shared/PWAInstallPrompt';
import { BottomNav } from '@/components/coach';
import SideNav from '@/components/shared/SideNav';
import { ToastContainer } from '@/components/ui';
import { useAppSelector } from '@/store/hooks';

const coachNavItems = [
  { label: 'Home', href: '/coach/home', icon: 'Home' },
  { label: 'Courses', href: '/coach/courses', icon: 'BookOpen' },
  { label: 'Profile', href: '/coach/profile', icon: 'User' },
];

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  const user = useAppSelector((s) => s.auth.user);

  return (
    <ProtectedRoute allowedRoles={['coach']}>
      <div className="min-h-screen bg-surface-background">
        {/* Header — always visible, responsive padding */}
        <header className="fixed left-0 right-0 top-0 z-30 flex h-[56px] items-center justify-between bg-primary-main px-md sm:px-lg lg:px-xl shadow-sm">
          {/* Logo — hidden on desktop where SideNav shows it */}
          <Link href="/coach/home" className="text-h2 font-bold text-white">
            LMS
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-md">
            <span className="hidden sm:block text-body-md text-white font-semibold">
              {user?.name}
            </span>
            <NotificationBell iconClassName="text-white font-bold" />
          </div>
        </header>

        <div className="flex pt-[56px]">
          {/* Desktop: Side navigation */}
          <SideNav items={coachNavItems} className="hidden lg:flex fixed top-[56px] left-0 h-[calc(100vh-56px)]" />

          {/* Main content — responsive padding */}
          <main className="flex-1 min-h-[calc(100vh-56px)] pb-[72px] lg:pb-lg lg:ml-60">
            <div className="p-md sm:p-lg lg:p-xl max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>

        {/* Bottom nav — hidden on desktop */}
        <BottomNav className="lg:hidden" />
        <PWAInstallPrompt />
        <ToastContainer />
      </div>
    </ProtectedRoute>
  );
}
