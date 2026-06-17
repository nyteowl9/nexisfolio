"use client";

import { createContext, useContext } from "react";
import type { Prefs } from "@/lib/db/prefs";

export interface PrefsCtxValue {
  prefs: Prefs;
  update: (patch: Partial<Prefs>) => void;
  openSettings: () => void;
}

export const PrefsCtx = createContext<PrefsCtxValue | null>(null);

export function usePrefs(): PrefsCtxValue {
  const c = useContext(PrefsCtx);
  if (!c) throw new Error("usePrefs must be used within PrefsProvider");
  return c;
}
