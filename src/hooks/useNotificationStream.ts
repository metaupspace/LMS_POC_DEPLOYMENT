'use client';

import { useEffect, useRef } from 'react';
import { useAppSelector } from '@/store/hooks';

type NotificationHandler = (notification: Record<string, unknown>) => void;

export function useNotificationStream(onNotification: NotificationHandler) {
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const handlerRef = useRef(onNotification);
  handlerRef.current = onNotification;

  useEffect(() => {
    if (!accessToken) return;

    let eventSource: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      eventSource = new EventSource(
        `/api/notifications/stream?token=${encodeURIComponent(accessToken)}`
      );

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
        // Retry after 5 seconds
        retryTimeout = setTimeout(connect, 5000);
      };
    };

    connect();

    return () => {
      eventSource?.close();
      clearTimeout(retryTimeout);
    };
  }, [accessToken]);
}
