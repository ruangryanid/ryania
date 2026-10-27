"use client";

import { Plus, Scale, Trash2, Wallet } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/app-provider";
import { MoneyInput, moneyToNumber } from "@/components/money-input";
import {
  ACCOUNT_ICONS,
  Button,
  Card,
  Empty,
  Field,
  IconBadge,
  IconButton,
  PageHeader,
  Section,
  Sheet,
  inputCls,
  useSheetClose,
  useToast,
} from "@/components/ui";
import { formatMoney, toISODate } from "@/lib/format";
import { getSupabase } from "@/lib/supabase/client";
import { ACCOUNT_TYPE_LABEL, type Account, type AccountType } from "@/lib/types";

const PRESETS: { name: string; type: AccountType }[] = [
  { name: "Dompet Tunai", type: "cash" },
  { name: "BCA", type: "bank" },
  { name: "Mandiri", type: "bank" },
  { name: "BRI", type: "bank" },
  { name: "GoPay", type: "ewallet" },
  { name: "OVO", type: "ewallet" },
  { name: "ShopeePay", type: "ewallet" },
  { name: "DANA", type: "ewallet" },
];
const TYPES = Object.keys(ACCOUNT_TYPE_LABEL) as AccountType[];

export default function AccountsPage() {
  const { household, accounts, isAdmin } = useApp();
  const cur = household?.currency ?? "IDR";
  const [sheet, setSheet] = useState<{ account?: Account } | null>(null);
  const total = accounts.reduce((s, a) => s + a.current_balance, 0);

  return (
    <>
      <PageHeader
        title="Dompet"
        right={
          isAdmin && (
            <IconButton label="Tambah dompet" onClick={() => setSheet({})}>
              <Plus size={20} strokeWidth={2.4} />
            </IconButton>
          )
        }
      />

      <Card className="mt-4 p-5">
        <p className="t-sub">Total saldo semua dompet</p>
        <p className="num mt-1 text-[2rem] font-bold leading-none tracking-[-0.025em]">{formatMoney(total, cur)}</p>
      </Card>

      <Section>
        <Card className="overflow-hidden">
          {accounts.length === 0 ? (
            <Empty
              icon={Wallet}
              title="Belum ada dompet"
              body={isAdmin ? "Mulai dengan menambahkan dompet pertama." : "Minta admin menambahkan dompet."}
              action={isAdmin && <Button small onClick={() => setSheet({})}>Tambah dompet</Button>}
            />
          ) : (
            accounts.map((a, i) => {
              const Row = isAdmin ? "button" : "div";
              return (
                <Row
                  key={a.id}
                  onClick={isAdmin ? () => setSheet({ account: a }) : undefined}
                  className={`${isAdmin ? "press-row w-full text-left" : ""} flex items-center gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-sep" : ""}`}
                >
                  <IconBadge icon={ACCOUNT_ICONS[a.type]} />
                  <span className="min-w-0 flex-1">
                    <span className="t-body block truncate font-medium">{a.name}</span>
                    <span className="t-sub">{ACCOUNT_TYPE_LABEL[a.type]}</span>
                  </span>
                  <span className="num t-body font-semibold" style={{ color: a.current_balance < 0 ? "var(--expense)" : undefined }}>
                    {formatMoney(a.current_balance, cur)}
                  </span>
                </Row>
              );
            })
          )}
        </Card>
      </Section>

      {sheet && (
        <Sheet title={sheet.account ? "Ubah dompet" : "Dompet baru"} onClose={() => setSheet(null)}>
          <AccountForm account={sheet.account} />
        </Sheet>
      )}
    </>
  );
}

function AccountForm({ account }: { account?: Account }) {
  const supabase = getSupabase();
  const toast = useToast();
  const close = useSheetClose();
  const { household, userId, bump } = useApp();
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<AccountType>(account?.type ?? "bank");
  const [initial, setInitial] = useState(account ? String(Math.round(account.initial_balance)) : "");
  const [actual, setActual] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function save() {
    if (!name.trim() || !household) return;
    setBusy(true);
    const fields = { name: name.trim(), type, initial_balance: moneyToNumber(initial) };
    const { error } = account
      ? await supabase.from("accounts").update(fields).eq("id", account.id)
      : await supabase.from("accounts").insert({ ...fields, household_id: household.id });
    if (error) {
      toast(error.message, "error");
      setBusy(false);
      return;
    }
    toast("Dompet disimpan", "success");
    bump();
    close();
  }

  /** Reconcile: record the difference as an adjustment transaction so history stays honest. */
  async function reconcile() {
    if (!account || !household || actual === "") return;
    const diff = moneyToNumber(actual) - account.current_balance;
    if (diff === 0) return toast("Saldo sudah sesuai", "info");
    setBusy(true);
    const { error } = await supabase.from("transactions").insert({
      household_id: household.id,
      account_id: account.id,
      amount: Math.abs(diff),
      type: diff > 0 ? "income" : "expense",
      transaction_date: toISODate(new Date()),
      notes: "Penyesuaian saldo",
      created_by: userId,
      source: "pwa",
    });
    if (error) {
      toast(error.message, "error");
      setBusy(false);
      return;
    }
    toast("Saldo disesuaikan", "success");
    bump();
    close();
  }

  async function remove() {
    if (!account) return;
    if (!confirm) return setConfirm(true);
    setBusy(true);
    const { error } = await supabase.from("accounts").delete().eq("id", account.id);
    if (error) {
      toast(error.code === "23503" ? "Dompet masih punya transaksi, tidak bisa dihapus" : error.message, "error");
      setBusy(false);
      setConfirm(false);
      return;
    }
    toast("Dompet dihapus", "info");
    bump();
    close();
  }

  return (
    <div className="space-y-5 pb-2">
      {!account && (
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" style={{ touchAction: "pan-x" }}>
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => {
                setName(p.name);
                setType(p.type);
              }}
              className="press h-9 shrink-0 rounded-full bg-surface px-3.5 text-[0.875rem] font-medium"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      <Field label="Nama">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: BCA Utama" className={inputCls} />
      </Field>

      <div>
        <p className="t-cap mb-1.5 px-1 font-medium">Jenis</p>
        <div className="grid grid-cols-4 gap-2">
          {TYPES.map((t) => {
            const Icon = ACCOUNT_ICONS[t];
            const active = t === type;
            return (
              <button
                key={t}
                onClick={() => setType(t)}
                aria-pressed={active}
                className={`press flex flex-col items-center gap-1 rounded-xl py-2.5 text-[0.75rem] font-medium ${active ? "bg-accent text-white" : "bg-surface text-label"}`}
              >
                <Icon size={20} />
                {ACCOUNT_TYPE_LABEL[t]}
              </button>
            );
          })}
        </div>
      </div>

      <Field label="Saldo awal" hint={account ? "Mengubah saldo awal menggeser saldo saat ini." : undefined}>
        <MoneyInput value={initial} onChange={setInitial} />
      </Field>

      <Button block disabled={busy || !name.trim()} onClick={save}>
        Simpan
      </Button>

      {account && (
        <>
          <div className="rounded-2xl bg-surface p-4">
            <p className="t-headline flex items-center gap-2">
              <Scale size={18} className="text-accent" /> Sesuaikan saldo
            </p>
            <p className="t-sub mt-1 num">Saldo di aplikasi: {formatMoney(account.current_balance, "IDR")}</p>
            <div className="mt-3">
              <MoneyInput value={actual} onChange={setActual} placeholder="Saldo sebenarnya" allowNegative />
            </div>
            <Button block variant="tinted" small className="mt-3" disabled={busy || actual === ""} onClick={reconcile}>
              Catat selisih sebagai penyesuaian
            </Button>
          </div>
          <Button block variant="danger" disabled={busy} onClick={remove}>
            <Trash2 size={18} />
            {confirm ? "Ketuk lagi untuk menghapus" : "Hapus dompet"}
          </Button>
        </>
      )}
    </div>
  );
}
