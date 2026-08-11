import {
  deleteDeviceByToken,
  readDeviceToken,
  upsertDevice,
  validatePreferences,
  validateSubscription,
} from "@/app/lib/notifications-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "No pudimos configurar las notificaciones";
  const status = message.includes("todavía no están configuradas") || message.includes("Falta configurar") ? 503 : 400;
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const token = readDeviceToken(request);
    const body = await request.json() as { subscription?: unknown; preferences?: unknown };
    const subscription = validateSubscription(body.subscription);
    const preferences = validatePreferences(body.preferences);
    const device = await upsertDevice({ token, subscription, preferences });
    return Response.json({ deviceId: device.id }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const token = readDeviceToken(request);
    await deleteDeviceByToken(token);
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}

