"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isUnitPriced, type AssetClass } from "@/lib/engine";

const num = (v: FormDataEntryValue | null) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

/** For unit-priced positions, keep position.qty in sync with the sum of its lots. */
async function syncQty(supabase: SupabaseClient, positionId: string, userId: string) {
  const { data: pos } = await supabase.from("positions").select("cls").eq("id", positionId).eq("user_id", userId).single();
  if (!pos || !isUnitPriced(pos.cls as AssetClass)) return;
  const { data: lots } = await supabase.from("lots").select("qty").eq("position_id", positionId);
  const total = (lots ?? []).reduce((s, l) => s + Number(l.qty), 0);
  await supabase.from("positions").update({ qty: total }).eq("id", positionId).eq("user_id", userId);
}

function done(positionId: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/detail/${positionId}`);
}

export async function addLot(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const positionId = str(formData.get("positionId"));
  if (!positionId) return;
  await supabase.from("lots").insert({
    user_id: user.id,
    position_id: positionId,
    qty: num(formData.get("qty")),
    price: num(formData.get("price")),
    acquired_date: str(formData.get("acquired_date")) || new Date().toISOString().slice(0, 10),
    account: str(formData.get("account")) || null,
  });
  await syncQty(supabase, positionId, user.id);
  done(positionId);
}

export async function updateLot(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const id = str(formData.get("id"));
  const positionId = str(formData.get("positionId"));
  if (!id) return;
  await supabase.from("lots").update({
    qty: num(formData.get("qty")),
    price: num(formData.get("price")),
    acquired_date: str(formData.get("acquired_date")) || new Date().toISOString().slice(0, 10),
    account: str(formData.get("account")) || null,
  }).eq("id", id).eq("user_id", user.id);
  await syncQty(supabase, positionId, user.id);
  done(positionId);
}

export async function deleteLot(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const id = str(formData.get("id"));
  const positionId = str(formData.get("positionId"));
  if (!id) return;
  await supabase.from("lots").delete().eq("id", id).eq("user_id", user.id);
  await syncQty(supabase, positionId, user.id);
  done(positionId);
}
