import { supabaseClient } from "../lib/supabase";
import { dayOrder, type DayKey } from "../data/routine";
import type { RoutineByDay } from "../types/app";

function requireClient() {
  if (!supabaseClient) throw new Error("Missing Supabase configuration.");
  return supabaseClient;
}

export async function getSessionUser() {
  const client = requireClient();
  const { data } = await client.auth.getSession();
  return data.session?.user || null;
}

export async function signInWithPassword(email: string, password: string) {
  return requireClient().auth.signInWithPassword({ email, password });
}

export async function signUpWithPassword(email: string, password: string) {
  return requireClient().auth.signUp({ email, password });
}

export async function signInWithGoogle(redirectTo: string) {
  return requireClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
}

export async function signOutSession() {
  return requireClient().auth.signOut();
}

export async function getProfileUsername(userId: string): Promise<string> {
  const client = requireClient();
  const { data } = await client.from("profiles").select("username").eq("id", userId).maybeSingle();
  return ((data?.username as string | undefined) || "").trim();
}

export async function saveProfileUsername(userId: string, username: string) {
  return requireClient().from("profiles").upsert({ id: userId, username }, { onConflict: "id" });
}

export async function saveCloudPayload(userId: string, payload: Record<string, string>) {
  return requireClient()
    .from("ppla_profiles")
    .upsert({ profile_id: userId, payload, updated_at: new Date().toISOString() }, { onConflict: "profile_id" });
}

export async function getCloudPayload(userId: string): Promise<Record<string, string> | null> {
  const { data } = await requireClient()
    .from("ppla_profiles")
    .select("payload")
    .eq("profile_id", userId)
    .maybeSingle();
  if (!data?.payload || typeof data.payload !== "object") return null;
  return data.payload as Record<string, string>;
}

export async function findUserIdByUsername(username: string): Promise<string | null> {
  const normalized = username.trim();
  if (!normalized) return null;
  const { data } = await requireClient()
    .from("profiles")
    .select("id")
    .ilike("username", normalized)
    .maybeSingle();
  return (data?.id as string | undefined) || null;
}

export async function sendFriendRequest(fromUser: string, toUser: string) {
  return requireClient().from("friend_requests").insert({ from_user: fromUser, to_user: toUser, status: "pending" });
}

export async function areUsersFriends(userId: string, otherUserId: string): Promise<boolean> {
  const { data } = await requireClient()
    .from("friendships")
    .select("user_id")
    .eq("user_id", userId)
    .eq("friend_id", otherUserId)
    .maybeSingle();
  return Boolean(data);
}

export async function hasPendingFriendRequest(userId: string, otherUserId: string): Promise<boolean> {
  const { data } = await requireClient()
    .from("friend_requests")
    .select("id")
    .or(
      `and(from_user.eq.${userId},to_user.eq.${otherUserId},status.eq.pending),and(from_user.eq.${otherUserId},to_user.eq.${userId},status.eq.pending)`
    )
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

export async function submitDailyCheckin(
  didTrain: boolean,
  dateIso: string,
  trainingMode: "gym" | "extra" | "missed" = didTrain ? "gym" : "missed",
  sportName: string | null = null
) {
  const normalizedMode: "gym" | "extra" | "missed" =
    !didTrain || trainingMode === "missed" ? "missed" : trainingMode;
  return requireClient().rpc("submit_activity", {
    p_date: dateIso,
    p_activity_type: normalizedMode,
    p_sport_name: normalizedMode === "missed" ? null : sportName
  });
}

type AssignmentRow = { template_id: string; planned_day_key: DayKey };

function normalizeDayKey(value: string | null | undefined): DayKey {
  if (!value) return "monday";
  return dayOrder.includes(value as DayKey) ? (value as DayKey) : "monday";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function getOrCreateDefaultTemplateId(): Promise<string> {
  const client = requireClient();
  const { data: existing } = await client
    .from("routine_templates")
    .select("id")
    .is("owner_id", null)
    .eq("name", "PPLA Default 7D")
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data: fallback } = await client
    .from("routine_templates")
    .select("id")
    .is("owner_id", null)
    .limit(1)
    .maybeSingle();
  if (fallback?.id) return fallback.id as string;
  throw new Error("No default routine template available.");
}

export async function ensureUserRoutineAssignment(userId: string): Promise<AssignmentRow> {
  const client = requireClient();
  const { data: current } = await client
    .from("user_routine_assignments")
    .select("template_id,planned_day_key")
    .eq("user_id", userId)
    .maybeSingle();

  if (current?.template_id) {
    return {
      template_id: current.template_id as string,
      planned_day_key: normalizeDayKey(current.planned_day_key as string | undefined)
    };
  }

  const templateId = await getOrCreateDefaultTemplateId();
  const planned: DayKey = "monday";
  await client.from("user_routine_assignments").upsert(
    {
      user_id: userId,
      template_id: templateId,
      planned_day_key: planned,
      active: true,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  return { template_id: templateId, planned_day_key: planned };
}

export async function updateUserPlannedDay(userId: string, plannedDay: DayKey): Promise<void> {
  const assignment = await ensureUserRoutineAssignment(userId);
  await requireClient().from("user_routine_assignments").upsert(
    {
      user_id: userId,
      template_id: assignment.template_id,
      planned_day_key: plannedDay,
      active: true,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );
}

export async function loadRoutineTemplateById(templateId: string): Promise<RoutineByDay | null> {
  const client = requireClient();
  const { data: days } = await client
    .from("routine_template_days")
    .select("id,day_key,day_order")
    .eq("template_id", templateId)
    .order("day_order", { ascending: true });

  if (!days || days.length === 0) return null;

  const dayIds = days.map((day) => day.id as string);
  const { data: exercises } = await client
    .from("routine_template_day_exercises")
    .select("day_id,sets,is_s_tier,sort_order,exercise_catalog(name)")
    .in("day_id", dayIds)
    .order("sort_order", { ascending: true });

  const routine = dayOrder.reduce((acc, day) => {
    acc[day] = [];
    return acc;
  }, {} as RoutineByDay);

  const grouped = new Map<string, typeof exercises>();
  (exercises || []).forEach((entry) => {
    const bucket = grouped.get(entry.day_id as string) || [];
    bucket.push(entry);
    grouped.set(entry.day_id as string, bucket);
  });

  days.forEach((day) => {
    const dayKey = normalizeDayKey(day.day_key as string);
    const list = grouped.get(day.id as string) || [];
    routine[dayKey] = list.map((entry) => {
      const catalog = entry.exercise_catalog as { name?: string } | null;
      return {
        name: catalog?.name || "",
        sets: (entry.sets as string | undefined) || "",
        sTier: Boolean(entry.is_s_tier)
      };
    });
  });

  return routine;
}

export async function saveUserRoutineTemplate(userId: string, routine: RoutineByDay): Promise<string> {
  const client = requireClient();
  const templateName = "PPLA Personal";
  const { data: existingTemplate } = await client
    .from("routine_templates")
    .select("id")
    .eq("owner_id", userId)
    .eq("name", templateName)
    .maybeSingle();

  let templateId = (existingTemplate?.id as string | undefined) || "";
  if (!templateId) {
    const { data: created, error } = await client
      .from("routine_templates")
      .insert({
        owner_id: userId,
        name: templateName,
        description: "User custom weekly routine",
        is_public: false
      })
      .select("id")
      .single();
    if (error || !created?.id) throw error || new Error("Failed to create routine template.");
    templateId = created.id as string;
  }

  await client.from("routine_template_days").delete().eq("template_id", templateId);

  const daysPayload = dayOrder.map((day, index) => ({
    template_id: templateId,
    day_key: day,
    day_order: index + 1
  }));
  const { data: createdDays } = await client
    .from("routine_template_days")
    .insert(daysPayload)
    .select("id,day_key");

  const dayIdByKey = new Map<DayKey, string>();
  (createdDays || []).forEach((row) => {
    const dayKey = normalizeDayKey(row.day_key as string);
    dayIdByKey.set(dayKey, row.id as string);
  });

  const allNames = Array.from(
    new Set(
      dayOrder.flatMap((day) => routine[day].map((exercise) => exercise.name.trim()).filter((name) => name.length > 0))
    )
  );

  if (allNames.length > 0) {
    await client
      .from("exercise_catalog")
      .upsert(
        allNames.map((name) => ({ slug: slugify(name), name })),
        { onConflict: "slug" }
      );
  }

  const { data: catalogRows } = allNames.length
    ? await client.from("exercise_catalog").select("id,name").in("name", allNames)
    : { data: [] as Array<{ id: string; name: string }> };

  const catalogByName = new Map<string, string>();
  (catalogRows || []).forEach((row) => {
    catalogByName.set((row.name as string).trim(), row.id as string);
  });

  const exerciseRows = dayOrder.flatMap((day) => {
    const dayId = dayIdByKey.get(day);
    if (!dayId) return [];
    return routine[day]
      .map((exercise, index) => {
        const exerciseId = catalogByName.get(exercise.name.trim());
        if (!exerciseId) return null;
        return {
          day_id: dayId,
          exercise_id: exerciseId,
          sets: exercise.sets,
          is_s_tier: exercise.sTier,
          sort_order: index + 1
        };
      })
      .filter(Boolean) as Array<{
      day_id: string;
      exercise_id: string;
      sets: string;
      is_s_tier: boolean;
      sort_order: number;
    }>;
  });

  if (exerciseRows.length > 0) {
    await client.from("routine_template_day_exercises").insert(exerciseRows);
  }

  return templateId;
}

export async function assignTemplateToUser(userId: string, templateId: string, plannedDay: DayKey): Promise<void> {
  await requireClient().from("user_routine_assignments").upsert(
    {
      user_id: userId,
      template_id: templateId,
      planned_day_key: plannedDay,
      active: true,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );
}

export async function loadUserExerciseNotes(userId: string): Promise<Record<string, string>> {
  const { data } = await requireClient()
    .from("user_exercise_notes")
    .select("exercise_slug,note")
    .eq("user_id", userId);
  const map: Record<string, string> = {};
  (data || []).forEach((row) => {
    map[(row.exercise_slug as string) || ""] = (row.note as string) || "";
  });
  return map;
}

export async function saveUserExerciseNote(userId: string, exerciseSlug: string, note: string): Promise<void> {
  const client = requireClient();
  if (!note.trim()) {
    await client
      .from("user_exercise_notes")
      .delete()
      .eq("user_id", userId)
      .eq("exercise_slug", exerciseSlug);
    return;
  }
  await client.from("user_exercise_notes").upsert(
    {
      user_id: userId,
      exercise_slug: exerciseSlug,
      note,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id,exercise_slug" }
  );
}

export type UserExercisePR = { weight: string; reps: string; rir: string };

export async function loadUserExercisePrs(userId: string): Promise<Record<string, UserExercisePR>> {
  const { data } = await requireClient()
    .from("user_exercise_prs")
    .select("exercise_slug,weight,reps,rir")
    .eq("user_id", userId);
  const map: Record<string, UserExercisePR> = {};
  (data || []).forEach((row) => {
    map[(row.exercise_slug as string) || ""] = {
      weight: (row.weight as string) || "",
      reps: (row.reps as string) || "",
      rir: (row.rir as string) || ""
    };
  });
  return map;
}

export async function saveUserExercisePr(
  userId: string,
  exerciseSlug: string,
  pr: UserExercisePR | null
): Promise<void> {
  const client = requireClient();
  if (!pr) {
    await client
      .from("user_exercise_prs")
      .delete()
      .eq("user_id", userId)
      .eq("exercise_slug", exerciseSlug);
    return;
  }
  await client.from("user_exercise_prs").upsert(
    {
      user_id: userId,
      exercise_slug: exerciseSlug,
      weight: pr.weight,
      reps: pr.reps,
      rir: pr.rir,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id,exercise_slug" }
  );
}

export async function loadUserExerciseChecks(userId: string): Promise<Record<string, boolean>> {
  const { data } = await requireClient()
    .from("user_day_exercise_checks")
    .select("day_key,exercise_slug,done")
    .eq("user_id", userId);
  const map: Record<string, boolean> = {};
  (data || []).forEach((row) => {
    const key = `${(row.day_key as string) || ""}::${(row.exercise_slug as string) || ""}`;
    map[key] = Boolean(row.done);
  });
  return map;
}

export async function saveUserExerciseCheck(
  userId: string,
  dayKey: DayKey,
  exerciseSlug: string,
  done: boolean
): Promise<void> {
  const client = requireClient();
  if (!done) {
    await client
      .from("user_day_exercise_checks")
      .delete()
      .eq("user_id", userId)
      .eq("day_key", dayKey)
      .eq("exercise_slug", exerciseSlug);
    return;
  }
  await client.from("user_day_exercise_checks").upsert(
    {
      user_id: userId,
      day_key: dayKey,
      exercise_slug: exerciseSlug,
      done: true,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id,day_key,exercise_slug" }
  );
}

export type UserSessionState = { startedAt: number | null; lastDurationSec?: number };
export type UserTimerState = {
  seconds: number;
  target: number | null;
  running: boolean;
  endAt: number | null;
  autoStart: boolean;
};

export async function loadUserSessionState(userId: string): Promise<UserSessionState | null> {
  const { data } = await requireClient()
    .from("user_session_state")
    .select("started_at,last_duration_sec")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    startedAt: data.started_at ? new Date(data.started_at as string).getTime() : null,
    lastDurationSec: Number(data.last_duration_sec || 0)
  };
}

export async function saveUserSessionState(userId: string, state: UserSessionState): Promise<void> {
  await requireClient().from("user_session_state").upsert(
    {
      user_id: userId,
      started_at: state.startedAt ? new Date(state.startedAt).toISOString() : null,
      last_duration_sec: state.lastDurationSec || 0,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );
}

export async function loadUserTimerState(userId: string): Promise<UserTimerState | null> {
  const { data } = await requireClient()
    .from("user_timer_state")
    .select("seconds,target,running,end_at,auto_start")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    seconds: Number(data.seconds || 0),
    target: data.target === null ? null : Number(data.target),
    running: Boolean(data.running),
    endAt: data.end_at ? new Date(data.end_at as string).getTime() : null,
    autoStart: Boolean(data.auto_start)
  };
}

export async function saveUserTimerState(userId: string, state: UserTimerState): Promise<void> {
  await requireClient().from("user_timer_state").upsert(
    {
      user_id: userId,
      seconds: state.seconds,
      target: state.target,
      running: state.running,
      end_at: state.endAt ? new Date(state.endAt).toISOString() : null,
      auto_start: state.autoStart,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );
}
