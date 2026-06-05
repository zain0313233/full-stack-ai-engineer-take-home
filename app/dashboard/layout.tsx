import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { upsertUser } from "@/lib/db/users";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Ensure user exists in our DB
  await upsertUser(
    user.id,
    user.email!,
    user.user_metadata?.full_name ?? undefined
  );

  const profile = {
    name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
    email: user.email,
  };

  return <DashboardLayout user={profile}>{children}</DashboardLayout>;
}
