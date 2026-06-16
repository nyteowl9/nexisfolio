import "@/styles/tokens.css";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--ink)", fontFamily: "var(--font-sans)" }}>
      {children}
    </div>
  );
}
