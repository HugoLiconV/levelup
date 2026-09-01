import { generateMealPrepDraft, MealPrepGenerationError } from '@/app/lib/meal-prep-server';
import type { MealPrepWeek } from '@/app/lib/meal-prep';
import type { MealPrepPreferences } from '@/app/lib/levelup';
import { createClient } from '@/app/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function isAuthenticated(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    return !error && Boolean(data.user);
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'El cuerpo debe ser JSON válido' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return Response.json({ error: 'Solicitud inválida' }, { status: 400 });
  const input = body as { week?: MealPrepWeek; selectedOccurrenceIds?: string[]; preferences?: MealPrepPreferences };
  if (!input.week || !Array.isArray(input.week.occurrences) || input.week.occurrences.length > 80 || !Array.isArray(input.selectedOccurrenceIds) || input.selectedOccurrenceIds.length === 0 || !input.preferences || !Array.isArray(input.preferences.sessions) || input.preferences.sessions.length < 1 || input.preferences.sessions.length > 2) {
    return Response.json({ error: 'Selecciona al menos un Slot y una o dos sesiones' }, { status: 400 });
  }
  if (!(await isAuthenticated())) return Response.json({ error: 'Debes iniciar sesión para generar la preparación' }, { status: 401 });
  try {
    return Response.json(await generateMealPrepDraft(input.week, input.selectedOccurrenceIds, input.preferences));
  } catch (error) {
    const message = error instanceof MealPrepGenerationError ? error.message : 'No pudimos generar la preparación';
    return Response.json({ error: message }, { status: 502 });
  }
}
