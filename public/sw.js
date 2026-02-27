// LMS Platform Service Worker
// Production-ready with caching strategies and offline fallback

const CACHE_NAME = 'lms-v1';
const OFFLINE_URL = '/offline.html';

// Assets to pre-cache during install
const PRECACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
];

// ─── INSTALL ────────────────────────────────────────────────────────────────
// Pre-cache the offline fallback page and basic shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // Activate immediately without waiting for existing clients to close
  self.skipWaiting();
});

// ─── ACTIVATE ───────────────────────────────────────────────────────────────
// Clean up old caches from previous versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control of all open clients immediately
  self.clients.claim();
});

// ─── FETCH ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) schemes
  if (!url.protocol.startsWith('http')) return;

  // Skip dev server requests (HMR, webpack, etc.)
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return;

  // ── API calls: Network-first, fall back to cache ──
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // ── Static assets: Cache-first, fall back to network ──
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // ── Navigation requests: Network-first, fall back to offline page ──
  if (request.mode === 'navigate') {
    event.respondWith(navigationStrategy(request));
    return;
  }

  // ── Everything else: Network-first ──
  event.respondWith(networkFirstStrategy(request));
});

// ─── STRATEGIES ─────────────────────────────────────────────────────────────

/**
 * Network-first strategy: Try network, fall back to cache.
 * Good for API calls and dynamic content.
 */
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    // Cache successful responses for future offline use
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    // If nothing in cache either, return a basic error response
    return new Response(JSON.stringify({ success: false, error: 'You are offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Cache-first strategy: Try cache, fall back to network.
 * Good for static assets that rarely change.
 */
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    return new Response('', { status: 408, statusText: 'Offline' });
  }
}

/**
 * Navigation strategy: Network-first for page loads, offline fallback page.
 */
async function navigationStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    // Cache the page for future offline access
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch {
    // Try to return the cached version of this page
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    // Last resort: show the offline fallback page
    const offlinePage = await caches.match(OFFLINE_URL);
    if (offlinePage) return offlinePage;
    // If even the offline page isn't cached, return inline HTML
    return new Response(
      '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title></head><body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#F5F6FA;color:#333"><div style="text-align:center;padding:2rem"><h1 style="color:#FF7A1A">You\'re Offline</h1><p>Please check your internet connection and try again.</p></div></body></html>',
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

/**
 * Determine if a URL points to a static asset that benefits from cache-first.
 */
function isStaticAsset(url) {
  const staticPaths = ['/_next/static/', '/icons/', '/fonts/', '/images/'];
  if (staticPaths.some((path) => url.pathname.startsWith(path))) return true;

  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf'];
  if (staticExtensions.some((ext) => url.pathname.endsWith(ext))) return true;

  return false;
}
