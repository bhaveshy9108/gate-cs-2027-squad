import {
  formatStudyDuration,
  type StudyTimerState,
} from "./trackerStore";

const SERVICE_WORKER_PATH = `${import.meta.env.BASE_URL}study-timer-sw.js`;
const TIMER_NOTIFICATION_TAG = "gate-study-timer";

function supportsTimerNotifications() {
  return "Notification" in window && "serviceWorker" in navigator;
}

export async function registerStudyTimerServiceWorker() {
  if (!supportsTimerNotifications()) return null;
  try {
    return await navigator.serviceWorker.register(SERVICE_WORKER_PATH);
  } catch (error) {
    console.warn("Study timer notification service worker failed to register", error);
    return null;
  }
}

export async function requestStudyTimerNotificationPermission() {
  if (!supportsTimerNotifications()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  return Notification.requestPermission();
}

export async function clearStudyTimerNotification() {
  if (!supportsTimerNotifications() || Notification.permission !== "granted") return;
  const registration = await navigator.serviceWorker.ready;
  const notifications = await registration.getNotifications({ tag: TIMER_NOTIFICATION_TAG });
  notifications.forEach((notification) => notification.close());
}

export async function syncStudyTimerNotification(timer: StudyTimerState) {
  if (!supportsTimerNotifications() || Notification.permission !== "granted") return;

  if (timer.status === "idle") {
    await clearStudyTimerNotification();
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const subject = timer.subjectName || "Study session";
  const isRunning = timer.status === "running";
  const elapsedMs =
    timer.status === "running" && timer.lastStartedAt
      ? timer.effectiveMs + Math.max(0, Date.now() - new Date(timer.lastStartedAt).getTime())
      : timer.effectiveMs;
  const elapsed = formatStudyDuration(elapsedMs);
  const actions = isRunning
    ? [
        { action: "pause", title: "Pause" },
        { action: "stop", title: "Stop" },
      ]
    : [
        { action: "resume", title: "Resume" },
        { action: "stop", title: "Stop" },
      ];

  await registration.showNotification(`Study timer ${isRunning ? "running" : "paused"}`, {
    tag: TIMER_NOTIFICATION_TAG,
    renotify: false,
    requireInteraction: true,
    silent: true,
    badge: `${import.meta.env.BASE_URL}favicon.ico`,
    icon: `${import.meta.env.BASE_URL}favicon.ico`,
    body: `${subject} • ${elapsed} active`,
    data: {
      type: "study-timer",
      url: new URL(import.meta.env.BASE_URL, window.location.href).href,
    },
    actions,
  });
}
