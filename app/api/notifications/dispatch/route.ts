import {
  assertSchedulerConfigured,
  clearTimer,
  deleteDeviceById,
  deliveryExists,
  dispatchPushNotification,
  getAllDevices,
  isValidCronRequest,
  recordDelivery,
  type NotificationDeviceRow,
  type NotificationPayload,
} from "@/app/lib/notifications-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getLocalReminderParts(date: Date, timezone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

function isPermanentPushError(error: unknown): boolean {
  const statusCode = (error as { statusCode?: number })?.statusCode;
  return statusCode === 404 || statusCode === 410;
}

async function send(device: NotificationDeviceRow, payload: NotificationPayload, key: string, kind: string, scheduledFor: string): Promise<"sent" | "skipped" | "expired"> {
  if (await deliveryExists(key)) return "skipped";
  try {
    await dispatchPushNotification(device.subscription, payload);
    await recordDelivery({ key, deviceId: device.id, kind, scheduledFor });
    return "sent";
  } catch (error) {
    if (isPermanentPushError(error)) {
      await deleteDeviceById(device.id);
      return "expired";
    }
    throw error;
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isValidCronRequest(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    assertSchedulerConfigured();
    const now = new Date();
    const devices = await getAllDevices();
    const summary = { devices: devices.length, sent: 0, expired: 0, skipped: 0, failed: 0 };

    for (const device of devices) {
      let local: { date: string; time: string };
      try {
        local = getLocalReminderParts(now, device.timezone);
      } catch {
        local = getLocalReminderParts(now, "UTC");
      }
      if (device.reminder_enabled && local.time === device.reminder_time) {
        const key = `${device.id}:omega:${local.date}:${device.reminder_time}`;
        try {
          const result = await send(device, {
            title: "Tu Omega-3",
            body: "Un pequeño hábito para cuidar tu checkpoint.",
            url: "/?screen=today",
            tag: "levelup-omega",
          }, key, "omega", now.toISOString());
          summary[result] += 1;
        } catch {
          summary.failed += 1;
        }
      }

      if (device.reminder_enabled && device.timer_due_at && new Date(device.timer_due_at).getTime() <= now.getTime()) {
        const key = `${device.id}:movement:${device.timer_due_at}`;
        try {
          const result = await send(device, {
            title: "Hora de moverte",
            body: "Una pausa corta lejos del escritorio también cuenta.",
            url: "/?screen=move",
            tag: "levelup-movement",
          }, key, "movement", device.timer_due_at);
          summary[result] += 1;
          if (result === "sent") await clearTimer(device);
        } catch {
          summary.failed += 1;
        }
      }
    }

    return Response.json(summary);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No pudimos ejecutar el scheduler";
    return Response.json({ error: message }, { status: 500 });
  }
}
