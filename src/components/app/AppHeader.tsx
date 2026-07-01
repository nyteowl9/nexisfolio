"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useEffect } from "react";
import { signOut } from "@/app/login/actions";
import { Bolt, Search, Sun, Moon, Plus, Menu, Sliders } from "@/components/ui/icons";
import { AddTradeModal } from "@/components/app/AddTradeModal";
import { GlobalSearch } from "@/components/app/GlobalSearch";
import { usePrefs } from "@/components/app/prefs-context";

const ALL_TABS: Array<[string, string]> = [
  ["Overview", "/dashboard"],
  ["History", "/history"],
  ["Watchlist", "/watchlist"],
  ["News", "/news"],
  ["Retirement", "/retirement"],
  ["Tax", "/tax"],
  ["Connections", "/connections"],
];

export function AppHeader({ email }: { email?: string }) {
  const { prefs, update, openSettings } = usePrefs();
  const [navOpen, setNavOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();

  // "/" or ⌘/Ctrl-K opens search (unless typing in a field)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing))) { e.preventDefault(); setSearchOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const tabs = ALL_TABS.filter(([label]) => label !== "News" || prefs.showNews);

  const iconBtn: React.CSSProperties = { width: 32, height: 32, border: "var(--hair) solid var(--border)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-2)", background: "var(--surface)", cursor: "pointer" };
  const toggleTheme = () => update({ theme: prefs.theme === "dark" ? "light" : "dark" });

  return (
    <>
      <header className="nw-hdr" style={{ position: "sticky", top: 0, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "0 28px", height: 56, borderBottom: "var(--hair) solid var(--border)", background: "var(--surface)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24, minWidth: 0, flex: 1 }}>
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
            <Image src="/demo/landing-assets/nexis-mark.png" alt="Nexis Folio" width={24} height={24} style={{ height: 24, width: "auto" }} />
            <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: ".08em", color: "var(--ink)" }}>NEXIS FOLIO</span>
          </Link>
          <nav className="nw-nav nw-desktop-nav" style={{ display: "flex", gap: 20, minWidth: 0, overflowX: "auto" }}>
            {tabs.map(([label, href]) => {
              const active = pathname === href || (href === "/dashboard" && pathname.startsWith("/detail"));
              return (
                <Link key={href} href={href} style={{ display: "flex", alignItems: "center", padding: "6px 2px", fontSize: 13.5, fontWeight: active ? 600 : 450, color: active ? "var(--ink)" : "var(--ink-2)", borderBottom: `2px solid ${active ? "var(--ink)" : "transparent"}`, height: 56, whiteSpace: "nowrap" }}>{label}</Link>
              );
            })}
          </nav>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "none" }}>
          <span className="nw-hide-mobile" style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--pos)", fontWeight: 500 }}><Bolt size={12} /> live</span>
          <button className="nw-hide-mobile" aria-label="Search" onClick={() => setSearchOpen(true)} style={iconBtn}><Search size={15} /></button>
          <button className="nw-hide-mobile" aria-label="Settings" onClick={openSettings} style={iconBtn}><Sliders size={15} /></button>
          <button className="nw-hide-mobile" aria-label="Toggle theme" onClick={toggleTheme} style={iconBtn}>{prefs.theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}</button>
          <button onClick={() => setAddOpen(true)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", background: "var(--accent)", color: "var(--accent-ink)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", cursor: "pointer", fontFamily: "var(--font-sans)" }}><Plus size={15} /><span className="nw-hide-mobile">Add position</span></button>
          <form className="nw-hide-mobile" action={signOut} title="Sign out">
            <button style={{ width: 30, height: 30, borderRadius: 99, background: "var(--bg-sunk)", border: "var(--hair) solid var(--border)", color: "var(--ink-2)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{(email?.[0] ?? "?").toUpperCase()}</button>
          </form>
          <button className="nw-menu-btn" aria-label="Menu" onClick={() => setNavOpen((o) => !o)} style={{ ...iconBtn, display: "none" }}><Menu size={18} /></button>
        </div>
      </header>

      {navOpen && (
        <div className="nw-mobile-menu" style={{ position: "sticky", top: 56, zIndex: 19, background: "var(--surface)", borderBottom: "var(--hair) solid var(--border)", padding: "6px 14px 12px", display: "flex", flexDirection: "column" }}>
          {tabs.map(([label, href]) => {
            const active = pathname === href || (href === "/dashboard" && pathname.startsWith("/detail"));
            return (
              <Link key={href} href={href} onClick={() => setNavOpen(false)} style={{ padding: "12px 6px", fontSize: 15, fontWeight: active ? 700 : 500, color: active ? "var(--ink)" : "var(--ink-2)", borderBottom: "var(--hair) solid var(--border)" }}>{label}</Link>
            );
          })}
          <div style={{ display: "flex", gap: 10, paddingTop: 12, flexWrap: "wrap" }}>
            <button onClick={() => { setNavOpen(false); setSearchOpen(true); }} style={{ ...iconBtn, width: "auto", padding: "8px 12px", gap: 6, fontSize: 13 }}><Search size={15} /> Search</button>
            <button onClick={() => { setNavOpen(false); openSettings(); }} style={{ ...iconBtn, width: "auto", padding: "8px 12px", gap: 6, fontSize: 13 }}><Sliders size={15} /> Settings</button>
            <button onClick={toggleTheme} style={{ ...iconBtn, width: "auto", padding: "8px 12px", gap: 6, fontSize: 13 }}>{prefs.theme === "dark" ? <Sun size={15} /> : <Moon size={15} />} Theme</button>
            <form action={signOut} style={{ marginLeft: "auto" }}><button style={{ ...iconBtn, width: "auto", padding: "8px 12px", fontSize: 13, color: "var(--neg)" }}>Sign out</button></form>
          </div>
        </div>
      )}
      {addOpen && <AddTradeModal onClose={() => setAddOpen(false)} />}
      {searchOpen && <GlobalSearch onClose={() => setSearchOpen(false)} />}
    </>
  );
}
