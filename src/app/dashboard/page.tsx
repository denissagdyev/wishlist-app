import { redirect } from "next/navigation";

import { getSupabaseServerClient } from "@/utils/supabase/server";
import { DashboardClient } from "./dashboard-client";

export const dynamic = "force-dynamic";

type Wishlist = {
  id: string;
  title: string;
  event_date: string | null;
  created_at: string;
};

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const { data: wishlists } = await supabase
    .from("wishlists")
    .select("id, title, event_date, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <DashboardClient
      initialWishlists={(wishlists ?? []) as Wishlist[]}
      userEmail={user.email ?? ""}
      userId={user.id}
    />
  );
}
