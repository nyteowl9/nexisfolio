"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Alert } from "@/app/api/alerts/route";

const color = (l: Alert["level"]) => l === "danger" ? "var(--neg)" : l === "warn" ? "var(--c-crypto)" : l === "pos" ? "var(--pos)" : l === "neg" ? "var(--neg)" : "var(--c-stocks)";

function Bell({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 1 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}

export function Notifications({ iconBtn }: { iconBtn: React.CSSProperties }) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/alerts").then((r) => r.json()).then((j) => { if (live) setAlerts((j.alerts as Alert[]) ?? []); }).catch(() => {});
    const onDoc = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => { live = false; document.removeEventListener("mousedown", onDoc); };
  }, []);

  const urgent = alerts.filter((a) => a.level === "danger" || a.level === "warn").length;
  const badge = urgent || alerts.length;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button aria-label="Notifications" onClick={() => setOpen((o) => !o)} style={{ ...iconBtn, position: "relative", color: urgent ? "var(--neg)" : "var(--ink-2)" }}>
        <Bell size={15} />
        {badge > 0 && <span style={{ position: "absolute", top: -4, right: -4, minWidth: 15, height: 15, padding: "0 3px", borderRadius: 99, background: urgent ? "var(--neg)" : "var(--c-stocks)", color: "#fff", fontSize: 9.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 0 2px var(--surface)" }}>{badge}</span>}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 340, maxWidth: "88vw", maxHeight: "70vh", overflowY: "auto", background: "var(--surface)", border: "var(--hair) solid var(--border)", borderRadius: 12, boxShadow: "0 18px 50px rgba(0,0,0,.28)", zIndex: 50 }}>
          <div style={{ padding: "12px 16px", borderBottom: "var(--hair) solid var(--border)", fontSize: 13, fontWeight: 700 }}>Alerts</div>
          {alerts.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--ink-3)", fontSize: 12.5 }}>You&rsquo;re all clear — no alerts right now.</div>
          ) : (
            alerts.map((a, i) => (
              <button key={a.id} onClick={() => { setOpen(false); router.push(a.href); }} style={{ display: "flex", gap: 10, width: "100%", textAlign: "left", padding: "12px 16px", background: "transparent", border: "none", borderTop: i ? "var(--hair) solid var(--border)" : "none", cursor: "pointer", color: "var(--ink)", fontFamily: "var(--font-sans)" }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: color(a.level), flex: "none", marginTop: 5 }} />
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: 13, fontWeight: 600 }}>{a.title}</span>
                  <span style={{ display: "block", fontSize: 12, color: "var(--ink-3)", marginTop: 2, lineHeight: 1.4 }}>{a.detail}</span>
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
