"use client";

import { useState } from "react";
import { fmtUSD } from "@/lib/engine";
import { usePrefs } from "@/components/app/prefs-context";

const card: React.CSSProperties = { background: "var(--surface)", border: "var(--hair) solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)" };

function Ring({ pct }: { pct: number }) {
  const r = 34, c = 2 * Math.PI * r;
  const done = Math.max(0, Math.min(1, pct / 100));
  return (
    <svg width={84} height={84} viewBox="0 0 84 84" style={{ flex: "none" }}>
      <circle cx={42} cy={42} r={r} fill="none" stroke="var(--bg-sunk)" strokeWidth={9} />
      <circle cx={42} cy={42} r={r} fill="none" stroke={pct >= 100 ? "var(--pos)" : "var(--accent)"} strokeWidth={9} strokeLinecap="round" strokeDasharray={`${done * c} ${c}`} transform="rotate(-90 42 42)" />
      <text x={42} y={46} textAnchor="middle" fontSize={17} fontWeight={700} fill="var(--ink)" className="num">{Math.round(pct)}%</text>
    </svg>
  );
}

export function GoalCard({ net }: { net: number }) {
  const { prefs, update } = usePrefs();
  const goal = prefs.netWorthGoal || 0;
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(goal ? String(goal) : "");

  const save = () => { const n = parseFloat(val.replace(/[$,\s]/g, "")); update({ netWorthGoal: Number.isFinite(n) && n > 0 ? n : 0 }); setEditing(false); };

  if (!goal && !editing) {
    return (
      <div style={{ ...card, padding: "15px 19px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
        <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>Net-worth goal</div>
        <button onClick={() => setEditing(true)} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)", background: "var(--bg-sunk)", border: "var(--hair) solid var(--border)", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontFamily: "var(--font-sans)", width: "fit-content" }}>+ Set a goal</button>
      </div>
    );
  }

  if (editing) {
    return (
      <div style={{ ...card, padding: "15px 19px", display: "flex", flexDirection: "column", gap: 9 }}>
        <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>Net-worth goal</div>
        <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") save(); }} placeholder="1,500,000" style={{ width: "100%", padding: "8px 10px", border: "var(--hair) solid var(--border-strong)", borderRadius: 7, fontSize: 13, background: "var(--surface-2)", color: "var(--ink)", fontFamily: "var(--font-sans)", boxSizing: "border-box" }} />
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={save} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--accent-ink)", background: "var(--accent)", border: "none", borderRadius: 7, padding: "7px 13px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Save</button>
          <button onClick={() => { setEditing(false); setVal(goal ? String(goal) : ""); }} style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)", background: "var(--bg-sunk)", border: "none", borderRadius: 7, padding: "7px 13px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Cancel</button>
        </div>
      </div>
    );
  }

  const pct = goal > 0 ? (net / goal) * 100 : 0;
  const remaining = Math.max(0, goal - net);
  return (
    <div style={{ ...card, padding: "15px 19px", display: "flex", alignItems: "center", gap: 16 }}>
      <Ring pct={pct} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>Net-worth goal</span>
          <button onClick={() => setEditing(true)} style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-3)", background: "transparent", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}>edit</button>
        </div>
        <div className="num" style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-.01em", marginTop: 3 }}>{fmtUSD(goal)}</div>
        <div className="num" style={{ fontSize: 12, color: pct >= 100 ? "var(--pos)" : "var(--ink-3)", marginTop: 3 }}>{pct >= 100 ? "Goal reached 🎉" : `${fmtUSD(remaining)} to go`}</div>
      </div>
    </div>
  );
}
