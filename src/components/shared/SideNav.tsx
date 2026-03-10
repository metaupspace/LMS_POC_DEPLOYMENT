'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, BookOpen, CalendarDays, User } from 'lucide-react';

const iconMap: Record<string, typeof Home> = {
  Home,
  BookOpen,
  CalendarDays,
  User,
};

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

interface SideNavProps {
  items: NavItem[];
  className?: string;
}

export default function SideNav({ items, className = '' }: SideNavProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`w-60 min-h-screen bg-surface-white border-r border-border-light flex-shrink-0 flex-col ${className}`}
    >
      {/* <div className="p-lg">
        <Link href="/" className="text-h2 font-bold text-primary-main">
          LMS
        </Link>
      </div> */}

      <nav className="px-sm mt-sm pt-sm">
        {items.map((item) => {
          const Icon = iconMap[item.icon] || Home;
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex items-center gap-sm px-md py-sm rounded-md mb-xs transition-colors
                ${
                  isActive
                    ? 'bg-primary-main/10 text-primary-main font-medium'
                    : 'text-text-secondary hover:bg-surface-background hover:text-text-primary'
                }
              `}
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} />
              <span className="text-body-md">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
