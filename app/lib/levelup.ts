export type MealType = "Desayuno" | "Comida" | "Cena" | "Snack";

export type MealTag =
  | "Proteína"
  | "Verduras"
  | "Fruta"
  | "Grano integral"
  | "Legumbres"
  | "Pescado"
  | "Nueces y semillas"
  | "Bebida azucarada"
  | "Postre / azúcar añadida"
  | "Muy procesado"
  | "Carne procesada"
  | "Alcohol"
  | "Lácteos"
  | "Huevo"
  | "Frito"
  | "Grano refinado";

export type ExerciseType =
  | "Caminata"
  | "Gimnasio"
  | "Fuerza"
  | "Correr"
  | "Ciclismo"
  | "Otro";

export type QuestId =
  | "omega"
  | "movement"
  | "exercise"
  | "meals"
  | "vegetables"
  | "fruit"
  | "partnerWalk"
  | "water";

export type LabMetric =
  | "triglycerides"
  | "ldl"
  | "hdl"
  | "nonHdl"
  | "vldl"
  | "sdLdl"
  | "totalCholesterol";

export type LabValues = Record<LabMetric, number | null>;

export interface AppSettings {
  name: string;
  startDate: string;
  appointmentDate: string;
  labWindowDate: string;
  weeklyActivityGoal: number;
  strengthGoal: number;
  dailyMovementGoal: number;
  supplementName: string;
  supplementDose: string;
  reminderEnabled: boolean;
  reminderTime: string;
  solidDayThreshold: number;
  questXp: Record<QuestId, number>;
  bottleSizeMl: number;
  dailyWaterGoalMl: number;
}

export interface DailyQuest {
  id: QuestId;
  title: string;
  description: string;
  reward: number;
  target?: number;
  optional?: boolean;
}

export interface QuestCompletion {
  id: string;
  questId: QuestId;
  date: string;
  completedAt: string;
}

export interface Meal {
  id: string;
  date: string;
  type: MealType;
  description: string;
  tags: MealTag[];
  createdAt: string;
}

export interface ExerciseSession {
  id: string;
  date: string;
  activity: ExerciseType;
  duration: number;
  note: string;
  createdAt: string;
}

export interface MovementBreak {
  id: string;
  date: string;
  createdAt: string;
}

export interface WaterLog {
  id: string;
  date: string;
  createdAt: string;
}

export interface SupplementLog {
  id: string;
  date: string;
  dose: string;
  createdAt: string;
}

export interface WeeklyReflection {
  id: string;
  weekStart: string;
  note: string;
  createdAt: string;
}

export type AchievementId =
  | "firstStep"
  | "backInMotion"
  | "deskEscape"
  | "momentum"
  | "twoWeeksIn"
  | "walkTogether"
  | "club150"
  | "recovery"
  | "halfway";

export interface Achievement {
  id: AchievementId;
  unlockedAt: string;
}

export interface LabCheckpoint {
  id: string;
  label: string;
  date: string;
  values: LabValues;
}

export interface NutritionPlan {
  status: "pending" | "added";
  prioritize: string[];
  limit: string[];
  targets: string[];
  notes: string;
  updatedAt?: string;
}

export interface ImplementationIntention {
  id: string;
  ifText: string;
  thenText: string;
}

export interface AppState {
  version: 1;
  protectedXp: number;
  settings: AppSettings;
  meals: Meal[];
  exercises: ExerciseSession[];
  movementBreaks: MovementBreak[];
  waterLogs: WaterLog[];
  supplementLogs: SupplementLog[];
  questCompletions: QuestCompletion[];
  partnerWalks: string[];
  reflections: WeeklyReflection[];
  achievements: Achievement[];
  labs: LabCheckpoint[];
  nutritionPlan: NutritionPlan;
  intentions: ImplementationIntention[];
}

export const STORAGE_KEY = "levelup-local-state-v1";
export const TOTAL_DAYS = 92;

export const DEFAULT_LAB_VALUES: LabValues = {
  triglycerides: 182,
  ldl: 119,
  hdl: 42,
  nonHdl: 146,
  vldl: 36,
  sdLdl: 4.33,
  totalCholesterol: 188,
};

export const LAB_METRICS: Array<{ id: LabMetric; label: string; shortLabel: string; unit: string }> = [
  { id: "triglycerides", label: "Triglicéridos", shortLabel: "TG", unit: "mg/dL" },
  { id: "ldl", label: "LDL directo", shortLabel: "LDL", unit: "mg/dL" },
  { id: "hdl", label: "HDL", shortLabel: "HDL", unit: "mg/dL" },
  { id: "nonHdl", label: "Colesterol no-HDL", shortLabel: "No-HDL", unit: "mg/dL" },
  { id: "vldl", label: "VLDL", shortLabel: "VLDL", unit: "mg/dL" },
  { id: "sdLdl", label: "sd-LDL", shortLabel: "sd-LDL", unit: "" },
  { id: "totalCholesterol", label: "Colesterol total", shortLabel: "Total", unit: "mg/dL" },
];

export const FOOD_GUIDE = {
  prioritize: [
    "Verduras",
    "Frutas enteras",
    "Frijoles, lentejas y otras legumbres",
    "Avena y granos integrales",
    "Pescado",
    "Proteínas magras",
    "Nueces y semillas",
    "Aguacate",
    "Aceite de oliva",
    "Alimentos mínimamente procesados",
  ],
  limit: [
    "Bebidas azucaradas",
    "Alimentos altos en azúcar añadida",
    "Postres en exceso",
    "Carbohidratos muy refinados",
    "Alimentos muy procesados",
    "Carnes procesadas",
    "Alimentos altos en grasa saturada",
    "Alcohol en exceso",
  ],
};

export const MEAL_TAGS: MealTag[] = [
  "Proteína",
  "Verduras",
  "Fruta",
  "Grano integral",
  "Legumbres",
  "Pescado",
  "Nueces y semillas",
  "Bebida azucarada",
  "Postre / azúcar añadida",
  "Muy procesado",
  "Carne procesada",
  "Alcohol",
  "Lácteos",
  "Huevo",
  "Frito",
  "Grano refinado",
];

export const ACHIEVEMENT_META: Record<AchievementId, { title: string; description: string; icon: string }> = {
  firstStep: { title: "Primer paso", description: "Registraste tu primera actividad.", icon: "footprints" },
  backInMotion: { title: "De vuelta en movimiento", description: "Completaste tu primera sesión de gimnasio.", icon: "dumbbell" },
  deskEscape: { title: "Escape del escritorio", description: "Completaste tus pausas del día.", icon: "sun" },
  momentum: { title: "Buen ritmo", description: "Tuviste 5 días sólidos en una semana.", icon: "sparkles" },
  twoWeeksIn: { title: "Dos semanas", description: "Llegaste al día 14.", icon: "calendar" },
  walkTogether: { title: "Caminata juntos", description: "Disfrutaste 5 caminatas con tu pareja.", icon: "users" },
  club150: { title: "Club 150", description: "Alcanzaste 150 minutos en una semana.", icon: "target" },
  recovery: { title: "Consistencia > perfección", description: "Volviste a tener un día sólido.", icon: "refresh" },
  halfway: { title: "A mitad del camino", description: "Llegaste a la mitad del reto.", icon: "flag" },
};

export const ACHIEVEMENT_ORDER: AchievementId[] = [
  "firstStep",
  "backInMotion",
  "deskEscape",
  "momentum",
  "twoWeeksIn",
  "walkTogether",
  "club150",
  "recovery",
  "halfway",
];

const DAY_MS = 24 * 60 * 60 * 1000;

export function toDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateInput(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function addDays(value: string, amount: number): string {
  const date = parseDateInput(value);
  date.setDate(date.getDate() + amount);
  return toDateInput(date);
}

export function daysBetween(from: string, to: string): number {
  const start = parseDateInput(from).getTime();
  const end = parseDateInput(to).getTime();
  return Math.round((end - start) / DAY_MS);
}

export function getToday(): string {
  return toDateInput(new Date());
}

export function getJourneyStatus(today: string, settings: AppSettings): "upcoming" | "active" | "completed" {
  if (today < settings.startDate) return "upcoming";
  if (today >= settings.appointmentDate) return "completed";
  return "active";
}

export function getJourneyDay(today: string, settings: AppSettings): number {
  return Math.max(1, Math.min(TOTAL_DAYS, daysBetween(settings.startDate, today) + 1));
}

export function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short" }).format(parseDateInput(value)).replace(".", "");
}

export function formatLongDate(value: string): string {
  return new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric" }).format(parseDateInput(value));
}

export function formatWeekday(value: string): string {
  return new Intl.DateTimeFormat("es-MX", { weekday: "long" }).format(parseDateInput(value));
}

export function getWeekStart(value: string): string {
  const date = parseDateInput(value);
  const day = date.getDay();
  const difference = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + difference);
  return toDateInput(date);
}

export function getDateRange(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, index) => addDays(start, index));
}

export function getRecentDays(today: string, count = 7): string[] {
  return getDateRange(addDays(today, -(count - 1)), count);
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isMainMeal(type: MealType): boolean {
  return type !== "Snack";
}

export function getDayData(state: AppState, date: string) {
  const meals = state.meals.filter((meal) => meal.date === date);
  const exercises = state.exercises.filter((exercise) => exercise.date === date);
  const movementBreaks = state.movementBreaks.filter((movement) => movement.date === date);
  const waterLogs = state.waterLogs.filter((water) => water.date === date);
  const waterMl = waterLogs.length * state.settings.bottleSizeMl;
  const supplementTaken = state.supplementLogs.some((log) => log.date === date);
  const mainMeals = meals.filter((meal) => isMainMeal(meal.type));
  const vegetableMeals = meals.filter((meal) => meal.tags.includes("Verduras"));
  const fruitMeals = meals.filter((meal) => meal.tags.includes("Fruta"));
  const partnerWalk = state.partnerWalks.includes(date);
  return { meals, exercises, movementBreaks, waterLogs, waterMl, supplementTaken, mainMeals, vegetableMeals, fruitMeals, partnerWalk };
}

export function getDayScore(state: AppState, date: string): number {
  const data = getDayData(state, date);
  let complete = 0;
  if (data.supplementTaken) complete += 1;
  if (data.movementBreaks.length >= state.settings.dailyMovementGoal) complete += 1;
  if (data.mainMeals.length >= 2) complete += 1;
  if (data.vegetableMeals.length >= 2) complete += 1;
  return complete / 4;
}

export function isSolidDay(state: AppState, date: string): boolean {
  return getDayScore(state, date) >= state.settings.solidDayThreshold;
}

export function getDailyXp(state: AppState, date: string): number {
  const data = getDayData(state, date);
  const xp = state.settings.questXp;
  let total = 0;
  if (data.supplementTaken) total += xp.omega;
  total += Math.min(data.movementBreaks.length * 3, xp.movement);
  total += Math.min(data.waterLogs.length * 3, xp.water);
  if (data.exercises.length > 0) total += xp.exercise;
  total += Math.min(data.mainMeals.length * 5, xp.meals);
  if (data.vegetableMeals.length >= 2) total += xp.vegetables;
  if (data.fruitMeals.length > 0) total += xp.fruit;
  if (data.partnerWalk) total += xp.partnerWalk;
  return total;
}

export function getTotalXp(state: AppState): number {
  const dates = new Set([
    ...state.meals.map((item) => item.date),
    ...state.exercises.map((item) => item.date),
    ...state.movementBreaks.map((item) => item.date),
    ...state.waterLogs.map((item) => item.date),
    ...state.supplementLogs.map((item) => item.date),
    ...state.partnerWalks,
  ]);
  const dailyXp = Array.from(dates).reduce((total, date) => total + getDailyXp(state, date), 0);
  const exerciseWeeks = new Set(state.exercises.map((exercise) => getWeekStart(exercise.date)));
  const weeklyBonuses = Array.from(exerciseWeeks).reduce((total, weekStart) => {
    const weekDates = getDateRange(weekStart, 7);
    const minutes = state.exercises.filter((exercise) => weekDates.includes(exercise.date)).reduce((sum, exercise) => sum + exercise.duration, 0);
    return total + (minutes >= state.settings.weeklyActivityGoal ? 50 : 0);
  }, 0);
  return Math.max(state.protectedXp ?? 0, dailyXp + weeklyBonuses);
}

export function getLevel(totalXp: number): { level: number; title: string; current: number; next: number } {
  const levels = [
    { level: 1, title: "Empezando", threshold: 0 },
    { level: 2, title: "Construyendo", threshold: 120 },
    { level: 3, title: "En movimiento", threshold: 300 },
    { level: 4, title: "Constante", threshold: 550 },
    { level: 5, title: "Impulso", threshold: 850 },
    { level: 6, title: "Fuerte", threshold: 1200 },
    { level: 7, title: "A tu ritmo", threshold: 1600 },
  ];
  let currentLevel = levels[0];
  for (const level of levels) {
    if (totalXp >= level.threshold) currentLevel = level;
  }
  const nextLevel = levels.find((level) => level.threshold > totalXp);
  const next = nextLevel?.threshold ?? currentLevel.threshold + 500;
  return { level: currentLevel.level, title: currentLevel.title, current: totalXp - currentLevel.threshold, next: next - currentLevel.threshold };
}

export function getWeeklyStats(state: AppState, today: string) {
  const weekStart = getWeekStart(today);
  const dates = getDateRange(weekStart, 7);
  const activityMinutes = dates.reduce((sum, date) => sum + state.exercises.filter((item) => item.date === date).reduce((daySum, item) => daySum + item.duration, 0), 0);
  const strengthSessions = dates.reduce((sum, date) => sum + state.exercises.filter((item) => item.date === date && (item.activity === "Fuerza" || item.activity === "Gimnasio")).length, 0);
  const movementBreaks = dates.reduce((sum, date) => sum + state.movementBreaks.filter((item) => item.date === date).length, 0);
  const omegaDays = dates.filter((date) => state.supplementLogs.some((item) => item.date === date)).length;
  const mealsLogged = dates.reduce((sum, date) => sum + state.meals.filter((item) => item.date === date && isMainMeal(item.type)).length, 0);
  const solidDays = dates.filter((date) => date <= today && isSolidDay(state, date)).length;
  const weeklyGoalReached = activityMinutes >= state.settings.weeklyActivityGoal;
  const bonusXp = weeklyGoalReached ? 50 : 0;
  const weekXp = dates.reduce((sum, date) => sum + getDailyXp(state, date), 0) + bonusXp;
  return { weekStart, dates, activityMinutes, strengthSessions, movementBreaks, omegaDays, mealsLogged, solidDays, weeklyGoalReached, bonusXp, weekXp };
}

export function getMomentum(state: AppState, today: string) {
  const days = getRecentDays(today, 7);
  const solidDays = days.filter((date) => isSolidDay(state, date));
  const count = solidDays.length;
  const label = count >= 5 ? "Fuerte" : count >= 3 ? "Buen ritmo" : count >= 1 ? "Tomando forma" : "Listo para empezar";
  return { days, solidDays, count, label };
}

export function isExerciseDay(today: string, settings: AppSettings): boolean {
  if (today < settings.startDate || today >= settings.appointmentDate) return false;
  const journeyDay = getJourneyDay(today, settings);
  return [1, 3, 5].includes((journeyDay - 1) % 7);
}

export function getMilestones(settings: AppSettings) {
  const candidates = [
    { label: "Inicio", date: settings.startDate, icon: "sparkles" },
    { label: "2 semanas", date: addDays(settings.startDate, 13), icon: "calendar" },
    { label: "1 mes", date: addDays(settings.startDate, 29), icon: "leaf" },
    { label: "Mitad", date: addDays(settings.startDate, 45), icon: "flag" },
    { label: "1 mes restante", date: addDays(settings.startDate, 61), icon: "target" },
    { label: "Ventana de laboratorios", date: settings.labWindowDate, icon: "flask" },
    { label: "Cita médica", date: settings.appointmentDate, icon: "heart" },
  ];
  const seen = new Set<string>();
  return candidates.filter((item) => {
    if (seen.has(item.date)) return false;
    seen.add(item.date);
    return true;
  });
}

export function getWeeklyInsight(state: AppState, today: string): string {
  const stats = getWeeklyStats(state, today);
  const previousWeekEnd = addDays(stats.weekStart, -1);
  const previous = getWeeklyStats(state, previousWeekEnd);
  if (stats.movementBreaks > previous.movementBreaks && stats.movementBreaks > 0) return "Tus pausas de movimiento mejoraron esta semana.";
  if (stats.omegaDays >= 5) return "Tu mejor hábito esta semana fue tomar tu omega-3.";
  if (stats.activityMinutes >= state.settings.weeklyActivityGoal) return "Ya llegaste a tu meta de movimiento semanal.";
  if (stats.mealsLogged > 0) return "Registrar lo que comes te está ayudando a ver tus patrones.";
  return "Una pausa corta también cuenta. Empieza con la acción más fácil de hoy.";
}

export function getUnlockedAchievementIds(state: AppState, today: string): AchievementId[] {
  const stats = getWeeklyStats(state, today);
  const momentum = getMomentum(state, today);
  const activityExists = state.exercises.length > 0;
  const hasGym = state.exercises.some((item) => item.activity === "Gimnasio");
  const movementDates = new Set(state.movementBreaks.map((item) => item.date));
  const anyDeskGoal = Array.from(movementDates).some((date) => state.movementBreaks.filter((item) => item.date === date).length >= state.settings.dailyMovementGoal);
  const weekHas150 = stats.activityMinutes >= state.settings.weeklyActivityGoal;
  const journeyDay = getJourneyDay(today, state.settings);
  const unlocked: AchievementId[] = [];
  if (activityExists) unlocked.push("firstStep");
  if (hasGym) unlocked.push("backInMotion");
  if (anyDeskGoal) unlocked.push("deskEscape");
  if (momentum.count >= 5) unlocked.push("momentum");
  if (journeyDay >= 14) unlocked.push("twoWeeksIn");
  if (state.partnerWalks.length >= 5) unlocked.push("walkTogether");
  if (weekHas150) unlocked.push("club150");
  const recent = getRecentDays(today, 7).filter((date) => date >= state.settings.startDate && date <= today);
  const recovered = recent.some((date, index) => index > 0 && !isSolidDay(state, recent[index - 1]) && isSolidDay(state, date));
  if (recovered) unlocked.push("recovery");
  if (journeyDay >= 46) unlocked.push("halfway");
  return unlocked;
}

export function syncAchievements(state: AppState, today: string): AppState {
  const existing = new Map(state.achievements.map((achievement) => [achievement.id, achievement]));
  for (const id of getUnlockedAchievementIds(state, today)) {
    if (!existing.has(id)) existing.set(id, { id, unlockedAt: today });
  }
  const synced = { ...state, achievements: Array.from(existing.values()) };
  return { ...synced, protectedXp: getTotalXp(synced) };
}

export function createSeedState(): AppState {
  return {
    version: 1,
    protectedXp: 0,
    settings: {
      name: "Hugo",
      startDate: "2026-08-10",
      appointmentDate: "2026-11-10",
      labWindowDate: "2026-11-06",
      weeklyActivityGoal: 150,
      strengthGoal: 2,
      dailyMovementGoal: 5,
      supplementName: "Omega-3",
      supplementDose: "2 cápsulas cada mañana",
      reminderEnabled: false,
      reminderTime: "09:00",
      solidDayThreshold: 0.65,
      questXp: { omega: 10, movement: 18, exercise: 25, meals: 15, vegetables: 10, fruit: 5, partnerWalk: 10, water: 12 },
      bottleSizeMl: 600,
      dailyWaterGoalMl: 2000,
    },
    meals: [],
    exercises: [],
    movementBreaks: [],
    waterLogs: [],
    supplementLogs: [],
    questCompletions: [],
    partnerWalks: [],
    reflections: [],
    achievements: [],
    labs: [{ id: "baseline", label: "Baseline", date: "2026-08-10", values: DEFAULT_LAB_VALUES }],
    nutritionPlan: { status: "pending", prioritize: [], limit: [], targets: [], notes: "" },
    intentions: [
      { id: "lunch-walk", ifText: "Termino de comer", thenText: "caminaré 5–10 minutos." },
      { id: "desk-break", ifText: "Llevo mucho tiempo en el escritorio", thenText: "me pondré de pie y me moveré." },
      { id: "dinner-walk", ifText: "Terminamos de cenar y tenemos tiempo", thenText: "le preguntaré a mi pareja si damos una caminata corta." },
      { id: "morning-omega", ifText: "Es por la mañana", thenText: "tomaré mi omega-3." },
    ],
  };
}

export function loadState(): AppState {
  if (typeof window === "undefined") return createSeedState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createSeedState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const seed = createSeedState();
    return {
      ...seed,
      ...parsed,
      settings: { ...seed.settings, ...(parsed.settings ?? {}), questXp: { ...seed.settings.questXp, ...(parsed.settings?.questXp ?? {}) } },
      labs: parsed.labs?.length ? parsed.labs : seed.labs,
      intentions: parsed.intentions?.length ? parsed.intentions : seed.intentions,
      nutritionPlan: { ...seed.nutritionPlan, ...(parsed.nutritionPlan ?? {}) },
    } as AppState;
  } catch {
    return createSeedState();
  }
}

export function saveState(state: AppState): void {
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getComparison(baseline: number | null, followUp: number | null): { absolute: number | null; percent: number | null } {
  if (baseline === null || followUp === null) return { absolute: null, percent: null };
  return { absolute: followUp - baseline, percent: baseline === 0 ? null : ((followUp - baseline) / baseline) * 100 };
}
