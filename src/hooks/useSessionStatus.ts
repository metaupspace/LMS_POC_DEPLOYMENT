import { useState, useEffect } from 'react';

export type SessionDisplayStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

/**
 * Compute display status based on current time vs session date+timeSlot+duration.
 * Single source of truth — imported everywhere instead of duplicated.
 */
export function getDisplayStatus(session: {
  date: string;
  timeSlot?: string;
  duration?: number;
  status?: string;
}): SessionDisplayStatus {
  if (session.status === 'cancelled') return 'cancelled';
  if (session.status === 'completed') return 'completed';

  const sessionDate = new Date(session.date);
  const parts = (session.timeSlot ?? '00:00').split(':').map(Number);
  const hours = parts[0];
  const minutes = parts[1];
  if (hours !== undefined && minutes !== undefined && !isNaN(hours) && !isNaN(minutes)) {
    sessionDate.setHours(hours, minutes, 0, 0);
  }

  const now = Date.now();
  const startTime = sessionDate.getTime();
  const endTime = startTime + (session.duration ?? 30) * 60 * 1000;

  if (now >= endTime) return 'completed';
  if (now >= startTime) return 'ongoing';
  return 'upcoming';
}

/** Triggers a re-render on a fixed interval (default 60s) for time-sensitive UI. */
export function useAutoRefreshTick(intervalMs = 60000) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);
  return tick;
}
