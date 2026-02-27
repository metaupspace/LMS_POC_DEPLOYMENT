'use client';

import { Menu } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { toggleSidebar, setMobileMenuOpen } from '@/store/slices/uiSlice';
import NotificationBell from '@/components/shared/NotificationBell';
import ProfileDropdown from '@/components/shared/ProfileDropdown';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';

export default function TopBar() {
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector((s) => s.ui.sidebarOpen);

  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-[56px] items-center justify-between bg-primary-main px-md">
      {/* Left: Logo + hamburger */}
      <div className="flex items-center gap-md">
        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => dispatch(setMobileMenuOpen(true))}
          className="rounded-sm p-xs text-white transition-colors hover:bg-white/10 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop sidebar toggle */}
        <button
          type="button"
          onClick={() => dispatch(toggleSidebar())}
          className="hidden rounded-sm p-xs text-white transition-colors hover:bg-white/10 lg:block"
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-sm">
          <span className="text-h3 font-semibold text-white">LMS</span>
        </div>
      </div>

      {/* Right: Language + Notifications + Profile */}
      <div className="flex items-center gap-md">
        <LanguageSwitcher variant="light" />
        <NotificationBell />
        <ProfileDropdown />
      </div>
    </header>
  );
}
