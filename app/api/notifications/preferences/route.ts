import {
  getDeviceByToken,
  readDeviceToken,
  updateDeviceByToken,
  validatePreferences,
} from "@/app/lib/notifications-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "No pudimos guardar las preferencias";
  const status = message.includes("todavía no están configuradas") ? 503 : 400;
  return Response.json({ error: message }, { status });
}

export async function PATCH(request: Request): Promise<Response> {
  try {
    const token = readDeviceToken(request);
    const preferences = validatePreferences(await request.json());
    if (!await getDeviceByToken(token)) return new Response(null, { status: 204 });
    await updateDeviceByToken(token, {
      reminder_enabled: preferences.reminderEnabled,
      reminder_time: preferences.reminderTime,
      timezone: preferences.timezone,
    });
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}

