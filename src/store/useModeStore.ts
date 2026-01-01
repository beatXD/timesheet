import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppMode = "team" | "personal";

interface ModeState {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  toggleMode: () => void;
}

export const useModeStore = create<ModeState>()(
  persist(
    (set) => ({
      mode: "team",
      setMode: (mode) => set({ mode }),
      toggleMode: () =>
        set((state) => ({
          mode: state.mode === "team" ? "personal" : "team",
        })),
    }),
    {
      name: "timesheet-mode",
    }
  )
);
