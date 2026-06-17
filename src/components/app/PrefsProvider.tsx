"use client";

import { useState, type CSSProperties } from "react";
import type { Prefs } from "@/lib/db/prefs";
import { updatePrefs } from "@/lib/db/prefs-actions";
import { PrefsCtx } from "@/components/app/prefs-context";
import { AppHeader } from "@/components/app/AppHeader";
import { SettingsPanel } from "@/components/app/SettingsPanel";

const MONO = "#15171A";

export function PrefsProvider({ initial, email, children }: { initial: Prefs; email?: string; children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<Prefs>(initial);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const update = (patch: Partial<Prefs>) => {
    setPrefs((p) => ({ ...p, ...patch }));
    void updatePrefs(patch);
  };

  const accentVars: CSSProperties =
    prefs.accent && prefs.accent !== MONO
      ? ({ "--accent": prefs.accent, "--accent-ink": "#FFFFFF" } as CSSProperties)
      : {};

  return (
    <PrefsCtx.Provider value={{ prefs, update, openSettings: () => setSettingsOpen(true) }}>
      <div data-theme={prefs.theme} style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)", fontFamily: "var(--font-sans)", ...accentVars }}>
        <AppHeader email={email} />
        {children}
      </div>
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
    </PrefsCtx.Provider>
  );
}
