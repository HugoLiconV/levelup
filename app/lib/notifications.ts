export type NotificationPreferences = {
  reminderEnabled: boolean;
  reminderTime: string;
  timezone: string;
};

export type NotificationSubscription = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    auth: string;
    p256dh: string;
  };
};

export const NOTIFICATION_DEVICE_KEY = "levelup-notification-device-v1";
export const NOTIFICATION_TIMER_KEY = "levelup-notification-timer-v1";

function getDeviceToken(): string {
  if (typeof window === "undefined") throw new Error("Notifications require a browser");

  const existing = window.localStorage.getItem(NOTIFICATION_DEVICE_KEY);
  if (existing) return existing;

  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  window.localStorage.setItem(NOTIFICATION_DEVICE_KEY, token);
  return token;
}

export function clearNotificationDevice(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(NOTIFICATION_DEVICE_KEY);
}

export function getStoredTimerEndsAt(): number | null {
  if (typeof window === "undefined") return null;
  const value = Number(window.localStorage.getItem(NOTIFICATION_TIMER_KEY));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function storeTimerEndsAt(value: number | null): void {
  if (typeof window === "undefined") return;
  if (value === null) window.localStorage.removeItem(NOTIFICATION_TIMER_KEY);
  else window.localStorage.setItem(NOTIFICATION_TIMER_KEY, String(value));
}

export function getNotificationTimezone(): string {
  if (typeof Intl === "undefined") return "UTC";
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function isPushSupported(): boolean {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
    && "Notification" in window;
}

function vapidKeyToBytes(value: string): Uint8Array {
  const normalized = `${value}${"=".repeat((4 - (value.length % 4)) % 4)}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const decoded = window.atob(normalized);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

function subscriptionToJSON(subscription: PushSubscription): NotificationSubscription {
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.auth || !json.keys.p256dh) {
    throw new Error("La suscripción de notificaciones está incompleta");
  }
  return {
    endpoint: json.endpoint,
    expirationTime: json.expirationTime ?? null,
    keys: { auth: json.keys.auth, p256dh: json.keys.p256dh },
  };
}

async function notificationRequest(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-LevelUp-Device-Token": getDeviceToken(),
      ...(init.headers ?? {}),
    },
  });
}

async function assertSuccessful(response: Response): Promise<void> {
  if (response.ok) return;
  let message = "No pudimos configurar las notificaciones";
  try {
    const body = await response.json() as { error?: string };
    if (body.error) message = body.error;
  } catch {
    // Keep the generic message when the server did not return JSON.
  }
  throw new Error(message);
}

export async function enablePushNotifications(
  preferences: NotificationPreferences,
): Promise<NotificationPermission> {
  if (!isPushSupported()) throw new Error("Este navegador no permite notificaciones push");

  const permission = Notification.permission === "granted"
    ? "granted"
    : await Notification.requestPermission();
  if (permission !== "granted") return permission;

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) throw new Error("Falta configurar la clave pública de notificaciones");
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKeyToBytes(publicKey) as unknown as BufferSource,
    });
  }

  const response = await notificationRequest("/api/notifications/subscription", {
    method: "POST",
    body: JSON.stringify({ subscription: subscriptionToJSON(subscription), preferences }),
  });
  await assertSuccessful(response);
  return permission;
}

export async function updatePushPreferences(preferences: NotificationPreferences): Promise<void> {
  const response = await notificationRequest("/api/notifications/preferences", {
    method: "PATCH",
    body: JSON.stringify(preferences),
  });
  await assertSuccessful(response);
}

export async function unsubscribePushNotifications(): Promise<void> {
  let serverError: Error | null = null;
  try {
    const response = await notificationRequest("/api/notifications/subscription", { method: "DELETE" });
    await assertSuccessful(response);
  } catch (error) {
    serverError = error instanceof Error ? error : new Error("No pudimos cancelar las notificaciones");
  }

  if (isPushSupported()) {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    await subscription?.unsubscribe();
  }
  clearNotificationDevice();
  if (serverError) throw serverError;
}

export async function startRemoteMovementTimer(durationSeconds = 45 * 60): Promise<number> {
  const response = await notificationRequest("/api/notifications/timer", {
    method: "POST",
    body: JSON.stringify({ durationSeconds }),
  });
  await assertSuccessful(response);
  const body = await response.json() as { timerEndsAt: string };
  const endsAt = new Date(body.timerEndsAt).getTime();
  if (!Number.isFinite(endsAt)) throw new Error("El servidor devolvió un temporizador inválido");
  return endsAt;
}

export async function cancelRemoteMovementTimer(): Promise<void> {
  const response = await notificationRequest("/api/notifications/timer", { method: "DELETE" });
  await assertSuccessful(response);
}

export async function getRemoteMovementTimer(): Promise<number | null> {
  const response = await notificationRequest("/api/notifications/timer");
  await assertSuccessful(response);
  const body = await response.json() as { timerEndsAt: string | null };
  return body.timerEndsAt ? new Date(body.timerEndsAt).getTime() : null;
}
