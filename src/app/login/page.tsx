import { AuthButtons } from "./AuthButtons";

export const metadata = { title: "Sign in — NEXIS FOLIO" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const sp = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#FAFAFB] px-4 text-[#15171A]">
      <div className="w-full max-w-[380px]">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">NEXIS FOLIO</h1>
          <p className="mt-1 text-sm text-[#5C6168]">Every asset you own, in one place.</p>
        </div>

        <form className="space-y-3 rounded-[10px] border border-[#E7E8EA] bg-white p-6 shadow-sm">
          <input type="hidden" name="next" value={sp.next ?? "/dashboard"} />

          {sp.error && (
            <p className="rounded-md bg-[#FDECEC] px-3 py-2 text-sm text-[#E0443E]">{sp.error}</p>
          )}
          {sp.message && (
            <p className="rounded-md bg-[#E8F6F0] px-3 py-2 text-sm text-[#0E9D6E]">{sp.message}</p>
          )}

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[#5C6168]">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-[10px] border border-[#E7E8EA] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#15171A]"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-[#5C6168]">Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              className="w-full rounded-[10px] border border-[#E7E8EA] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#15171A]"
            />
          </label>

          <AuthButtons />
        </form>

        <p className="mt-4 text-center text-xs text-[#8A9099]">
          Google &amp; Apple sign-in coming soon.
        </p>
      </div>
    </main>
  );
}
