"use client";

import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp, useTransactions } from "@/components/app-provider";
import { MoneyInput, moneyToNumber } from "@/components/money-input";
import { MonthNav } from "@/components/month-nav";
import {
  Button,
  Card,
  Empty,
  Field,
  IconBadge,
  IconButton,
  PageHeader,
  ProgressBar,
  Section,
  Sheet,
  categoryIcon,
  inputCls,
  useSheetClose,
  useToast,
} from "@/components/ui";
import { getSupabase } from "@/lib/supabase/client";
import { budgetPercent, budgetTone, formatMoney, monthRange } from "@/lib/format";
import type { Category } from "@/lib/types";
import { PieChart } from "lucide-react";

export default function BudgetPage() {
  const { household, categories, isAdmin } = useApp();
  const cur = household?.currency ?? "IDR";
  const [month, setMonth] = useState(() => new Date());
  const [sheet, setSheet] = useState<{ category?: Category } | null>(null);
  const { start, end } = monthRange(month);
  const { rows } = useTransactions(start, end);

  const spentByCat = useMemo(() => {
    const m = new Map<string, number>();
    rows.forEach((t) => t.type === "expense" && t.category_id && m.set(t.category_id, (m.get(t.category_id) ?? 0) + t.amount));
    return m;
  }, [rows]);

  const expenseCats = categories.filter((c) => c.type === "expense");
  const totalBudget = expenseCats.reduce((s, c) => s + c.monthly_budget, 0);
  const totalSpent = rows.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const pct = budgetPercent(totalSpent, totalBudget);
  const remaining = totalBudget - totalSpent;
  const tone = budgetTone(pct);

  return (
    <>
      <PageHeader
        title="Anggaran"
        right={
          isAdmin && (
            <IconButton label="Tambah kategori" onClick={() => setSheet({})}>
              <Plus size={20} strokeWidth={2.4} />
            </IconButton>
          )
        }
      />
      <MonthNav value={month} onChange={setMonth} />

      <Card className="mt-4 p-5">
        <p className="t-sub">{totalBudget > 0 ? (remaining >= 0 ? "Sisa anggaran" : "Melebihi anggaran") : "Total pengeluaran"}</p>
        <p
          className="num mt-1 text-[2rem] font-bold leading-none tracking-[-0.025em]"
          style={{ color: totalBudget > 0 && tone === "danger" ? "var(--danger)" : undefined }}
        >
          {formatMoney(totalBudget > 0 ? Math.abs(remaining) : totalSpent, cur)}
        </p>
        {totalBudget > 0 && (
          <>
            <div className="mt-4">
              <ProgressBar pct={pct} height={12} />
            </div>
            <p className="t-sub num mt-2">
              {formatMoney(totalSpent, cur)} dari {formatMoney(totalBudget, cur)} · {Math.round(pct)}%
            </p>
          </>
        )}
      </Card>

      <Section title="Per kategori">
        <Card className="overflow-hidden">
          {expenseCats.length === 0 ? (
            <Empty icon={PieChart} title="Belum ada kategori" />
          ) : (
            expenseCats.map((c, i) => {
              const spent = spentByCat.get(c.id) ?? 0;
              const p = budgetPercent(spent, c.monthly_budget);
              const Icon = categoryIcon(c.icon);
              const Row = isAdmin ? "button" : "div";
              return (
                <Row
                  key={c.id}
                  onClick={isAdmin ? () => setSheet({ category: c }) : undefined}
                  className={`${isAdmin ? "press-row w-full text-left" : ""} flex items-center gap-3 px-4 py-3.5 ${i > 0 ? "border-t border-sep" : ""}`}
                >
                  <IconBadge icon={Icon} tone={c.monthly_budget > 0 ? (budgetTone(p) === "ok" ? "accent" : "expense") : "neutral"} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="t-body truncate font-medium">{c.name}</span>
                      <span className="num t-sub shrink-0">
                        {formatMoney(spent, cur)}
                        {c.monthly_budget > 0 && ` / ${formatMoney(c.monthly_budget, cur)}`}
                      </span>
                    </span>
                    <span className="mt-2 block">
                      {c.monthly_budget > 0 ? (
                        <ProgressBar pct={p} />
                      ) : (
                        <span className="t-cap">{isAdmin ? "Ketuk untuk atur batas" : "Tanpa batas"}</span>
                      )}
                    </span>
                  </span>
                </Row>
              );
            })
          )}
        </Card>
      </Section>

      {sheet && (
        <Sheet title={sheet.category ? "Ubah kategori" : "Kategori baru"} onClose={() => setSheet(null)}>
          <CategoryForm category={sheet.category} />
        </Sheet>
      )}
    </>
  );
}

function CategoryForm({ category }: { category?: Category }) {
  const supabase = getSupabase();
  const toast = useToast();
  const close = useSheetClose();
  const { household, bump } = useApp();
  const [name, setName] = useState(category?.name ?? "");
  const [budget, setBudget] = useState(category ? String(Math.round(category.monthly_budget)) : "");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);

  async function save() {
    if (!name.trim() || !household) return;
    setBusy(true);
    const fields = { name: name.trim(), monthly_budget: moneyToNumber(budget) };
    const { error } = category
      ? await supabase.from("categories").update(fields).eq("id", category.id)
      : await supabase.from("categories").insert({ ...fields, household_id: household.id, type: "expense", icon: "tag" });
    if (error) {
      toast(error.message, "error");
      setBusy(false);
      return;
    }
    toast("Kategori disimpan", "success");
    bump();
    close();
  }

  async function remove() {
    if (!category) return;
    if (!confirm) return setConfirm(true);
    setBusy(true);
    const { error } = await supabase.from("categories").delete().eq("id", category.id);
    if (error) {
      toast(error.message, "error");
      setBusy(false);
      return;
    }
    toast("Kategori dihapus", "info");
    bump();
    close();
  }

  return (
    <div className="space-y-4 pb-2">
      <Field label="Nama kategori">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Makan & Minum" className={inputCls} autoFocus={!category} />
      </Field>
      <Field label="Batas anggaran per bulan" hint="Kosongkan atau 0 untuk tanpa batas.">
        <MoneyInput value={budget} onChange={setBudget} />
      </Field>
      <div className="space-y-2 pt-1">
        <Button block disabled={busy || !name.trim()} onClick={save}>
          Simpan
        </Button>
        {category && (
          <Button block variant="danger" disabled={busy} onClick={remove}>
            <Trash2 size={18} />
            {confirm ? "Ketuk lagi untuk menghapus" : "Hapus kategori"}
          </Button>
        )}
      </div>
    </div>
  );
}
