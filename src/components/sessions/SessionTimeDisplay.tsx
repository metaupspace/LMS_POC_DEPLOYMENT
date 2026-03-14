import { CalendarDays, Clock } from 'lucide-react';

interface SessionTimeDisplayProps {
  date: string;
  timeSlot: string;
  duration?: number;
  locale?: string;
  className?: string;
}

export function formatSessionDate(dateStr: string, locale = 'en-IN'): string {
  return new Date(dateStr).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function SessionTimeDisplay({
  date,
  timeSlot,
  duration,
  locale = 'en-IN',
  className = '',
}: SessionTimeDisplayProps) {
  return (
    <div className={`space-y-xs ${className}`}>
      <div className="flex items-center gap-xs text-body-md text-text-secondary">
        <CalendarDays className="h-4 w-4 flex-shrink-0" />
        <span>{formatSessionDate(date, locale)} &mdash; {timeSlot}</span>
      </div>
      {duration != null && duration > 0 && (
        <div className="flex items-center gap-xs text-body-md text-text-secondary">
          <Clock className="h-4 w-4 flex-shrink-0" />
          <span>{duration} min</span>
        </div>
      )}
    </div>
  );
}
