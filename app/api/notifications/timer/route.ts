import {
  getDeviceByToken,
  readDeviceToken,
  updateDeviceByToken,
} from "@/app/lib/notifications-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "No pudimos configurar el temporizador";
  const status = message.includes("todavía no están configuradas") ? 503 : 400;
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request): Promise<Response> {
  try {
    const device = await getDeviceByToken(readDeviceToken(request));
    return Response.json({ timerEndsAt: device?.timer_due_at ?? null });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const token = readDeviceToken(request);
    const device = await getDeviceByToken(token);
    if (!device) return Response.json({ error: "Activa primero los recordatorios" }, { status: 409 });
    if (!device.reminder_enabled) return Response.json({ error: "Activa los recordatorios para usar el temporizador" }, { status: 409 });

    const body = await request.json().catch(() => ({})) as { durationSeconds?: unknown };
    const durationSeconds = typeof body.durationSeconds === "number" ? body.durationSeconds : 45 * 60;
    if (!Number.isInteger(durationSeconds) || durationSeconds < 60 || durationSeconds > 2 * 60 * 60) {
      return Response.json({ error: "La duración del temporizador no es válida" }, { status: 400 });
    }

    const timerEndsAt = new Date(Date.now() + durationSeconds * 1000).toISOString();
    await updateDeviceByToken(token, { timer_due_at: timerEndsAt });
    return Response.json({ timerEndsAt }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const device = await getDeviceByToken(readDeviceToken(request));
    if (device) await updateDeviceByToken(readDeviceToken(request), { timer_due_at: null });
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}

