export type UserStats = {
  score: number;
  streak: number;
  bestStreak: number;
};

export function applyDailyResult(
  stats: UserStats,
  didTrain: boolean,
  options: { trainPoints?: number; missPoints?: number } = {}
): UserStats {
  const trainPoints = options.trainPoints ?? 10;
  const missPoints = options.missPoints ?? 12;

  if (didTrain) {
    const nextStreak = stats.streak + 1;
    return {
      score: stats.score + trainPoints,
      streak: nextStreak,
      bestStreak: Math.max(stats.bestStreak, nextStreak)
    };
  }

  return {
    score: stats.score - missPoints,
    streak: 0,
    bestStreak: stats.bestStreak
  };
}
