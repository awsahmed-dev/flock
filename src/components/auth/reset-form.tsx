"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { CircleNotch as Loader2, Eye, EyeSlash as EyeOff } from "@phosphor-icons/react/dist/ssr";
import { useT } from "@/components/i18n/locale-provider";
import Link from "next/link";

const MIN_PASSWORD = 8;

/**
 * Landing page for the password-reset email.
 *
 * Supabase delivers a recovery session here (hash fragment or an already
 * exchanged cookie session); we only need to be sure one exists before
 * offering the form, otherwise a stale/expired link would show a password
 * box that silently fails on submit.
 */
export function ResetForm() {
  const t = useT();
  const router = useRouter();
  const supabase = createClient();

  const [ready, setReady] = useState<"checking" | "ok" | "expired">("checking");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // The recovery token arrives in the URL hash; supabase-js picks it up
    // asynchronously, so listen as well as poll once.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled && session) setReady("ok");
    });
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setReady((prev) => (prev === "ok" ? prev : data.session ? "ok" : "expired"));
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) {
      toast.error(t("auth.passwordTooShort"));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("auth.resetDone"));
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">{t("auth.resetTitle")}</CardTitle>
        <CardDescription>{t("auth.resetSubtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {ready === "expired" ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">{t("auth.resetExpired")}</p>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center rounded-md h-9 px-4 text-sm font-medium text-primary-foreground bg-primary hover:opacity-90"
            >
              {t("auth.signIn")}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-password">{t("auth.newPassword")}</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={MIN_PASSWORD}
                  autoComplete="new-password"
                  className="pe-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rtl:right-auto rtl:left-3"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{t("auth.passwordHint")}</p>
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:opacity-90 border-0"
              disabled={loading || ready === "checking"}
            >
              {(loading || ready === "checking") && (
                <Loader2 className="w-4 h-4 animate-spin me-2" />
              )}
              {t("auth.savePassword")}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
