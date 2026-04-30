import { describe, expect, it } from "vitest";
import { applyDailyResult } from "./scoring";

describe("applyDailyResult", () => {
  it("adds points and increments streak when training", () => {
    const result = applyDailyResult({ score: 20, streak: 2, bestStreak: 2 }, true);

    expect(result).toEqual({
      score: 30,
      streak: 3,
      bestStreak: 3
    });
  });

  it("resets streak and subtracts points when missing", () => {
    const result = applyDailyResult({ score: 35, streak: 4, bestStreak: 6 }, false);

    expect(result).toEqual({
      score: 23,
      streak: 0,
      bestStreak: 6
    });
  });

  it("uses custom scoring options", () => {
    const result = applyDailyResult({ score: 0, streak: 0, bestStreak: 0 }, true, {
      trainPoints: 5,
      missPoints: 3
    });

    expect(result).toEqual({
      score: 5,
      streak: 1,
      bestStreak: 1
    });
  });
});
