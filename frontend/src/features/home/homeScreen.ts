export type HomeScreenElements = {
  homeScreen: HTMLElement | null;
  homeOpenRoutine: HTMLButtonElement | null;
  homeStartToday: HTMLButtonElement | null;
  homeOpenLeaderboard: HTMLButtonElement | null;
  homeOpenSettings: HTMLButtonElement | null;
};

export function setHomeScreenVisible(homeScreen: HTMLElement | null, visible: boolean): void {
  if (!homeScreen) return;
  homeScreen.classList.toggle("routine__home--hidden", !visible);
  homeScreen.setAttribute("aria-hidden", visible ? "false" : "true");
}

export function bindHomeScreenActions(
  elements: HomeScreenElements,
  actions: {
    openRoutine: () => void;
    startToday: () => void;
    openLeaderboard: () => void;
    openSettings: () => void;
  }
): void {
  elements.homeOpenRoutine?.addEventListener("click", actions.openRoutine);
  elements.homeStartToday?.addEventListener("click", actions.startToday);
  elements.homeOpenLeaderboard?.addEventListener("click", actions.openLeaderboard);
  elements.homeOpenSettings?.addEventListener("click", actions.openSettings);
}
