"use client";

import { usePrefs } from "@/components/app/prefs-context";
import type { Prefs } from "@/lib/db/prefs";

const ACCENTS = ["#15171A", "#3E72F0", "#14A6A0", "#9466F0", "#E0992B"];

function Seg<T extends string>({ value, options, onChange }: { value: T; options: ({ value: T; label: string } | T)[]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "inline-flex", gap: 3, background: "var(--bg-sunk)", padding: 3, borderRadius: 8 }}>
      {options.map((o) => {
        const v = (typeof o === "string" ? o : o.value) as T;
        const label = typeof o === "string" ? o : o.label;
        return <button key={v} onClick={() => onChange(v)} style={{ padding: "6px 13px", fontSize: 12.5, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", textTransform: "capitalize", color: value === v ? "var(--ink)" : "var(--ink-3)", background: value === v ? "var(--surface)" : "transparent", boxShadow: value === v ? "var(--shadow)" : "none" }}>{label}</button>;
      })}
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 0", borderTop: "var(--hair) solid var(--border)" }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{label}</div>
        {hint && <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{hint}</div>}
      </div>
      <div style={{ flex: "none" }}>{children}</div>
    </div>
  );
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { prefs, update } = usePrefs();
  const set = <K extends keyof Prefs>(k: K, v: Prefs[K]) => update({ [k]: v });

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(10,12,14,.45)" }} />
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 400, maxWidth: "100%", background: "var(--bg)", borderLeft: "var(--hair) solid var(--border)", boxShadow: "-12px 0 40px rgba(0,0,0,.18)", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "var(--hair) solid var(--border)", background: "var(--surface)" }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Settings</span>
          <button onClick={onClose} style={{ background: "var(--bg-sunk)", border: "none", borderRadius: 7, width: 28, height: 28, cursor: "pointer", color: "var(--ink-2)", fontSize: 15 }}>✕</button>
        </div>
        <div style={{ padding: "6px 22px 24px" }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", paddingTop: 16 }}>Appearance</div>
          <Row label="Theme">
            <Seg value={prefs.theme} options={["light", "dark"]} onChange={(v) => set("theme", v)} />
          </Row>
          <Row label="Brand accent">
            <div style={{ display: "flex", gap: 8 }}>
              {ACCENTS.map((c) => (
                <button key={c} onClick={() => set("accent", c)} aria-label={c} style={{ width: 24, height: 24, borderRadius: 99, background: c, cursor: "pointer", border: prefs.accent === c ? "2px solid var(--ink)" : "var(--hair) solid var(--border)", outline: prefs.accent === c ? "2px solid var(--surface)" : "none", outlineOffset: -3 }} />
              ))}
            </div>
          </Row>

          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", paddingTop: 22 }}>Data display</div>
          <Row label="Allocation chart" hint="Donut or horizontal bars on Overview.">
            <Seg value={prefs.allocChart} options={["donut", "bars"]} onChange={(v) => set("allocChart", v)} />
          </Row>

          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", paddingTop: 22 }}>Tax</div>
          <Row label="Cost-basis method" hint="How sales match lots for realized gains.">
            <Seg value={prefs.costBasis} options={["FIFO", "LIFO", "HIFO"]} onChange={(v) => set("costBasis", v)} />
          </Row>

          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".06em", paddingTop: 22 }}>Tabs</div>
          <Row label="News tab" hint="Show the News tab in the nav.">
            <button onClick={() => set("showNews", !prefs.showNews)} style={{ width: 44, height: 24, borderRadius: 99, border: "none", cursor: "pointer", background: prefs.showNews ? "var(--accent)" : "var(--bg-sunk)", position: "relative", transition: "background .15s" }}>
              <span style={{ position: "absolute", top: 3, left: prefs.showNews ? 23 : 3, width: 18, height: 18, borderRadius: 99, background: "var(--surface)", transition: "left .15s", boxShadow: "var(--shadow)" }} />
            </button>
          </Row>

          <p style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 20, lineHeight: 1.5 }}>
            Saved to your account — preferences follow you across devices.
          </p>
        </div>
      </div>
    </div>
  );
}
