import {
  NutritionPlanCompletenessError,
  NutritionPlanConfigurationError,
  parseNutritionPlan,
} from "@/app/lib/nutrition-plan-server";
import { createClient } from "@/app/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

class NutritionPlanValidationError extends Error {}

class MalformedRequestJsonError extends Error {}

const UNAUTHENTICATED_MESSAGE = "Debes iniciar sesión para generar un plan";
const UPSTREAM_RATE_LIMIT_MESSAGE = "El servicio de sugerencias está temporalmente limitado; inténtalo más tarde";
const UPSTREAM_FAILURE_MESSAGE = "El servicio de sugerencias no está disponible; inténtalo de nuevo";
const MALFORMED_PROVIDER_RESPONSE_MESSAGE = "No pudimos interpretar la respuesta del servicio";

function getStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;

  const status = (error as { status?: unknown }).status;
  if (typeof status === "number" && Number.isInteger(status) && status >= 400 && status <= 599) {
    return status;
  }

  const message = error instanceof Error ? error.message : "";
  const match = /^OpenAI request failed \((\d{3})\):/.exec(message);
  return match ? Number(match[1]) : null;
}

function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const name = (error as { name?: unknown }).name;
  const code = (error as { code?: unknown }).code;
  const message = error instanceof Error ? error.message : "";
  return name === "TimeoutError"
    || name === "AbortError"
    || code === "UND_ERR_CONNECT_TIMEOUT"
    || /(?:timed?\s*out|timeout)/i.test(message);
}

function errorResponse(error: unknown): Response {
  if (error instanceof NutritionPlanValidationError) {
    return Response.json({ error: error.message }, { status: 400 });
  }

  if (error instanceof MalformedRequestJsonError) {
    return Response.json({ error: "El cuerpo de la solicitud debe ser JSON válido" }, { status: 400 });
  }

  if (error instanceof NutritionPlanConfigurationError) {
    return Response.json({ error: error.message }, { status: 503 });
  }

  if (error instanceof NutritionPlanCompletenessError) {
    return Response.json({
      error: `${error.message}. Intenta analizarlo de nuevo`,
    }, { status: 502 });
  }

  const upstreamStatus = getStatus(error);
  if (upstreamStatus === 429) {
    return Response.json({ error: UPSTREAM_RATE_LIMIT_MESSAGE }, { status: 429 });
  }
  if (upstreamStatus !== null && upstreamStatus >= 500 && upstreamStatus <= 599) {
    return Response.json({ error: UPSTREAM_FAILURE_MESSAGE }, { status: upstreamStatus });
  }

  if (isTimeoutError(error)) {
    return Response.json({ error: "El servicio de sugerencias tardó demasiado; inténtalo de nuevo" }, { status: 504 });
  }

  return Response.json({ error: MALFORMED_PROVIDER_RESPONSE_MESSAGE }, { status: 502 });
}

async function requireAuthenticatedSession(): Promise<Response | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      const status = getStatus(error);
      if (status !== null && (status === 429 || status >= 500)) {
        return Response.json({ error: "No pudimos verificar la sesión" }, { status: 503 });
      }
      return Response.json({ error: UNAUTHENTICATED_MESSAGE }, { status: 401 });
    }

    if (!data.user) {
      return Response.json({ error: UNAUTHENTICATED_MESSAGE }, { status: 401 });
    }

    return null;
  } catch {
    return Response.json({ error: "No pudimos verificar la sesión" }, { status: 503 });
  }
}

// The returned draft is intentionally reviewed in the browser before it can be
// written to the user's local AppState.
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(new MalformedRequestJsonError());
  }

  const rawText = body && typeof body === "object" && !Array.isArray(body)
    ? (body as { text?: unknown }).text
    : undefined;
  if (typeof rawText !== "string" || rawText.trim().length < 20) {
    return errorResponse(new NutritionPlanValidationError("Pega un menú de al menos 20 caracteres"));
  }
  if (rawText.trim().length > 20000) {
    return errorResponse(new NutritionPlanValidationError("El menú es demasiado largo; divídelo en una sola versión de hasta 20,000 caracteres"));
  }

  const authenticationError = await requireAuthenticatedSession();
  if (authenticationError) return authenticationError;

  try {
    const draft = await parseNutritionPlan(rawText.trim());
    return Response.json({ draft });
  } catch (error) {
    return errorResponse(error);
  }
}
