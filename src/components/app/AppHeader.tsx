"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { signOut } from "@/app/login/actions";
import { Bolt, Search, Sun, Moon, Plus, Menu } from "@/components/ui/icons";

const TABS = ["Overview", "History", "Watchlist", "News", "Retirement", "Tax", "Connections"];

export function AppHeader({ email }: { email?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem("nf-theme") as "light" | "dark") || "light";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("nf-theme", next);
  };

  const iconBtn: React.CSSProperties = {
    width: 32,
    height: 32,
    border: "var(--hair) solid var(--border)",
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--ink-2)",
    background: "var(--surface)",
    cursor: "pointer",
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "0 28px",
        height: 56,
        borderBottom: "var(--hair) solid var(--border)",
        background: "var(--surface)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24, minWidth: 0, flex: 1 }}>
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
          <Image src="/demo/landing-assets/nexis-mark.png" alt="Nexis Folio" width={24} height={24} style={{ height: 24, width: "auto" }} />
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: ".08em", color: "var(--ink)" }}>NEXIS FOLIO</span>
        </Link>
        <nav className="nw-nav" style={{ display: "flex", gap: 20, minWidth: 0 }}>
          {TABS.map((label, i) => {
            const active = i === 0;
            return (
              <button
                key={label}
                disabled={!active}
                title={active ? undefined : "Coming soon"}
                style={{
                  padding: "6px 2px",
                  fontSize: 13.5,
                  fontWeight: active ? 600 : 450,
                  color: active ? "var(--ink)" : "var(--ink-3)",
                  background: "none",
                  border: "none",
                  borderBottom: `2px solid ${active ? "var(--ink)" : "transparent"}`,
                  cursor: active ? "default" : "not-allowed",
                  height: 56,
                  fontFamily: "var(--font-sans)",
                }}
              >
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--pos)", fontWeight: 500 }}>
          <Bolt size={12} /> live
        </span>
        <button aria-label="Search" style={iconBtn}><Search size={15} /></button>
        <button aria-label="Toggle theme" onClick={toggleTheme} style={iconBtn}>
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <Link
          href="/onboarding"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 14px",
            background: "var(--accent)",
            color: "var(--accent-ink)",
            border: "none",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          <Plus size={15} /> Add position
        </Link>
        <form action={signOut} title="Sign out">
          <button
            style={{
              width: 30,
              height: 30,
              borderRadius: 99,
              background: "var(--bg-sunk)",
              border: "var(--hair) solid var(--border)",
              color: "var(--ink-2)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {(email?.[0] ?? "?").toUpperCase()}
          </button>
        </form>
      </div>

      {/* keep mobile menu icon usable on small screens */}
      <button aria-label="Menu" onClick={() => setNavOpen(!navOpen)} style={{ ...iconBtn, display: "none" }}>
        <Menu size={18} />
      </button>
    </header>
  );
}
