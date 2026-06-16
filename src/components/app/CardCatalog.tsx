"use client";

import { useEffect, useState } from "react";
import { priceForGrade, GRADES, fmtUSD, type Grader, type CardPrices } from "@/lib/engine";
import { CARDS, SEALED, SETS, GAMES } from "@/lib/sample/sample-data";
import { CardThumb, GradeLadder } from "@/components/ui/CardThumb";
import { Search, Plus, Check } from "@/components/ui/icons";
import { addCardItem, type NewCardItem } from "@/lib/db/cards";
import type { ProviderCard } from "@/lib/market/cards-provider";

const LIVE_GAMES = new Set(["pkm", "mtg"]);
const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 11px", border: "var(--hair) solid var(--border-strong)", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-sans)", background: "var(--surface-2)", color: "var(--ink)", boxSizing: "border-box" };

interface DisplayEntry {
  id: string;
  kind: "card" | "sealed";
  game: string;
  name: string;
  num: string;
  setCode: string;
  setName: string;
  rarity: string;
  img: string | null;
  prices?: CardPrices;
  price?: number;
  provider?: ProviderCard;
}

const staticEntries = (type: "all" | "cards" | "sealed"): DisplayEntry[] => {
  const out: DisplayEntry[] = [];
  if (type !== "sealed") for (const c of CARDS) out.push({ id: c.id, kind: "card", game: c.game, name: c.name, num: c.num, setCode: SETS[c.set]?.code ?? "", setName: SETS[c.set]?.name ?? "", rarity: c.rarity, img: c.img ?? null, prices: c.prices });
  if (type !== "cards") for (const s of SEALED) out.push({ id: s.id, kind: "sealed", game: s.game, name: s.name, num: "", setCode: SETS[s.set]?.code ?? "", setName: SETS[s.set]?.name ?? "", rarity: s.kind, img: s.img ?? null, price: s.price });
  return out;
};

function Seg<T extends string>({ value, options, onChange }: { value: T; options: ({ value: T; label: string } | T)[]; onChange: (v: T) => void }) {
  return (
    <div style={{ display: "inline-flex", gap: 3, background: "var(--bg-sunk)", padding: 3, borderRadius: 8, flexWrap: "wrap" }}>
      {options.map((o) => {
        const val = (typeof o === "string" ? o : o.value) as T;
        const label = typeof o === "string" ? o : o.label;
        return <button key={val} onClick={() => onChange(val)} style={{ padding: "6px 13px", fontSize: 12.5, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", color: value === val ? "var(--ink)" : "var(--ink-3)", background: value === val ? "var(--surface)" : "transparent", boxShadow: value === val ? "var(--shadow)" : "none" }}>{label}</button>;
      })}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label style={{ display: "block" }}><div style={{ fontSize: 11.5, color: "var(--ink-2)", fontWeight: 600, marginBottom: 6 }}>{label}</div>{children}</label>;
}

function ResultCell({ entry, selected, onPick }: { entry: DisplayEntry; selected: boolean; onPick: (e: DisplayEntry) => void }) {
  const isCard = entry.kind === "card";
  const ref = isCard ? entry.prices?.raw ?? 0 : entry.price ?? 0;
  const [hov, setHov] = useState(false);
  return (
    <div onClick={() => onPick(entry)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 10, borderRadius: 11, border: `1.5px solid ${selected ? "var(--accent)" : "var(--border)"}`, background: hov || selected ? "var(--surface-2)" : "var(--surface)" }}>
      <CardThumb gameColor={GAMES[entry.game]?.color} name={entry.name} num={isCard ? entry.num : ""} setCode={entry.setCode} sealed={!isCard} img={entry.img} w={78} />
      <div style={{ textAlign: "center", minWidth: 0, width: "100%" }}>
        <div style={{ fontSize: 11.5, fontWeight: 650, lineHeight: 1.15, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{entry.name}</div>
        <div className="num" style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 3, fontWeight: 600 }}>{ref > 0 ? (isCard ? `from ${fmtUSD(ref, { full: true })}` : fmtUSD(ref, { full: true })) : "—"}</div>
      </div>
    </div>
  );
}

function ConfigPanel({ entry, onAdd }: { entry: DisplayEntry | null; onAdd: (i: NewCardItem) => void }) {
  const isCard = entry?.kind === "card";
  const [type, setType] = useState<"graded" | "raw">("graded");
  const [grader, setGrader] = useState<Grader>("PSA");
  const [grade, setGrade] = useState("10");
  const [qty, setQty] = useState("1");
  const [basis, setBasis] = useState("");
  const [date, setDate] = useState("2026-06-15");

  useEffect(() => {
    if (!entry) return;
    if (entry.kind === "card") { setType("graded"); setGrader("PSA"); setGrade("10"); }
    setQty("1"); setBasis("");
  }, [entry]);

  if (!entry) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: 30, textAlign: "center", color: "var(--ink-3)", gap: 12 }}>
      <div style={{ width: 56, height: 78, borderRadius: 9, border: "2px dashed var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "var(--ink-3)" }}>＋</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2)" }}>Pick a card or box</div>
      <div style={{ fontSize: 12, lineHeight: 1.5 }}>Search the catalog on the left, then set its condition and grade here.</div>
    </div>
  );

  const prices = entry.prices;
  const unit = isCard && prices ? (type === "raw" ? prices.raw : priceForGrade(prices, grader, grade)) : entry.price ?? 0;
  const q = Math.max(1, parseInt(qty) || 1);
  const ok = isCard ? (type === "raw" ? "raw" : (grader === "PSA" ? "psa" : grader === "BGS" ? "bgs" : "cgc") + String(grade).replace(".", "")) : null;
  const badge = !isCard ? "SEALED" : type === "raw" ? "RAW" : `${grader} ${grade}`;

  const submit = () => onAdd({
    catId: entry.id, type: isCard ? type : "sealed",
    grader: isCard && type === "graded" ? grader : null,
    grade: isCard && type === "graded" ? grade : null,
    qty: q, basis: parseFloat(basis) || unit, acquired: date,
    name: entry.name, game: entry.game, setCode: entry.setCode, setName: entry.setName, num: entry.num, img: entry.img,
    provider: entry.provider,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 14 }}>
        <CardThumb gameColor={GAMES[entry.game]?.color} name={entry.name} num={isCard ? entry.num : ""} setCode={entry.setCode} sealed={!isCard} badge={badge} img={entry.img} w={84} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.2 }}>{entry.name}</div>
          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3 }}>{entry.setCode ? `${entry.setCode}${entry.setName ? " · " + entry.setName : ""}` : ""}{isCard && entry.num ? ` · ${entry.num}` : ""}</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{GAMES[entry.game]?.label}{entry.rarity ? ` · ${entry.rarity}` : ""}{entry.provider ? " · live" : ""}</div>
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 10.5, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>Market value</div>
            <div className="num" style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-.02em", marginTop: 2 }}>{fmtUSD(unit, { full: true })}</div>
          </div>
        </div>
      </div>
      {isCard && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Condition"><Seg value={type} options={[{ value: "graded", label: "Graded" }, { value: "raw", label: "Raw / ungraded" }]} onChange={setType} /></Field>
          {type === "graded" && <Field label="Grader"><Seg value={grader} options={["PSA", "BGS", "CGC"] as Grader[]} onChange={(g) => { setGrader(g); setGrade(GRADES[g][0]); }} /></Field>}
          {type === "graded" && <Field label="Grade"><Seg value={grade} options={GRADES[grader]} onChange={setGrade} /></Field>}
        </div>
      )}
      {isCard && prices && (
        <div style={{ background: "var(--surface-2)", border: "var(--hair) solid var(--border)", borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ fontSize: 10.5, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 12 }}>Value by grade {entry.provider ? <span style={{ textTransform: "none", fontWeight: 500 }}>· raw live, graded est.</span> : null}</div>
          <GradeLadder prices={prices} ownedKey={type === "raw" ? "raw" : ok} />
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Quantity"><input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} style={inputStyle} /></Field>
        <Field label="Cost basis (each)"><input type="number" value={basis} onChange={(e) => setBasis(e.target.value)} placeholder={String(unit)} style={inputStyle} /></Field>
      </div>
      <Field label="Acquired"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} /></Field>
      <button onClick={submit} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: 11, background: "var(--accent)", color: "var(--accent-ink)", border: "none", borderRadius: 9, fontSize: 13.5, fontWeight: 650, cursor: "pointer", fontFamily: "var(--font-sans)" }}><Plus size={15} />{`Add ${q > 1 ? q + " × " : ""}to collection · ${fmtUSD(unit * q, { full: true })}`}</button>
    </div>
  );
}

function ManualForm({ onAdd, onCancel }: { onAdd: (i: NewCardItem) => void; onCancel: () => void }) {
  const [f, setF] = useState<Record<string, string>>({ type: "graded", grader: "PSA", grade: "10", qty: "1", acquired: "2026-06-15", game: "" });
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  const val = parseFloat(f.value) || 0;
  const q = Math.max(1, parseInt(f.qty) || 1);
  const ready = (f.name || "").trim() !== "" && val > 0;
  const badge = f.type === "sealed" ? "SEALED" : f.type === "raw" ? "RAW" : `${f.grader} ${f.grade}`;
  const submit = () => { if (!ready) return; onAdd({ manual: true, type: f.type as NewCardItem["type"], name: f.name.trim(), game: f.game || null, setCode: f.setCode || "", setName: f.setName || "", num: f.num || "", kind: f.type === "sealed" ? "Sealed product" : "", grader: f.type === "graded" ? f.grader : null, grade: f.type === "graded" ? f.grade : null, value: val, basis: parseFloat(f.basis) || val, qty: q, acquired: f.acquired, img: (f.img || "").trim() || null }); };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Add manually</div>
        <button onClick={onCancel} style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-3)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}>← Back to catalog</button>
      </div>
      <div style={{ fontSize: 12, color: "var(--ink-3)", lineHeight: 1.5, marginTop: -4 }}>Not in the catalog yet? Enter it by hand. Paste an image URL to show the card.</div>
      <div style={{ display: "flex", gap: 14 }}>
        <CardThumb gameColor={f.game ? GAMES[f.game]?.color : undefined} name={f.name || "New item"} num={f.num} setCode={f.setCode} sealed={f.type === "sealed"} badge={badge} img={(f.img || "").trim() || null} w={78} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="Name"><input value={f.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="e.g. OP13-119 Luffy (Manga)" style={inputStyle} /></Field>
          <Field label="Game"><select value={f.game || ""} onChange={(e) => set("game", e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}><option value="">— Other / unlisted —</option>{Object.values(GAMES).map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}</select></Field>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Set / code"><input value={f.setCode || ""} onChange={(e) => set("setCode", e.target.value)} placeholder="OP-13" style={inputStyle} /></Field>
        <Field label="Card # (optional)"><input value={f.num || ""} onChange={(e) => set("num", e.target.value)} placeholder="OP13-119" style={inputStyle} /></Field>
      </div>
      <Field label="Condition"><Seg value={f.type} options={[{ value: "graded", label: "Graded" }, { value: "raw", label: "Raw" }, { value: "sealed", label: "Sealed" }]} onChange={(v) => set("type", v)} /></Field>
      {f.type === "graded" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Grader"><Seg value={f.grader} options={["PSA", "BGS", "CGC"]} onChange={(g) => { set("grader", g); set("grade", GRADES[g as Grader][0]); }} /></Field>
          <Field label="Grade"><Seg value={f.grade} options={GRADES[f.grader as Grader]} onChange={(v) => set("grade", v)} /></Field>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Current value (each)"><input type="number" value={f.value || ""} onChange={(e) => set("value", e.target.value)} placeholder="0" style={inputStyle} /></Field>
        <Field label="Cost basis (each)"><input type="number" value={f.basis || ""} onChange={(e) => set("basis", e.target.value)} placeholder="optional" style={inputStyle} /></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Quantity"><input type="number" min={1} value={f.qty} onChange={(e) => set("qty", e.target.value)} style={inputStyle} /></Field>
        <Field label="Acquired"><input type="date" value={f.acquired} onChange={(e) => set("acquired", e.target.value)} style={inputStyle} /></Field>
      </div>
      <Field label="Image URL (optional)"><input value={f.img || ""} onChange={(e) => set("img", e.target.value)} placeholder="https://…  — shows the actual card" style={inputStyle} /></Field>
      <button onClick={submit} disabled={!ready} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: 11, background: ready ? "var(--accent)" : "var(--bg-sunk)", color: ready ? "var(--accent-ink)" : "var(--ink-3)", border: "none", borderRadius: 9, fontSize: 13.5, fontWeight: 650, cursor: ready ? "pointer" : "not-allowed", fontFamily: "var(--font-sans)" }}><Plus size={15} />{ready ? `Add to collection · ${fmtUSD(val * q, { full: true })}` : "Enter a name & value"}</button>
    </div>
  );
}

export function CardCatalog({ positionId, onClose }: { positionId: string; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [game, setGame] = useState("pkm");
  const [type, setType] = useState<"all" | "cards" | "sealed">("all");
  const [sel, setSel] = useState<DisplayEntry | null>(null);
  const [manual, setManual] = useState(false);
  const [added, setAdded] = useState<string[]>([]);
  const [flash, setFlash] = useState(false);
  const [live, setLive] = useState<DisplayEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const liveGame = LIVE_GAMES.has(game);

  // live provider search (Pokémon / Magic)
  useEffect(() => {
    if (!liveGame || q.trim().length < 2) { setLive([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/cards/search?game=${game}&q=${encodeURIComponent(q)}`);
        const j = await r.json();
        setLive((j.results as ProviderCard[]).map((p) => ({ id: p.id, kind: "card" as const, game: p.game, name: p.name, num: p.num, setCode: p.setCode, setName: p.setName, rarity: p.rarity, img: p.image, prices: p.prices, provider: p })));
      } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q, game, liveGame]);

  const query = q.trim().toLowerCase();
  let results: DisplayEntry[];
  if (liveGame && query.length >= 2) {
    results = type === "sealed" ? [] : live;
  } else {
    results = staticEntries(type).filter((en) => {
      if (game !== "all" && en.game !== game) return false;
      if (!query) return true;
      const hay = `${en.name} ${en.num} ${en.setCode} ${en.setName} ${en.rarity} ${en.kind}`.toLowerCase();
      return query.split(/\s+/).every((w) => hay.includes(w));
    });
  }

  const onAdd = async (item: NewCardItem) => {
    await addCardItem(positionId, item);
    setAdded((a) => [(item.name || "Card") + (item.type === "graded" ? ` ${item.grader} ${item.grade}` : ""), ...a].slice(0, 6));
    setFlash(true); setTimeout(() => setFlash(false), 1200);
    setSel(null);
  };

  const gameChips = [{ value: "all", label: "All games" }].concat(Object.values(GAMES).map((g) => ({ value: g.key, label: g.label + (LIVE_GAMES.has(g.key) ? " ·live" : "") })));

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 75, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(10,12,14,.5)" }} />
      <div style={{ position: "relative", width: 980, maxWidth: "100%", height: "88vh", display: "flex", flexDirection: "column", background: "var(--surface)", border: "var(--hair) solid var(--border)", borderRadius: 16, boxShadow: "0 24px 70px rgba(0,0,0,.34)", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "var(--hair) solid var(--border)" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-.01em" }}>Add to collection</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>Pokémon & Magic search the full live catalog (real images + prices)</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {flash && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, color: "var(--pos)", fontWeight: 600 }}><Check size={14} /> Added</span>}
            {added.length > 0 && <button onClick={onClose} style={{ padding: "8px 16px", background: "var(--accent)", color: "var(--accent-ink)", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>{`Done · ${added.length} added`}</button>}
            <button onClick={onClose} style={{ background: "var(--bg-sunk)", border: "none", borderRadius: 7, width: 30, height: 30, cursor: "pointer", color: "var(--ink-2)", fontSize: 16 }}>✕</button>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 24px", borderBottom: "var(--hair) solid var(--border)", flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: "1 1 240px", minWidth: 200 }}>
            <input value={q} onChange={(e) => setQ(e.target.value)} autoFocus placeholder={`Search e.g. "Charizard", "Ugin", "Pikachu"…`} style={{ ...inputStyle, paddingLeft: 34 }} />
            <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)", display: "flex" }}><Search size={15} /></span>
          </div>
          <Seg value={type} options={[{ value: "all", label: "All" }, { value: "cards", label: "Cards" }, { value: "sealed", label: "Sealed" }]} onChange={setType} />
        </div>
        <div style={{ display: "flex", gap: 8, padding: "0 24px 14px", flexWrap: "wrap", borderBottom: "var(--hair) solid var(--border)" }}>
          {gameChips.map((g) => <button key={g.value} onClick={() => setGame(g.value)} style={{ padding: "6px 13px", fontSize: 12, fontWeight: 600, borderRadius: 99, cursor: "pointer", fontFamily: "var(--font-sans)", border: `1px solid ${game === g.value ? "var(--ink)" : "var(--border)"}`, background: game === g.value ? "var(--ink)" : "var(--surface)", color: game === g.value ? "var(--surface)" : "var(--ink-2)" }}>{g.label}</button>)}
        </div>
        <div className="nw-cat-body" style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", flex: 1, minHeight: 0 }}>
          <div style={{ overflowY: "auto", padding: 18, borderRight: "var(--hair) solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 600 }}>{loading ? "Searching live catalog…" : `${results.length} result${results.length === 1 ? "" : "s"}`}</span>
              <button onClick={() => { setManual(true); setSel(null); }} style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-2)", background: "var(--bg-sunk)", border: "none", borderRadius: 7, padding: "5px 10px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Can&apos;t find it? Add manually</button>
            </div>
            {liveGame && query.length < 2 ? (
              <div style={{ padding: "36px 12px", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>Type at least 2 letters to search the full live {GAMES[game]?.label} catalog.</div>
            ) : results.length === 0 ? (
              <div style={{ padding: "36px 12px", textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
                <div>{loading ? "Searching…" : "No matches."}</div>
                {!loading && <button onClick={() => { setManual(true); setSel(null); }} style={{ marginTop: 14, fontSize: 12.5, fontWeight: 650, color: "var(--accent-ink)", background: "var(--accent)", border: "none", borderRadius: 8, padding: "9px 16px", cursor: "pointer", fontFamily: "var(--font-sans)" }}>+ Add it manually</button>}
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: 12 }}>
                {results.map((en) => <ResultCell key={en.kind + en.id} entry={en} selected={sel?.id === en.id} onPick={(e2) => { setSel(e2); setManual(false); }} />)}
              </div>
            )}
          </div>
          <div style={{ overflowY: "auto", padding: 22, background: "var(--surface)" }}>
            {manual ? <ManualForm onAdd={onAdd} onCancel={() => setManual(false)} /> : <ConfigPanel entry={sel} onAdd={onAdd} />}
          </div>
        </div>
      </div>
    </div>
  );
}
