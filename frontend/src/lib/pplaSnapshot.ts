export function getPplaSnapshot(): Record<string, string> {
  const snapshot: Record<string, string> = {};
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith("ppla_")) continue;
    const value = window.localStorage.getItem(key);
    if (value === null) continue;
    snapshot[key] = value;
  }
  return snapshot;
}

export function applyPplaSnapshot(snapshot: Record<string, string>): void {
  const currentKeys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (!key || !key.startsWith("ppla_")) continue;
    currentKeys.push(key);
  }
  currentKeys.forEach((key) => window.localStorage.removeItem(key));
  Object.entries(snapshot).forEach(([key, value]) => {
    window.localStorage.setItem(key, value);
  });
}
