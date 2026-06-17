"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  itemMeta,
  itemUnitValue,
  itemValue,
  itemBasis,
  itemDaily,
  ownedKey,
  gradeChipText,
  fmtUSD,
  fmtPct,
  fmtDate,
  type Catalog,
  type CardItem,
  type Position,
} from "@/lib/engine";
import { CATALOG as SAMPLE_CATALOG } from "@/lib/sample/sample-data";
import { CardThumb, GradeLadder } from "@/components/ui/CardThumb";
import { Area } from "@/components/ui/charts";
import { ArrowUp, ArrowDown, Plus } from "@/components/ui/icons";
import { removeCardItem } from "@/lib/db/cards";
import { CardCatalog } from "@/components/app/CardCatalog";

const card: React.CSSProperties = { background: "var(--surface)", border: "var(--hair) solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", overflow: "hidden" };

function seedOf(str: string) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed: number) { let s = seed || 1; return () => { s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }
function history(seed: number, end: number, n: number, vol = 0.03) {
  const r = rng(seed); const out: number[] = []; let v = end * 0.72;
  for (let i = 0; i < n; i++) { v = v + (end - v) * 0.05 + (r() - 0.46) * end * vol; out.push(Math.max(end * 0.25, v)); }
  if (out.length) out[n - 1] = end; return out;
}
const VENUES = ["eBay", "TCGplayer", "PWCC", "Goldin", "Heritage"];
function recentSales(it: CardItem, unit: number) {
  const r = rng(seedOf((it.catId ?? it.id) + (it.grade || "raw")));
  const gradeTxt = it.type === "sealed" ? "Sealed" : it.type === "raw" ? "Raw" : `${it.grader} ${it.grade}`;
  const out: { date: string; price: number; grade: string; venue: string }[] = [];
  const d = new Date("2026-06-14");
  for (let i = 0; i < 6; i++) {
    out.push({ date: new Date(d).toISOString().slice(0, 10), price: Math.round(unit * (0.9 + r() * 0.2)), grade: gradeTxt, venue: VENUES[Math.floor(r() * VENUES.length)] });
    d.setDate(d.getDate() - Math.ceil(1 + r() * 6));
  }
  return out;
}

function ItemDrawer({ positionId, item, catalog, onClose, onChanged }: { positionId: string; item: CardItem; catalog: Catalog; onClose: () => void; onChanged: () => void }) {
  const meta = itemMeta(item, catalog);
  const unit = itemUnitValue(item, catalog), val = itemValue(item, catalog), basis = itemBasis(item);
  const pl = val - basis, plPct = basis ? (pl / basis) * 100 : 0;
  const daily = itemDaily(item, catalog);
  const hist = history(seedOf((item.catId ?? item.id) + (item.grade || "")), unit || 1, 60, item.type === "sealed" ? 0.02 : 0.035);
  const sales = recentSales(item, unit);
  const ok = ownedKey(item);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(10,12,14,.45)" }} />
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 460, maxWidth: "100%", background: "var(--bg)", borderLeft: "var(--hair) solid var(--border)", boxShadow: "-12px 0 40px rgba(0,0,0,.18)", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "20px 22px", borderBottom: "var(--hair) solid var(--border)", background: "var(--surface)", position: "sticky", top: 0, zIndex: 2 }}>
          <CardThumb gameColor={meta.gameColor} name={meta.name} num={meta.num} setCode={meta.set?.code} sealed={meta.sealed} badge={gradeChipText(item)} img={meta.img} w={92} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-.01em", lineHeight: 1.15 }}>{meta.name}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 3 }}>{meta.set ? `${meta.set.code} · ${meta.set.name}` : ""}{meta.num ? ` · ${meta.num}` : ""}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 9, marginTop: 12 }}>
              <span className="num" style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-.02em" }}>{fmtUSD(unit, { full: true })}</span>
              <span className="num" style={{ fontSize: 13, fontWeight: 600, color: daily >= 0 ? "var(--pos)" : "var(--neg)", display: "inline-flex", alignItems: "center", gap: 2 }}>{daily >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}{fmtPct(Math.abs(daily))} today</span>
            </div>
            {item.qty > 1 && <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 3 }}>{item.qty} copies · {fmtUSD(val, { full: true })} total</div>}
          </div>
          <button onClick={onClose} style={{ background: "var(--bg-sunk)", border: "none", borderRadius: 7, width: 28, height: 28, cursor: "pointer", color: "var(--ink-2)", fontSize: 15, flex: "none" }}>✕</button>
        </div>
        <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 8 }}>{meta.custom ? "Tracked value" : "90-day price · index"}</div>
            <Area points={hist} width={416} height={92} color={pl >= 0 ? "var(--pos)" : "var(--neg)"} strokeWidth={2} />
          </div>
          {!meta.sealed && meta.prices && (
            <div>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 12 }}>Value by grade</div>
              <GradeLadder prices={meta.prices} ownedKey={ok} />
            </div>
          )}
          <div style={card}>
            {([["Your basis", fmtUSD(basis, { full: true }), undefined], ["Market value", fmtUSD(val, { full: true }), undefined], ["Unrealized P/L", `${pl >= 0 ? "+" : "−"}${fmtUSD(Math.abs(pl), { full: true })} · ${fmtPct(plPct, true)}`, pl >= 0 ? "var(--pos)" : "var(--neg)"], ["Acquired", fmtDate(item.acquired), undefined], ["Condition", item.type === "sealed" ? meta.rarity : item.type === "raw" ? "Raw / ungraded" : `${item.grader} ${item.grade}`, undefined]] as Array<[string, string, string | undefined]>).map(([k, v, c], i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 18px", borderTop: i ? "var(--hair) solid var(--border)" : "none" }}>
                <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{k}</span>
                <span className="num" style={{ fontSize: 12.5, fontWeight: 600, color: c || "var(--ink)" }}>{v}</span>
              </div>
            ))}
          </div>
          {!meta.custom && (
            <div style={card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 20px", borderBottom: "var(--hair) solid var(--border)", fontSize: 13.5, fontWeight: 600 }}>Recent sales <span style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 450 }}>comps</span></div>
              {sales.map((s, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "72px 1fr auto", alignItems: "center", gap: 10, padding: "9px 18px", borderTop: i ? "var(--hair) solid var(--border)" : "none" }}>
                  <span className="num" style={{ fontSize: 12, color: "var(--ink-3)" }}>{fmtDate(s.date).replace(", 2026", "")}</span>
                  <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{s.venue}<span style={{ color: "var(--ink-3)", marginLeft: 7 }}>{s.grade}</span></span>
                  <span className="num" style={{ fontSize: 12.5, fontWeight: 650, textAlign: "right" }}>{fmtUSD(s.price, { full: true })}</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={async () => { await removeCardItem(positionId, item.id); onClose(); onChanged(); }} style={{ padding: 10, background: "var(--bg-sunk)", color: "var(--neg)", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}>Remove from collection</button>
        </div>
      </div>
    </div>
  );
}

function GalleryCell({ item, catalog, onOpen }: { item: CardItem; catalog: Catalog; onOpen: (it: CardItem) => void }) {
  const meta = itemMeta(item, catalog);
  const unit = itemUnitValue(item, catalog), val = itemValue(item, catalog), basis = itemBasis(item);
  const pl = val - basis, daily = itemDaily(item, catalog);
  const [hov, setHov] = useState(false);
  return (
    <div onClick={() => onOpen(item)} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: 9, padding: 12, borderRadius: 12, border: "var(--hair) solid var(--border)", background: hov ? "var(--surface-2)" : "var(--surface)", transition: "background .15s, transform .15s", transform: hov ? "translateY(-2px)" : "none", boxShadow: "var(--shadow)" }}>
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 2 }}>
        <CardThumb gameColor={meta.gameColor} name={meta.name} num={meta.num} setCode={meta.set?.code} sealed={meta.sealed} badge={gradeChipText(item)} img={meta.img} w={104} />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span className="num" style={{ fontSize: 14, fontWeight: 700 }}>{fmtUSD(unit, { full: true })}</span>
        <span className="num" style={{ fontSize: 11.5, fontWeight: 600, color: daily >= 0 ? "var(--pos)" : "var(--neg)" }}>{(daily >= 0 ? "+" : "−") + Math.abs(daily).toFixed(1)}%</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: "var(--c-private)", background: "var(--t-private)", padding: "2px 7px", borderRadius: 99 }}>{gradeChipText(item)}</span>
        {item.qty > 1 && <span className="num" style={{ fontSize: 10.5, color: "var(--ink-3)", fontWeight: 600 }}>×{item.qty}</span>}
        <span className="num" style={{ fontSize: 11, fontWeight: 600, color: pl >= 0 ? "var(--pos)" : "var(--neg)", marginLeft: "auto" }}>{(pl >= 0 ? "+" : "−") + fmtUSD(Math.abs(pl))}</span>
      </div>
    </div>
  );
}

function CompBar({ rows }: { rows: { label: string; color: string; value: number }[] }) {
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  return (
    <div>
      <div style={{ display: "flex", height: 10, borderRadius: 99, overflow: "hidden", background: "var(--bg-sunk)" }}>
        {rows.map((r, i) => <div key={i} style={{ width: `${(r.value / total) * 100}%`, background: r.color }} />)}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "7px 16px", marginTop: 12 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: r.color }} />
            <span style={{ fontSize: 12, color: "var(--ink-2)" }}>{r.label}</span>
            <span className="num" style={{ fontSize: 12, fontWeight: 650, color: "var(--ink)" }}>{fmtUSD(r.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardsDetail({ position, catalog = SAMPLE_CATALOG, autoOpenCatalog }: { position: Position; catalog?: Catalog; autoOpenCatalog?: boolean }) {
  const router = useRouter();
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [view, setView] = useState<"gallery" | "list">("gallery");
  const [range, setRange] = useState<"1W" | "1M" | "1Y" | "ALL">("1Y");
  const [catalogOpen, setCatalogOpen] = useState(!!autoOpenCatalog);
  const items = position.items ?? [];
  const value = items.reduce((s, it) => s + itemValue(it, catalog), 0);
  const basis = items.reduce((s, it) => s + itemBasis(it), 0);
  const pl = value - basis, plPct = basis ? (pl / basis) * 100 : 0;
  const nCards = items.filter((i) => i.type !== "sealed").reduce((s, i) => s + (i.qty || 1), 0);
  const nSealed = items.filter((i) => i.type === "sealed").reduce((s, i) => s + (i.qty || 1), 0);
  const daily = value ? items.reduce((s, it) => s + itemDaily(it, catalog) * itemValue(it, catalog), 0) / value : 0;
  const N = { "1W": 8, "1M": 22, "1Y": 60, ALL: 90 }[range] || 60;
  const hist = history(seedOf("collection" + items.length), value || 1, N, 0.022);
  const byType = [
    { label: "Graded", color: "var(--c-private)", value: items.filter((i) => i.type === "graded").reduce((s, i) => s + itemValue(i, catalog), 0) },
    { label: "Raw", color: "var(--c-crypto)", value: items.filter((i) => i.type === "raw").reduce((s, i) => s + itemValue(i, catalog), 0) },
    { label: "Sealed", color: "var(--c-stocks)", value: items.filter((i) => i.type === "sealed").reduce((s, i) => s + itemValue(i, catalog), 0) },
  ].filter((r) => r.value > 0);
  const drawerItem = items.find((x) => x.id === drawerId) || null;

  return (
    <div>
      <div className="nw-stack-2" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, alignItems: "start" }}>
        <div style={card}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "18px 22px 4px" }}>
            <div>
              <div style={{ fontSize: 12.5, color: "var(--ink-3)", fontWeight: 500 }}>Collection value</div>
              <div className="num" style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-.02em", marginTop: 3 }}>{fmtUSD(value, { full: true })}</div>
              <div className="num" style={{ fontSize: 13, fontWeight: 600, color: daily >= 0 ? "var(--pos)" : "var(--neg)", marginTop: 4, display: "inline-flex", alignItems: "center", gap: 4 }}>{daily >= 0 ? <ArrowUp size={13} /> : <ArrowDown size={13} />}{fmtPct(Math.abs(daily))} today</div>
            </div>
            <div style={{ display: "inline-flex", gap: 4, background: "var(--bg-sunk)", padding: 3, borderRadius: 8 }}>
              {(["1W", "1M", "1Y", "ALL"] as const).map((r) => (
                <button key={r} onClick={() => setRange(r)} style={{ padding: "4px 11px", fontSize: 12, fontWeight: 550, borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", color: range === r ? "var(--ink)" : "var(--ink-3)", background: range === r ? "var(--surface)" : "transparent", boxShadow: range === r ? "var(--shadow)" : "none" }}>{r}</button>
              ))}
            </div>
          </div>
          <div style={{ padding: "8px 14px 16px" }}><Area points={hist} width={640} height={150} color={pl >= 0 ? "var(--pos)" : "var(--neg)"} strokeWidth={2} /></div>
          <div style={{ display: "flex", gap: 18, padding: "0 22px 16px", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11.5, color: "var(--ink-3)", display: "inline-flex", alignItems: "center", gap: 5 }}><span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--pos)" }} />Priced daily · live providers</span>
            <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{nCards} cards · {nSealed} sealed</span>
          </div>
        </div>
        <div style={{ ...card, padding: "4px 0" }}>
          {([["Market value", fmtUSD(value, { full: true }), undefined, undefined], ["Cost basis", fmtUSD(basis, { full: true }), undefined, undefined], ["Unrealized P/L", `${pl >= 0 ? "+" : "−"}${fmtUSD(Math.abs(pl), { full: true })}`, pl >= 0 ? "var(--pos)" : "var(--neg)", fmtPct(plPct, true)]] as Array<[string, string, string | undefined, string | undefined]>).map(([k, v, c, sub], i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "13px 22px", borderTop: i ? "var(--hair) solid var(--border)" : "none" }}>
              <span style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{k}</span>
              <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span className="num" style={{ fontSize: 18, fontWeight: 700, color: c || "var(--ink)" }}>{v}</span>
                {sub && <span className="num" style={{ fontSize: 12.5, fontWeight: 600, color: c }}>{sub}</span>}
              </span>
            </div>
          ))}
          <div style={{ padding: "16px 22px 18px", borderTop: "var(--hair) solid var(--border)" }}>
            <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 12 }}>Composition</div>
            <CompBar rows={byType} />
          </div>
        </div>
      </div>

      <div style={{ ...card, marginTop: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "var(--hair) solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, fontSize: 13.5, fontWeight: 600 }}>Your collection <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 450 }}>{items.length} line items</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "inline-flex", gap: 3, background: "var(--bg-sunk)", padding: 3, borderRadius: 8 }}>
              {(["gallery", "list"] as const).map((v) => (
                <button key={v} onClick={() => setView(v)} style={{ padding: "5px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", textTransform: "capitalize", color: view === v ? "var(--ink)" : "var(--ink-3)", background: view === v ? "var(--surface)" : "transparent", boxShadow: view === v ? "var(--shadow)" : "none" }}>{v}</button>
              ))}
            </div>
            <button onClick={() => setCatalogOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", background: "var(--accent)", color: "var(--accent-ink)", border: "none", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-sans)" }}><Plus size={14} /> Add card or sealed</button>
          </div>
        </div>
        {items.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>No cards yet — click &ldquo;Add card or sealed&rdquo; to browse the live catalog.</div>
        ) : view === "gallery" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14, padding: 18 }}>
            {items.map((it) => <GalleryCell key={it.id} item={it} catalog={catalog} onOpen={(x) => setDrawerId(x.id)} />)}
          </div>
        ) : (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1.8fr 90px 80px 90px 110px", gap: 12, padding: "9px 20px", borderBottom: "var(--hair) solid var(--border)", background: "var(--surface-2)" }}>
              {["Item", "Unit", "24h", "Value", "Total return"].map((h, i) => <span key={i} style={{ fontSize: 10.5, fontWeight: 600, color: "var(--ink-3)", letterSpacing: ".04em", textTransform: "uppercase", textAlign: i ? "right" : "left" }}>{h}</span>)}
            </div>
            {items.map((it, i) => {
              const meta = itemMeta(it, catalog);
              const unit = itemUnitValue(it, catalog), val = itemValue(it, catalog), b = itemBasis(it);
              const p = val - b, pp = b ? (p / b) * 100 : 0, dy = itemDaily(it, catalog);
              return (
                <div key={it.id} onClick={() => setDrawerId(it.id)} style={{ display: "grid", gridTemplateColumns: "1.8fr 90px 80px 90px 110px", alignItems: "center", gap: 12, padding: "11px 20px", borderTop: i ? "var(--hair) solid var(--border)" : "none", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 13, minWidth: 0 }}>
                    <CardThumb gameColor={meta.gameColor} name={meta.name} num={meta.num} setCode={meta.set?.code} sealed={meta.sealed} badge={gradeChipText(it)} img={meta.img} w={40} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta.name}{it.qty > 1 && <span className="num" style={{ color: "var(--ink-3)", fontWeight: 600, marginLeft: 6 }}>×{it.qty}</span>}</div>
                      <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{meta.set ? meta.set.code : ""}{meta.num ? ` · ${meta.num}` : ""} · <span style={{ color: "var(--c-private)", fontWeight: 600 }}>{gradeChipText(it)}</span></div>
                    </div>
                  </div>
                  <span className="num" style={{ textAlign: "right", fontSize: 13, fontWeight: 650 }}>{fmtUSD(unit, { full: true })}</span>
                  <span className="num" style={{ textAlign: "right", fontSize: 12.5, fontWeight: 600, color: dy >= 0 ? "var(--pos)" : "var(--neg)" }}>{(dy >= 0 ? "+" : "−") + Math.abs(dy).toFixed(1)}%</span>
                  <span className="num" style={{ textAlign: "right", fontSize: 13, fontWeight: 600 }}>{fmtUSD(val)}</span>
                  <span className="num" style={{ textAlign: "right", fontSize: 12.5, fontWeight: 600, color: p >= 0 ? "var(--pos)" : "var(--neg)" }}>{(p >= 0 ? "+" : "−") + fmtUSD(Math.abs(p))} · {fmtPct(pp, true)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {drawerItem && <ItemDrawer positionId={position.id} item={drawerItem} catalog={catalog} onClose={() => setDrawerId(null)} onChanged={() => router.refresh()} />}
      {catalogOpen && <CardCatalog positionId={position.id} onClose={() => { setCatalogOpen(false); router.refresh(); }} />}
    </div>
  );
}
