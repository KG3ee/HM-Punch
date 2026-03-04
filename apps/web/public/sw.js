self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Notification', body: event.data.text() };
  }

  const title = data.title || 'Notification';
  const link = appendNotificationId(data.link || '/', data.id);
  const body = data.body || '';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon.png',
      badge: '/icon.png',
      data: {
        link,
      },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification?.data?.link || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        const url = new URL(client.url);
        const next = new URL(link, self.location.origin);

        if (url.pathname === next.pathname && url.search === next.search) {
          client.focus();
          return client;
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(link);
      }
      return undefined;
    }),
  );
});

function appendNotificationId(link, notificationId) {
  if (!notificationId) return link;
  try {
    const url = new URL(link, self.location.origin);
    url.searchParams.set('notificationId', notificationId);
    if (url.origin === self.location.origin) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
    return url.toString();
  } catch {
    return link;
  }
}
