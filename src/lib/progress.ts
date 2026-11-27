import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DrillRecord = {
  id: string;
  speedup: number;
  lpips: number;
  eligible: boolean;
  note: string;
  at: string;
};

type Progress = {
  quizzes: Record<string, { correct: number; total: number }>;
  bugs: Record<string, { correct: number; total: number }>;
  drills: DrillRecord[];
  setQuiz: (id: string, correct: number, total: number) => void;
  setBugs: (id: string, correct: number, total: number) => void;
  addDrill: (row: Omit<DrillRecord, "id" | "at">) => void;
};

export const useProgress = create<Progress>()(
  persist(
    (set) => ({
      quizzes: {},
      bugs: {},
      drills: [],
      setQuiz: (id, correct, total) =>
        set((s) => ({ quizzes: { ...s.quizzes, [id]: { correct, total } } })),
      setBugs: (id, correct, total) =>
        set((s) => ({ bugs: { ...s.bugs, [id]: { correct, total } } })),
      addDrill: (row) =>
        set((s) => ({
          drills: [
            {
              ...row,
              id: `${Date.now()}`,
              at: new Date().toISOString(),
            },
            ...s.drills,
          ].slice(0, 20),
        })),
    }),
    { name: "kerneldojo-progress" },
  ),
);
