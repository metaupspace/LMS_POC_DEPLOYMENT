'use client';

import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Respect 7-day dismissal
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const daysSince = (Date.now() - new Date(dismissed).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 7) return;
    }

    // Detect iOS Safari
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !('MSStream' in window);
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      const isSafari =
        /Safari/.test(navigator.userAgent) &&
        !/CriOS|FxiOS/.test(navigator.userAgent);
      if (isSafari) {
        setTimeout(() => setShowBanner(true), 3000);
      }
      return;
    }

    // Android/Desktop — listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowBanner(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
  };

  if (isInstalled || !showBanner) return null;

  // iOS — manual instructions
  if (isIOS) {
    return (
      <>
        <div className="fixed bottom-20 left-md right-md z-50 rounded-lg border border-border-light bg-surface-white p-md shadow-md animate-[slideUp_300ms_ease-out]">
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute right-sm top-sm p-xs text-text-secondary hover:text-text-primary"
          >
            <X className="h-[18px] w-[18px]" strokeWidth={1.5} />
          </button>
          <div className="flex items-center gap-md">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary-main">
              <Smartphone className="h-6 w-6 text-white" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <p className="text-body-md font-semibold text-text-primary">Install LMS App</p>
              <p className="text-caption text-text-secondary">
                Add to your home screen for the best experience
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowIOSGuide(true)}
            className="mt-md w-full rounded-md bg-primary-main py-sm text-button font-medium text-white transition-colors hover:bg-primary-hover"
          >
            Show Me How
          </button>
        </div>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-end bg-black/50 animate-[fadeIn_200ms_ease-out]">
            <div className="w-full max-h-[70vh] overflow-y-auto rounded-t-2xl bg-surface-white p-lg animate-[slideUp_300ms_ease-out]">
              <div className="mb-lg flex items-center justify-between">
                <h3 className="text-h3 font-semibold text-text-primary">
                  Install LMS on iPhone
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowIOSGuide(false);
                    handleDismiss();
                  }}
                  className="p-xs"
                >
                  <X className="h-5 w-5 text-text-secondary" strokeWidth={1.5} />
                </button>
              </div>

              <div className="space-y-lg">
                <div className="flex items-start gap-md">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-main text-caption font-bold text-white">
                    1
                  </span>
                  <div>
                    <p className="text-body-md font-medium text-text-primary">
                      Tap the Share button
                    </p>
                    <p className="text-caption text-text-secondary">
                      The square with an arrow at the bottom of Safari
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-md">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-main text-caption font-bold text-white">
                    2
                  </span>
                  <div>
                    <p className="text-body-md font-medium text-text-primary">
                      Scroll down and tap &ldquo;Add to Home Screen&rdquo;
                    </p>
                    <p className="text-caption text-text-secondary">
                      You may need to scroll in the share sheet
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-md">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-main text-caption font-bold text-white">
                    3
                  </span>
                  <div>
                    <p className="text-body-md font-medium text-text-primary">
                      Tap &ldquo;Add&rdquo;
                    </p>
                    <p className="text-caption text-text-secondary">
                      The LMS app icon will appear on your home screen
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowIOSGuide(false);
                  handleDismiss();
                }}
                className="mt-xl w-full rounded-md bg-primary-main py-sm text-button font-medium text-white"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Android/Desktop — native install prompt
  return (
    <div className="fixed bottom-20 left-md right-md z-50 rounded-lg border border-border-light bg-surface-white p-md shadow-md animate-[slideUp_300ms_ease-out]">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-sm top-sm p-xs text-text-secondary hover:text-text-primary"
      >
        <X className="h-[18px] w-[18px]" strokeWidth={1.5} />
      </button>
      <div className="flex items-center gap-md">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary-main">
          <Download className="h-6 w-6 text-white" strokeWidth={1.5} />
        </div>
        <div className="min-w-0">
          <p className="text-body-md font-semibold text-text-primary">Install LMS App</p>
          <p className="text-caption text-text-secondary">Fast access from your home screen</p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleInstall}
        className="mt-md w-full rounded-md bg-primary-main py-sm text-button font-medium text-white transition-colors hover:bg-primary-hover"
      >
        Install App
      </button>
    </div>
  );
}
