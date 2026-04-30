export function openFullRoutinePage(
  setHomeVisible: (visible: boolean) => void,
  showAllDays: () => void
): void {
  setHomeVisible(false);
  document.body.classList.add("routine--full-routine-mode");
  showAllDays();
}

