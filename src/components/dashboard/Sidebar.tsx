'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UserCog,
  GraduationCap,
  Users,
  BookOpen,
  CalendarDays,
  BarChart3,
  FileText,
  X,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setMobileMenuOpen } from '@/store/slices/uiSlice';
import { useTranslation } from '@/i18n';

interface NavItem {
  labelKey: string;
  href: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  { labelKey: 'dashboard.dashboard', href: '/admin/dashboard', icon: LayoutDashboard, roles: ['admin', 'manager'] },
  { labelKey: 'users.managers', href: '/admin/managers', icon: UserCog, roles: ['admin'] },
  { labelKey: 'users.coaches', href: '/admin/coaches', icon: GraduationCap, roles: ['admin', 'manager'] },
  { labelKey: 'users.staff', href: '/admin/staff', icon: Users, roles: ['admin', 'manager'] },
  { labelKey: 'courses.courses', href: '/admin/courses', icon: BookOpen, roles: ['admin', 'manager'] },
  { labelKey: 'sessions.trainingSessions', href: '/admin/sessions', icon: CalendarDays, roles: ['admin', 'manager'] },
  { labelKey: 'reports.reports', href: '/admin/reports', icon: BarChart3, roles: ['admin', 'manager'] },
  { labelKey: 'API Docs', href: '/api-docs', icon: FileText, roles: ['admin'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const sidebarOpen = useAppSelector((s) => s.ui.sidebarOpen);
  const isMobileMenuOpen = useAppSelector((s) => s.ui.isMobileMenuOpen);
  const user = useAppSelector((s) => s.auth.user);
  const role = user?.role ?? 'admin';

  const filteredItems = navItems.filter((item) => item.roles.includes(role));

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') return pathname === '/admin/dashboard';
    return pathname.startsWith(href);
  };

  const navContent = (
    <nav className="flex flex-col gap-xs py-sm">
      {filteredItems.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => dispatch(setMobileMenuOpen(false))}
            className={`
              group relative mx-sm flex items-center gap-md rounded-sm px-md py-sm
              text-body-md font-medium transition-colors
              ${
                active
                  ? 'bg-primary-light text-primary-main'
                  : 'text-text-secondary hover:bg-surface-background hover:text-text-primary'
              }
            `}
          >
            {active && (
              <span className="absolute left-0 top-1/2 h-[60%] w-[3px] -translate-y-1/2 rounded-r-full bg-primary-main" />
            )}
            <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
            <span className={`${!sidebarOpen ? 'lg:hidden' : ''}`}>{t(item.labelKey)}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden lg:flex lg:flex-col lg:fixed lg:top-[56px] lg:bottom-0 lg:left-0
          border-r border-border-light bg-surface-white transition-[width] duration-200 z-20
          overflow-y-auto overflow-x-hidden
          ${sidebarOpen ? 'lg:w-[250px]' : 'lg:w-[72px]'}
        `}
      >
        {navContent}
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-overlay"
            onClick={() => dispatch(setMobileMenuOpen(false))}
          />
          <aside className="relative z-10 flex h-full w-[250px] flex-col bg-surface-white shadow-md animate-[slideInLeft_200ms_ease-out]">
            <div className="flex items-center justify-between border-b border-border-light px-md py-md">
              <span className="text-h3 font-semibold text-primary-main">LMS</span>
              <button
                type="button"
                onClick={() => dispatch(setMobileMenuOpen(false))}
                className="rounded-sm p-xs text-text-secondary hover:bg-surface-background"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
