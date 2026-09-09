self.addEventListener("notificationclick", (event) => {
  const action = event.action || "open";
  const targetUrl = event.notification.data?.url || self.registration.scope;
  event.notification.close();

  event.waitUntil((async () => {
    const windows = await clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });
    const existingWindow = windows.find((client) => client.url.startsWith(self.registration.scope));

    if (existingWindow) {
      existingWindow.postMessage({
        type: "STUDY_TIMER_NOTIFICATION_ACTION",
        action,
      });
      await existingWindow.focus();
      return;
    }

    const openedWindow = await clients.openWindow(targetUrl);
    openedWindow?.postMessage?.({
      type: "STUDY_TIMER_NOTIFICATION_ACTION",
      action,
    });
  })());
});
