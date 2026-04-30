import type { DayKey } from "../data/routine";

export type ExercisePR = { weight: string; reps: string; rir: string };
export type SessionState = { startedAt: number | null };
export type RoutineExercise = { name: string; sets: string; sTier: boolean };
export type RoutineByDay = Record<DayKey, RoutineExercise[]>;
export type RestTimerState = {
  seconds: number;
  target: number | null;
  running: boolean;
  endAt: number | null;
  autoStart: boolean;
};
