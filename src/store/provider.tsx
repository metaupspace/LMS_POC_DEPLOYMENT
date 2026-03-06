'use client';

import { useRef, useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './store';
import { hydrateAuth } from './slices/authSlice';
import { I18nProvider } from '@/i18n';

export default function ReduxProvider({ children }: { children: React.ReactNode }) {
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) {
      store.dispatch(hydrateAuth());
      hydrated.current = true;
    }

    // Register service worker
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          void registration.scope; // registered successfully

          // Check for updates periodically (every 60 minutes)
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
        })
        .catch(() => {
          // SW registration failed — non-critical
        });
    }
  }, []);

  return (
    <Provider store={store}>
      <I18nProvider>{children}</I18nProvider>
    </Provider>
  );
}
