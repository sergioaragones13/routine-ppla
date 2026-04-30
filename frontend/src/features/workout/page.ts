import type { DayKey } from "../../data/routine";

export function openWorkoutPage(
  setHomeVisible: (visible: boolean) => void,
  showDay: (day: DayKey) => void,
  plannedDay: DayKey
): void {
  setHomeVisible(false);
  document.body.classList.remove("routine--full-routine-mode");
  showDay(plannedDay);
}

