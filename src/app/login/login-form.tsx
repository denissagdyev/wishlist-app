"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/utils/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(
          "Не получилось войти. Проверьте email и пароль и попробуйте ещё раз."
        );
        return;
      }

      router.refresh();
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Что-то пошло не так. Попробуйте ещё раз через минуту.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Пароль</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Введите пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50/80 rounded-md px-3 py-2">
          {error}
        </p>
      )}

      <Button
        type="submit"
        className="w-full h-10 text-base font-medium bg-gradient-to-r from-violet-500 to-pink-500 text-white hover:from-violet-600 hover:to-pink-600 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/35 transition-all"
        disabled={loading}
      >
        {loading ? "Входим..." : "Войти"}
      </Button>

      <p className="text-sm text-muted-foreground text-center">
        Нет аккаунта?{" "}
        <Link
          href="/register"
          className="font-medium text-violet-600 hover:text-violet-700 underline-offset-4 hover:underline"
        >
          Зарегистрироваться
        </Link>
      </p>
    </form>
  );
}

