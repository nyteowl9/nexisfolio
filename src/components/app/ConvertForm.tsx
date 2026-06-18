"use client";

import { useEffect, useRef, useState } from "react";
import { fmtUSD, fmtQty, isUnitPriced, type AssetClass } from "@/lib/engine";
import { convert } from "@/lib/db/trades";

const inputStyle: React.CSSProperties = { width: "100%", padding: "9px 11px", border: "var(--hair) solid var(--border-strong)", borderRadius: 8, fontSize: 13, fontFamily: "var(--font-sans)", background: "var(--surface-2)", color: "var(--ink)", boxSizing: "border-box" };
const flabel = "mb-1 block text-xs font-semibold";

interface Pos { id: string; name: string; ticker: string | null; cls: AssetClass; qty: number | null; price: number | null; value: number }
interface Pick { cls: string; ticker: string; name: string; providerId?: string }

const NEW_CLASSES: Array<[AssetClass, string]> = [["crypto", "Crypto"], ["stocks", "Stocks"], ["metals", "Metals"]];

/** Drop a redundant ticker (e.g. "BTC · BTC" → "BTC"). */
function nameOf(p: { ticker: string | null; name: string }) {
  const tk = p.ticker && p.ticker !== "—" ? p.ticker : "";
  if (tk && tk.toLowerCase() !== p.name.toLowerCase()) return `${tk} · ${p.name}`;
  return p.name || tk;
}

function NewAssetSearch({ cls, onPick }: { cls: AssetClass; onPick: (p: Pick | null) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Pick[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/symbols?cls=${cls}&q=${encodeURIComponent(q)}`);
      const j = await r.json();
      setResults(j.results ?? []);
      setOpen(true);
    }, 220);
    return () => clearTimeout(t);
  }, [q, cls]);
  return (
    <div ref={boxRef} style={{ position: "relative" }}>
      <input value={q} onChange={(e) => { setQ(e.target.value); onPick(null); }} onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder="Search — e.g. bitcoin, NVDA, gold…" style={inputStyle} />
      {open && results.length > 0 && (
        <div style={{ position: "absolute", zIndex: 10, marginTop: 4, maxHeight: 220, overflowY: "auto", width: "100%", borderRadius: 8, border: "var(--hair) solid var(--border)", background: "var(--surface)", boxShadow: "var(--shadow)" }}>
          {results.map((r) => (
            <button type="button" key={r.cls + r.ticker + (r.providerId ?? "")} onMouseDown={() => { onPick(r); setQ(`${r.ticker} · ${r.name}`); setOpen(false); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 11px", fontSize: 13, background: "transparent", border: "none", cursor: "pointer", color: "var(--ink)" }}>
              <b>{r.ticker}</b> <span style={{ color: "var(--ink-3)" }}>{r.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ConvertForm() {
  const [positions, setPositions] = useState<Pos[]>([]);
  const [fromId, setFromId] = useState("");
  const [toMode, setToMode] = useState<"existing" | "new">("existing");
  const [toId, setToId] = useState("");
  const [newCls, setNewCls] = useState<AssetClass>("crypto");
  const [picked, setPicked] = useState<Pick | null>(null);
  const [entry, setEntry] = useState<"usd" | "qty">("usd");
  const [amount, setAmount] = useState("");
  const [qty, setQty] = useState("");
  const [custom, setCustom] = useState(false);
  const [buyPriceStr, setBuyPriceStr] = useState("");
  const [sellPriceStr, setSellPriceStr] = useState("");
  const [destPrice, setDestPrice] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/positions").then((r) => r.json()).then((j) => {
      const ps = (j.positions as Pos[]) ?? [];
      setPositions(ps);
      if (ps[0]) setFromId(ps[0].id);
      const other = ps.find((p) => p.id !== ps[0]?.id);
      if (other) setToId(other.id);
    });
  }, []);

  const from = positions.find((p) => p.id === fromId);
  const toOptions = positions.filter((p) => p.id !== fromId);
  const toSel = toOptions.find((p) => p.id === toId);
  const fromUnit = !!from && isUnitPriced(from.cls);
  const toUnit = toMode === "new" ? true : !!toSel && isUnitPriced(toSel.cls);

  // keep the destination valid when the source changes
  useEffect(() => {
    if (toMode === "existing" && (!toId || toId === fromId || !toOptions.some((p) => p.id === toId))) {
      setToId(toOptions[0]?.id ?? "");
    }
  }, [fromId, toMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // fetch the destination's live price (for the quantity ⇄ dollars preview)
  useEffect(() => {
    const cls = toMode === "new" ? picked?.cls : toSel?.cls;
    const ticker = toMode === "new" ? picked?.ticker : toSel?.ticker;
    if (!toUnit || !cls || !ticker) { setDestPrice(null); return; }
    const id = toMode === "new" ? picked?.providerId ?? "" : "";
    let live = true;
    fetch(`/api/quote?cls=${cls}&ticker=${encodeURIComponent(ticker)}&id=${encodeURIComponent(id)}`)
      .then((r) => r.json())
      .then((j) => { if (live) setDestPrice(j.quote?.price ?? null); });
    return () => { live = false; };
  }, [toMode, toId, picked, toUnit]);

  const effDestPrice = custom && parseFloat(buyPriceStr) > 0 ? parseFloat(buyPriceStr) : destPrice;
  const usdAmount = entry === "qty" ? (effDestPrice ? (parseFloat(qty) || 0) * effDestPrice : 0) : parseFloat(amount) || 0;
  const estQty = entry === "qty" ? parseFloat(qty) || 0 : effDestPrice ? usdAmount / effDestPrice : 0;
  const destName = toMode === "new" ? picked?.ticker : toSel ? (toSel.ticker && toSel.ticker !== "—" ? toSel.ticker : toSel.name) : "";

  const ready = !!fromId && usdAmount > 0 && (toMode === "existing" ? !!toId && toId !== fromId : !!picked) && (entry === "qty" ? !!effDestPrice : true);

  // hidden values sent to the server
  const sendAmount = usdAmount ? String(usdAmount) : "";
  const sendToPrice = entry === "qty" ? (effDestPrice ? String(effDestPrice) : "") : custom && parseFloat(buyPriceStr) > 0 ? buyPriceStr : "";
  const sendFromPrice = custom && fromUnit && parseFloat(sellPriceStr) > 0 ? sellPriceStr : "";

  const label = (t: string) => <span className={flabel} style={{ color: "var(--ink-2)" }}>{t}</span>;

  return (
    <form action={convert}>
      <input type="hidden" name="from" value="/dashboard" />
      <input type="hidden" name="toMode" value={toMode} />
      <input type="hidden" name="amount" value={sendAmount} />
      <input type="hidden" name="toPrice" value={sendToPrice} />
      <input type="hidden" name="fromPrice" value={sendFromPrice} />
      {toMode === "new" && picked && (
        <>
          <input type="hidden" name="toCls" value={picked.cls} />
          <input type="hidden" name="toTicker" value={picked.ticker} />
          <input type="hidden" name="toName" value={picked.name} />
          <input type="hidden" name="toProviderId" value={picked.providerId ?? ""} />
        </>
      )}

      <p style={{ fontSize: 12.5, color: "var(--ink-3)", marginBottom: 16 }}>Move value from one holding into another in one step — e.g. sell cash to buy Bitcoin. Selling crypto/stocks/metals records a taxable disposal.</p>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label style={{ display: "block" }}>
          {label("From")}
          <select name="fromId" value={fromId} onChange={(e) => setFromId(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
            {positions.map((p) => <option key={p.id} value={p.id}>{nameOf(p)} — {fmtUSD(p.value)} available</option>)}
          </select>
        </label>

        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            {label("To")}
            <div style={{ display: "inline-flex", gap: 3, background: "var(--bg-sunk)", padding: 3, borderRadius: 8 }}>
              {(["existing", "new"] as const).map((m) => (
                <button type="button" key={m} onClick={() => setToMode(m)} style={{ padding: "4px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", color: toMode === m ? "var(--ink)" : "var(--ink-3)", background: toMode === m ? "var(--surface)" : "transparent", boxShadow: toMode === m ? "var(--shadow)" : "none" }}>{m === "existing" ? "A holding" : "New asset"}</button>
              ))}
            </div>
          </div>
          {toMode === "existing" ? (
            <select name="toId" value={toId} onChange={(e) => setToId(e.target.value)} style={{ ...inputStyle, cursor: "pointer" }}>
              {toOptions.length === 0 && <option value="">No other holdings — use “New asset”</option>}
              {toOptions.map((p) => <option key={p.id} value={p.id}>{nameOf(p)}</option>)}
            </select>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "inline-flex", gap: 3, background: "var(--bg-sunk)", padding: 3, borderRadius: 8, width: "fit-content" }}>
                {NEW_CLASSES.map(([c, l]) => (
                  <button type="button" key={c} onClick={() => { setNewCls(c); setPicked(null); }} style={{ padding: "5px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", color: newCls === c ? "var(--ink)" : "var(--ink-3)", background: newCls === c ? "var(--surface)" : "transparent", boxShadow: newCls === c ? "var(--shadow)" : "none" }}>{l}</button>
                ))}
              </div>
              <NewAssetSearch cls={newCls} onPick={setPicked} />
            </div>
          )}
        </div>

        {/* amount: by dollars, or by quantity of the destination */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            {label(entry === "qty" ? `Quantity${destName ? ` of ${destName}` : ""}` : "Amount (USD)")}
            {toUnit && (
              <div style={{ display: "inline-flex", gap: 3, background: "var(--bg-sunk)", padding: 3, borderRadius: 8 }}>
                {(["usd", "qty"] as const).map((m) => (
                  <button type="button" key={m} onClick={() => setEntry(m)} style={{ padding: "4px 12px", fontSize: 12, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "var(--font-sans)", color: entry === m ? "var(--ink)" : "var(--ink-3)", background: entry === m ? "var(--surface)" : "transparent", boxShadow: entry === m ? "var(--shadow)" : "none" }}>{m === "usd" ? "$ amount" : "Units"}</button>
                ))}
              </div>
            )}
          </div>
          {entry === "qty" ? (
            <input type="number" step="any" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="1" style={inputStyle} />
          ) : (
            <input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="10000" style={inputStyle} />
          )}
        </div>

        <label style={{ display: "block" }}>
          {label("Date")}
          <input name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} style={inputStyle} />
        </label>

        {(fromUnit || toUnit) && (
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={custom} onChange={(e) => setCustom(e.target.checked)} style={{ accentColor: "var(--accent)", cursor: "pointer", width: 15, height: 15 }} />
              <span style={{ fontSize: 12.5, color: "var(--ink-2)", fontWeight: 500 }}>Use a custom price (past-dated conversion)</span>
            </label>
            {custom && (
              <div style={{ display: "grid", gridTemplateColumns: fromUnit && toUnit ? "1fr 1fr" : "1fr", gap: 12, marginTop: 10 }}>
                {fromUnit && <label>{label("Sell price")}<input value={sellPriceStr} onChange={(e) => setSellPriceStr(e.target.value)} type="number" step="any" placeholder="live" style={inputStyle} /></label>}
                {toUnit && <label>{label("Buy price")}<input value={buyPriceStr} onChange={(e) => setBuyPriceStr(e.target.value)} type="number" step="any" placeholder="live" style={inputStyle} /></label>}
              </div>
            )}
          </div>
        )}

        {from && usdAmount > 0 && (
          <div style={{ fontSize: 12.5, color: "var(--ink-3)", background: "var(--surface-2)", border: "var(--hair) solid var(--border)", borderRadius: 8, padding: "10px 12px", lineHeight: 1.5 }}>
            Converting <b style={{ color: "var(--ink)" }}>{fmtUSD(usdAmount)}</b> from {nameOf(from)}
            {toUnit && estQty > 0 && destName && (
              <> into <b style={{ color: "var(--ink)" }}>{fmtQty(estQty)} {destName}</b>{effDestPrice ? <> @ {fmtUSD(effDestPrice, { full: true, cents: effDestPrice < 1000 })}{!custom && entry !== "qty" ? " (live)" : ""}</> : null}</>
            )}
            {!toUnit && toSel && <> into {nameOf(toSel)}</>}
            {fromUnit ? " · taxable disposal" : ""}.
          </div>
        )}

        <button disabled={!ready} style={{ padding: 11, background: ready ? "var(--accent)" : "var(--bg-sunk)", color: ready ? "var(--accent-ink)" : "var(--ink-3)", border: "none", borderRadius: 9, fontSize: 13.5, fontWeight: 650, cursor: ready ? "pointer" : "not-allowed", fontFamily: "var(--font-sans)" }}>
          Convert
        </button>
      </div>
    </form>
  );
}
