"use client";

import { Copy, Eye, EyeOff, LogOut, RefreshCw, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { Avatar, Button, Card, Field, PageHeader, Section, inputCls, useToast } from "@/components/ui";
import { haptic } from "@/lib/haptics";
import { getSupabase } from "@/lib/supabase/client";

export default function SettingsPage() {
  const supabase = getSupabase();
  const router = useRouter();
  const toast = useToast();
  const { profile, household, members, isAdmin, role, userId, reload } = useApp();

  const [name, setName] = useState(profile?.full_name ?? "");
  const [tg, setTg] = useState(profile?.telegram_chat_id ?? "");
  const [wa, setWa] = useState(profile?.whatsapp_number ?? "");
  const [saving, setSaving] = useState(false);
  const [code, setCode] = useState(household?.invite_code ?? "");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(msg, "success");
    } catch {
      toast("Tidak bisa menyalin", "error");
    }
  };

  async function saveProfile() {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: name.trim() || null,
        telegram_chat_id: tg.trim() || null,
        whatsapp_number: wa.trim().replace(/[^\d+]/g, "") || null,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) return toast(error.code === "23505" ? "ID/nomor itu sudah dipakai akun lain" : error.message, "error");
    toast("Profil disimpan", "success");
    reload();
  }

  async function invite() {
    const text = `Gabung ke "${household?.name}" di Family Ledger dengan kode undangan: ${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {}
    } else copy(text, "Undangan disalin");
  }

  async function regen() {
    const { data, error } = await supabase.rpc("regenerate_invite_code", { p_household: household!.id });
    if (error) return toast(error.message, "error");
    setCode(data as string);
    toast("Kode baru dibuat", "success");
  }

  async function revealKey() {
    if (apiKey) return setShowKey((s) => !s);
    const { data, error } = await supabase.rpc("get_api_secret", { p_household: household!.id });
    if (error) return toast(error.message, "error");
    setApiKey(data as string);
    setShowKey(true);
  }

  async function rotateKey() {
    const { data, error } = await supabase.rpc("rotate_api_secret", { p_household: household!.id });
    if (error) return toast(error.message, "error");
    setApiKey(data as string);
    setShowKey(true);
    haptic("success");
    toast("API key diganti — bot lama berhenti bekerja", "info");
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const endpoint = typeof window !== "undefined" ? `${window.location.origin}/api/v1/transactions/ingest` : "";

  return (
    <>
      <PageHeader title="Pengaturan" />

      <Section title="Profil">
        <Card className="space-y-4 p-4">
          <div className="flex items-center gap-3">
            <Avatar name={name || profile?.full_name} size={48} />
            <div className="min-w-0">
              <p className="t-headline truncate">{profile?.full_name ?? "Tanpa nama"}</p>
              <p className="t-sub capitalize">{role}</p>
            </div>
          </div>
          <Field label="Nama lengkap">
            <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={`${inputCls} !bg-surface-2`} />
          </Field>
          <Field label="Telegram chat ID" hint="Untuk mencatat lewat bot Telegram (opsional).">
            <input value={tg} onChange={(e) => setTg(e.target.value)} inputMode="numeric" autoCapitalize="none" autoCorrect="off" className={`${inputCls} !bg-surface-2`} />
          </Field>
          <Field label="Nomor WhatsApp" hint="Format internasional, contoh +62812…">
            <input value={wa} onChange={(e) => setWa(e.target.value)} type="tel" autoComplete="tel" className={`${inputCls} !bg-surface-2`} />
          </Field>
          <Button block disabled={saving} onClick={saveProfile}>Simpan profil</Button>
        </Card>
      </Section>

      <Section title={`Household · ${household?.name ?? ""}`}>
        <Card className="p-4">
          <p className="t-sub">Kode undangan (6 digit)</p>
          <p className="num mt-1 text-[2.25rem] font-bold tracking-[0.18em]">{code}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="tinted" small onClick={() => copy(code, "Kode disalin")}>
              <Copy size={16} /> Salin
            </Button>
            <Button variant="tinted" small onClick={invite}>
              <Share2 size={16} /> Bagikan
            </Button>
          </div>
          {isAdmin && (
            <Button variant="plain" small className="mt-1 w-full" onClick={regen}>
              <RefreshCw size={15} /> Buat kode baru
            </Button>
          )}
        </Card>

        <Card className="mt-3 overflow-hidden">
          {members.map((m, i) => (
            <div key={m.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-sep" : ""}`}>
              <Avatar name={m.profiles?.full_name} />
              <span className="t-body min-w-0 flex-1 truncate">
                {m.profiles?.full_name ?? "Anggota"}
                {m.user_id === userId && <span className="t-sub"> (kamu)</span>}
              </span>
              <span className="t-sub capitalize">{m.role}</span>
            </div>
          ))}
        </Card>
      </Section>

      {isAdmin && (
        <Section title="Integrasi bot & API">
          <Card className="space-y-3 p-4">
            <div>
              <p className="t-cap font-medium">Endpoint</p>
              <button onClick={() => copy(endpoint, "Endpoint disalin")} className="press-row mt-1 w-full break-all rounded-lg bg-surface-2 px-3 py-2 text-left font-mono text-[0.75rem]">
                POST {endpoint}
              </button>
            </div>
            <div>
              <p className="t-cap font-medium">API key (header x-api-key)</p>
              <div className="mt-1 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-surface-2 px-3 py-2 font-mono text-[0.75rem]">
                  {apiKey && showKey ? apiKey : "••••••••••••••••••••••••"}
                </code>
                <button onClick={revealKey} aria-label={showKey ? "Sembunyikan" : "Tampilkan"} className="press grid h-9 w-9 place-items-center rounded-full bg-surface-2">
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                {apiKey && (
                  <button onClick={() => copy(apiKey, "API key disalin")} aria-label="Salin" className="press grid h-9 w-9 place-items-center rounded-full bg-surface-2">
                    <Copy size={16} />
                  </button>
                )}
              </div>
            </div>
            <div>
              <p className="t-cap font-medium">Household ID</p>
              <button onClick={() => copy(household!.id, "ID disalin")} className="press-row mt-1 w-full truncate rounded-lg bg-surface-2 px-3 py-2 text-left font-mono text-[0.75rem]">
                {household?.id}
              </button>
            </div>
            <Button variant="danger" small block onClick={rotateKey}>
              <RefreshCw size={15} /> Ganti API key
            </Button>
          </Card>
        </Section>
      )}

      <div className="mt-8">
        <Button block variant="danger" onClick={signOut}>
          <LogOut size={18} /> Keluar
        </Button>
        <p className="t-cap mt-4 text-center">Family Ledger · data tersinkron real-time antar anggota</p>
      </div>
    </>
  );
}
