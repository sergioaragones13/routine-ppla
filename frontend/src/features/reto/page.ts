import { dayOrder, defaultRoutineByDay } from "../../data/routine";
import { getSessionUser, loadUserActivityLogsInRange, type ActivityLogType } from "../../services/backendApi";

type DayStatus = "pending" | "trained" | "failed";

type ChallengeState = {
  startDateIso: string;
  endDateIso: string;
};

const challengeStorageKey = "routine__challenge_state_v2";
const challengeGoalDays = 100;
const dayToWeekdayMon0: Record<(typeof dayOrder)[number], number> = {
  monday: 0,
  tuesday: 1,
  wednesday: 2,
  thursday: 3,
  friday: 4,
  saturday: 5,
  sunday: 6
};
const routineTrainingWeekdays = dayOrder
  .filter((day) => (defaultRoutineByDay[day] || []).length > 0)
  .map((day) => dayToWeekdayMon0[day]);

function toLocalIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromIsoToLocalDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map((value) => Number(value));
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function firstDayOfMonth(year: number, monthIndex: number): Date {
  return new Date(year, monthIndex, 1);
}

function mondayIndex(date: Date): number {
  const js = date.getDay(); // 0=Sun
  return (js + 6) % 7; // 0=Mon
}

function isoWeekdayMon0(iso: string): number {
  return mondayIndex(fromIsoToLocalDate(iso));
}

function rangeDates(startIso: string, endIso: string): string[] {
  const start = fromIsoToLocalDate(startIso);
  const end = fromIsoToLocalDate(endIso);
  if (start.getTime() > end.getTime()) return [];
  const result: string[] = [];
  let cursor = new Date(start);
  while (cursor.getTime() <= end.getTime()) {
    result.push(toLocalIso(cursor));
    cursor = addDays(cursor, 1);
  }
  return result;
}

function loadChallengeState(): ChallengeState | null {
  try {
    const raw = window.localStorage.getItem(challengeStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChallengeState;
    if (!parsed?.startDateIso || !parsed?.endDateIso) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveChallengeState(state: ChallengeState): void {
  window.localStorage.setItem(challengeStorageKey, JSON.stringify(state));
}

export function initRetoPage(): void {
  const startInput = document.getElementById("challengeStartInput") as HTMLInputElement | null;
  const endInput = document.getElementById("challengeEndInput") as HTMLInputElement | null;
  const saveBtn = document.getElementById("challengeStartBtn") as HTMLButtonElement | null;
  const calendar = document.getElementById("challengeCalendar") as HTMLElement | null;
  const meta = document.getElementById("challengeMeta") as HTMLElement | null;
  const progress = document.getElementById("challengeProgress") as HTMLElement | null;
  const prevMonthBtn = document.getElementById("challengePrevMonth") as HTMLButtonElement | null;
  const nextMonthBtn = document.getElementById("challengeNextMonth") as HTMLButtonElement | null;
  const monthLabel = document.getElementById("challengeMonthLabel") as HTMLElement | null;
  const openSettingsBtn = document.getElementById("challengeOpenSettings") as HTMLButtonElement | null;
  const settingsModal = document.getElementById("challengeSettingsModal") as HTMLElement | null;
  const settingsCloseBtn = document.getElementById("challengeSettingsClose") as HTMLButtonElement | null;
  const setupSection = document.getElementById("challengeSetup") as HTMLElement | null;

  if (
    !startInput ||
    !endInput ||
    !saveBtn ||
    !calendar ||
    !meta ||
    !progress ||
    !prevMonthBtn ||
    !nextMonthBtn ||
    !monthLabel ||
    !openSettingsBtn ||
    !settingsModal ||
    !settingsCloseBtn ||
    !setupSection
  )
    return;

  let state = loadChallengeState();
  let socialStatusByIso: Record<string, DayStatus> = {};
  let socialActivityLabelByIso: Record<string, string> = {};
  let socialRangeKey = "";
  const todayIso = toLocalIso(new Date());
  let monthCursor = firstDayOfMonth(new Date().getFullYear(), new Date().getMonth());
  startInput.value = state?.startDateIso || todayIso;
  endInput.value = state?.endDateIso || toLocalIso(addDays(new Date(), 29));

  if (state) {
    const startDate = fromIsoToLocalDate(state.startDateIso);
    const endDate = fromIsoToLocalDate(state.endDateIso);
    const todayDate = fromIsoToLocalDate(todayIso);
    const todayInChallengeRange =
      todayDate.getTime() >= startDate.getTime() && todayDate.getTime() <= endDate.getTime();
    monthCursor = todayInChallengeRange
      ? firstDayOfMonth(todayDate.getFullYear(), todayDate.getMonth())
      : firstDayOfMonth(startDate.getFullYear(), startDate.getMonth());
  }

  const closeSettingsModal = (): void => {
    settingsModal.classList.remove("routine__confirm-modal--open");
    settingsModal.setAttribute("aria-hidden", "true");
  };

  const openSettingsModal = (): void => {
    settingsModal.classList.add("routine__confirm-modal--open");
    settingsModal.setAttribute("aria-hidden", "false");
    startInput.focus();
  };

  const render = (): void => {
    if (!state) {
      calendar.innerHTML = `<div class="routine__challenge-empty">Set a date range to build your challenge calendar.</div>`;
      meta.textContent = "No active challenge yet.";
      progress.textContent = `0/${challengeGoalDays} goal · 0 failed`;
      monthLabel.textContent = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(monthCursor);
      return;
    }

    const activeState = state;

    const days = rangeDates(activeState.startDateIso, activeState.endDateIso);
    const scheduledDays = days.filter((iso) => routineTrainingWeekdays.includes(isoWeekdayMon0(iso)));
    const extraTrainedDays = days.filter(
      (iso) => !scheduledDays.includes(iso) && socialStatusByIso[iso] === "trained"
    );
    const trackedDays = [...new Set([...scheduledDays, ...extraTrainedDays])];

    const resolveStatus = (iso: string): DayStatus => socialStatusByIso[iso] || "pending";
    const trainedTotal = days.filter((iso) => resolveStatus(iso) === "trained").length;
    const remainingForGoal = Math.max(challengeGoalDays - trainedTotal, 0);

    const futureOrTodayDays = days.filter((iso) => iso >= todayIso);
    const scheduledFutureDays = futureOrTodayDays.filter((iso) =>
      routineTrainingWeekdays.includes(isoWeekdayMon0(iso))
    );
    const requiredTargetDays = [...scheduledFutureDays].slice(0, remainingForGoal);
    const requiredByIso = new Set(requiredTargetDays);

    const trained = trackedDays.filter((iso) => resolveStatus(iso) === "trained").length;
    const failed = trackedDays.filter((iso) => resolveStatus(iso) === "failed").length;
    const pending = Math.max(trackedDays.length - trained - failed, 0);

    meta.textContent = `Range: ${activeState.startDateIso} → ${activeState.endDateIso} (${days.length} days, ${trackedDays.length} tracked from routine + extra activity, read-only).`;
    progress.textContent = `${trainedTotal}/${challengeGoalDays} goal · ${failed} failed · ${pending} pending`;
    monthLabel.textContent = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(monthCursor);

    const cursorYear = monthCursor.getFullYear();
    const cursorMonth = monthCursor.getMonth();
    const monthStart = firstDayOfMonth(cursorYear, cursorMonth);
    const monthEnd = firstDayOfMonth(cursorYear, cursorMonth + 1);
    monthEnd.setDate(0);
    const offset = mondayIndex(monthStart);
    const totalDaysInMonth = monthEnd.getDate();
    const totalCells = Math.ceil((offset + totalDaysInMonth) / 7) * 7;

    calendar.innerHTML = Array.from({ length: totalCells }, (_, idx) => {
      if (idx < offset || idx >= offset + totalDaysInMonth) {
        return `<div class="routine__challenge-day routine__challenge-day--empty" aria-hidden="true"></div>`;
      }
      const dayNumber = idx - offset + 1;
      const dateObj = new Date(cursorYear, cursorMonth, dayNumber);
        const iso = toLocalIso(dateObj);
        const inRange = iso >= activeState.startDateIso && iso <= activeState.endDateIso;
        const scheduled = routineTrainingWeekdays.includes(isoWeekdayMon0(iso));
        const extraFromSocial = socialStatusByIso[iso] === "trained" && !scheduled;
        const informative = inRange && (scheduled || extraFromSocial);
        const isRestDay = inRange && !informative;
        const status = resolveStatus(iso);
        const requiredForGoal = requiredByIso.has(iso) && status !== "trained";
        const activityLabel = socialActivityLabelByIso[iso] || "";
        const restSleepMarkup = isRestDay
          ? `<span class="routine__challenge-day-sleep" aria-hidden="true">
              <span class="routine__challenge-day-z routine__challenge-day-z--1">Z</span>
              <span class="routine__challenge-day-z routine__challenge-day-z--2">Z</span>
              <span class="routine__challenge-day-z routine__challenge-day-z--3">Z</span>
              <span class="routine__challenge-day-z routine__challenge-day-z--4">Z</span>
            </span>`
          : "";
        const classes = [
          "routine__challenge-day",
          inRange ? "routine__challenge-day--in-range" : "routine__challenge-day--disabled",
          isRestDay ? "routine__challenge-day--rest" : "",
          informative ? `routine__challenge-day--${status}` : "",
          requiredForGoal ? "routine__challenge-day--required" : "",
          extraFromSocial ? "routine__challenge-day--extra" : "",
          iso === todayIso ? "routine__challenge-day--today" : ""
        ]
          .filter(Boolean)
          .join(" ");
        return `
          <button
            type="button"
            class="${classes}"
            data-challenge-date="${iso}"
            disabled
            aria-label="Status for ${iso}"
          >
            <span class="routine__challenge-day-number">${dateObj.getDate()}</span>
            <span class="routine__challenge-day-activity">${
              activityLabel || (requiredForGoal ? "Goal" : "")
            }</span>
            ${restSleepMarkup}
            <span class="routine__challenge-day-dot"></span>
          </button>
        `;
      })
      .join("");
  };

  saveBtn.addEventListener("click", () => {
    const startIso = startInput.value || todayIso;
    const endIso = endInput.value || startIso;
    if (fromIsoToLocalDate(startIso).getTime() > fromIsoToLocalDate(endIso).getTime()) {
      meta.textContent = "End date must be after start date.";
      return;
    }
    state = { startDateIso: startIso, endDateIso: endIso };
    monthCursor = firstDayOfMonth(fromIsoToLocalDate(startIso).getFullYear(), fromIsoToLocalDate(startIso).getMonth());
    saveChallengeState(state);
    void syncSocialRange(true);
    render();
    closeSettingsModal();
  });

  openSettingsBtn.addEventListener("click", () => {
    openSettingsModal();
  });

  settingsCloseBtn.addEventListener("click", () => {
    closeSettingsModal();
  });

  settingsModal.addEventListener("click", (event) => {
    if (event.target === settingsModal) {
      closeSettingsModal();
    }
  });

  prevMonthBtn.addEventListener("click", () => {
    monthCursor = firstDayOfMonth(monthCursor.getFullYear(), monthCursor.getMonth() - 1);
    render();
  });

  nextMonthBtn.addEventListener("click", () => {
    monthCursor = firstDayOfMonth(monthCursor.getFullYear(), monthCursor.getMonth() + 1);
    render();
  });

  const syncSocialRange = async (force = false): Promise<void> => {
    if (!state) return;
    const key = `${state.startDateIso}:${state.endDateIso}`;
    if (!force && key === socialRangeKey) return;
    const user = await getSessionUser();
    if (!user?.id) {
      socialStatusByIso = {};
      socialActivityLabelByIso = {};
      socialRangeKey = key;
      render();
      return;
    }
    const logs = await loadUserActivityLogsInRange(user.id, state.startDateIso, state.endDateIso);
    const nextMap: Record<string, DayStatus> = {};
    const nextLabelMap: Record<string, string> = {};
    logs.forEach((row) => {
      const dateIso = row.dateIso;
      const mode = row.activityType as ActivityLogType;
      if (!dateIso) return;
      if (mode === "gym" || mode === "extra") {
        nextMap[dateIso] = "trained";
        nextLabelMap[dateIso] = mode === "gym" ? "Gym" : row.sportName || "Extra";
        return;
      }
      if (mode === "missed" && !nextMap[dateIso]) {
        nextMap[dateIso] = "failed";
        nextLabelMap[dateIso] = "Missed";
      }
    });
    socialStatusByIso = nextMap;
    socialActivityLabelByIso = nextLabelMap;
    socialRangeKey = key;
    render();
  };

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      void syncSocialRange(true);
    }
  });

  render();
  if (!state) {
    openSettingsModal();
  }
  void syncSocialRange(true);
}
