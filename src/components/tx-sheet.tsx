"use client";

import { Camera, ImageIcon, Trash2, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { digitsToNumber, groupDigits, toISODate } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import type { TxType } from "@/lib/types";
import { useApp } from "./app-provider";
import {
  ACCOUNT_ICONS,
  Button,
  Empty,
  Field,
  Segmented,
  Sheet,
  categoryIcon,
  inputCls,
  useSheetClose,
  useToast,
} from "./ui";

const LAST_ACCOUNT_KEY = "ledger:last-account";

function readLastAccount() {
  try {
    return localStorage.getItem(LAST_ACCOUNT_KEY);
  } catch {
    return null;
  }
}

export function TxSheet() {
  const { txSheet, closeTx } = useApp();
  if (!txSheet.open) return null;
  return (
    <Sheet title={txSheet.editing ? "Ubah transaksi" : "Catat transaksi"} onClose={closeTx}>
      <TxForm />
    </Sheet>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        haptic("tap");
        onClick();
      }}
      aria-pressed={active}
      className={`press inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[0.9375rem] font-medium ${
        active ? "bg-accent text-white" : "bg-surface text-label"
      }`}
    >
      {children}
    </button>
  );
}

function TxForm() {
  const supabase = getSupabase();
  const toast = useToast();
  const closeSheet = useSheetClose();
  const { txSheet, accounts, categories, household, userId, bump } = useApp();
  const editing = txSheet.editing;

  const [type, setType] = useState<TxType>(editing?.type ?? "expense");
  const [digits, setDigits] = useState(editing ? String(Math.round(editing.amount)) : "");
  const [accountId, setAccountId] = useState(() => {
    if (editing) return editing.account_id;
    const last = readLastAccount();
    return accounts.find((a) => a.id === last)?.id ?? accounts[0]?.id ?? "";
  });
  const [toAccountId, setToAccountId] = useState(editing?.to_account_id ?? "");
  const [categoryId, setCategoryId] = useState(editing?.category_id ?? "");
  const [date, setDate] = useState(editing?.transaction_date ?? toISODate(new Date()));
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const cats = useMemo(() => categories.filter((c) => c.type === (type === "income" ? "income" : "expense")), [categories, type]);

  // Receipt thumbnail for an existing transaction (private bucket -> signed URL)
  useEffect(() => {
    if (!editing?.receipt_url) return;
    supabase.storage
      .from("receipts")
      .createSignedUrl(editing.receipt_url, 3600)
      .then(({ data }: { data: { signedUrl: string } | null }) => setReceiptUrl(data?.signedUrl ?? null));
  }, [supabase, editing?.receipt_url]);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  if (accounts.length === 0) {
    return (
      <Empty
        icon={Wallet}
        title="Belum ada dompet"
        body="Tambahkan rekening atau dompet dulu supaya transaksi bisa dicatat."
        action={
          <Link href="/accounts" onClick={closeSheet}>
            <Button>Tambah dompet</Button>
          </Link>
        }
      />
    );
  }

  const amount = digitsToNumber(digits);
  const valid =
    amount > 0 && !!accountId && (type !== "transfer" || (!!toAccountId && toAccountId !== accountId));

  async function save() {
    if (!valid || !household) return;
    setSaving(true);
    try {
      let receipt_url = editing?.receipt_url ?? null;
      if (file) {
        if (file.size > 8 * 1024 * 1024) throw new Error("Foto terlalu besar (maks 8 MB)");
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `${household.id}/${crypto.randomUUID()}.${ext}`;
        const up = await supabase.storage.from("receipts").upload(path, file, { contentType: file.type });
        if (up.error) throw up.error;
        receipt_url = path;
      }
      const fields = {
        account_id: accountId,
        to_account_id: type === "transfer" ? toAccountId : null,
        category_id: type === "transfer" ? null : categoryId || null,
        amount,
        type,
        transaction_date: date,
        notes: notes.trim() || null,
        receipt_url,
      };
      const res = editing
        ? await supabase.from("transactions").update(fields).eq("id", editing.id)
        : await supabase
            .from("transactions")
            .insert({ ...fields, household_id: household.id, created_by: userId, source: "pwa" });
      if (res.error) throw res.error;

      try {
        localStorage.setItem(LAST_ACCOUNT_KEY, accountId);
      } catch {}
      toast(editing ? "Perubahan disimpan" : "Transaksi tercatat", "success");
      bump();
      closeSheet();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Gagal menyimpan", "error");
      setSaving(false);
    }
  }

  async function remove() {
    if (!editing) return;
    if (!confirmDelete) {
      haptic("error");
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("transactions").delete().eq("id", editing.id);
    if (error) {
      toast(error.message, "error");
      setSaving(false);
      return;
    }
    toast("Transaksi dihapus", "info");
    bump();
    closeSheet();
  }

  const accountChips = (value: string, set: (id: string) => void, exclude?: string) => (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" style={{ touchAction: "pan-x" }}>
      {accounts
        .filter((a) => a.id !== exclude)
        .map((a) => {
          const Icon = ACCOUNT_ICONS[a.type];
          return (
            <Chip key={a.id} active={value === a.id} onClick={() => set(a.id)}>
              <Icon size={16} />
              {a.name}
            </Chip>
          );
        })}
    </div>
  );

  return (
    <div className="space-y-5 pb-2">
      <Segmented
        id="tx-type"
        value={type}
        onChange={(t) => {
          setType(t);
          setCategoryId("");
          setConfirmDelete(false);
        }}
        options={[
          { value: "expense", label: "Keluar" },
          { value: "income", label: "Masuk" },
          { value: "transfer", label: "Transfer" },
        ]}
      />

      <div className="flex items-baseline justify-center gap-2 py-3">
        <span className="t-title text-label-2">Rp</span>
        <input
          autoFocus={!editing}
          inputMode="decimal"
          enterKeyHint="done"
          autoComplete="off"
          aria-label="Nominal"
          placeholder="0"
          value={groupDigits(digits)}
          onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").slice(0, 13))}
          className="num w-full min-w-0 max-w-[300px] bg-transparent text-center text-[2.75rem] font-bold tracking-tight outline-none placeholder:text-label-3"
          style={{
            color: type === "income" ? "var(--income)" : type === "expense" ? "var(--label)" : "var(--accent)",
            fieldSizing: "content",
          } as React.CSSProperties}
        />
      </div>

      <div>
        <p className="t-cap mb-1.5 px-1 font-medium">{type === "transfer" ? "Dari" : "Dompet"}</p>
        {accountChips(accountId, (id) => {
          setAccountId(id);
          if (id === toAccountId) setToAccountId("");
        })}
      </div>

      {type === "transfer" ? (
        <div>
          <p className="t-cap mb-1.5 px-1 font-medium">Ke</p>
          {accounts.length < 2 ? (
            <p className="t-sub px-1">Perlu minimal dua dompet untuk transfer.</p>
          ) : (
            accountChips(toAccountId, setToAccountId, accountId)
          )}
        </div>
      ) : (
        <div>
          <p className="t-cap mb-1.5 px-1 font-medium">Kategori</p>
          <div className="flex flex-wrap gap-2">
            {cats.map((c) => {
              const Icon = categoryIcon(c.icon);
              return (
                <Chip key={c.id} active={categoryId === c.id} onClick={() => setCategoryId(categoryId === c.id ? "" : c.id)}>
                  <Icon size={16} />
                  {c.name}
                </Chip>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tanggal">
          <input type="date" value={date} max="2999-12-31" onChange={(e) => e.target.value && setDate(e.target.value)} className={`${inputCls} appearance-none`} />
        </Field>
        <Field label="Bukti nota">
          <label className="press flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-surface px-3 text-[0.9375rem] font-medium text-accent">
            {file || editing?.receipt_url ? <ImageIcon size={18} /> : <Camera size={18} />}
            <span className="truncate">{file ? "Ganti foto" : editing?.receipt_url ? "Ganti foto" : "Tambah foto"}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
        </Field>
      </div>

      {(preview || receiptUrl) && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview ?? receiptUrl!} alt="Bukti nota" className="max-h-48 w-full rounded-xl object-cover" />
      )}

      <Field label="Catatan">
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Contoh: makan siang ayam geprek"
          enterKeyHint="done"
          autoCapitalize="sentences"
          className={inputCls}
        />
      </Field>

      <div className="space-y-2 pt-1">
        <Button block disabled={!valid || saving} onClick={save}>
          {saving ? "Menyimpan…" : editing ? "Simpan perubahan" : "Simpan"}
        </Button>
        {editing && (
          <Button block variant="danger" disabled={saving} onClick={remove}>
            <Trash2 size={18} />
            {confirmDelete ? "Ketuk lagi untuk menghapus" : "Hapus transaksi"}
          </Button>
        )}
      </div>
    </div>
  );
}
