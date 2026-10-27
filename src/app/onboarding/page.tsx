"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Field, Segmented, ToastProvider, inputCls, useToast } from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";

function Onboarding() {
  const supabase = getSupabase();
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [myName, setMyName] = useState("");
  const [hhName, setHhName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      if (!data.user) return router.replace("/login");
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", data.user.id)
        .maybeSingle()
        .then(({ data: p }: { data: { full_name: string | null } | null }) => {
          setMyName((n) => n || p?.full_name || "");
        });
    });
  }, [supabase, router]);

  async function submit() {
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (u.user && myName.trim()) {
        await supabase.from("profiles").update({ full_name: myName.trim() }).eq("id", u.user.id);
      }
      const { error } =
        mode === "create"
          ? await supabase.rpc("create_household", { p_name: hhName.trim() })
          : await supabase.rpc("join_household", { p_code: code });
      if (error) throw error;
      router.replace("/");
    } catch (e) {
      toast(e instanceof Error ? e.message : (e as { message?: string }).message ?? "Gagal", "error");
      setBusy(false);
    }
  }

  const ok = myName.trim() && (mode === "create" ? hhName.trim() : code.length === 6);

  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center px-6"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 24px)",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
      }}
    >
      <h1 className="t-large">Selamat datang</h1>
      <p className="t-body mt-2 text-label-2">Buat household baru untuk keluargamu, atau gabung dengan kode dari pasangan.</p>

      <div className="mt-8 space-y-4">
        <Segmented
          id="onb"
          value={mode}
          onChange={setMode}
          options={[
            { value: "create", label: "Buat baru" },
            { value: "join", label: "Gabung" },
          ]}
        />
        <Field label="Nama panggilanmu" hint="Tampil di transaksi yang kamu catat.">
          <input value={myName} onChange={(e) => setMyName(e.target.value)} autoComplete="given-name" className={inputCls} />
        </Field>
        {mode === "create" ? (
          <Field label="Nama household">
            <input value={hhName} onChange={(e) => setHhName(e.target.value)} placeholder="Contoh: Keluarga Ryan" enterKeyHint="done" className={inputCls} />
          </Field>
        ) : (
          <Field label="Kode undangan">
            <input
              inputMode="numeric"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              maxLength={6}
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              enterKeyHint="done"
              className={`${inputCls} num text-center text-[1.5rem] tracking-[0.4em]`}
            />
          </Field>
        )}
        <Button block disabled={busy || !ok} onClick={submit}>
          {mode === "create" ? "Buat household" : "Gabung"}
        </Button>
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <ToastProvider>
      <Onboarding />
    </ToastProvider>
  );
}
