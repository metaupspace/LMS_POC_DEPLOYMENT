'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User, KeyRound, LogOut } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logout } from '@/store/slices/authSlice';
import { useLogoutMutation } from '@/store/slices/api/authApi';

export default function ProfileDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [logoutApi] = useLogoutMutation();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '??';

  const handleLogout = async () => {
    try {
      await logoutApi().unwrap();
    } catch {
      // Logout even if API fails
    }
    dispatch(logout());
    router.push('/login');
  };

  const menuItems = [
    {
      label: 'Profile',
      icon: User,
      onClick: () => {
        setOpen(false);
        const role = user?.role;
        if (role === 'admin' || role === 'manager') router.push('/admin/profile');
        else if (role === 'coach') router.push('/coach/profile');
        else router.push('/learner/profile');
      },
    },
    {
      label: 'Change Password',
      icon: KeyRound,
      onClick: () => {
        setOpen(false);
        router.push('/admin/change-password');
      },
    },
    {
      label: 'Logout',
      icon: LogOut,
      onClick: handleLogout,
      danger: true,
    },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-sm rounded-sm px-xs py-xs text-white transition-colors hover:bg-white/10"
      >
        <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-white/20 text-caption font-semibold text-white">
          {initials}
        </div>
        <span className="hidden text-body-md font-medium md:block">{user?.name}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-sm w-[200px] rounded-md border border-border-light bg-surface-white py-xs shadow-md animate-[scaleIn_150ms_ease-out]">
          {/* User info */}
          <div className="border-b border-border-light px-md py-sm">
            <p className="text-body-md font-medium text-text-primary">{user?.name}</p>
            <p className="text-caption text-text-secondary">{user?.empId}</p>
          </div>

          {/* Menu items */}
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={`
                  flex w-full items-center gap-sm px-md py-sm text-body-md transition-colors
                  ${'danger' in item && item.danger ? 'text-error hover:bg-error/5' : 'text-text-primary hover:bg-surface-background'}
                `}
              >
                <Icon className="h-4 w-4" strokeWidth={1.5} />
                {item.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
