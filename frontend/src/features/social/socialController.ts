import { defaultRoutineByDay, type DayKey } from "../../data/routine";

type ToastKind = "success" | "error" | "info";
type CheckinMode = "gym" | "extra" | "missed";

type SupabaseSetup = { client: { auth: { getSession: () => Promise<{ data: { session: { user?: { id?: string } } | null } }> } } };

type SocialControllerDeps = {
  pageType: string;
  socialModal: HTMLElement | null;
  socialOpen: HTMLButtonElement | null;
  socialClose: HTMLElement | null;
  socialLogout: HTMLButtonElement | null;
  socialSaveUsername: HTMLButtonElement | null;
  socialUsername: HTMLInputElement | null;
  socialSendRequest: HTMLButtonElement | null;
  socialFriendUsername: HTMLInputElement | null;
  socialAuthStatus: HTMLElement | null;
  socialCheckinOpenSports: HTMLButtonElement | null;
  socialCheckinMissed: HTMLButtonElement | null;
  socialCheckinDate: HTMLInputElement | null;
  socialCheckinFeedback: HTMLElement | null;
  socialSportPicker: HTMLElement | null;
  socialSportPickerClose: HTMLButtonElement | null;
  socialSportSearch: HTMLInputElement | null;
  socialSportOptions: NodeListOf<HTMLButtonElement>;
  socialSportEmpty: HTMLElement | null;
  setHomeVisible: (visible: boolean) => void;
  setSettingsVisible: (visible: boolean) => void;
  updateAppShellVisibility: () => void;
  refreshSocialData: () => Promise<void>;
  runWithBusyState: (button: HTMLButtonElement | null, action: () => Promise<void>) => Promise<void>;
  getSupabaseClientFromSavedConfig: () => SupabaseSetup | null;
  forceRedirectToLoginPage: () => void;
  showToast: (message: string, kind?: ToastKind) => void;
  loadCustomRoutine: () => Record<DayKey, Array<unknown>> | null;
  getDefaultRoutine: () => Record<DayKey, Array<unknown>> | null;
  saveProfileUsername: (userId: string, username: string) => Promise<unknown>;
  signOutSession: () => Promise<unknown>;
  findUserIdByUsername: (username: string) => Promise<string | null>;
  areUsersFriends: (userId: string, otherUserId: string) => Promise<boolean>;
  hasPendingFriendRequest: (userId: string, otherUserId: string) => Promise<boolean>;
  sendFriendRequest: (fromUser: string, toUser: string) => Promise<{ error?: { code?: string; message?: string } | null }>;
  getSessionUser: () => Promise<{ id?: string } | null>;
  loadUserActivityLogsInRange: (
    userId: string,
    startDateIso: string,
    endDateIso: string
  ) => Promise<Array<{ dateIso: string; activityType: CheckinMode; sportName: string | null }>>;
  submitDailyCheckin: (
    didTrain: boolean,
    dateIso: string,
    mode: CheckinMode,
    sportName: string | null
  ) => Promise<{ error?: { message?: string } | null }>;
};

export function initSocialController(
  deps: SocialControllerDeps
): { closeSportPicker: () => void; closeSocialModal: () => void } {
  const {
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
    getDefaultRoutine,
    saveProfileUsername,
    signOutSession,
    findUserIdByUsername,
    areUsersFriends,
    hasPendingFriendRequest,
    sendFriendRequest,
    getSessionUser,
    loadUserActivityLogsInRange,
    submitDailyCheckin
  } = deps;

  function toLocalIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function addDays(date: Date, amount: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + amount);
    return next;
  }

  function firstDayOfMonth(year: number, monthIndex: number): Date {
    return new Date(year, monthIndex, 1);
  }

  function mondayIndex(date: Date): number {
    const jsDay = date.getDay();
    return (jsDay + 6) % 7;
  }

  function fromIsoToLocalDate(iso: string): Date {
    const [year, month, day] = iso.split("-").map((value) => Number(value));
    return new Date(year, month - 1, day);
  }

  function startOfWeek(date: Date): Date {
    return addDays(date, -mondayIndex(date));
  }

  const socialCalendar = document.getElementById("socialCheckinCalendar") as HTMLElement | null;
  const socialCalendarWeekLabel = document.getElementById("socialCalendarWeekLabel") as HTMLElement | null;
  const socialCalendarPrevBtn = document.getElementById("socialCalendarPrevWeek") as HTMLButtonElement | null;
  const socialCalendarNextBtn = document.getElementById("socialCalendarNextWeek") as HTMLButtonElement | null;
  let selectedDateIso = toLocalIsoDate(new Date());
  let weekCursor = startOfWeek(new Date());
  let weekStatusByIso: Record<string, CheckinMode | null> = {};

  function renderCheckinCalendar(): void {
    if (!socialCalendar || !socialCalendarWeekLabel) return;
    const todayIso = toLocalIsoDate(new Date());
    const weekStart = startOfWeek(weekCursor);
    const weekEnd = addDays(weekStart, 6);
    const weekStartLabel = new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "short" }).format(
      weekStart
    );
    const weekEndLabel = new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(weekEnd);
    socialCalendarWeekLabel.textContent = `${weekStartLabel} - ${weekEndLabel}`;
    const cells = Array.from({ length: 7 }, (_, idx) => addDays(weekStart, idx));
    socialCalendar.innerHTML = cells
      .map((dateObj) => {
        const iso = toLocalIsoDate(dateObj);
        const isToday = iso === todayIso;
        const isSelected = iso === selectedDateIso;
        const isFuture = iso > todayIso;
        const status = weekStatusByIso[iso] || null;
        const className = [
          "routine__social-calendar-day",
          isToday ? "routine__social-calendar-day--today" : "",
          isSelected ? "routine__social-calendar-day--selected" : "",
          status === "gym" || status === "extra" ? "routine__social-calendar-day--trained" : "",
          status === "missed" ? "routine__social-calendar-day--missed" : "",
          !status && !isFuture ? "routine__social-calendar-day--pending" : ""
        ]
          .filter(Boolean)
          .join(" ");
        return `<button type="button" class="${className}" data-social-date="${iso}" ${
          isFuture ? "disabled" : ""
        }><span>${dateObj.getDate()}</span><span class="routine__social-calendar-dot"></span></button>`;
      })
      .join("");
  }

  async function syncWeekStatuses(): Promise<void> {
    const weekStart = startOfWeek(weekCursor);
    const weekEnd = addDays(weekStart, 6);
    const fromIso = toLocalIsoDate(weekStart);
    const toIso = toLocalIsoDate(weekEnd);
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      weekStatusByIso = {};
      renderCheckinCalendar();
      return;
    }
    const logs = await loadUserActivityLogsInRange(sessionUser.id, fromIso, toIso);
    const nextMap: Record<string, CheckinMode | null> = {};
    logs.forEach((entry) => {
      if (!entry.dateIso) return;
      nextMap[entry.dateIso] = entry.activityType;
    });
    weekStatusByIso = nextMap;
    renderCheckinCalendar();
  }

  function setCheckinFeedback(message: string, kind: "success" | "error"): void {
    if (!socialCheckinFeedback) return;
    socialCheckinFeedback.textContent = message;
    socialCheckinFeedback.classList.remove(
      "routine__checkin-feedback--success",
      "routine__checkin-feedback--error"
    );
    socialCheckinFeedback.classList.add(
      kind === "success" ? "routine__checkin-feedback--success" : "routine__checkin-feedback--error"
    );
  }

  function openSportPicker(): void {
    if (!socialSportPicker) return;
    socialSportPicker.classList.add("routine__sport-picker--open");
    socialSportPicker.setAttribute("aria-hidden", "false");
    socialSportEmpty?.classList.add("routine__sport-empty--hidden");
    if (socialSportSearch) {
      socialSportSearch.value = "";
      socialSportOptions.forEach((option) => {
        option.style.display = "";
      });
      socialSportSearch.focus();
    }
  }

  function closeSportPicker(): void {
    if (!socialSportPicker) return;
    socialSportPicker.classList.remove("routine__sport-picker--open");
    socialSportPicker.setAttribute("aria-hidden", "true");
  }

  function resolveSelectedCheckinDate(): string {
    const now = new Date();
    const todayIso = toLocalIsoDate(now);
    const selected = selectedDateIso || socialCheckinDate?.value || todayIso;
    const selectedDate = new Date(`${selected}T00:00:00`);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const diffDays = Math.floor((todayStart - selectedDate.getTime()) / 86400000);

    if (Number.isNaN(diffDays) || diffDays < 0) {
      setCheckinFeedback("You can only register today or past dates.", "error");
      return "";
    }
    return selected;
  }

  function dayKeyFromIsoDate(dateIso: string): DayKey {
    const date = new Date(`${dateIso}T00:00:00`);
    const jsDay = date.getDay();
    const dayByJsIndex: DayKey[] = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday"
    ];
    return dayByJsIndex[jsDay] || "monday";
  }

  function isRoutineTrainingDay(dateIso: string): boolean {
    const dayKey = dayKeyFromIsoDate(dateIso);
    const activeRoutine = loadCustomRoutine() || getDefaultRoutine() || defaultRoutineByDay;
    const exercises = activeRoutine[dayKey] || [];
    return exercises.length > 0;
  }

  async function submitSocialCheckin(
    didTrain: boolean,
    mode: CheckinMode,
    label: string,
    points: number
  ): Promise<void> {
    const setup = getSupabaseClientFromSavedConfig();
    if (!setup) return;
    const targetDate = resolveSelectedCheckinDate();
    if (!targetDate) return;
    if (mode === "gym" && !isRoutineTrainingDay(targetDate)) {
      const message = `Gym is only allowed on routine days. Use extra for ${targetDate}.`;
      setCheckinFeedback(message, "error");
      showToast(message, "error");
      return;
    }
    const sessionUser = await getSessionUser();
    if (!sessionUser?.id) {
      setCheckinFeedback("You must be logged in to register activity.", "error");
      return;
    }
    const sportName = didTrain ? label : null;
    const { error } = await submitDailyCheckin(didTrain, targetDate, mode, sportName);
    if (error) {
      setCheckinFeedback(error.message || "Check-in failed.", "error");
      showToast(error.message || "Check-in failed.", "error");
      return;
    }
    const signedPoints = points > 0 ? `+${points}` : `${points}`;
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const targetMonthKey = targetDate.slice(0, 7);
    const outOfCurrentMonth = targetMonthKey !== currentMonthKey;
    const leaderboardHint = outOfCurrentMonth
      ? " Saved correctly, but it will count in that month leaderboard."
      : "";
    setCheckinFeedback(`${label} updated for ${targetDate} (${signedPoints} pts).${leaderboardHint}`, "success");
    showToast(`${label} updated for ${targetDate} (${signedPoints} pts).`, "success");
    await syncWeekStatuses();
    await refreshSocialData();
  }

  function openSocialModal(): void {
    if (!socialModal) return;
    setHomeVisible(false);
    setSettingsVisible(false);
    socialModal.classList.add("routine__modal--open");
    socialModal.setAttribute("aria-hidden", "false");
    updateAppShellVisibility();
    renderCheckinCalendar();
    void syncWeekStatuses();
    void refreshSocialData();
  }

  function closeSocialModal(): void {
    if (!socialModal) return;
    socialModal.classList.remove("routine__modal--open");
    socialModal.setAttribute("aria-hidden", "true");
    setHomeVisible(true);
    updateAppShellVisibility();
  }

  async function executeLogoutFlow(): Promise<void> {
    const setup = getSupabaseClientFromSavedConfig();
    if (!setup) {
      forceRedirectToLoginPage();
      return;
    }
    try {
      await signOutSession();
      await refreshSocialData();
    } catch (error) {
      if (socialAuthStatus) {
        socialAuthStatus.textContent = error instanceof Error ? error.message : "Logout failed.";
      }
      showToast(error instanceof Error ? error.message : "Logout failed.", "error");
    } finally {
      showToast("Session closed.", "info");
      forceRedirectToLoginPage();
    }
  }

  socialOpen?.addEventListener("click", openSocialModal);
  socialClose?.addEventListener("click", () => {
    if (pageType === "social") {
      window.location.href = "./?page=home";
      return;
    }
    closeSocialModal();
  });
  socialLogout?.addEventListener("click", async () => {
    await runWithBusyState(socialLogout, executeLogoutFlow);
  });

  socialSaveUsername?.addEventListener("click", async () => {
    const setup = getSupabaseClientFromSavedConfig();
    if (!setup) return;
    const { data: sessionData } = await setup.client.auth.getSession();
    const user = sessionData.session?.user;
    if (!user || !socialUsername) return;
    const username = socialUsername.value.trim();
    if (!username) return;
    await saveProfileUsername(user.id || "", username);
    await refreshSocialData();
  });

  socialSendRequest?.addEventListener("click", async () => {
    const setup = getSupabaseClientFromSavedConfig();
    const sessionUser = await getSessionUser();
    if (!setup || !socialFriendUsername || !sessionUser?.id) {
      if (socialAuthStatus) socialAuthStatus.textContent = "Login required to send friend requests.";
      showToast("Login required to send friend requests.", "error");
      return;
    }
    const username = socialFriendUsername.value.trim();
    if (!username) {
      if (socialAuthStatus) socialAuthStatus.textContent = "Type a username first.";
      showToast("Type a username first.", "error");
      return;
    }
    const targetUserId = await findUserIdByUsername(username);
    if (!targetUserId) {
      if (socialAuthStatus) socialAuthStatus.textContent = "Username not found.";
      showToast("Username not found.", "error");
      return;
    }
    if (targetUserId === sessionUser.id) {
      if (socialAuthStatus) socialAuthStatus.textContent = "You cannot add yourself.";
      showToast("You cannot add yourself.", "error");
      return;
    }
    const alreadyFriends = await areUsersFriends(sessionUser.id, targetUserId);
    if (alreadyFriends) {
      if (socialAuthStatus) socialAuthStatus.textContent = "You are already friends.";
      showToast("You are already friends.", "info");
      return;
    }
    const pending = await hasPendingFriendRequest(sessionUser.id, targetUserId);
    if (pending) {
      if (socialAuthStatus) socialAuthStatus.textContent = "A pending request already exists.";
      showToast("A pending request already exists.", "info");
      return;
    }
    const { error } = await sendFriendRequest(sessionUser.id, targetUserId);
    if (error) {
      if (socialAuthStatus) {
        socialAuthStatus.textContent =
          error.code === "23505"
            ? "Friend request already pending."
            : error.message || "Could not send request.";
      }
      showToast(
        error.code === "23505" ? "Friend request already pending." : error.message || "Could not send request.",
        "error"
      );
      return;
    }
    socialFriendUsername.value = "";
    if (socialAuthStatus) socialAuthStatus.textContent = "Request sent.";
    showToast("Friend request sent.", "success");
    await refreshSocialData();
  });

  socialCheckinOpenSports?.addEventListener("click", openSportPicker);
  socialCalendarPrevBtn?.addEventListener("click", () => {
    weekCursor = addDays(weekCursor, -7);
    void syncWeekStatuses();
  });
  socialCalendarNextBtn?.addEventListener("click", () => {
    weekCursor = addDays(weekCursor, 7);
    void syncWeekStatuses();
  });
  socialCalendar?.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>("[data-social-date]");
    if (!button?.dataset.socialDate) return;
    selectedDateIso = button.dataset.socialDate;
    weekCursor = startOfWeek(fromIsoToLocalDate(selectedDateIso));
    if (socialCheckinDate) socialCheckinDate.value = selectedDateIso;
    renderCheckinCalendar();
    setCheckinFeedback(`Selected date: ${selectedDateIso}`, "success");
  });
  socialSportPickerClose?.addEventListener("click", closeSportPicker);
  socialSportPicker?.addEventListener("click", (event) => {
    if (event.target === socialSportPicker) closeSportPicker();
  });
  socialSportOptions.forEach((option) => {
    option.addEventListener("click", async () => {
      const mode = (option.dataset.sportMode as "gym" | "extra" | undefined) || "extra";
      const label = option.dataset.sportLabel || "Training";
      const points = Number(option.dataset.sportPoints || "6");
      await submitSocialCheckin(true, mode, label, points);
      closeSportPicker();
    });
  });

  socialSportSearch?.addEventListener("input", () => {
    const query = socialSportSearch.value.trim().toLowerCase();
    let visibleCount = 0;
    socialSportOptions.forEach((option) => {
      const label = (option.dataset.sportLabel || "").toLowerCase();
      const visible = !query || label.includes(query);
      option.style.display = visible ? "" : "none";
      if (visible) visibleCount += 1;
    });
    socialSportEmpty?.classList.toggle("routine__sport-empty--hidden", visibleCount > 0);
  });

  if (socialCheckinDate) {
    socialCheckinDate.value = selectedDateIso;
  }
  renderCheckinCalendar();

  socialCheckinMissed?.addEventListener("click", async () => {
    await submitSocialCheckin(false, "missed", "Missed", -12);
  });

  return { closeSportPicker, closeSocialModal };
}
