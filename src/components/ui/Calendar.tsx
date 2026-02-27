'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────

export interface CalendarEvent {
  date: string; // YYYY-MM-DD
  title: string;
  status: 'upcoming' | 'completed' | 'cancelled';
}

interface CalendarProps {
  events?: CalendarEvent[];
  onDayClick?: (_date: Date, _dayEvents: CalendarEvent[]) => void;
  onMonthChange?: (_date: Date) => void;
  className?: string;
}

// ─── Helpers ────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const statusDot: Record<string, string> = {
  upcoming: 'bg-primary-main',
  completed: 'bg-success',
  cancelled: 'bg-text-disabled',
};

// ─── Component ──────────────────────────────────────────

export default function Calendar({
  events = [],
  onDayClick,
  onMonthChange,
  className = '',
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    events.forEach((ev) => {
      (map[ev.date] ??= []).push(ev);
    });
    return map;
  }, [events]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [year, month]);

  const navigate = (dir: -1 | 1) => {
    const next = new Date(year, month + dir, 1);
    setCurrentDate(next);
    onMonthChange?.(next);
  };

  const todayKey = toDateKey(new Date());

  return (
    <div className={`rounded-md bg-surface-white p-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="mb-md flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-sm p-xs text-text-secondary transition-colors hover:bg-surface-background"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="text-h3 text-text-primary">
          {MONTHS[month]} {year}
        </h3>
        <button
          type="button"
          onClick={() => navigate(1)}
          className="rounded-sm p-xs text-text-secondary transition-colors hover:bg-surface-background"
          aria-label="Next month"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Day Headers */}
      <div className="mb-xs grid grid-cols-7 gap-[1px]">
        {DAYS.map((d) => (
          <div key={d} className="py-xs text-center text-caption font-semibold text-text-secondary">
            {d}
          </div>
        ))}
      </div>

      {/* Day Cells */}
      <div className="grid grid-cols-7 gap-[1px]">
        {calendarDays.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="h-[56px]" />;
          }

          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayEvents = eventsByDate[dateKey] ?? [];
          const isToday = dateKey === todayKey;

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onDayClick?.(new Date(year, month, day), dayEvents)}
              className={`
                flex h-[56px] flex-col items-center justify-start rounded-sm p-xs
                transition-colors hover:bg-surface-background
                ${isToday ? 'bg-primary-light' : ''}
              `}
            >
              <span
                className={`text-body-md ${isToday ? 'font-semibold text-primary-main' : 'text-text-primary'}`}
              >
                {day}
              </span>
              {dayEvents.length > 0 && (
                <div className="mt-[2px] flex gap-[3px]">
                  {dayEvents.slice(0, 3).map((ev, j) => (
                    <span
                      key={j}
                      className={`h-[5px] w-[5px] rounded-full ${statusDot[ev.status]}`}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
