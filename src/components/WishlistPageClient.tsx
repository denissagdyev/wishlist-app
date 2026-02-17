"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { WishlistItems } from "@/components/WishlistItems";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSupabaseBrowserClient } from "@/utils/supabase/client";

type Wishlist = {
  id: string;
  owner_id: string;
  title: string;
  event_date: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

type WishlistPageClientProps = {
  wishlist: Wishlist;
  isOwner: boolean;
  currentUserEmail: string | null;
};

export function WishlistPageClient({
  wishlist,
  isOwner,
  currentUserEmail,
}: WishlistPageClientProps) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const eventDateLabel = wishlist.event_date
    ? new Date(wishlist.event_date).toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  const userInitial =
    currentUserEmail?.charAt(0).toUpperCase() ??
    wishlist.title.charAt(0).toUpperCase() ??
    "U";

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 text-white text-xl shadow-md"
            >
              🎁
            </Link>
            <div className="flex flex-col">
              <span className="text-lg font-semibold tracking-tight">
                Social Wishlist
              </span>
              <span className="text-xs text-muted-foreground">
                {isOwner
                  ? "Ваш список желаний"
                  : "Публичный вишлист для друзей"}
              </span>
            </div>
          </div>

          {isOwner ? (
            <div className="flex items-center gap-3">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="hidden sm:inline-flex rounded-full border-white/70 bg-white/70 text-xs font-medium shadow-sm hover:bg-white hover:shadow-md backdrop-blur-md"
              >
                <Link href="/dashboard">Мои вишлисты</Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 rounded-full bg-white/70 px-3 py-1.5 text-sm shadow-sm backdrop-blur-md border border-white/60 hover:shadow-md hover:bg-white transition-all">
                    <div className="text-right hidden sm:block">
                      <div className="font-medium leading-tight">
                        {currentUserEmail || "Пользователь"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Владелец вишлиста
                      </div>
                    </div>
                    <Avatar size="default">
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-pink-500 text-white text-sm font-semibold">
                        {userInitial}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Аккаунт</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard">Перейти к вишлистам</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    variant="destructive"
                  >
                    Выйти
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="rounded-full border-white/70 bg-white/70 text-xs font-medium shadow-sm hover:bg-white hover:shadow-md backdrop-blur-md"
              >
                <Link href="/register">Создать свой вишлист</Link>
              </Button>
            </div>
          )}
        </header>

        <Card className="backdrop-blur-xl bg-white/70 border-white/60 shadow-2xl rounded-3xl">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl sm:text-3xl font-semibold tracking-tight">
                {wishlist.title}
              </CardTitle>
              {eventDateLabel && (
                <CardDescription className="mt-1 text-sm">
                  Событие: {eventDateLabel}
                </CardDescription>
              )}
            </div>
            <div className="mt-3 sm:mt-0">
              <span className="inline-flex items-center rounded-full bg-gradient-to-r from-violet-500/10 to-pink-500/10 px-3 py-1 text-xs font-medium text-violet-700 border border-violet-200/60">
                {isOwner
                  ? "Это ваш вишлист. Детали резервов и сборов будут скрыты, чтобы не портить сюрприз."
                  : "Вы гость этого списка. Помогите выбрать подарок для владельца."}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Делитесь этой страницей с друзьями, чтобы они могли выбрать
              подарок и при необходимости скинуться на дорогие позиции.
            </p>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight">
              Подарки в этом вишлисте
            </h2>
          </div>
          <WishlistItems wishlistId={wishlist.id} isOwner={isOwner} />
        </section>
      </div>
    </div>
  );
}

