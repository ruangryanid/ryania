"use client";

import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, ToastProvider, inputCls, useToast } from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";

function LoginForm() {
  const supabase = getSupabase();
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error")) {
      toast("Tautan tidak valid atau kedaluwarsa. Coba lagi.", "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendLink() {
    if (!email.includes("@")) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setBusy(false);
    if (error) return toast(error.message, "error");
    setStep("code");
    toast("Cek email kamu", "success");
  }

  async function verify() {
    if (token.length < 6) return;
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: token.trim(), type: "email" });
    if (error) {
      setBusy(false);
      return toast("Kode salah atau kedaluwarsa", "error");
    }
    router.replace("/");
    router.refresh();
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) toast(error.message, "error");
  }

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center px-6"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 24px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
      }}
    >
      <div
        className="mb-8 grid h-[72px] w-[72px] place-items-center rounded-[20px]"
        style={{ background: "linear-gradient(145deg, #34c3ff, #007aff 55%, #5856d6)", boxShadow: "0 10px 30px color-mix(in srgb, #007aff 35%, transparent)" }}
        aria-hidden
      >
        <div className="flex items-end gap-1.5">
          <span className="h-4 w-2.5 rounded-sm bg-white" />
          <span className="h-6 w-2.5 rounded-sm bg-white" />
          <span className="h-9 w-2.5 rounded-sm bg-white" />
        </div>
      </div>

      <h1 className="t-large">Family Ledger</h1>
      <p className="t-body mt-2 text-label-2">Catat keuangan keluarga bersama, langsung sinkron di HP masing-masing.</p>

      <div className="mt-8 space-y-3">
        {step === "email" ? (
          <>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              enterKeyHint="send"
              placeholder="email@kamu.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendLink()}
              className={inputCls}
              aria-label="Email"
            />
            <Button block disabled={busy || !email.includes("@")} onClick={sendLink}>
              <Mail size={18} /> Kirim tautan masuk
            </Button>
            <div className="flex items-center gap-3 py-1 text-label-3">
              <span className="h-px flex-1 bg-sep" />
              <span className="t-cap">atau</span>
              <span className="h-px flex-1 bg-sep" />
            </div>
            <Button block variant="tinted" onClick={google}>
              Lanjut dengan Google
            </Button>
          </>
        ) : (
          <>
            <p className="t-sub">
              Kami kirim tautan ke <b className="text-label">{email}</b>. Buka tautannya, atau masukkan kode 6 digit jika ada di email.
            </p>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              autoCapitalize="none"
              autoCorrect="off"
              enterKeyHint="done"
              maxLength={6}
              placeholder="••••••"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && verify()}
              className={`${inputCls} num text-center text-[1.5rem] tracking-[0.4em]`}
              aria-label="Kode 6 digit"
            />
            <Button block disabled={busy || token.length < 6} onClick={verify}>
              Masuk
            </Button>
            <Button block variant="plain" onClick={() => setStep("email")}>
              Ganti email
            </Button>
          </>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <ToastProvider>
      <LoginForm />
    </ToastProvider>
  );
}
