"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const str = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
};
const num = (v: FormDataEntryValue | null) => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function fields(formData: FormData) {
  return {
    name: str(formData.get("name")) ?? "Debt",
    kind: str(formData.get("kind")) ?? "other",
    balance: num(formData.get("balance")) ?? 0,
    rate: num(formData.get("rate")),
    originated: str(formData.get("originated")),
    collateral_position_id: str(formData.get("collateral_position_id")),
    liq_ltv: num(formData.get("liq_ltv")),
  };
}

export async function addLiability(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("liabilities").insert({ user_id: user.id, ...fields(formData) });
  revalidatePath("/dashboard");
  revalidatePath("/history");
}

export async function updateLiability(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const id = str(formData.get("id"));
  if (!id) return;
  await supabase.from("liabilities").update({ ...fields(formData), updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/dashboard");
  revalidatePath("/history");
}

export async function deleteLiability(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const id = str(formData.get("id"));
  if (!id) return;
  await supabase.from("liabilities").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/dashboard");
  revalidatePath("/history");
}
