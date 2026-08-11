import "@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-levelup-cron-secret",
  "Content-Type": "application/json",
};

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const expectedSecret = Deno.env.get("NOTIFICATION_CRON_SECRET");
  const providedSecret = request.headers.get("x-levelup-cron-secret");
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const appUrl = Deno.env.get("LEVELUP_APP_URL")?.replace(/\/$/, "");
  if (!appUrl) {
    return new Response(JSON.stringify({ error: "LEVELUP_APP_URL is not configured" }), { status: 500, headers: corsHeaders });
  }

  try {
    const response = await fetch(`${appUrl}/api/notifications/dispatch`, {
      method: "POST",
      headers: { "x-levelup-cron-secret": expectedSecret },
      body: JSON.stringify({ triggeredAt: new Date().toISOString() }),
    });
    const body = await response.text();
    return new Response(body, { status: response.status, headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unable to reach the LevelUp app",
    }), { status: 502, headers: corsHeaders });
  }
});
