import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Root routing. Signed-in users go to the dashboard; everyone else sees the
 *  marketing landing (served statically from /public/demo) so new visitors can
 *  preview the product before creating an account. */
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? "/dashboard" : "/demo/index.html");
}
