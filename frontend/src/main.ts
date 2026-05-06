import "./style.css";
import fullRoutinePageTemplate from "./features/full-routine/full-routine.page.html?raw";
import {
  dayOrder,
  defaultRoutineByDay,
  exerciseGuide,
  exerciseMediaEmbed,
  type DayKey
} from "./data/routine";
import { supabaseClient } from "./lib/supabase";
import { getPplaSnapshot } from "./lib/pplaSnapshot";
import { bindAuthFormActions } from "./features/auth/bindAuthForms";
import { bindHomeScreenActions, setHomeScreenVisible } from "./features/home/homeScreen";
import homePageTemplate from "./features/home/home.page.html?raw";
import { createSocialRefresher } from "./features/social/refreshSocialData";
import { initSocialController } from "./features/social/socialController";
import socialPageTemplate from "./features/social/social.page.html?raw";
import { openSettingsPanel } from "./features/settings/settingsPanel";
import { createDayController } from "./features/workout/dayController";
import workoutPageTemplate from "./features/workout/workout.page.html?raw";
import retoPageTemplate from "./features/reto/reto.page.html?raw";
import { initRetoPage } from "./features/reto/page";
import exerciseModalFragment from "./features/shared/exercise-modal.fragment.html?raw";
import {
  areUsersFriends,
  assignTemplateToUser,
  ensureUserRoutineAssignment,
  findUserIdByUsername,
  hasPendingFriendRequest,
  getProfileUsername,
  getSessionUser,
  loadUserActivityLogsInRange,
  loadUserExerciseChecks,
  loadUserExerciseNotes,
  loadUserExercisePrs,
  loadUserTimerState,
  loadRoutineTemplateById,
  saveCloudPayload,
  saveUserExerciseCheck,
  saveUserExerciseNote,
  saveUserExercisePr,
  saveProfileUsername,
  saveUserTimerState,
  saveUserRoutineTemplate,
  sendFriendRequest,
  signInWithGoogle,
  signInWithPassword,
  signOutSession,
  signUpWithPassword,
  submitDailyCheckin,
  updateUserPlannedDay
} from "./services/backendApi";
import type {
  ExercisePR,
  RestTimerState,
  RoutineByDay,
  RoutineExercise
} from "./types/app";

const queryPage = new URLSearchParams(window.location.search).get("page");
const pageType = queryPage || document.body.dataset.page || "home";
type ToastKind = "success" | "error" | "info";
type ThemeMode = "dark" | "light";

let toastHost: HTMLElement | null = null;
const recentToastMap = new Map<string, number>();

function ensureToastHost(): HTMLElement {
  if (toastHost) return toastHost;
  const existing = document.getElementById("toastHost");
  if (existing) {
    toastHost = existing;
    return existing;
  }
  const host = document.createElement("div");
  host.id = "toastHost";
  host.className = "routine__toast-host";
  document.body.appendChild(host);
  toastHost = host;
  return host;
}

function showToast(message: string, kind: ToastKind = "info"): void {
  const now = Date.now();
  const dedupeKey = `${kind}:${message}`;
  const lastShownAt = recentToastMap.get(dedupeKey) || 0;
  if (now - lastShownAt < 1400) return;
  recentToastMap.set(dedupeKey, now);
  const host = ensureToastHost();
  while (host.children.length >= 3) {
    host.firstElementChild?.remove();
  }
  const toast = document.createElement("div");
  toast.className = `routine__toast routine__toast--${kind}`;
  toast.textContent = message;
  host.appendChild(toast);
  window.setTimeout(() => {
    toast.classList.add("routine__toast--hide");
    window.setTimeout(() => toast.remove(), 220);
  }, 2600);
}

function redirectToLoginPage(): void {
  if (pageType !== "home" && pageType !== "reto") {
    window.location.replace("./?page=home");
  }
}

function forceRedirectToLoginPage(): void {
  if (pageType === "reto") return;
  window.location.replace(`./?page=home&login=${Date.now()}`);
}
const appRoot = document.getElementById("app");
if (appRoot && appRoot.innerHTML.trim().length === 0) {
  if (pageType === "workout") {
    appRoot.innerHTML = workoutPageTemplate;
  } else if (pageType === "full-routine") {
    appRoot.innerHTML = fullRoutinePageTemplate;
  } else if (pageType === "social") {
    appRoot.innerHTML = socialPageTemplate;
  } else if (pageType === "reto") {
    appRoot.innerHTML = retoPageTemplate;
  } else {
    appRoot.innerHTML = homePageTemplate;
  }
}
if (!document.getElementById("exerciseModal")) {
  document.body.insertAdjacentHTML("beforeend", exerciseModalFragment);
}
if (pageType === "reto") {
  initRetoPage();
}
const authGate = document.getElementById("authGate") as HTMLElement | null;
const authGateStatus = document.getElementById("authGateStatus") as HTMLElement | null;
const homeScreen = document.getElementById("homeScreen") as HTMLElement | null;
const appShell = document.getElementById("appShell") as HTMLElement | null;
const goHome = document.getElementById("goHome") as HTMLButtonElement | null;
const settingsPage = document.getElementById("settingsPage") as HTMLElement | null;
const settingsBackHome = document.getElementById("settingsBackHome") as HTMLButtonElement | null;
const settingsBackHomeBottom = document.getElementById(
  "settingsBackHomeBottom"
) as HTMLButtonElement | null;
const homeOpenRoutine = document.getElementById("homeOpenRoutine") as HTMLButtonElement | null;
const homeStartToday = document.getElementById("homeStartToday") as HTMLButtonElement | null;
const homeOpenLeaderboard = document.getElementById("homeOpenLeaderboard") as HTMLButtonElement | null;
const homeOpenSettings = document.getElementById("homeOpenSettings") as HTMLButtonElement | null;
const authGateEmail = document.getElementById("authGateEmail") as HTMLInputElement | null;
const authGatePassword = document.getElementById("authGatePassword") as HTMLInputElement | null;
const authGateSignIn = document.getElementById("authGateSignIn") as HTMLButtonElement | null;
const authGateSignUp = document.getElementById("authGateSignUp") as HTMLButtonElement | null;
const authGateLoginGoogle = document.getElementById("authGateLoginGoogle") as HTMLButtonElement | null;
const authGateOnboarding = document.getElementById("authGateOnboarding") as HTMLElement | null;
const authGateUsername = document.getElementById("authGateUsername") as HTMLInputElement | null;
const authGateSaveUsername = document.getElementById(
  "authGateSaveUsername"
) as HTMLButtonElement | null;

const restTimerProgressCircle = document.querySelector<SVGCircleElement>(
  ".routine__timer-progress"
);

const modal = document.getElementById("exerciseModal") as HTMLElement | null;
const modalTitle = document.getElementById("exerciseModalTitle") as HTMLElement | null;
const modalMedia = document.getElementById("exerciseModalMedia") as HTMLElement | null;
const mediaTabs = document.querySelectorAll<HTMLElement>(".routine__media-tab");
const modalTabs = document.querySelectorAll<HTMLButtonElement>(".routine__modal-tab");
const modalPanels = document.querySelectorAll<HTMLElement>(".routine__modal-panel");
const modalSteps = document.getElementById("exerciseModalSteps") as HTMLElement | null;
const overlay = document.getElementById("exerciseModalOverlay") as HTMLElement | null;
const closeBtn = document.getElementById("exerciseModalClose") as HTMLElement | null;
const notesTextarea = document.getElementById("exerciseNotes") as HTMLTextAreaElement | null;
const notesSaveBtn = document.getElementById("exerciseNotesSave") as HTMLButtonElement | null;
const logo = document.querySelector<HTMLElement>(".routine__logo");
const restTimerDisplay = document.getElementById("restTimerDisplay") as HTMLElement | null;
const restTimerToggle = document.getElementById("restTimerToggle") as HTMLButtonElement | null;
const restTimerCancel = document.getElementById("restTimerCancel") as HTMLButtonElement | null;
const restTimerCircle = document.querySelector<HTMLElement>(".routine__timer-circle");
const restTimePicker = document.querySelector<HTMLElement>(".routine__time-picker");
const timerHoursWheel = document.getElementById("timerHoursWheel") as HTMLElement | null;
const timerMinutesWheel = document.getElementById("timerMinutesWheel") as HTMLElement | null;
const timerSecondsWheel = document.getElementById("timerSecondsWheel") as HTMLElement | null;
let items = document.querySelectorAll<HTMLElement>(".routine__exercise-item");
const routineEditOpen = document.getElementById("routineEditOpen") as HTMLButtonElement | null;
const weeklyDays = document.querySelectorAll<HTMLButtonElement>(".routine__weekly-day");
const dayResetButtons = document.querySelectorAll<HTMLButtonElement>(".routine__day-clear");
const routineEditorModal = document.getElementById("routineEditorModal") as HTMLElement | null;
const routineEditorOverlay = document.getElementById("routineEditorOverlay") as HTMLElement | null;
const routineEditorClose = document.getElementById("routineEditorClose") as HTMLElement | null;
const routineEditorBody = document.getElementById("routineEditorBody") as HTMLElement | null;
const routineEditorSave = document.getElementById("routineEditorSave") as HTMLButtonElement | null;
const routineEditorReset = document.getElementById(
  "routineEditorReset"
) as HTMLButtonElement | null;
const socialOpen = document.getElementById("socialOpen") as HTMLButtonElement | null;
const socialModal = document.getElementById("socialModal") as HTMLElement | null;
const socialClose = document.getElementById("socialClose") as HTMLElement | null;
const socialAuthStatus = document.getElementById("socialAuthStatus") as HTMLElement | null;
const socialEmail = document.getElementById("socialEmail") as HTMLInputElement | null;
const socialPassword = document.getElementById("socialPassword") as HTMLInputElement | null;
const socialSignIn = document.getElementById("socialSignIn") as HTMLButtonElement | null;
const socialSignUp = document.getElementById("socialSignUp") as HTMLButtonElement | null;
const socialLoginGoogle = document.getElementById("socialLoginGoogle") as HTMLButtonElement | null;
const socialLogout = document.getElementById("socialLogout") as HTMLButtonElement | null;
const socialUsername = document.getElementById("socialUsername") as HTMLInputElement | null;
const socialSaveUsername = document.getElementById(
  "socialSaveUsername"
) as HTMLButtonElement | null;
const socialFriendUsername = document.getElementById(
  "socialFriendUsername"
) as HTMLInputElement | null;
const socialSendRequest = document.getElementById("socialSendRequest") as HTMLButtonElement | null;
const socialRequests = document.getElementById("socialRequests") as HTMLElement | null;
const socialLeaderboard = document.getElementById("socialLeaderboard") as HTMLElement | null;
const socialLeaderboardTitle = document.getElementById("socialLeaderboardTitle") as HTMLElement | null;
const socialMonthlyModal = document.getElementById("socialMonthlyModal") as HTMLElement | null;
const socialMonthlyTitle = document.getElementById("socialMonthlyTitle") as HTMLElement | null;
const socialMonthlyBody = document.getElementById("socialMonthlyBody") as HTMLElement | null;
const socialMonthlyClose = document.getElementById("socialMonthlyClose") as HTMLButtonElement | null;
const socialCheckinOpenSports = document.getElementById(
  "socialCheckinOpenSports"
) as HTMLButtonElement | null;
const socialCheckinMissed = document.getElementById(
  "socialCheckinMissed"
) as HTMLButtonElement | null;
const socialCheckinDate = document.getElementById("socialCheckinDate") as HTMLInputElement | null;
const socialCheckinFeedback = document.getElementById("socialCheckinFeedback") as HTMLElement | null;
const socialSportPicker = document.getElementById("socialSportPicker") as HTMLElement | null;
const socialSportPickerClose = document.getElementById(
  "socialSportPickerClose"
) as HTMLButtonElement | null;
const socialSportSearch = document.getElementById("socialSportSearch") as HTMLInputElement | null;
const socialSportOptions = document.querySelectorAll<HTMLButtonElement>(".routine__sport-option");
const socialSportEmpty = document.getElementById("socialSportEmpty") as HTMLElement | null;
const themeToggle = document.getElementById("themeToggle") as HTMLInputElement | null;
const homeThemeToggle = document.getElementById("homeThemeToggle") as HTMLInputElement | null;
const themeToggleLabel = document.getElementById("themeToggleLabel") as HTMLElement | null;
const notesClearBtn = document.getElementById("exerciseNotesClear") as HTMLButtonElement | null;
const prWeight = document.getElementById("prWeight") as HTMLInputElement | null;
const prReps = document.getElementById("prReps") as HTMLInputElement | null;
const prRir = document.getElementById("prRir") as HTMLInputElement | null;
const prSaveBtn = document.getElementById("prSave") as HTMLButtonElement | null;
const prClearBtn = document.getElementById("prClear") as HTMLButtonElement | null;
const prLastValue = document.getElementById("prLastValue") as HTMLElement | null;
let currentExerciseName = "";
let currentMediaView = "youtube";
let restTimerSeconds = 0;
let restTimerRunning = false;
let restTimerId: number | null = null;
let restTimerTarget: number | null = null;
let lastFocusedElement: HTMLElement | null = null;
let notificationAudioContext: AudioContext | null = null;
let audioUnlocked = false;
let restTimerEndAt: number | null = null;
let defaultRoutine: RoutineByDay | null = null;
let socialUserId: string | null = null;
let autoCloudSyncTimer: number | null = null;
let remoteNotesState: Record<string, string> = {};
let remotePrState: Record<string, ExercisePR> = {};
let remoteChecksState: Record<string, boolean> = {};
let remoteTimerState: RestTimerState | null = null;
const volatileNotesState: Record<string, string> = {};
const volatilePrState: Record<string, ExercisePR> = {};
const volatileChecksState: Record<string, boolean> = {};
let volatileTimerState: RestTimerState | null = null;
let volatileCustomRoutine: RoutineByDay | null = null;
let socialUiController: { closeSportPicker: () => void; closeSocialModal: () => void } | null = null;

function resolvePreferredTheme(): ThemeMode {
  const saved = window.localStorage.getItem("theme");
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme: ThemeMode): void {
  document.documentElement.setAttribute("data-theme", theme);
  window.localStorage.setItem("theme", theme);
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute("content", theme === "light" ? "#f4f6fb" : "#192229");
  }
  if (themeToggle) {
    themeToggle.checked = theme === "light";
  }
  if (homeThemeToggle) {
    homeThemeToggle.checked = theme === "light";
  }
  if (themeToggleLabel) {
    themeToggleLabel.textContent = `Theme: ${theme === "light" ? "Light" : "Dark"}`;
  }
}

function initThemeControls(): void {
  const currentTheme = (document.documentElement.getAttribute("data-theme") as ThemeMode | null)
    || resolvePreferredTheme();
  applyTheme(currentTheme);
  themeToggle?.addEventListener("change", () => {
    applyTheme(themeToggle.checked ? "light" : "dark");
  });
  homeThemeToggle?.addEventListener("change", () => {
    applyTheme(homeThemeToggle.checked ? "light" : "dark");
  });
}

function updateTimerControlsState(): void {
  if (!restTimerToggle) return;
  const hasTime = restTimerSeconds > 0;
  const selectedTime = readSecondsFromTimePicker();
  const isPaused = !restTimerRunning && hasTime && (restTimerTarget || 0) > 0;
  const readyToStart = hasTime || selectedTime > 0;
  const showActiveTimer = restTimerRunning || isPaused;
  document.body.classList.toggle("routine--timer-active", showActiveTimer);
  if (restTimerCircle) restTimerCircle.hidden = !showActiveTimer;
  if (restTimePicker) restTimePicker.hidden = showActiveTimer;
  if (restTimerCancel) restTimerCancel.hidden = !showActiveTimer;
  restTimerToggle.hidden = false;
  restTimerToggle.disabled = !restTimerRunning && !readyToStart;
  if (restTimerRunning) {
    restTimerToggle.textContent = "Pause";
    return;
  }
  restTimerToggle.textContent = hasTime ? "Resume" : "Start";
}

function normalizeExerciseName(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cloneRoutine(source: RoutineByDay): RoutineByDay {
  return dayOrder.reduce((acc, day) => {
    acc[day] = source[day].map((exercise) => ({ ...exercise }));
    return acc;
  }, {} as RoutineByDay);
}

function loadCustomRoutine(): RoutineByDay | null {
  return volatileCustomRoutine ? cloneRoutine(volatileCustomRoutine) : null;
}

function saveCustomRoutine(routine: RoutineByDay): void {
  volatileCustomRoutine = cloneRoutine(routine);
  queueAutoCloudSync();
}

function clearCustomRoutine(): void {
  volatileCustomRoutine = null;
  queueAutoCloudSync();
}

function getSupabaseClientFromSavedConfig() {
  if (!supabaseClient) return null;
  return { client: supabaseClient };
}

async function uploadCurrentStateForUser(userId: string): Promise<void> {
  const payload = getPplaSnapshot();
  await saveCloudPayload(userId, payload);
}

function queueAutoCloudSync(): void {
  // Strict DB mode: disable local snapshot sync churn.
  if (autoCloudSyncTimer !== null) {
    window.clearTimeout(autoCloudSyncTimer);
    autoCloudSyncTimer = null;
  }
}

function setAuthGateVisible(visible: boolean): void {
  if (!authGate) return;
  authGate.classList.toggle("routine__auth-gate--hidden", !visible);
  authGate.setAttribute("aria-hidden", visible ? "false" : "true");
  updateAppShellVisibility();
}

function setAuthGateOnboarding(open: boolean): void {
  authGateOnboarding?.classList.toggle("routine__auth-onboarding--open", open);
}

const setHomeVisible = (visible: boolean): void => {
  setHomeScreenVisible(homeScreen, visible);
  updateAppShellVisibility();
};

function setSettingsVisible(visible: boolean): void {
  if (!settingsPage) return;
  settingsPage.classList.toggle("routine__modal--open", visible);
  settingsPage.setAttribute("aria-hidden", visible ? "false" : "true");
  updateAppShellVisibility();
}

function updateAppShellVisibility(): void {
  if (!appShell) return;
  const authVisible = authGate?.getAttribute("aria-hidden") === "false";
  const homeVisible = homeScreen?.getAttribute("aria-hidden") === "false";
  const exerciseOpen = modal?.classList.contains("routine__modal--open") || false;
  const socialOpenState = socialModal?.classList.contains("routine__modal--open") || false;
  const editorOpen = routineEditorModal?.classList.contains("routine__modal--open") || false;
  const settingsOpen = settingsPage?.classList.contains("routine__modal--open") || false;
  appShell.classList.toggle(
    "routine__app-shell--hidden",
    authVisible || homeVisible || exerciseOpen || socialOpenState || editorOpen || settingsOpen
  );
}

async function hasUsernameProfile(userId: string): Promise<boolean> {
  const username = await getProfileUsername(userId);
  if (authGateUsername) authGateUsername.value = username;
  return username.trim().length > 0;
}

async function syncRoutineFromBackend(userId: string): Promise<boolean> {
  try {
    const assignment = await ensureUserRoutineAssignment(userId);
    const routineFromDb = await loadRoutineTemplateById(assignment.template_id);
    if (!routineFromDb) return false;

    const localRoutine = loadCustomRoutine() || defaultRoutine;
    const localSerialized = JSON.stringify(localRoutine || {});
    const remoteSerialized = JSON.stringify(routineFromDb);
    const plannedLocal = loadPlannedWorkoutDay();
    const plannedRemote = assignment.planned_day_key;

    const changed = localSerialized !== remoteSerialized || plannedLocal !== plannedRemote;
    if (!changed) return false;

    saveCustomRoutine(routineFromDb);
    savePlannedWorkoutDay(plannedRemote);
    return true;
  } catch {
    return false;
  }
}

async function syncTrainingStateFromBackend(userId: string): Promise<boolean> {
  try {
    const [notes, prs, checks, timerStateDb] = await Promise.all([
      loadUserExerciseNotes(userId),
      loadUserExercisePrs(userId),
      loadUserExerciseChecks(userId),
      loadUserTimerState(userId)
    ]);

    const prev = JSON.stringify({
      notes: remoteNotesState,
      prs: remotePrState,
      checks: remoteChecksState,
      timer: remoteTimerState
    });
    remoteNotesState = notes;
    remotePrState = prs;
    remoteChecksState = checks;
    remoteTimerState = timerStateDb
      ? {
          seconds: timerStateDb.seconds,
          target: timerStateDb.target,
          running: timerStateDb.running,
          endAt: timerStateDb.endAt,
          autoStart: timerStateDb.autoStart
        }
      : null;
    const next = JSON.stringify({
      notes: remoteNotesState,
      prs: remotePrState,
      checks: remoteChecksState,
      timer: remoteTimerState
    });
    return prev !== next;
  } catch {
    return false;
  }
}

async function initAuthAutoSync(): Promise<void> {
  if (!supabaseClient) {
    setAuthGateVisible(true);
    setHomeVisible(false);
    if (authGateStatus) authGateStatus.textContent = "Missing Supabase environment configuration.";
    return;
  }
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const user = sessionData.session?.user || null;
  socialUserId = user?.id || null;
  if (!user) {
    setSettingsVisible(false);
    if (socialModal) {
      socialModal.classList.remove("routine__modal--open");
      socialModal.setAttribute("aria-hidden", "true");
    }
    socialUiController?.closeSportPicker();
    setAuthGateVisible(true);
    setHomeVisible(false);
    setAuthGateOnboarding(false);
    if (authGateStatus) authGateStatus.textContent = "Login required to use the app.";
    redirectToLoginPage();
  } else {
    const hasUsername = await hasUsernameProfile(user.id);
    if (!hasUsername) {
      setAuthGateVisible(true);
      setHomeVisible(false);
      setAuthGateOnboarding(true);
      if (authGateStatus) authGateStatus.textContent = "Choose a username to continue.";
      await refreshSocialData();
      return;
    }
    setAuthGateVisible(false);
    setHomeVisible(true);
    await syncTrainingStateFromBackend(user.id);
    await syncRoutineFromBackend(user.id);
  }
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" && session?.user?.id) {
      socialUserId = session.user.id;
      const hasUsername = await hasUsernameProfile(session.user.id);
      if (!hasUsername) {
        setAuthGateVisible(true);
        setHomeVisible(false);
        setAuthGateOnboarding(true);
        if (authGateStatus) authGateStatus.textContent = "Choose a username to continue.";
        await refreshSocialData();
        return;
      }
      setAuthGateVisible(false);
      setHomeVisible(true);
      await syncTrainingStateFromBackend(session.user.id);
      await syncRoutineFromBackend(session.user.id);
      await refreshSocialData();
    }
    if (event === "SIGNED_OUT") {
      socialUserId = null;
      remoteNotesState = {};
      remotePrState = {};
      remoteChecksState = {};
      remoteTimerState = null;
      setSettingsVisible(false);
      if (socialModal) {
        socialModal.classList.remove("routine__modal--open");
        socialModal.setAttribute("aria-hidden", "true");
      }
      socialUiController?.closeSportPicker();
      setAuthGateVisible(true);
      setHomeVisible(false);
      setAuthGateOnboarding(false);
      if (authGateStatus) authGateStatus.textContent = "Login required to use the app.";
      await refreshSocialData();
      forceRedirectToLoginPage();
    }
  });
}

const refreshSocialData = createSocialRefresher(
  getSupabaseClientFromSavedConfig,
  {
    socialAuthStatus,
    socialRequests,
    socialLeaderboard,
    socialLeaderboardTitle,
    socialMonthlyModal,
    socialMonthlyTitle,
    socialMonthlyBody,
    socialMonthlyClose,
    socialUsername
  },
  (userId: string | null) => {
    socialUserId = userId;
  }
);

function renderRoutineToDom(routine: RoutineByDay): void {
  dayOrder.forEach((day) => {
    const card = document.querySelector<HTMLElement>(`.routine__day-card[data-day="${day}"]`);
    const list = card?.querySelector<HTMLElement>(".routine__exercise-list");
    if (!card || !list) return;
    list.innerHTML = routine[day]
      .map((exercise, index) => {
        const number = String(index + 1).padStart(2, "0");
        const safeName = escapeHtml(exercise.name);
        const safeSets = escapeHtml(exercise.sets);
        const nameHtml = exercise.sTier
          ? `<div class="routine__exercise-main"><div class="routine__exercise-name">${safeName}</div><span class="routine__star-badge">★ S-Tier</span></div>`
          : `<span class="routine__exercise-name">${safeName}</span>`;
        return `<li class="routine__exercise-item"><span class="routine__exercise-number">${number}</span>${nameHtml}<div class="routine__exercise-meta"><span class="routine__exercise-sets">${safeSets}</span></div></li>`;
      })
      .join("");
  });
  items = document.querySelectorAll<HTMLElement>(".routine__exercise-item");
}

const exerciseGuideIndex = Object.fromEntries(
  Object.entries(exerciseGuide).map(([name, guide]) => [normalizeExerciseName(name), guide])
);

const exerciseMediaIndex = Object.fromEntries(
  Object.entries(exerciseMediaEmbed).map(([name, url]) => [normalizeExerciseName(name), url])
);

const genericGuide = [
  "Ajusta maquina o carga antes de empezar y haz una serie de aproximacion.",
  "Busca rango completo y controlado, evitando rebotes.",
  "Mantiene tecnica estable y deja 1-2 repeticiones en reserva en la mayoria de series.",
  "Si aparece dolor articular, reduce carga y revisa ejecucion."
];

function formatSeconds(totalSeconds: number): string {
  const safeTotal = Math.max(totalSeconds, 0);
  const hours = Math.floor(safeTotal / 3600);
  const minutes = Math.floor((safeTotal % 3600) / 60);
  const seconds = safeTotal % 60;
  const hh = hours.toString().padStart(2, "0");
  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");
  if (hours > 0) return `${hh}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

function buildTimeWheel(wheel: HTMLElement, maxValue: number): void {
  const options = Array.from({ length: maxValue + 1 }, (_, value) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "routine__time-option";
    option.dataset.value = String(value);
    option.textContent = value.toString().padStart(2, "0");
    option.setAttribute("aria-selected", "false");
    return option;
  });
  wheel.replaceChildren(...options);
}

function getWheelOptions(wheel: HTMLElement): HTMLElement[] {
  return Array.from(wheel.querySelectorAll<HTMLElement>(".routine__time-option"));
}

function clampWheelValue(wheel: HTMLElement, maxValue: number, value: number): number {
  const clamped = Math.max(0, Math.min(maxValue, value));
  const options = getWheelOptions(wheel);
  options.forEach((option, index) => {
    const selected = index === clamped;
    option.classList.toggle("routine__time-option--active", selected);
    option.setAttribute("aria-selected", selected ? "true" : "false");
  });
  return clamped;
}

function scrollWheelToValue(wheel: HTMLElement, value: number, smooth = false): void {
  const options = getWheelOptions(wheel);
  const option = options[value];
  if (!option) return;
  const targetTop = option.offsetTop - (wheel.clientHeight - option.clientHeight) / 2;
  wheel.scrollTo({ top: Math.max(targetTop, 0), behavior: smooth ? "smooth" : "auto" });
}

function getCenteredWheelValue(wheel: HTMLElement, maxValue: number): number {
  const options = getWheelOptions(wheel);
  if (options.length === 0) return 0;
  const wheelRect = wheel.getBoundingClientRect();
  const wheelCenter = wheelRect.top + wheelRect.height / 2;
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  options.forEach((option, index) => {
    const rect = option.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    const distance = Math.abs(center - wheelCenter);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });
  return clampWheelValue(wheel, maxValue, closestIndex);
}

function setWheelValue(wheel: HTMLElement, maxValue: number, value: number, smooth = false): number {
  const next = clampWheelValue(wheel, maxValue, value);
  scrollWheelToValue(wheel, next, smooth);
  return next;
}

function getWheelValue(wheel: HTMLElement, maxValue: number): number {
  return getCenteredWheelValue(wheel, maxValue);
}

function syncTimePickerFromSeconds(totalSeconds: number): void {
  if (!timerHoursWheel || !timerMinutesWheel || !timerSecondsWheel) return;
  const safeTotal = Math.max(totalSeconds, 0);
  const hours = Math.floor(safeTotal / 3600);
  const minutes = Math.floor((safeTotal % 3600) / 60);
  const seconds = safeTotal % 60;
  setWheelValue(timerHoursWheel, 23, hours);
  setWheelValue(timerMinutesWheel, 59, minutes);
  setWheelValue(timerSecondsWheel, 59, seconds);
}

function readSecondsFromTimePicker(): number {
  if (!timerHoursWheel || !timerMinutesWheel || !timerSecondsWheel) return 0;
  const hours = getWheelValue(timerHoursWheel, 23);
  const minutes = getWheelValue(timerMinutesWheel, 59);
  const seconds = getWheelValue(timerSecondsWheel, 59);
  return hours * 3600 + minutes * 60 + seconds;
}

function initTimePickerWheels(): void {
  if (!timerHoursWheel || !timerMinutesWheel || !timerSecondsWheel) return;
  buildTimeWheel(timerHoursWheel, 23);
  buildTimeWheel(timerMinutesWheel, 59);
  buildTimeWheel(timerSecondsWheel, 59);

  const bindWheel = (wheel: HTMLElement, max: number) => {
    let scrollTimeout: number | null = null;
    wheel.addEventListener("scroll", () => {
      if (scrollTimeout !== null) window.clearTimeout(scrollTimeout);
      scrollTimeout = window.setTimeout(() => {
        const value = getWheelValue(wheel, max);
        setWheelValue(wheel, max, value, true);
        updateTimerControlsState();
      }, 70);
    });
    wheel.addEventListener("click", (event) => {
      const option = (event.target as HTMLElement).closest<HTMLElement>(".routine__time-option");
      if (!option?.dataset.value) return;
      const value = Number.parseInt(option.dataset.value, 10);
      if (Number.isNaN(value)) return;
      setWheelValue(wheel, max, value, true);
      updateTimerControlsState();
    });
  };

  bindWheel(timerHoursWheel, 23);
  bindWheel(timerMinutesWheel, 59);
  bindWheel(timerSecondsWheel, 59);
  syncTimePickerFromSeconds(restTimerSeconds);
}

function updateRestTimerDisplay(): void {
  if (!restTimerDisplay) return;
  restTimerDisplay.textContent = formatSeconds(restTimerSeconds);
  restTimerDisplay.classList.toggle(
    "routine__timer-display--done",
    restTimerTarget !== null && restTimerSeconds <= 0
  );
  if (restTimerProgressCircle) {
    const circumference = 2 * Math.PI * 17; // r = 17
    if (!restTimerTarget || restTimerTarget <= 0) {
      restTimerProgressCircle.style.strokeDasharray = `${circumference}`;
      restTimerProgressCircle.style.strokeDashoffset = `${circumference}`;
    } else {
      const clamped = Math.max(Math.min(restTimerSeconds, restTimerTarget), 0);
      const ratio = clamped / restTimerTarget; // 1 = full, 0 = empty
      const offset = circumference * (1 - ratio);
      restTimerProgressCircle.style.strokeDasharray = `${circumference}`;
      restTimerProgressCircle.style.strokeDashoffset = `${offset}`;
    }
  }
  updateTimerControlsState();
}

function setupAudioUnlock(): void {
  const unlock = () => {
    if (!notificationAudioContext) {
      try {
        notificationAudioContext = new window.AudioContext();
      } catch {
        return;
      }
    }
    notificationAudioContext
      .resume()
      .then(() => {
        audioUnlocked = true;
      })
      .catch(() => {
        // ignore resume errors
      });
  };

  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock, { passive: true });
}

function playTimerBeep(): void {
  try {
    if (!notificationAudioContext) {
      notificationAudioContext = new window.AudioContext();
    }

    if (notificationAudioContext.state === "suspended") {
      notificationAudioContext.resume().catch(() => {
        // ignore resume errors
      });
    }

    if (!audioUnlocked && notificationAudioContext.state !== "running") return;

    const oscillator = notificationAudioContext.createOscillator();
    const gain = notificationAudioContext.createGain();
    oscillator.connect(gain);
    gain.connect(notificationAudioContext.destination);
    oscillator.frequency.value = 880;
    gain.gain.value = 0.025;
    oscillator.start();
    oscillator.stop(notificationAudioContext.currentTime + 0.22);
  } catch {
    // ignore audio errors
  }
}

function notifyTimerDone(): void {
  if ("vibrate" in navigator) navigator.vibrate?.([180, 90, 180]);
  playTimerBeep();
}

function saveRestTimerState(): void {
  const state: RestTimerState = {
    seconds: Math.max(restTimerSeconds, 0),
    target: restTimerTarget,
    running: restTimerRunning,
    endAt: restTimerEndAt,
    autoStart: false
  };
  if (socialUserId) {
    remoteTimerState = { ...state };
    void saveUserTimerState(socialUserId, {
      seconds: state.seconds,
      target: state.target,
      running: state.running,
      endAt: state.endAt,
      autoStart: state.autoStart
    });
    queueAutoCloudSync();
    return;
  }
  volatileTimerState = { ...state };
  queueAutoCloudSync();
}

function loadRestTimerState(): RestTimerState | null {
  if (socialUserId && remoteTimerState) {
    return { ...remoteTimerState };
  }
  return volatileTimerState ? { ...volatileTimerState } : null;
}

function syncRestTimerFromClock(notifyIfDone: boolean): void {
  if (!restTimerRunning || !restTimerEndAt) return;
  const remaining = Math.ceil((restTimerEndAt - Date.now()) / 1000);
  if (remaining <= 0) {
    restTimerSeconds = 0;
    if (restTimerId !== null) {
      window.clearInterval(restTimerId);
      restTimerId = null;
    }
    restTimerRunning = false;
    restTimerEndAt = null;
    updateRestTimerDisplay();
    saveRestTimerState();
    if (notifyIfDone) notifyTimerDone();
    return;
  }
  restTimerSeconds = remaining;
  updateRestTimerDisplay();
  saveRestTimerState();
}

function stopRestTimer(): void {
  if (restTimerId !== null) {
    window.clearInterval(restTimerId);
    restTimerId = null;
  }
  restTimerRunning = false;
  restTimerEndAt = null;
  document.body.classList.remove("routine--timer-active");
  updateTimerControlsState();
  saveRestTimerState();
}

function startRestTimer(): void {
  if (!restTimerDisplay) return;
  if (restTimerRunning) {
    stopRestTimer();
    return;
  }
  const pickerVisible = restTimePicker ? !restTimePicker.hidden : true;
  if (pickerVisible) {
    const pickedSeconds = readSecondsFromTimePicker();
    restTimerSeconds = pickedSeconds;
    restTimerTarget = pickedSeconds > 0 ? pickedSeconds : null;
  }
  if (restTimerSeconds <= 0) return;
  if (!restTimerTarget || restTimerTarget <= 0) {
    restTimerTarget = restTimerSeconds;
  }
  restTimerRunning = true;
  restTimerEndAt = Date.now() + restTimerSeconds * 1000;
  document.body.classList.add("routine--timer-active");
  if (restTimePicker) restTimePicker.hidden = true;
  if (restTimerCircle) restTimerCircle.hidden = false;
  if (restTimerCancel) restTimerCancel.hidden = false;
  updateTimerControlsState();
  saveRestTimerState();
  restTimerId = window.setInterval(() => {
    syncRestTimerFromClock(true);
  }, 1000);
}

function resetRestTimer(): void {
  stopRestTimer();
  restTimerSeconds = 0;
  restTimerTarget = null;
  syncTimePickerFromSeconds(restTimerSeconds);
  updateRestTimerDisplay();
  saveRestTimerState();
}

function getRemoteCheckKey(dayKey: string, exerciseName: string): string {
  return `${dayKey}::${normalizeExerciseName(exerciseName)}`;
}

function loadNote(exerciseName: string): string {
  if (socialUserId) {
    return remoteNotesState[normalizeExerciseName(exerciseName)] || "";
  }
  return volatileNotesState[normalizeExerciseName(exerciseName)] || "";
}

function saveNote(exerciseName: string, note: string): void {
  const slug = normalizeExerciseName(exerciseName);
  if (socialUserId) {
    if (!note.trim()) {
      delete remoteNotesState[slug];
    } else {
      remoteNotesState[slug] = note;
    }
    void saveUserExerciseNote(socialUserId, slug, note);
    queueAutoCloudSync();
    return;
  }
  if (!note.trim()) {
    delete volatileNotesState[slug];
  } else {
    volatileNotesState[slug] = note;
  }
  queueAutoCloudSync();
}

function isExerciseDone(dayKey: string, exerciseName: string): boolean {
  if (!dayKey) return false;
  const key = getRemoteCheckKey(dayKey, exerciseName);
  return socialUserId ? Boolean(remoteChecksState[key]) : Boolean(volatileChecksState[key]);
}

function setExerciseDone(dayKey: string, exerciseName: string, done: boolean): void {
  if (!dayKey) return;
  const key = getRemoteCheckKey(dayKey, exerciseName);
  if (socialUserId) {
    if (done) {
      remoteChecksState[key] = true;
    } else {
      delete remoteChecksState[key];
    }
    void saveUserExerciseCheck(socialUserId, dayKey as DayKey, normalizeExerciseName(exerciseName), done);
    queueAutoCloudSync();
    return;
  }
  if (done) {
    volatileChecksState[key] = true;
  } else {
    delete volatileChecksState[key];
  }
  queueAutoCloudSync();
}

function loadPR(exerciseName: string): ExercisePR | null {
  if (socialUserId) {
    return remotePrState[normalizeExerciseName(exerciseName)] || null;
  }
  return volatilePrState[normalizeExerciseName(exerciseName)] || null;
}

function savePR(exerciseName: string, data: ExercisePR): void {
  const slug = normalizeExerciseName(exerciseName);
  if (socialUserId) {
    remotePrState[slug] = data;
    void saveUserExercisePr(socialUserId, slug, data);
    queueAutoCloudSync();
    return;
  }
  volatilePrState[slug] = data;
  queueAutoCloudSync();
}

function clearPR(exerciseName: string): void {
  const slug = normalizeExerciseName(exerciseName);
  if (socialUserId) {
    delete remotePrState[slug];
    void saveUserExercisePr(socialUserId, slug, null);
    queueAutoCloudSync();
    return;
  }
  delete volatilePrState[slug];
  queueAutoCloudSync();
}

function renderMedia(exerciseName: string): void {
  if (!modalMedia) return;

  const normalizedName = normalizeExerciseName(exerciseName);
  const mediaUrl = exerciseMediaIndex[normalizedName];
  const imageUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${exerciseName} tecnica gimnasio`)}`;

  if (currentMediaView === "youtube") {
    const fallbackUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${exerciseName} tecnica`)}`;
    modalMedia.innerHTML = `<a class="routine__media-link" href="${mediaUrl || fallbackUrl}" target="_blank" rel="noopener noreferrer">Ver videos de tecnica en YouTube</a>`;
    return;
  }

  if (currentMediaView === "image") {
    modalMedia.innerHTML = `<a class="routine__media-link" href="${imageUrl}" target="_blank" rel="noopener noreferrer">Buscar imagenes en Google</a>`;
  }
}

function setMediaView(view: string): void {
  currentMediaView = view;
  mediaTabs.forEach((tab) => {
    tab.classList.toggle("routine__media-tab--active", tab.dataset.mediaView === view);
  });
  if (currentExerciseName) {
    renderMedia(currentExerciseName);
  }
}

function setModalPanel(panel: string): void {
  modalTabs.forEach((tab) => {
    tab.classList.toggle("routine__modal-tab--active", tab.dataset.modalPanel === panel);
  });
  modalPanels.forEach((section) => {
    const isActive = section.dataset.modalPanelContent === panel;
    section.classList.toggle("routine__modal-panel--active", isActive);
    section.setAttribute("aria-hidden", isActive ? "false" : "true");
  });
}

function openModal(title: string, steps: string[]): void {
  if (!modal || !modalTitle || !modalSteps) return;
  lastFocusedElement =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  currentExerciseName = title;
  modalTitle.textContent = title;
  setModalPanel("overview");
  setMediaView("youtube");
  modalSteps.innerHTML = steps
    .map((step) => `<li class="routine__modal-step">${step}</li>`)
    .join("");
  if (notesTextarea && notesSaveBtn) {
    const existing = loadNote(title);
    notesTextarea.value = existing;
    notesSaveBtn.classList.remove("routine__notes-save--saved");
  }
  const pr = loadPR(title);
  if (prWeight && prReps && prRir && prLastValue) {
    prWeight.value = pr?.weight || "";
    prReps.value = pr?.reps || "";
    prRir.value = pr?.rir || "";
    prLastValue.textContent = pr
      ? `Last PR: ${pr.weight} kg · ${pr.reps} reps · RIR ${pr.rir}`
      : "No PR saved yet";
  }
  modal.classList.add("routine__modal--open");
  modal.setAttribute("aria-hidden", "false");
  updateAppShellVisibility();
  closeBtn?.focus();
}

function closeModal(): void {
  if (!modal || !modalMedia) return;
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  modal.classList.remove("routine__modal--open");
  modal.setAttribute("aria-hidden", "true");
  modalMedia.innerHTML = "";
  currentExerciseName = "";
  updateAppShellVisibility();
  if (lastFocusedElement) {
    lastFocusedElement.focus();
  }
}

defaultRoutine = cloneRoutine(defaultRoutineByDay);
const customRoutine = loadCustomRoutine();
renderRoutineToDom(customRoutine || defaultRoutine);

items.forEach((item) => {
  item.setAttribute("role", "button");
  item.setAttribute("tabindex", "0");
  item.setAttribute("aria-label", "Ver tecnica del ejercicio");

  const dayCard = item.closest<HTMLElement>(".routine__day-card");
  const dayKey = dayCard?.dataset.day || "";

  const nameEl = item.querySelector(".routine__exercise-name");
  if (!nameEl) return;

  const exerciseName = nameEl.textContent?.trim() || "";
  const normalizedName = normalizeExerciseName(exerciseName);
  const steps = exerciseGuideIndex[normalizedName] || genericGuide;

  const check = document.createElement("button");
  check.type = "button";
  check.className = "routine__exercise-check";
  check.setAttribute("aria-label", "Mark exercise as done");
  const inner = document.createElement("span");
  inner.className = "routine__exercise-check-mark";
  check.appendChild(inner);
  item.insertBefore(check, item.firstChild);

  const initialDone = isExerciseDone(dayKey, exerciseName);
  if (initialDone) {
    item.classList.add("routine__exercise-item--done");
    check.classList.add("routine__exercise-check--done");
  }

  item.addEventListener("click", () => openModal(exerciseName, steps));
  item.addEventListener("keydown", (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openModal(exerciseName, steps);
    }
  });

  check.addEventListener("click", (event) => {
    event.stopPropagation();
    const currentlyDone = item.classList.contains("routine__exercise-item--done");
    const newDone = !currentlyDone;
    item.classList.toggle("routine__exercise-item--done", newDone);
    check.classList.toggle("routine__exercise-check--done", newDone);
    setExerciseDone(dayKey, exerciseName, newDone);
    if (dayKey) {
      updateDayProgress(dayKey);
    }
  });
});

function updateDayProgress(dayKey: string): void {
  if (!dayKey) return;
  const card = document.querySelector<HTMLElement>(`.routine__day-card[data-day="${dayKey}"]`);
  if (!card) return;
  if (pageType === "full-routine") {
    const existingProgress = card.querySelector<HTMLElement>(".routine__day-progress");
    existingProgress?.remove();
    return;
  }
  const itemsInDay = card.querySelectorAll<HTMLElement>(".routine__exercise-item");
  if (!itemsInDay.length) return;

  let doneCount = 0;
  itemsInDay.forEach((it) => {
    const nameEl = it.querySelector(".routine__exercise-name");
    if (!nameEl) return;
    const exName = nameEl.textContent?.trim() || "";
    if (isExerciseDone(dayKey, exName)) {
      doneCount += 1;
    }
  });

  let progressEl = card.querySelector<HTMLElement>(".routine__day-progress");
  if (!progressEl) {
    const header = card.querySelector<HTMLElement>(".routine__day-header");
    if (!header) return;
    progressEl = document.createElement("div");
    progressEl.className = "routine__day-progress";
    header.appendChild(progressEl);
  }
  progressEl.textContent = `${doneCount}/${itemsInDay.length}`;
  const weekBtn = document.querySelector<HTMLButtonElement>(
    `.routine__weekly-day[data-week-day="${dayKey}"]`
  );
  weekBtn?.classList.toggle(
    "routine__weekly-day--done",
    doneCount === itemsInDay.length && itemsInDay.length > 0
  );
}

function resetDayChecks(dayKey: string): void {
  const card = document.querySelector<HTMLElement>(`.routine__day-card[data-day="${dayKey}"]`);
  if (!card) return;
  const rows = card.querySelectorAll<HTMLElement>(".routine__exercise-item");
  rows.forEach((row) => {
    const nameEl = row.querySelector(".routine__exercise-name");
    const check = row.querySelector<HTMLElement>(".routine__exercise-check");
    if (!nameEl) return;
    setExerciseDone(dayKey, nameEl.textContent?.trim() || "", false);
    row.classList.remove("routine__exercise-item--done");
    check?.classList.remove("routine__exercise-check--done");
  });
  updateDayProgress(dayKey);
}

const dayController = createDayController({
  weeklyDays,
  updateDayProgress
});

const getTodayKey = (): DayKey => dayController.getTodayKey();
const showDay = (dayKey: DayKey): void => dayController.showDay(dayKey);
const showAllDays = (): void => dayController.showAllDays();
const loadPlannedWorkoutDay = (): DayKey => dayController.loadPlannedWorkoutDay();
const savePlannedWorkoutDay = (day: DayKey): void => dayController.savePlannedWorkoutDay(day);
const getNextDay = (day: DayKey): DayKey => dayController.getNextDay(day);

overlay?.addEventListener("click", closeModal);
closeBtn?.addEventListener("click", closeModal);
mediaTabs.forEach((tab) => {
  tab.addEventListener("click", () => setMediaView(tab.dataset.mediaView || "youtube"));
});
modalTabs.forEach((tab) => {
  tab.addEventListener("click", () => setModalPanel(tab.dataset.modalPanel || "overview"));
});
document.addEventListener("keydown", (event: KeyboardEvent) => {
  if (event.key === "Escape" && modal?.classList.contains("routine__modal--open")) {
    closeModal();
    return;
  }
  if (event.key === "Escape" && socialModal?.classList.contains("routine__modal--open")) {
    socialUiController?.closeSocialModal();
  }
  if (event.key === "Escape" && socialSportPicker?.classList.contains("routine__sport-picker--open")) {
    socialUiController?.closeSportPicker();
  }
});

notesSaveBtn?.addEventListener("click", () => {
  if (!currentExerciseName || !notesTextarea || !notesSaveBtn) return;
  saveNote(currentExerciseName, notesTextarea.value);
  notesSaveBtn.classList.add("routine__notes-save--saved");
  setTimeout(() => {
    notesSaveBtn.classList.remove("routine__notes-save--saved");
  }, 900);
});

notesClearBtn?.addEventListener("click", () => {
  if (!currentExerciseName || !notesTextarea) return;
  notesTextarea.value = "";
  saveNote(currentExerciseName, "");
});

prSaveBtn?.addEventListener("click", () => {
  if (!currentExerciseName || !prWeight || !prReps || !prRir || !prLastValue) return;
  const data = {
    weight: prWeight.value || "0",
    reps: prReps.value || "0",
    rir: prRir.value || "0"
  };
  savePR(currentExerciseName, data);
  prLastValue.textContent = `Last PR: ${data.weight} kg · ${data.reps} reps · RIR ${data.rir}`;
});

prClearBtn?.addEventListener("click", () => {
  if (!currentExerciseName || !prWeight || !prReps || !prRir || !prLastValue) return;
  clearPR(currentExerciseName);
  prWeight.value = "";
  prReps.value = "";
  prRir.value = "";
  prLastValue.textContent = "No PR saved yet";
});

restTimerToggle?.addEventListener("click", () => {
  startRestTimer();
});

restTimerCancel?.addEventListener("click", () => {
  resetRestTimer();
});

const dayLabel: Record<DayKey, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday"
};

function getCurrentRoutineForEditor(): RoutineByDay {
  const custom = loadCustomRoutine();
  if (custom) return cloneRoutine(custom);
  if (defaultRoutine) return cloneRoutine(defaultRoutine);
  return dayOrder.reduce((acc, day) => {
    acc[day] = [];
    return acc;
  }, {} as RoutineByDay);
}

function createEditorRow(day: DayKey, exercise: RoutineExercise): HTMLElement {
  const row = document.createElement("div");
  row.className = "routine__editor-row";
  row.innerHTML = `
    <input class="routine__editor-input" data-field="name" data-day="${day}" placeholder="Exercise name" value="${escapeHtml(exercise.name)}" />
    <input class="routine__editor-input" data-field="sets" data-day="${day}" placeholder="Sets (e.g. 3 × 8-10)" value="${escapeHtml(exercise.sets)}" />
    <select class="routine__editor-select" data-field="tier" data-day="${day}">
      <option value="no"${exercise.sTier ? "" : " selected"}>Normal</option>
      <option value="yes"${exercise.sTier ? " selected" : ""}>S-Tier</option>
    </select>
    <button type="button" class="routine__editor-remove" aria-label="Remove exercise">×</button>
  `;
  row.querySelector(".routine__editor-remove")?.addEventListener("click", () => row.remove());
  return row;
}

function renderRoutineEditor(): void {
  if (!routineEditorBody) return;
  const routine = getCurrentRoutineForEditor();
  routineEditorBody.innerHTML = "";
  dayOrder.forEach((day) => {
    const dayBlock = document.createElement("section");
    dayBlock.className = "routine__editor-day";
    dayBlock.dataset.day = day;
    dayBlock.innerHTML = `<h3 class="routine__editor-day-title">${dayLabel[day]}</h3><div class="routine__editor-rows"></div><button type="button" class="routine__editor-add">+ Add exercise</button>`;
    const rows = dayBlock.querySelector(".routine__editor-rows");
    if (rows) {
      routine[day].forEach((exercise) => rows.appendChild(createEditorRow(day, exercise)));
    }
    dayBlock.querySelector(".routine__editor-add")?.addEventListener("click", () => {
      rows?.appendChild(createEditorRow(day, { name: "", sets: "", sTier: false }));
    });
    routineEditorBody.appendChild(dayBlock);
  });
}

function collectRoutineFromEditor(): RoutineByDay {
  return dayOrder.reduce((acc, day) => {
    const rows =
      routineEditorBody?.querySelectorAll<HTMLElement>(
        `.routine__editor-day[data-day="${day}"] .routine__editor-row`
      ) || [];
    acc[day] = Array.from(rows)
      .map((row) => ({
        name: row.querySelector<HTMLInputElement>('[data-field="name"]')?.value.trim() || "",
        sets: row.querySelector<HTMLInputElement>('[data-field="sets"]')?.value.trim() || "",
        sTier: row.querySelector<HTMLSelectElement>('[data-field="tier"]')?.value === "yes"
      }))
      .filter((entry) => entry.name.length > 0);
    return acc;
  }, {} as RoutineByDay);
}

function openRoutineEditor(): void {
  if (!routineEditorModal) return;
  renderRoutineEditor();
  routineEditorModal.classList.add("routine__modal--open");
  routineEditorModal.setAttribute("aria-hidden", "false");
  updateAppShellVisibility();
}

function closeRoutineEditor(): void {
  if (!routineEditorModal) return;
  routineEditorModal.classList.remove("routine__modal--open");
  routineEditorModal.setAttribute("aria-hidden", "true");
  updateAppShellVisibility();
}

routineEditOpen?.addEventListener("click", openRoutineEditor);
routineEditorOverlay?.addEventListener("click", closeRoutineEditor);
routineEditorClose?.addEventListener("click", closeRoutineEditor);
routineEditorSave?.addEventListener("click", async () => {
  const routine = collectRoutineFromEditor();
  saveCustomRoutine(routine);
  if (socialUserId) {
    const templateId = await saveUserRoutineTemplate(socialUserId, routine);
    await assignTemplateToUser(socialUserId, templateId, loadPlannedWorkoutDay());
  }
  window.location.reload();
});
routineEditorReset?.addEventListener("click", () => {
  clearCustomRoutine();
  window.location.reload();
});

function openSettingsPage(): void {
  setHomeVisible(false);
  setSettingsVisible(true);
  socialModal?.classList.remove("routine__modal--open");
  socialModal?.setAttribute("aria-hidden", "true");
  void refreshSocialData();
}

async function runWithBusyState(
  button: HTMLButtonElement | null,
  action: () => Promise<void>
): Promise<void> {
  if (!button) {
    await action();
    return;
  }
  button.disabled = true;
  button.classList.add("routine__btn--busy");
  try {
    await action();
  } finally {
    button.disabled = false;
    button.classList.remove("routine__btn--busy");
  }
}

socialUiController = initSocialController({
  pageType,
  socialModal,
  socialOpen,
  socialClose,
  socialLogout,
  socialSaveUsername,
  socialUsername,
  socialSendRequest,
  socialFriendUsername,
  socialAuthStatus,
  socialCheckinOpenSports,
  socialCheckinMissed,
  socialCheckinDate,
  socialCheckinFeedback,
  socialSportPicker,
  socialSportPickerClose,
  socialSportSearch,
  socialSportOptions,
  socialSportEmpty,
  setHomeVisible,
  setSettingsVisible,
  updateAppShellVisibility,
  refreshSocialData,
  runWithBusyState,
  getSupabaseClientFromSavedConfig,
  forceRedirectToLoginPage,
  showToast,
  loadCustomRoutine,
  getDefaultRoutine: () => defaultRoutine,
  saveProfileUsername,
  signOutSession,
  findUserIdByUsername,
  areUsersFriends,
  hasPendingFriendRequest,
  sendFriendRequest,
  getSessionUser,
  loadUserActivityLogsInRange,
  submitDailyCheckin
});
settingsBackHome?.addEventListener("click", () => {
  setSettingsVisible(false);
  setHomeVisible(true);
});
settingsBackHomeBottom?.addEventListener("click", () => {
  setSettingsVisible(false);
  setHomeVisible(true);
});
bindAuthFormActions(
  {
    authGateSignIn,
    authGateSignUp,
    authGateLoginGoogle,
    socialSignIn,
    socialSignUp,
    socialLoginGoogle
  },
  {
    authGateSignIn: async () => {
      await runWithBusyState(authGateSignIn, async () => {
        if (!supabaseClient || !authGateEmail || !authGatePassword) return;
        const email = authGateEmail.value.trim();
        const password = authGatePassword.value;
        if (!email || !password) {
          if (authGateStatus) authGateStatus.textContent = "Email and password are required.";
          showToast("Email and password are required.", "error");
          return;
        }
        const { error } = await signInWithPassword(email, password);
        if (error) {
          if (authGateStatus) authGateStatus.textContent = error.message;
          showToast(error.message, "error");
          return;
        }
        showToast("Signed in successfully.", "success");
      });
    },
    authGateSignUp: async () => {
      await runWithBusyState(authGateSignUp, async () => {
        if (!supabaseClient || !authGateEmail || !authGatePassword) return;
        const email = authGateEmail.value.trim();
        const password = authGatePassword.value;
        if (!email || !password) {
          if (authGateStatus) authGateStatus.textContent = "Email and password are required.";
          showToast("Email and password are required.", "error");
          return;
        }
        const { error } = await signUpWithPassword(email, password);
        if (authGateStatus) {
          authGateStatus.textContent = error
            ? error.message
            : "Sign up successful. Check your email if confirmation is enabled.";
        }
        showToast(
          error ? error.message : "Sign up successful. Check your email if confirmation is enabled.",
          error ? "error" : "success"
        );
      });
    },
    authGateGoogle: async () => {
      await runWithBusyState(authGateLoginGoogle, async () => {
        if (!supabaseClient) return;
        await signInWithGoogle(window.location.origin + window.location.pathname);
      });
    },
    socialSignIn: async () => {
      await runWithBusyState(socialSignIn, async () => {
        const setup = getSupabaseClientFromSavedConfig();
        if (!setup || !socialEmail || !socialPassword) return;
        const email = socialEmail.value.trim();
        const password = socialPassword.value;
        if (!email || !password) {
          if (socialAuthStatus) socialAuthStatus.textContent = "Email and password are required.";
          return;
        }
        const { error } = await signInWithPassword(email, password);
        if (error && socialAuthStatus) socialAuthStatus.textContent = error.message;
      });
    },
    socialSignUp: async () => {
      await runWithBusyState(socialSignUp, async () => {
        const setup = getSupabaseClientFromSavedConfig();
        if (!setup || !socialEmail || !socialPassword) return;
        const email = socialEmail.value.trim();
        const password = socialPassword.value;
        if (!email || !password) {
          if (socialAuthStatus) socialAuthStatus.textContent = "Email and password are required.";
          return;
        }
        const { error } = await signUpWithPassword(email, password);
        if (socialAuthStatus) {
          socialAuthStatus.textContent = error
            ? error.message
            : "Sign up successful. Check your email if confirmation is enabled.";
        }
      });
    },
    socialGoogle: async () => {
      await runWithBusyState(socialLoginGoogle, async () => {
        const setup = getSupabaseClientFromSavedConfig();
        if (!setup) {
          if (socialAuthStatus) socialAuthStatus.textContent = "Missing Supabase env config.";
          return;
        }
        await signInWithGoogle(window.location.origin + window.location.pathname);
      });
    }
  }
);

authGateSaveUsername?.addEventListener("click", async () => {
  await runWithBusyState(authGateSaveUsername, async () => {
    if (!supabaseClient || !socialUserId || !authGateUsername) return;
    const username = authGateUsername.value.trim();
    if (!username) {
      if (authGateStatus) authGateStatus.textContent = "Username is required.";
      showToast("Username is required.", "error");
      return;
    }
    const { error } = await saveProfileUsername(socialUserId, username);
    if (error) {
      if (authGateStatus) authGateStatus.textContent = error.message;
      showToast(error.message, "error");
      return;
    }
    setAuthGateVisible(false);
    setAuthGateOnboarding(false);
    setHomeVisible(true);
    if (socialUsername) socialUsername.value = username;
    await uploadCurrentStateForUser(socialUserId);
    await refreshSocialData();
    showToast("Username saved.", "success");
  });
});

authGatePassword?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  authGateSignIn?.click();
});

authGateEmail?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  authGateSignIn?.click();
});

bindHomeScreenActions(
  {
    homeScreen,
    homeOpenRoutine,
    homeStartToday,
    homeOpenLeaderboard,
    homeOpenSettings
  },
  {
    openRoutine: () => {
      window.location.href = "./?page=full-routine";
    },
    startToday: () => {
      window.location.href = "./?page=workout";
    },
    openLeaderboard: () => {
      window.location.href = "./?page=social";
    },
    openSettings: () => {
      openSettingsPanel(openSettingsPage);
    }
  }
);

function highlightToday(): void {
  const key = getTodayKey();
  if (!key) return;
  const card = document.querySelector<HTMLElement>(`.routine__day-card[data-day="${key}"]`);
  if (card) {
    card.classList.add("routine__day-card--today");
  }
}

highlightToday();
const storedTimer = loadRestTimerState();
if (storedTimer) {
  restTimerSeconds = Math.max(storedTimer.seconds || 0, 0);
  restTimerTarget = storedTimer.target && storedTimer.target > 0 ? storedTimer.target : null;
  restTimerRunning = Boolean(storedTimer.running);
  restTimerEndAt = storedTimer.endAt || null;
  if (restTimerRunning && restTimerEndAt) {
    syncRestTimerFromClock(false);
    if (restTimerRunning) {
      restTimerId = window.setInterval(() => {
        syncRestTimerFromClock(true);
      }, 1000);
    }
  } else {
    syncTimePickerFromSeconds(restTimerSeconds);
    updateRestTimerDisplay();
  }
} else {
  syncTimePickerFromSeconds(restTimerSeconds);
  updateRestTimerDisplay();
}

const initialPlannedDay = loadPlannedWorkoutDay();
dayController.setActiveDayView(initialPlannedDay);
if (pageType === "full-routine") {
  document.body.classList.add("routine--full-routine-mode");
  showAllDays();
} else {
  document.body.classList.remove("routine--full-routine-mode");
  showDay(initialPlannedDay);
}
if (pageType !== "reto") {
  void initAuthAutoSync();
  void refreshSocialData();
}

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    syncRestTimerFromClock(true);
    void refreshSocialData();
  }
});

window.addEventListener("pageshow", () => {
  syncRestTimerFromClock(true);
});


weeklyDays.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.weekDay;
    if (!target) return;
    const targetDay = target as DayKey;
    dayController.setActiveDayView(targetDay);
    if (dayController.getViewMode() === "today") {
      showDay(targetDay);
      savePlannedWorkoutDay(targetDay);
      if (socialUserId) {
        void updateUserPlannedDay(socialUserId, targetDay);
      }
      return;
    }
    showAllDays();
  });
});

dayResetButtons.forEach((btn) => {
  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    const target = btn.dataset.dayClear;
    if (!target) return;
    resetDayChecks(target as DayKey);
  });
});

logo?.addEventListener("click", () => {
  const plannedDay = loadPlannedWorkoutDay();
  dayController.setActiveDayView(plannedDay);
  document.body.classList.remove("routine--full-routine-mode");
  showDay(plannedDay);
});

goHome?.addEventListener("click", () => {
  setHomeVisible(true);
});

items.forEach((item) => {
  const check = item.querySelector<HTMLElement>(".routine__exercise-check");
  const dayCard = item.closest<HTMLElement>(".routine__day-card");
  const dayKey = (dayCard?.dataset.day || "monday") as DayKey;
  const nameEl = item.querySelector(".routine__exercise-name");
  const exerciseName = nameEl?.textContent?.trim() || "";
  check?.addEventListener("click", () => {
    updateDayProgress(dayKey);
    const allRows = dayCard?.querySelectorAll<HTMLElement>(".routine__exercise-item");
    if (allRows) {
      const done = [...allRows].filter((r) =>
        r.classList.contains("routine__exercise-item--done")
      ).length;
      if (done === allRows.length && allRows.length > 0) {
        if (loadPlannedWorkoutDay() === dayKey) {
          const nextPlannedDay = getNextDay(dayKey);
          savePlannedWorkoutDay(nextPlannedDay);
          if (socialUserId) {
            void updateUserPlannedDay(socialUserId, nextPlannedDay);
          }
        }
        notifyTimerDone();
      }
    }
    if (exerciseName) updateDayProgress(dayKey);
  });
});

setupAudioUnlock();
initTimePickerWheels();
updateTimerControlsState();
initThemeControls();
