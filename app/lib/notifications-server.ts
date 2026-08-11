import webpush from "web-push";

export type ServerNotificationPreferences = {
  reminderEnabled: boolean;
  reminderTime: string;
  timezone: string;
};

export type NotificationDeviceRow = {
  id: string;
  device_token_hash: string;
  endpoint: string;
  subscription: {
    endpoint: string;
    expirationTime?: number | null;
    keys: { auth: string; p256dh: string };
  };
  reminder_enabled: boolean;
  reminder_time: string;
  timezone: string;
  timer_due_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
};

export class NotificationConfigurationError extends Error {}

function getSupabaseConfig(): { url: string; serviceRoleKey: string } {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new NotificationConfigurationError(
      "Las notificaciones todavía no están configuradas en el servidor",
    );
  }
  return { url: url.replace(/\/$/, ""), serviceRoleKey };
}

function getVapidConfig(): { subject: string; publicKey: string; privateKey: string } {
  const subject = process.env.VAPID_SUBJECT ?? "mailto:notifications@levelup.app";
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    throw new NotificationConfigurationError(
      "Las claves VAPID todavía no están configuradas en el servidor",
    );
  }
  return { subject, publicKey, privateKey };
}

function getCronSecret(): string {
  const secret = process.env.NOTIFICATION_CRON_SECRET;
  if (!secret) throw new NotificationConfigurationError("Falta configurar el secreto del scheduler");
  return secret;
}

export function isValidCronRequest(request: Request): boolean {
  const secret = process.env.NOTIFICATION_CRON_SECRET;
  if (!secret) return false;
  const provided = request.headers.get("x-levelup-cron-secret")
    ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return provided === secret;
}

function encodeFilter(value: string): string {
  return encodeURIComponent(value);
}

async function supabaseRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { url, serviceRoleKey } = getSupabaseConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function hashDeviceToken(token: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function readDeviceToken(request: Request): string {
  const token = request.headers.get("x-levelup-device-token")?.trim();
  if (!token || !/^[a-f0-9]{64}$/i.test(token)) throw new Error("Falta un identificador de dispositivo válido");
  return token;
}

export function validatePreferences(value: unknown): ServerNotificationPreferences {
  if (!value || typeof value !== "object") throw new Error("Preferencias inválidas");
  const preferences = value as Partial<ServerNotificationPreferences>;
  if (typeof preferences.reminderEnabled !== "boolean") throw new Error("El estado de recordatorios es inválido");
  if (typeof preferences.reminderTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(preferences.reminderTime)) {
    throw new Error("La hora del recordatorio es inválida");
  }
  if (typeof preferences.timezone !== "string" || preferences.timezone.length < 1 || preferences.timezone.length > 100) {
    throw new Error("La zona horaria es inválida");
  }
  return {
    reminderEnabled: preferences.reminderEnabled,
    reminderTime: preferences.reminderTime,
    timezone: preferences.timezone,
  };
}

export function validateSubscription(value: unknown): NotificationDeviceRow["subscription"] {
  if (!value || typeof value !== "object") throw new Error("Suscripción inválida");
  const subscription = value as Partial<NotificationDeviceRow["subscription"]>;
  if (typeof subscription.endpoint !== "string" || !/^https:\/\//.test(subscription.endpoint)) {
    throw new Error("El endpoint de notificaciones es inválido");
  }
  if (!subscription.keys || typeof subscription.keys.auth !== "string" || typeof subscription.keys.p256dh !== "string") {
    throw new Error("Las claves de la suscripción son inválidas");
  }
  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime ?? null,
    keys: { auth: subscription.keys.auth, p256dh: subscription.keys.p256dh },
  };
}

export async function getDeviceByToken(token: string): Promise<NotificationDeviceRow | null> {
  const hash = await hashDeviceToken(token);
  const rows = await supabaseRequest<NotificationDeviceRow[]>(
    `notification_devices?device_token_hash=eq.${encodeFilter(hash)}&select=*`,
  );
  return rows[0] ?? null;
}

export async function upsertDevice(input: {
  token: string;
  subscription: NotificationDeviceRow["subscription"];
  preferences: ServerNotificationPreferences;
}): Promise<NotificationDeviceRow> {
  const deviceTokenHash = await hashDeviceToken(input.token);
  const rows = await supabaseRequest<NotificationDeviceRow[]>("notification_devices", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      device_token_hash: deviceTokenHash,
      endpoint: input.subscription.endpoint,
      subscription: input.subscription,
      reminder_enabled: input.preferences.reminderEnabled,
      reminder_time: input.preferences.reminderTime,
      timezone: input.preferences.timezone,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!rows[0]) throw new Error("No pudimos guardar la suscripción");
  return rows[0];
}

export async function updateDeviceByToken(
  token: string,
  patch: Partial<Pick<NotificationDeviceRow, "reminder_enabled" | "reminder_time" | "timezone" | "timer_due_at">>,
): Promise<NotificationDeviceRow | null> {
  const hash = await hashDeviceToken(token);
  const rows = await supabaseRequest<NotificationDeviceRow[]>(
    `notification_devices?device_token_hash=eq.${encodeFilter(hash)}&select=*`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    },
  );
  return rows[0] ?? null;
}

export async function deleteDeviceByToken(token: string): Promise<void> {
  const hash = await hashDeviceToken(token);
  await supabaseRequest<void>(`notification_devices?device_token_hash=eq.${encodeFilter(hash)}`, { method: "DELETE" });
}

export async function getAllDevices(): Promise<NotificationDeviceRow[]> {
  return supabaseRequest<NotificationDeviceRow[]>(
    "notification_devices?select=*&limit=1000",
  );
}

export async function clearTimer(device: NotificationDeviceRow): Promise<void> {
  if (!device.timer_due_at) return;
  await supabaseRequest<void>(
    `notification_devices?id=eq.${encodeFilter(device.id)}&timer_due_at=eq.${encodeFilter(device.timer_due_at)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ timer_due_at: null, updated_at: new Date().toISOString() }),
    },
  );
}

export async function deleteDeviceById(id: string): Promise<void> {
  await supabaseRequest<void>(`notification_devices?id=eq.${encodeFilter(id)}`, { method: "DELETE" });
}

export async function recordDelivery(delivery: {
  key: string;
  deviceId: string;
  kind: string;
  scheduledFor: string;
}): Promise<boolean> {
  const rows = await supabaseRequest<Array<{ delivery_key: string }>>("notification_deliveries", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify({
      delivery_key: delivery.key,
      device_id: delivery.deviceId,
      kind: delivery.kind,
      scheduled_for: delivery.scheduledFor,
    }),
  });
  return rows.length > 0;
}

export async function deliveryExists(deliveryKey: string): Promise<boolean> {
  const rows = await supabaseRequest<Array<{ delivery_key: string }>>(
    `notification_deliveries?delivery_key=eq.${encodeFilter(deliveryKey)}&select=delivery_key&limit=1`,
  );
  return rows.length > 0;
}

export async function dispatchPushNotification(
  subscription: NotificationDeviceRow["subscription"],
  payload: NotificationPayload,
): Promise<void> {
  const vapid = getVapidConfig();
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
  await webpush.sendNotification(subscription, JSON.stringify(payload), {
    TTL: 60 * 60,
    urgency: "normal",
  });
}

export function assertSchedulerConfigured(): void {
  getSupabaseConfig();
  getVapidConfig();
  getCronSecret();
}
