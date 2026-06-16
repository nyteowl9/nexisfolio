"use client";

import { useId } from "react";

export interface DonutSlice {
  key: string;
  label: string;
  color: string;
  value: number;
}

export function Donut({
  data,
  size = 200,
  thickness = 26,
  activeKey = null,
  onSlice,
  centerTop,
  centerMain,
  centerSub,
  gap = 2,
}: {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  activeKey?: string | null;
  onSlice?: (key: string) => void;
  centerTop?: string;
  centerMain?: string;
  centerSub?: string;
  gap?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  let acc = 0;
  const segs = data.map((d) => {
    const frac = d.value / total;
    const dash = Math.max(0, frac * C - gap);
    const seg = { ...d, dash, offset: -acc * C };
    acc += frac;
    return seg;
  });
  const dim = activeKey ? 0.18 : 1;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--donut-track)" strokeWidth={thickness} />
          {segs.map((s) => (
            <circle
              key={s.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={activeKey === s.key ? thickness + 4 : thickness}
              strokeDasharray={`${s.dash} ${C - s.dash}`}
              strokeDashoffset={s.offset}
              strokeLinecap="butt"
              opacity={activeKey && activeKey !== s.key ? dim : 1}
              style={{ cursor: onSlice ? "pointer" : "default", transition: "opacity .18s, stroke-width .18s" }}
              onMouseEnter={onSlice ? () => onSlice(s.key) : undefined}
            />
          ))}
        </g>
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          textAlign: "center",
        }}
      >
        {centerTop && (
          <div style={{ fontSize: 11, color: "var(--ink-3)", letterSpacing: ".04em", textTransform: "uppercase", fontWeight: 600 }}>
            {centerTop}
          </div>
        )}
        <div className="num" style={{ fontSize: size > 180 ? 26 : 20, fontWeight: 600, color: "var(--ink)", letterSpacing: "-.02em", lineHeight: 1.1, marginTop: 2 }}>
          {centerMain}
        </div>
        {centerSub && <div className="num" style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 3 }}>{centerSub}</div>}
      </div>
    </div>
  );
}

export function Area({
  points,
  width = 240,
  height = 64,
  color = "var(--ink)",
  fill = true,
  strokeWidth = 1.6,
}: {
  points: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
  strokeWidth?: number;
}) {
  const gid = useId().replace(/:/g, "");
  if (points.length < 2) return <svg width={width} height={height} />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const pad = (max - min) * 0.12 || 1;
  const lo = min - pad;
  const hi = max + pad;
  const x = (i: number) => (i / (points.length - 1)) * width;
  const y = (v: number) => height - ((v - lo) / (hi - lo)) * height;
  const line = points.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${width} ${height} L0 ${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", overflow: "visible" }}>
      {fill && (
        <defs>
          <linearGradient id={gid} x1={0} y1={0} x2={0} y2={1}>
            <stop offset="0%" stopColor={color} stopOpacity={0.16} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}
      {fill && <path d={area} fill={`url(#${gid})`} stroke="none" />}
      <path d={line} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
