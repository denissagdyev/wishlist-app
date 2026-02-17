import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { RegisterForm } from "./register-form";
import { getSupabaseServerClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="backdrop-blur-xl bg-white/70 border-white/60 shadow-2xl rounded-3xl">
          <CardHeader className="text-center space-y-1">
            <CardTitle className="text-3xl font-semibold tracking-tight">
              Регистрация
            </CardTitle>
            <CardDescription className="text-sm">
              Создайте аккаунт и начните делиться своими вишлистами с друзьями.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
