/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  }),
);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'gstatic-fonts-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  }),
);

registerRoute(
  ({ url }) => /\/api\/(auth\/me|families|modules\/config)/i.test(url.pathname),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 60 * 5 })],
  }),
);

registerRoute(new NavigationRoute(new NetworkFirst({ cacheName: 'navigations' })));

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

interface PushData {
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  icon?: string;
}

self.addEventListener('push', (event) => {
  let data: PushData = {};
  if (event.data) {
    try {
      data = event.data.json() as PushData;
    } catch {
      data = { title: 'Raised', body: event.data.text() };
    }
  }

  const title = data.title || 'Raised';
  const options: NotificationOptions = {
    body: data.body || '',
    icon: data.icon || '/logo.png',
    badge: '/favicon.ico',
    tag: data.tag || 'raised-push',
    data: { url: data.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data as { url?: string } | undefined)?.url || '/';

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      for (const client of clientsList) {
        if ('focus' in client) {
          try {
            await client.focus();
            if ('navigate' in client && targetUrl !== '/') {
              await (client as WindowClient).navigate(targetUrl);
            }
            return;
          } catch {
            // fall through and try opening a new window
          }
        }
      }

      await self.clients.openWindow(targetUrl);
    })(),
  );
});
