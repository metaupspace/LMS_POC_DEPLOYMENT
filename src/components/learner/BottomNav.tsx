'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, User } from 'lucide-react';

const tabs = [
  { label: 'Home', href: '/learner/home', icon: Home },
  { label: 'My Learning', href: '/learner/learning', icon: BookOpen },
  { label: 'Profile', href: '/learner/profile', icon: User },
];

export default function BottomNavLearner() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border-light bg-surface-white shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
      <div className="flex h-[56px] items-center justify-around">
        {tabs.map((tab) => {
          const active = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                flex flex-col items-center gap-[2px] px-lg py-xs transition-colors
                ${active ? 'text-primary-main' : 'text-text-disabled'}
              `}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.5} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
