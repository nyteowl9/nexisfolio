"use client";

import { clearPortfolio } from "@/lib/db/positions";

export function ClearPortfolioButton() {
  return (
    <form action={clearPortfolio}>
      <button
        onClick={(e) => { if (!confirm("Clear your ENTIRE portfolio?\n\nThis permanently deletes all holdings, transactions, and debts. Your account stays. This can't be undone.")) e.preventDefault(); }}
        style={{ background: "transparent", color: "var(--ink-3)", border: "var(--hair) solid var(--border)", padding: "8px 16px", borderRadius: 999, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-sans)" }}
      >
        Start over (clear portfolio)
      </button>
    </form>
  );
}
