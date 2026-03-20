'use client';

import { useState, useEffect, useRef } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

interface ConnectionStatusProps {
  topOffset?: string;
}

export default function ConnectionStatus({ topOffset = '56px' }: ConnectionStatusProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadRef = useRef(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    if (!navigator.onLine) {
      setShowBanner(true);
      setWasOffline(true);
    }

    setTimeout(() => {
      initialLoadRef.current = false;
    }, 1000);

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
      setWasOffline(true);

      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    };

    const handleOnline = () => {
      setIsOnline(true);

      if (!initialLoadRef.current && wasOffline) {
        setShowBanner(true);

        hideTimeoutRef.current = setTimeout(() => {
          setShowBanner(false);
          setWasOffline(false);
        }, 3000);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [wasOffline]);

  if (!showBanner) return null;

  return (
    <div
      style={{ top: topOffset }}
      className={`fixed left-0 right-0 z-40 flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium text-white animate-slideDown ${
        isOnline ? 'bg-success' : 'bg-error'
      }`}
      role="alert"
      aria-live="assertive"
    >
      {isOnline ? (
        <>
          <Wifi size={16} />
          <span>Back online</span>
        </>
      ) : (
        <>
          <WifiOff size={16} />
          <span>You are offline — some features may not work</span>
        </>
      )}
    </div>
  );
}
