"use client";

import { useState } from "react";
import { AddAssetForm } from "./AddAssetForm";
import { BulkAddTable } from "./BulkAddTable";

export function AddAssetSection() {
  const [mode, setMode] = useState<"one" | "many">("one");
  const seg = (m: "one" | "many", label: string) => (
    <button
      onClick={() => setMode(m)}
      style={{ padding: "6px 13px", fontSize: 12.5, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "inherit", color: mode === m ? "#15171A" : "#8A9099", background: mode === m ? "#fff" : "transparent", boxShadow: mode === m ? "0 1px 2px rgba(20,22,26,.06)" : "none" }}
    >
      {label}
    </button>
  );
  return (
    <div>
      <div style={{ display: "inline-flex", gap: 3, background: "#F2F3F4", padding: 3, borderRadius: 8, marginBottom: 16 }}>
        {seg("one", "One at a time")}
        {seg("many", "Add multiple")}
      </div>
      {mode === "one" ? <AddAssetForm /> : <BulkAddTable />}
    </div>
  );
}
