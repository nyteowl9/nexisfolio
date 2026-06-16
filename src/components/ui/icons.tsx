import type { CSSProperties } from "react";

interface IconProps {
  size?: number;
  color?: string;
  sw?: number;
  style?: CSSProperties;
}

const stroke =
  (paths: string[]) =>
  ({ size = 16, color = "currentColor", sw = 1.6, style }: IconProps = {}) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={style}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );

export const Bolt = ({ size = 14, color = "currentColor", style }: IconProps = {}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} stroke="none" style={style}>
    <path d="M13 2 L4.5 13.5 H11 L10 22 L19.5 9.5 H13 Z" />
  </svg>
);

export const Clock = stroke(["M12 7v5l3 2", "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"]);
export const ArrowUp = stroke(["M12 19V5", "M6 11l6-6 6 6"]);
export const ArrowDown = stroke(["M12 5v14", "M6 13l6 6 6-6"]);
export const Search = stroke(["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z", "M21 21l-4.3-4.3"]);
export const Plus = stroke(["M12 5v14", "M5 12h14"]);
export const Sun = stroke([
  "M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z", "M12 1v2", "M12 21v2", "M4.2 4.2l1.4 1.4",
  "M18.4 18.4l1.4 1.4", "M1 12h2", "M21 12h2", "M4.2 19.8l1.4-1.4", "M18.4 5.6l1.4-1.4",
]);
export const Moon = stroke(["M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"]);
export const Chevron = stroke(["M9 18l6-6-6-6"]);
export const Refresh = stroke(["M21 12a9 9 0 1 1-2.6-6.4", "M21 4v5h-5"]);
export const Menu = stroke(["M3 6h18", "M3 12h18", "M3 18h18"]);
