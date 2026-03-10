'use client';
/* eslint-disable no-console */

import { useEffect, useRef } from 'react';
import { useAppSelector } from '@/store/hooks';

type NotificationHandler = (_notification: Record<string, unknown>) => void;

export function useNotificationStream(onNotification: NotificationHandler) {
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const handlerRef = useRef(onNotification);
  handlerRef.current = onNotification;

  useEffect(() => {
    if (!accessToken) return;

    let eventSource: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout>;
    let isCancelled = false;

    const connect = () => {
      if (isCancelled) return;

      eventSource = new EventSource(
        `/api/notifications/stream?token=${encodeURIComponent(accessToken)}`
      );

      eventSource.onopen = () => {
        console.log('[SSE] Connected to notification stream');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handlerRef.current(data);
        } catch {
          // Heartbeat or invalid data — ignore
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        if (!isCancelled) {
          retryTimeout = setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      isCancelled = true;
      eventSource?.close();
      clearTimeout(retryTimeout);
    };
  }, [accessToken]);
}
