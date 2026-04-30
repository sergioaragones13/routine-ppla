import { dayOrder, type DayKey } from "../../data/routine";

type DayControllerDeps = {
  weeklyDays: NodeListOf<HTMLButtonElement>;
  updateDayProgress: (dayKey: string) => void;
};

export type DayController = {
  getTodayKey: () => DayKey;
  showDay: (dayKey: DayKey) => void;
  showAllDays: () => void;
  loadPlannedWorkoutDay: () => DayKey;
  savePlannedWorkoutDay: (day: DayKey) => void;
  getNextDay: (day: DayKey) => DayKey;
  getViewMode: () => "full" | "today";
  setActiveDayView: (day: DayKey) => void;
  getActiveDayView: () => DayKey;
  hydratePlannedDay: (day: DayKey) => void;
};

export function createDayController(deps: DayControllerDeps): DayController {
  const { weeklyDays, updateDayProgress } = deps;
  let currentViewMode: "full" | "today" = "today";
  let activeDayView: DayKey = "monday";
  let plannedDay: DayKey = "monday";

  const updateWeeklyActive = (dayKey: DayKey): void => {
    const todayKey = getTodayKey();
    weeklyDays.forEach((btn) => {
      btn.classList.toggle("routine__weekly-day--active", btn.dataset.weekDay === dayKey);
      btn.classList.toggle("routine__weekly-day--today", btn.dataset.weekDay === todayKey);
    });
  };

  const loadPlannedWorkoutDay = (): DayKey => {
    return plannedDay;
  };

  const savePlannedWorkoutDay = (day: DayKey): void => {
    plannedDay = day;
  };

  const getNextDay = (day: DayKey): DayKey => {
    const index = dayOrder.indexOf(day);
    if (index < 0) return "monday";
    return dayOrder[(index + 1) % dayOrder.length];
  };

  const getTodayKey = (): DayKey => {
    const weekday = new Date().getDay();
    if (weekday === 0) return "sunday";
    if (weekday === 1) return "monday";
    if (weekday === 2) return "tuesday";
    if (weekday === 3) return "wednesday";
    if (weekday === 4) return "thursday";
    if (weekday === 5) return "friday";
    if (weekday === 6) return "saturday";
    return "monday";
  };

  const showDay = (dayKey: DayKey): void => {
    currentViewMode = "today";
    activeDayView = dayKey;
    const cards = document.querySelectorAll<HTMLElement>(".routine__day-card");
    cards.forEach((card) => {
      const shouldShow = card.dataset.day === dayKey;
      card.style.display = shouldShow ? "" : "none";
      if (shouldShow) {
        card.classList.remove("routine__day-card--enter");
        window.requestAnimationFrame(() => {
          card.classList.add("routine__day-card--enter");
        });
      }
    });
    updateDayProgress(dayKey);
    updateWeeklyActive(dayKey);
  };

  const showAllDays = (): void => {
    currentViewMode = "full";
    const cards = document.querySelectorAll<HTMLElement>(".routine__day-card");
    cards.forEach((card) => {
      card.style.display = "";
    });
    dayOrder.forEach((day) => updateDayProgress(day));
    updateWeeklyActive(activeDayView);
  };

  return {
    getTodayKey,
    showDay,
    showAllDays,
    loadPlannedWorkoutDay,
    savePlannedWorkoutDay,
    getNextDay,
    getViewMode: () => currentViewMode,
    setActiveDayView: (day: DayKey) => {
      activeDayView = day;
    },
    getActiveDayView: () => activeDayView
    ,
    hydratePlannedDay: (day: DayKey) => {
      plannedDay = day;
    }
  };
}

