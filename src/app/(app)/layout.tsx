import "@/styles/tokens.css";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPrefs } from "@/lib/db/prefs";
import { PrefsProvider } from "@/components/app/PrefsProvider";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const prefs = await getPrefs(supabase);

  return (
    <PrefsProvider initial={prefs} email={user.email}>
      {children}
    </PrefsProvider>
  );
}
