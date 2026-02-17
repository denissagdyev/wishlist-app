"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
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
import { getSupabaseBrowserClient } from "@/utils/supabase/client";

type Item = {
  id: string;
  wishlist_id: string;
  name: string;
  url: string | null;
  price: number | null;
  image_url: string | null;
  created_at: string;
};

type Reservation = {
  id: string;
  item_id: string;
  reserver_name: string;
  created_at: string;
};

type Contribution = {
  id: string;
  item_id: string;
  contributor_name: string;
  amount: number;
  created_at: string;
};

type GuestAction = {
  wishlistId: string;
  itemId: string;
  type: "reservation" | "contribution";
};

type WishlistItemsProps = {
  wishlistId: string;
  isOwner: boolean;
};

const MIN_CONTRIBUTION = 100;
const GUEST_NAME_STORAGE_KEY = "wishlist_guest_name";
const GUEST_ACTIONS_STORAGE_KEY = "wishlist_guest_actions";

function loadGuestActions(): GuestAction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUEST_ACTIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveGuestActions(actions: GuestAction[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      GUEST_ACTIONS_STORAGE_KEY,
      JSON.stringify(actions)
    );
  } catch {
    // ignore
  }
}

export function WishlistItems({ wishlistId, isOwner }: WishlistItemsProps) {
  const supabase = getSupabaseBrowserClient();

  const [items, setItems] = useState<Item[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);

  const [guestName, setGuestName] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [contribDialogOpen, setContribDialogOpen] = useState(false);
  const [contribItemId, setContribItemId] = useState<string | null>(null);
  const [contribAmount, setContribAmount] = useState("");
  const [contribError, setContribError] = useState<string | null>(null);
  const [contribSaving, setContribSaving] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [alerts, setAlerts] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(GUEST_NAME_STORAGE_KEY);
    if (stored) {
      setGuestName(stored);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadAll() {
      setLoading(true);
      setError(null);

      try {
        const { data: itemsData, error: itemsError } = await supabase
          .from("items")
          .select("id, wishlist_id, name, url, price, image_url, created_at")
          .eq("wishlist_id", wishlistId)
          .order("created_at", { ascending: false });

        if (itemsError) {
          if (!isMounted) return;
          setError("Не удалось загрузить подарки. Попробуйте обновить страницу.");
          return;
        }

        const typedItems = (itemsData ?? []) as Item[];

        if (!isMounted) return;

        setItems(typedItems);

        const itemIds = typedItems.map((i) => i.id);
        if (itemIds.length === 0) {
          setReservations([]);
          setContributions([]);
        } else {
          const [
            { data: resData, error: resError },
            { data: contribData, error: contribError },
          ] = await Promise.all([
            supabase
              .from("reservations")
              .select("id, item_id, reserver_name, created_at")
              .in("item_id", itemIds),
            supabase
              .from("contributions")
              .select("id, item_id, contributor_name, amount, created_at")
              .in("item_id", itemIds),
          ]);

          if (!isMounted) return;

          if (resError || contribError) {
            setError(
              "Не удалось загрузить резервы или вклады. Попробуйте обновить страницу."
            );
            return;
          }

          setReservations((resData ?? []) as Reservation[]);
          setContributions((contribData ?? []) as Contribution[]);
        }

        // После первичной загрузки сверяем локальные действия с актуальными items
        if (typeof window !== "undefined") {
          const currentIds = new Set(typedItems.map((i) => i.id));
          const actions = loadGuestActions();
          const [remaining, removed] = actions.reduce<
            [GuestAction[], GuestAction[]]
          >(
            (acc, action) => {
              if (
                action.wishlistId === wishlistId &&
                !currentIds.has(action.itemId)
              ) {
                acc[1].push(action);
              } else {
                acc[0].push(action);
              }
              return acc;
            },
            [[], []]
          );

          if (removed.length > 0) {
            const newAlerts: string[] = [];
            removed.forEach((action) => {
              if (action.type === "contribution") {
                newAlerts.push(
                  "Владелец удалил подарок, на который вы скидывались. Виртуально считаем, что вклад возвращён — выберите другой подарок."
                );
              } else if (action.type === "reservation") {
                newAlerts.push(
                  "Владелец удалил подарок, который вы резервировали. Пожалуйста, выберите другой подарок."
                );
              }
            });
            if (newAlerts.length > 0) {
              setAlerts((prev) => [...prev, ...newAlerts]);
            }
            saveGuestActions(remaining);
          }
        }
      } catch (err) {
        console.error(err);
        if (!isMounted) return;
        setError("Что-то пошло не так при загрузке данных.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadAll();

    return () => {
      isMounted = false;
    };
  }, [supabase, wishlistId]);

  useEffect(() => {
    const channel = supabase
      .channel(`wishlist-${wishlistId}-realtime`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        (payload) => {
          const newRecord = payload.new as Reservation | null;
          const oldRecord = payload.old as Reservation | null;

          if (payload.eventType === "INSERT" && newRecord) {
            setReservations((prev) => {
              if (prev.some((r) => r.id === newRecord.id)) return prev;
              return [...prev, newRecord];
            });
          }

          if (payload.eventType === "DELETE" && oldRecord) {
            setReservations((prev) => prev.filter((r) => r.id !== oldRecord.id));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contributions" },
        (payload) => {
          const newRecord = payload.new as Contribution | null;
          const oldRecord = payload.old as Contribution | null;

          if (payload.eventType === "INSERT" && newRecord) {
            setContributions((prev) => {
              if (prev.some((c) => c.id === newRecord.id)) return prev;
              return [...prev, newRecord];
            });
          }

          if (payload.eventType === "DELETE" && oldRecord) {
            setContributions((prev) => prev.filter((c) => c.id !== oldRecord.id));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "items" },
        (payload) => {
          const newItem = payload.new as Item | null;
          const oldItem = payload.old as Item | null;

          if (payload.eventType === "INSERT" && newItem) {
            if (newItem.wishlist_id !== wishlistId) return;
            setItems((prev) => {
              if (prev.some((i) => i.id === newItem.id)) {
                return prev;
              }
              return [newItem, ...prev].sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              );
            });
          }

          if (payload.eventType === "UPDATE" && newItem) {
            if (newItem.wishlist_id !== wishlistId) return;
            setItems((prev) =>
              prev.map((i) => (i.id === newItem.id ? { ...i, ...newItem } : i))
            );
          }

          if (payload.eventType === "DELETE" && oldItem) {
            const deletedId = oldItem.id;
            setItems((prev) => prev.filter((i) => i.id !== deletedId));
            setReservations((prev) =>
              prev.filter((r) => r.item_id !== deletedId)
            );
            setContributions((prev) =>
              prev.filter((c) => c.item_id !== deletedId)
            );

            // Онлайн‑уведомления для гостя, если он участвовал
            if (typeof window !== "undefined") {
              const actions = loadGuestActions();
              const [remaining, removed] = actions.reduce<
                [GuestAction[], GuestAction[]]
              >(
                (acc, action) => {
                  if (
                    action.wishlistId === wishlistId &&
                    action.itemId === deletedId
                  ) {
                    acc[1].push(action);
                  } else {
                    acc[0].push(action);
                  }
                  return acc;
                },
                [[], []]
              );

              if (removed.length > 0) {
                const newAlerts: string[] = [];
                removed.forEach((action) => {
                  if (action.type === "contribution") {
                    newAlerts.push(
                      "Владелец удалил подарок, на который вы скидывались. Виртуально считаем, что вклад возвращён — выберите другой подарок."
                    );
                  } else if (action.type === "reservation") {
                    newAlerts.push(
                      "Владелец удалил подарок, который вы резервировали. Пожалуйста, выберите другой подарок."
                    );
                  }
                });
                if (newAlerts.length > 0) {
                  setAlerts((prev) => [...prev, ...newAlerts]);
                }
                saveGuestActions(remaining);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, wishlistId]);

  async function ensureGuestName(): Promise<string | null> {
    if (guestName) return guestName;

    if (typeof window === "undefined") return null;

    const name = window.prompt("Как вас представить друзьям?", "");
    if (!name) return null;

    const trimmed = name.trim();
    if (!trimmed) return null;

    try {
      window.localStorage.setItem(GUEST_NAME_STORAGE_KEY, trimmed);
    } catch {
      // ignore
    }

    setGuestName(trimmed);
    return trimmed;
  }

  function addGuestAction(action: GuestAction) {
    if (typeof window === "undefined") return;
    const current = loadGuestActions();
    current.push(action);
    saveGuestActions(current);
  }

  function removeGuestActionByReservation(itemId: string) {
    if (typeof window === "undefined") return;
    const current = loadGuestActions();
    const remaining = current.filter(
      (a) =>
        !(
          a.wishlistId === wishlistId &&
          a.itemId === itemId &&
          a.type === "reservation"
        )
    );
    saveGuestActions(remaining);
  }

  async function handleCreateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Пожалуйста, введите название подарка.");
      return;
    }

    let priceNumber: number | null = null;
    if (price.trim()) {
      const normalized = price.replace(",", ".").trim();
      const parsed = Number(normalized);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        priceNumber = parsed;
      } else {
        setFormError("Некорректное значение цены. Введите число, например 1999.99.");
        return;
      }
    }

    setSaving(true);

    try {
      const { data, error } = await supabase
        .from("items")
        .insert({
          wishlist_id: wishlistId,
          name: name.trim(),
          url: url.trim() || null,
          price: priceNumber,
          image_url: imageUrl.trim() || null,
        })
        .select("id, wishlist_id, name, url, price, image_url, created_at")
        .single();

      if (error) {
        setFormError("Не удалось добавить подарок. Попробуйте ещё раз.");
        return;
      }

      setItems((prev) => {
        const inserted = data as Item;
        if (prev.some((i) => i.id === inserted.id)) {
          return prev;
        }
        return [inserted, ...prev].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });

      setName("");
      setUrl("");
      setPrice("");
      setImageUrl("");
      setDialogOpen(false);
    } catch (err) {
      console.error(err);
      setFormError("Что-то пошло не так. Попробуйте ещё раз позже.");
    } finally {
      setSaving(false);
    }
  }

  function openEditDialog(item: Item) {
    setEditError(null);
    setEditItemId(item.id);
    setEditName(item.name ?? "");
    setEditUrl(item.url ?? "");
    setEditPrice(item.price == null ? "" : String(item.price));
    setEditImageUrl(item.image_url ?? "");
    setEditOpen(true);
  }

  async function handleUpdateItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEditError(null);

    if (!editItemId) return;

    if (!editName.trim()) {
      setEditError("Пожалуйста, введите название подарка.");
      return;
    }

    let priceNumber: number | null = null;
    if (editPrice.trim()) {
      const normalized = editPrice.replace(",", ".").trim();
      const parsed = Number(normalized);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        priceNumber = parsed;
      } else {
        setEditError("Некорректное значение цены. Введите число, например 1999.99.");
        return;
      }
    }

    setEditSaving(true);

    try {
      const { data, error } = await supabase
        .from("items")
        .update({
          name: editName.trim(),
          url: editUrl.trim() || null,
          price: priceNumber,
          image_url: editImageUrl.trim() || null,
        })
        .eq("id", editItemId)
        .select("id, wishlist_id, name, url, price, image_url, created_at")
        .single();

      if (error) {
        setEditError("Не удалось сохранить изменения. Попробуйте ещё раз.");
        return;
      }

      const updated = data as Item;
      setItems((prev) =>
        prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i))
      );

      setEditOpen(false);
      setEditItemId(null);
    } catch (err) {
      console.error(err);
      setEditError("Что-то пошло не так. Попробуйте ещё раз позже.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeleteItem(item: Item) {
    if (!isOwner) return;
    if (typeof window !== "undefined") {
      const hasActivity =
        reservations.some((r) => r.item_id === item.id) ||
        contributions.some((c) => c.item_id === item.id);
      const message = hasActivity
        ? "По этому подарку уже есть резервы или вклады. При удалении все связанные данные тоже будут удалены. Точно удалить подарок?"
        : "Точно удалить подарок?";
      const confirmed = window.confirm(message);
      if (!confirmed) return;
    }

    const { error } = await supabase.from("items").delete().eq("id", item.id);
    if (error) {
      console.error(error);
      if (typeof window !== "undefined") {
        window.alert("Не удалось удалить подарок. Попробуйте ещё раз.");
      }
      return;
    }

    setItems((prev) => prev.filter((i) => i.id !== item.id));
    setReservations((prev) => prev.filter((r) => r.item_id !== item.id));
    setContributions((prev) => prev.filter((c) => c.item_id !== item.id));
  }

  async function handleFetchMeta() {
    setMetaError(null);

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setMetaError("Сначала укажите ссылку на товар.");
      return;
    }

    setMetaLoading(true);

    try {
      const response = await fetch("/api/fetch-meta", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      if (!response.ok) {
        setMetaError("Не удалось получить данные по ссылке. Попробуйте ввести вручную.");
        return;
      }

      const data: {
        name: string | null;
        imageUrl: string | null;
        price: number | null;
        message?: string;
      } = await response.json();

      if (data.name && !name.trim()) {
        setName(data.name);
      }

      if (data.imageUrl && !imageUrl.trim()) {
        setImageUrl(data.imageUrl);
      }

      if (data.price != null && !Number.isNaN(data.price) && !price.trim()) {
        setPrice(String(data.price));
      }

      if (data.message) {
        setMetaError(data.message);
      } else if (!data.name && !data.imageUrl && data.price == null) {
        setMetaError("Не удалось найти данные по этой ссылке. Заполните поля вручную.");
      }
    } catch (err) {
      console.error(err);
      setMetaError("Что-то пошло не так при автозаполнении. Попробуйте ещё раз.");
    } finally {
      setMetaLoading(false);
    }
  }

  async function handleReserve(itemId: string) {
    if (isOwner) return;

    const existing = reservations.find((r) => r.item_id === itemId);
    if (existing && existing.reserver_name !== guestName) {
      if (typeof window !== "undefined") {
        window.alert("Этот подарок уже кто-то взял, выберите другой.");
      }
      return;
    }

    const name = await ensureGuestName();
    if (!name) return;

    if (existing && existing.reserver_name === name) {
      return;
    }

    const { data, error } = await supabase
      .from("reservations")
      .insert({
        item_id: itemId,
        reserver_name: name,
      })
      .select("id, item_id, reserver_name, created_at")
      .single();

    if (error) {
      console.error(error);
      if (typeof window !== "undefined") {
        window.alert("Не удалось зарезервировать подарок. Попробуйте ещё раз.");
      }
      return;
    }

    setReservations((prev) => [...prev, data as Reservation]);
    addGuestAction({ wishlistId, itemId, type: "reservation" });
  }

  async function handleUnreserve(itemId: string) {
    if (isOwner || !guestName) return;

    const existing = reservations.find(
      (r) => r.item_id === itemId && r.reserver_name === guestName
    );
    if (!existing) return;

    const { error } = await supabase.from("reservations").delete().eq("id", existing.id);

    if (error) {
      console.error(error);
      if (typeof window !== "undefined") {
        window.alert("Не удалось снять резерв. Попробуйте ещё раз.");
      }
      return;
    }

    setReservations((prev) => prev.filter((r) => r.id !== existing.id));
    removeGuestActionByReservation(itemId);
  }

  function openContributionDialog(itemId: string) {
    setContribItemId(itemId);
    setContribAmount("");
    setContribError(null);
    setContribDialogOpen(true);
  }

  async function handleCreateContribution(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContribError(null);

    if (!contribItemId) return;

    const name = await ensureGuestName();
    if (!name) return;

    const normalized = contribAmount.replace(",", ".").trim();
    const parsed = Number(normalized);
    if (Number.isNaN(parsed) || parsed <= 0) {
      setContribError("Введите корректную сумму вклада.");
      return;
    }

    const item = items.find((i) => i.id === contribItemId) ?? null;
    if (!item || !item.price || item.price <= 0) {
      setContribError("Для этого подарка нельзя сделать вклад.");
      return;
    }

    const itemReservations = reservations.filter((r) => r.item_id === contribItemId);
    if (itemReservations.length > 0) {
      setContribError("Этот подарок полностью зарезервирован. Вклады больше не принимаются.");
      return;
    }

    const sumContributions = contributions
      .filter((c) => c.item_id === contribItemId)
      .reduce((sum, c) => sum + (c.amount ?? 0), 0);

    const remaining = item.price - sumContributions;
    if (remaining <= 0) {
      setContribError("Сбор уже завершён. Вклады больше не принимаются.");
      return;
    }

    if (parsed > remaining) {
      setContribError(
        `Нельзя внести больше, чем осталось. Максимальная сумма: ${remaining.toLocaleString(
          "ru-RU",
          { style: "currency", currency: "RUB", maximumFractionDigits: 2 }
        )}`
      );
      return;
    }

    if (parsed < MIN_CONTRIBUTION) {
      setContribError(
        `Минимальный вклад — ${MIN_CONTRIBUTION.toLocaleString("ru-RU")} ₽.`
      );
      return;
    }

    setContribSaving(true);

    try {
      const { data, error } = await supabase
        .from("contributions")
        .insert({
          item_id: contribItemId,
          contributor_name: name,
          amount: parsed,
        })
        .select("id, item_id, contributor_name, amount, created_at")
        .single();

      if (error) {
        console.error(error);
        setContribError("Не удалось добавить вклад. Попробуйте ещё раз.");
        return;
      }

      setContributions((prev) => [...prev, data as Contribution]);
      addGuestAction({
        wishlistId,
        itemId: contribItemId,
        type: "contribution",
      });
      setContribDialogOpen(false);
      setContribAmount("");
    } catch (err) {
      console.error(err);
      setContribError("Что-то пошло не так. Попробуйте ещё раз позже.");
    } finally {
      setContribSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((msg, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-900 shadow-sm backdrop-blur-sm"
            >
              {msg}
            </div>
          ))}
        </div>
      )}

      {isOwner && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-gradient-to-r from-violet-500 to-pink-500 text-white hover:from-violet-600 hover:to-pink-600 shadow-md hover:shadow-lg transition-all"
              size="lg"
            >
              Добавить подарок
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Новый подарок</DialogTitle>
              <DialogDescription>
                Добавьте подарок в этот вишлист. Название обязательно, остальные
                поля можно заполнить позже.
              </DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleCreateItem}>
              <div className="space-y-2">
                <Label htmlFor="item-name">Название подарка</Label>
                <Input
                  id="item-name"
                  placeholder="Например, кофе-машина или путешествие в Стамбул"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-url">Ссылка на товар (необязательно)</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="item-url"
                    placeholder="https://..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleFetchMeta}
                    disabled={metaLoading}
                    className="sm:w-auto w-full"
                  >
                    {metaLoading ? "Ищем..." : "Автозаполнить"}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-price">Цена (необязательно)</Label>
                <Input
                  id="item-price"
                  type="text"
                  inputMode="decimal"
                  placeholder="Например, 1999.99"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-image-url">
                  Ссылка на картинку (необязательно)
                </Label>
                <Input
                  id="item-image-url"
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
              {formError && (
                <p className="text-sm text-red-500 bg-red-50/80 rounded-md px-3 py-2">
                  {formError}
                </p>
              )}
              {metaError && (
                <p className="text-xs text-amber-600 bg-amber-50/80 rounded-md px-3 py-2">
                  {metaError}
                </p>
              )}
              <DialogFooter>
                <Button
                  type="submit"
                  className="w-full sm:w-auto bg-gradient-to-r from-violet-500 to-pink-500 text-white hover:from-violet-600 hover:to-pink-600 shadow-md hover:shadow-lg transition-all"
                  disabled={saving}
                >
                  {saving ? "Добавляем..." : "Добавить подарок"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Редактировать подарок</DialogTitle>
            <DialogDescription>
              Обновите данные подарка. Изменения сразу отразятся в списке.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleUpdateItem}>
            <div className="space-y-2">
              <Label htmlFor="edit-item-name">Название подарка</Label>
              <Input
                id="edit-item-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-item-url">Ссылка на товар (необязательно)</Label>
              <Input
                id="edit-item-url"
                placeholder="https://..."
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-item-price">Цена (необязательно)</Label>
              <Input
                id="edit-item-price"
                type="text"
                inputMode="decimal"
                placeholder="Например, 1999.99"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-item-image-url">
                Ссылка на картинку (необязательно)
              </Label>
              <Input
                id="edit-item-image-url"
                placeholder="https://..."
                value={editImageUrl}
                onChange={(e) => setEditImageUrl(e.target.value)}
              />
            </div>
            {editError && (
              <p className="text-sm text-red-500 bg-red-50/80 rounded-md px-3 py-2">
                {editError}
              </p>
            )}
            <DialogFooter>
              <Button
                type="submit"
                className="w-full sm:w-auto bg-gradient-to-r from-violet-500 to-pink-500 text-white hover:from-violet-600 hover:to-pink-600 shadow-md hover:shadow-lg transition-all"
                disabled={editSaving}
              >
                {editSaving ? "Сохраняем..." : "Сохранить"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={contribDialogOpen} onOpenChange={setContribDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Скинуться на подарок</DialogTitle>
            <DialogDescription>
              Введите сумму, на которую хотите поучаствовать. Минимальный вклад —{" "}
              {MIN_CONTRIBUTION.toLocaleString("ru-RU")} ₽.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateContribution}>
            <div className="space-y-2">
              <Label htmlFor="contrib-amount">Сумма вклада</Label>
              <Input
                id="contrib-amount"
                type="text"
                inputMode="decimal"
                placeholder={MIN_CONTRIBUTION.toString()}
                value={contribAmount}
                onChange={(e) => setContribAmount(e.target.value)}
              />
            </div>
            {contribError && (
              <p className="text-sm text-red-500 bg-red-50/80 rounded-md px-3 py-2">
                {contribError}
              </p>
            )}
            <DialogFooter>
              <Button
                type="submit"
                className="w-full sm:w-auto bg-gradient-to-r from-violet-500 to-pink-500 text-white hover:from-violet-600 hover:to-pink-600 shadow-md hover:shadow-lg transition-all"
                disabled={contribSaving}
              >
                {contribSaving ? "Отправляем..." : "Отправить вклад"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {loading && (
        <p className="text-sm text-muted-foreground">
          Загружаем подарки для этого вишлиста...
        </p>
      )}

      {error && !loading && (
        <p className="text-sm text-red-500 bg-red-50/80 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {!loading && items.length === 0 && !error && (
        <Card className="rounded-2xl border-white/60 bg-white/60 shadow-sm backdrop-blur-xl">
          <CardContent className="py-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">✨</span>
              <div className="space-y-1">
                <p className="font-medium text-foreground">
                  В этом вишлисте пока нет подарков.
                </p>
                <p className="text-sm text-muted-foreground">
                  Начните с того, что давно хотели, но не покупали себе сами —
                  это поможет друзьям с идеями.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const hasPrice =
            typeof item.price === "number" && !Number.isNaN(item.price);

          const itemReservations = reservations.filter(
            (r) => r.item_id === item.id
          );
          const fullyReserved = itemReservations.length > 0;
          const reservedByCurrentGuest =
            !!guestName &&
            itemReservations.some((r) => r.reserver_name === guestName);

          const itemContributions = contributions.filter(
            (c) => c.item_id === item.id
          );
          const totalContributions = itemContributions.reduce(
            (sum, c) => sum + (c.amount ?? 0),
            0
          );
          const isPricedValid = hasPrice && item.price !== null && item.price > 0;
          const progress = isPricedValid
            ? Math.min(1, totalContributions / (item.price as number))
            : 0;

          const isFullyFunded =
            isPricedValid && totalContributions >= (item.price as number);
          const hasAnyContributions = itemContributions.length > 0;
          const isCollecting =
            isPricedValid && hasAnyContributions && !isFullyFunded;
          const isFree = !fullyReserved && !hasAnyContributions;

          let statusText: string;
          if (fullyReserved) {
            statusText = isOwner
              ? "Подарок зарезервирован."
              : reservedByCurrentGuest
              ? "Вы зарезервировали этот подарок."
              : "Подарок полностью зарезервирован.";
          } else if (isFullyFunded) {
            statusText = isOwner
              ? "Сбор по этому подарку завершён."
              : "Сбор по этому подарку завершён — выберите другой.";
          } else if (isCollecting) {
            statusText = "По этому подарку идёт сбор.";
          } else {
            statusText = "Подарок пока свободен.";
          }

          const canReserve =
            !isOwner && isFree && !isFullyFunded;
          const canContribute =
            !isOwner && isPricedValid && !isFullyFunded && !fullyReserved;

          return (
            <Card
              key={item.id}
              className="group h-full rounded-2xl border-white/60 bg-white/60 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:shadow-xl hover:bg-white/80 flex flex-col"
            >
              {item.image_url && (
                <div className="h-40 w-full overflow-hidden rounded-t-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>
              )}
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base sm:text-lg font-semibold line-clamp-2">
                    {item.name}
                  </CardTitle>
                  {hasPrice && (
                    <CardDescription className="mt-1 text-sm font-medium text-violet-700">
                      {item.price!.toLocaleString("ru-RU", {
                        style: "currency",
                        currency: "RUB",
                        maximumFractionDigits: 2,
                      })}
                    </CardDescription>
                  )}
                </div>
                {isOwner && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="xs"
                      variant="outline"
                      className="rounded-full text-[11px] px-2 py-1"
                      onClick={() => openEditDialog(item)}
                    >
                      Редактировать
                    </Button>
                    <Button
                      size="xs"
                      variant="outline"
                      className="rounded-full text-[11px] px-2 py-1"
                      onClick={() => handleDeleteItem(item)}
                    >
                      Удалить
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-0 flex flex-1 flex-col gap-3">
                {item.url && (
                  <Link
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-violet-600 hover:text-violet-700 underline underline-offset-2 line-clamp-1"
                  >
                    Открыть ссылку на подарок
                  </Link>
                )}

                <div className="flex flex-col gap-2 text-xs">
                  {/* Статус и резервы */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">
                      {statusText}
                    </span>
                    {!isOwner && (
                      <div className="shrink-0">
                        {canReserve ? (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleReserve(item.id)}
                          >
                            Зарезервировать
                          </Button>
                        ) : fullyReserved && reservedByCurrentGuest ? (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleUnreserve(item.id)}
                          >
                            Снять резерв
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Вклады и прогресс */}
                  {isPricedValid && (
                    <div className="space-y-1">
                      <div className="w-full h-2 rounded-full bg-violet-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all"
                          style={{ width: `${progress * 100}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-muted-foreground">
                          Собрано{" "}
                          {totalContributions.toLocaleString("ru-RU", {
                            style: "currency",
                            currency: "RUB",
                            maximumFractionDigits: 2,
                          })}{" "}
                          из{" "}
                          {item.price!.toLocaleString("ru-RU", {
                            style: "currency",
                            currency: "RUB",
                            maximumFractionDigits: 2,
                          })}
                        </span>
                        {canContribute && (
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => openContributionDialog(item.id)}
                          >
                            Скинуться
                          </Button>
                        )}
                      </div>
                      {!isOwner && itemContributions.length > 0 && (
                        <div className="mt-1 space-y-0.5 max-h-24 overflow-y-auto pr-1">
                          {itemContributions.map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center justify-between text-[11px] text-muted-foreground"
                            >
                              <span className="truncate">
                                {c.contributor_name || "Гость"}
                              </span>
                              <span className="ml-2 shrink-0">
                                {c.amount.toLocaleString("ru-RU", {
                                  style: "currency",
                                  currency: "RUB",
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <p className="mt-auto text-[11px] text-muted-foreground">
                  Добавлен{" "}
                  {new Date(item.created_at).toLocaleDateString("ru-RU", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

