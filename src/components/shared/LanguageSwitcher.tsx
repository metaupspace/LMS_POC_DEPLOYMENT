'use client';

import { Globe } from 'lucide-react';
import Dropdown from '@/components/ui/Dropdown';
import { useTranslation, SUPPORTED_LOCALES, type Locale } from '@/i18n';

const languages = [
  { label: 'English', value: 'en' },
  { label: 'Hindi', value: 'hi' },
];

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'light' | 'dark';
}

export default function LanguageSwitcher({
  className = '',
  variant = 'dark',
}: LanguageSwitcherProps) {
  const { locale, setLocale } = useTranslation();

  const handleChange = (val: string) => {
    if (SUPPORTED_LOCALES.includes(val as Locale)) {
      setLocale(val as Locale);
    }
  };

  return (
    <Dropdown
      items={languages}
      value={locale}
      onChange={handleChange}
      trigger={
        <div className={`flex items-center gap-sm rounded-sm px-sm py-xs text-body-md transition-colors ${variant === 'light' ? 'text-white hover:bg-white/10' : 'border border-border-light text-text-primary hover:bg-surface-background'}`}>
          <Globe className={`h-4 w-4 ${variant === 'light' ? 'text-white/80' : 'text-text-secondary'}`} strokeWidth={1.5} />
          <span className="hidden md:inline">{languages.find((l) => l.value === locale)?.label ?? 'English'}</span>
        </div>
      }
      className={className}
    />
  );
}
