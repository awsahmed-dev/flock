/* global self, clients */

/**
 * Custom worker code merged into the next-pwa service worker.
 *
 * Handles two events:
 *   - `push`             — server-pushed notification; renders it via
 *                          self.registration.showNotification.
 *   - `notificationclick`— focus an existing tab on data.url if open,
 *                          otherwise spawn a new one.
 */

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Flock", body: event.data.text() };
  }

  const title = payload.title || "Flock";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: "/icons/icon-96x96.png",
    tag: payload.tag || undefined,
    data: { url: payload.url || "/dashboard" },
    // Renotify so a re-pushed tag still pings the user.
    renotify: !!payload.tag,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard";

  event.waitUntil(
    (async () => {
      const all = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Focus an existing tab if one is on the same origin
      for (const c of all) {
        try {
          const u = new URL(c.url);
          if (u.origin === self.location.origin) {
            await c.focus();
            await c.navigate(url);
            return;
          }
        } catch {
          /* ignore */
        }
      }
      // Otherwise open fresh
      await clients.openWindow(url);
    })(),
  );
});
