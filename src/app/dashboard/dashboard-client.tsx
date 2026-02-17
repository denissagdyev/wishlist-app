"use client";

import { useState, useMemo, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getSupabaseBrowserClient } from "@/utils/supabase/client";

type Wishlist = {
  id: string;
  title: string;
  event_date: string | null;
  created_at: string;
};

type DashboardClientProps = {
  initialWishlists: Wishlist[];
  userEmail: string;
  userId: string;
};

export function DashboardClient({
  initialWishlists,
  userEmail,
  userId,
}: DashboardClientProps) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [wishlists, setWishlists] = useState<Wishlist[]>(initialWishlists);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState<string | "">("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userInitial = useMemo(
    () => (userEmail ? userEmail.charAt(0).toUpperCase() : "?"),
    [userEmail]
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function handleCreateWishlist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Пожалуйста, введите название списка.");
      return;
    }

    setCreating(true);

    try {
      const { data, error } = await supabase
        .from("wishlists")
        .insert({
          title: title.trim(),
          event_date: eventDate || null,
          owner_id: userId,
        })
        .select("id, title, event_date, created_at")
        .single();

      if (error) {
        setError("Не удалось создать вишлист. Попробуйте ещё раз.");
        return;
      }

      setWishlists((prev) =>
        [data as Wishlist, ...prev].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );

      setTitle("");
      setEventDate("");
      setIsDialogOpen(false);
    } catch (err) {
      console.error(err);
      setError("Что-то пошло не так. Попробуйте ещё раз позже.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-sky-100 to-violet-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-6 gap-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 text-white text-xl shadow-md">
              🎁
            </span>
            <div className="flex flex-col">
              <span className="text-lg font-semibold tracking-tight">
                Social Wishlist
              </span>
              <span className="text-xs text-muted-foreground">
                Создавайте списки желаний и делитесь ими с друзьями
              </span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 rounded-full bg-white/60 px-3 py-1.5 text-sm shadow-sm backdrop-blur-md border border-white/60 hover:shadow-md hover:bg-white/80 transition-all">
                <div className="text-right hidden sm:block">
                  <div className="font-medium leading-tight">
                    {userEmail || "Пользователь"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Аккаунт Supabase
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
              <DropdownMenuItem onClick={handleLogout} variant="destructive">
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main className="flex-1 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                Мои вишлисты
              </h1>
              <p className="text-sm text-muted-foreground">
                Собирайте подарки под разные события и делитесь ссылкой с
                друзьями.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <button className="group relative flex h-full min-h-[140px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/70 bg-white/40 px-4 py-6 text-center text-sm font-medium text-violet-700 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-white hover:bg-white/70 hover:shadow-lg">
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-md">
                    +
                  </div>
                  <div className="text-base font-semibold">
                    Создать новый вишлист
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Подготовьтесь к следующему празднику заранее
                  </div>
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Новый вишлист</DialogTitle>
                  <DialogDescription>
                    Задайте название и дату события, чтобы друзья знали, к какому
                    поводу вы готовитесь.
                  </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={handleCreateWishlist}>
                  <div className="space-y-2">
                    <Label htmlFor="wishlist-title">Название списка</Label>
                    <Input
                      id="wishlist-title"
                      placeholder="День рождения, Новый год, переезд..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wishlist-date">Дата события (необязательно)</Label>
                    <Input
                      id="wishlist-date"
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-red-500 bg-red-50/80 rounded-md px-3 py-2">
                      {error}
                    </p>
                  )}
                  <DialogFooter>
                    <Button
                      type="submit"
                      className="w-full sm:w-auto bg-gradient-to-r from-violet-500 to-pink-500 text-white hover:from-violet-600 hover:to-pink-600 shadow-md hover:shadow-lg transition-all"
                      disabled={creating}
                    >
                      {creating ? "Создаём..." : "Создать вишлист"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {wishlists.map((wishlist) => {
              const dateLabel = wishlist.event_date
                ? new Date(wishlist.event_date).toLocaleDateString("ru-RU", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })
                : null;

              return (
                <Link key={wishlist.id} href={`/wishlist/${wishlist.id}`}>
                  <Card className="group h-full cursor-pointer rounded-2xl border-white/60 bg-white/60 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-xl hover:bg-white/80">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold line-clamp-2">
                        {wishlist.title}
                      </CardTitle>
                      {dateLabel && (
                        <CardDescription className="text-xs">
                          Событие: {dateLabel}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Создан{" "}
                        {new Date(wishlist.created_at).toLocaleDateString(
                          "ru-RU",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }
                        )}
                      </span>
                      <span className="text-xs font-medium text-violet-600 group-hover:text-violet-700">
                        Открыть список →
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {wishlists.length === 0 && (
            <div className="mt-6 rounded-2xl border border-white/50 bg-white/50 px-4 py-5 text-sm text-muted-foreground shadow-sm backdrop-blur-xl flex items-center gap-3">
              <span className="text-xl">🎁</span>
              <div>
                <p className="font-medium text-foreground">
                  Здесь пока пусто.
                </p>
                <p>
                  Создайте первый вишлист и отправьте его друзьям — нажмите на
                  карточку «Создать новый вишлист» выше.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

