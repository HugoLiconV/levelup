import { MealTagsConfigurationError, suggestMealTags } from "@/app/lib/meal-tags-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : "No pudimos sugerir etiquetas";
  const status = error instanceof MealTagsConfigurationError ? 503 : 400;
  return Response.json({ error: message }, { status });
}

// Stateless proxy to OpenAI, no per-user data — intentionally unauthenticated like the
// rest of this local-first app. Revisit with rate-limiting if abuse becomes a concern.
export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json() as { description?: unknown };
    if (typeof body.description !== "string" || body.description.trim().length < 8) {
      throw new Error("La descripción es demasiado corta");
    }
    const tags = await suggestMealTags(body.description.trim().slice(0, 500));
    return Response.json({ tags });
  } catch (error) {
    return errorResponse(error);
  }
}
