"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AddAssetForm } from "@/app/onboarding/AddAssetForm";
import { BulkAddTable } from "@/app/onboarding/BulkAddTable";
import { ConvertForm } from "@/components/app/ConvertForm";

type Mode = "add" | "bulk" | "trade";

export function AddTradeModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("add");
  const done = () => { router.refresh(); onClose(); };
  const tab = (m: Mode, label: string) => (
    <button onClick={() => setMode(m)} style={{ padding: "8px 4px", fontSize: 14, fontWeight: mode === m ? 700 : 500, color: mode === m ? "var(--ink)" : "var(--ink-3)", background: "none", border: "none", borderBottom: `2px solid ${mode === m ? "var(--ink)" : "transparent"}`, cursor: "pointer", fontFamily: "var(--font-sans)" }}>{label}</button>
  );

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(10,12,14,.45)" }} />
      <div style={{ position: "relative", width: 660, maxWidth: "100%", maxHeight: "90vh", overflow: "auto", background: "var(--surface)", border: "var(--hair) solid var(--border)", borderRadius: 14, boxShadow: "0 20px 60px rgba(0,0,0,.3)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px 0" }}>
          <div style={{ display: "flex", gap: 22 }}>{tab("add", "Add position")}{tab("bulk", "Add multiple")}{tab("trade", "Trade")}</div>
          <button onClick={onClose} style={{ background: "var(--bg-sunk)", border: "none", borderRadius: 7, width: 30, height: 30, cursor: "pointer", color: "var(--ink-2)", fontSize: 17 }}>✕</button>
        </div>
        <div style={{ borderBottom: "var(--hair) solid var(--border)", marginTop: 14 }} />
        <div style={{ padding: "22px 24px" }}>
          {mode === "add" ? (
            <>
              <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 14 }}>Add any asset. Crypto/stocks/metals auto-price; everything else by value.</p>
              <AddAssetForm redirectTo="/dashboard" />
            </>
          ) : mode === "bulk" ? (
            <BulkAddTable onDone={done} />
          ) : (
            <ConvertForm />
          )}
        </div>
      </div>
    </div>
  );
}
