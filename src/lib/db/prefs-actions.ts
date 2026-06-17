"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PREFS, type Prefs } from "@/lib/db/prefs";

/** Server action: merge a partial prefs patch into the user's profile. */
export async function updatePrefs(patch: Partial<Prefs>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data } = await supabase.from("profiles").select("prefs").eq("id", user.id).single();
  const next = { ...DEFAULT_PREFS, ...((data?.prefs as Partial<Prefs>) ?? {}), ...patch };
  await supabase.from("profiles").update({ prefs: next }).eq("id", user.id);
  revalidatePath("/dashboard");
  revalidatePath("/news");
}
