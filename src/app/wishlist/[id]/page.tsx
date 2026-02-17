import { notFound } from "next/navigation";

import { getSupabaseServerClient } from "@/utils/supabase/server";
import { WishlistPageClient } from "@/components/WishlistPageClient";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function WishlistPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: wishlist, error } = await supabase
    .from("wishlists")
    .select("id, owner_id, title, event_date, is_public, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !wishlist) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-sky-100 to-violet-100 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight">
            Вишлист не найден или недоступен
          </h1>
          <p className="text-sm text-muted-foreground">
            Возможно, ссылка устарела или список был удалён. Попросите владельца
            отправить вам актуальную ссылку.
          </p>
        </div>
      </div>
    );
  }

  const isOwner = !!user && user.id === wishlist.owner_id;

  return (
    <WishlistPageClient
      wishlist={wishlist}
      isOwner={isOwner}
      currentUserEmail={user?.email ?? null}
    />
  );
}

