"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, signUp } from "./actions";

/** Sign-in / Create-account buttons with a pending state, so a click gives
 *  immediate feedback (disabled + "Signing in…") instead of looking inert. */
export function AuthButtons() {
  const { pending } = useFormStatus();
  const [mode, setMode] = useState<"in" | "up" | null>(null);

  return (
    <>
      <button
        formAction={signIn}
        onClick={() => setMode("in")}
        disabled={pending}
        className="w-full rounded-full bg-[#15171A] py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {pending && mode === "in" ? "Signing in…" : "Sign in"}
      </button>
      <button
        formAction={signUp}
        onClick={() => setMode("up")}
        disabled={pending}
        className="w-full rounded-full border border-[#E7E8EA] py-2.5 text-sm font-medium text-[#15171A] transition hover:bg-[#F5F5F6] disabled:opacity-60"
      >
        {pending && mode === "up" ? "Creating account…" : "Create account"}
      </button>
    </>
  );
}
