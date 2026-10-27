"use client";

import { ArrowDownLeft, ArrowUpRight, Receipt, Wallet } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useApp, useTransactions } from "@/components/app-provider";
import { TxRow } from "@/components/tx-row";
import {
  ACCOUNT_ICONS,
  Avatar,
  Button,
  Card,
  Empty,
  PageHeader,
  ProgressBar,
  Section,
  Skeleton,
  categoryIcon,
} from "@/components/ui";
import { budgetPercent, formatMoney, monthLabel, monthRange } from "@/lib/format";

export default function DashboardPage() {
  const { household, profile, accounts, categories, isAdmin, openAdd } = useApp();
  const cur = household?.currency ?? "IDR";
  const now = useMemo(() => new Date(), []);
  const { start, end } = monthRange(now);
  const { rows, loading } = useTransactions(start, end);

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    const byCat = new Map<string, number>();
    for (const t of rows) {
      if (t.type === "income") income += t.amount;
      if (t.type === "expense") {
        expense += t.amount;
        if (t.category_id) byCat.set(t.category_id, (byCat.get(t.category_id) ?? 0) + t.amount);
      }
    }
    return { income, expense, byCat };
  }, [rows]);

  const total = accounts.reduce((s, a) => s + a.current_balance, 0);

  const budgets = useMemo(
    () =>
      categories
        .filter((c) => c.type === "expense" && c.monthly_budget > 0)
        .map((c) => {
          const spent = stats.byCat.get(c.id) ?? 0;
          return { c, spent, pct: budgetPercent(spent, c.monthly_budget) };
        })
        .sort((a, b) => b.pct - a.pct),
    [categories, stats.byCat],
  );
  const totalBudget = budgets.reduce((s, b) => s + b.c.monthly_budget, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);

  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <>
      <PageHeader
        title="Ringkasan"
        subtitle={monthLabel(now)}
        right={
          <Link href="/settings" aria-label="Pengaturan" className="press rounded-full">
            <Avatar name={profile?.full_name} size={40} />
          </Link>
        }
      />
      {firstName && <p className="t-sub mt-1 px-0.5">Halo, {firstName} · {household?.name}</p>}

      {/* Hero */}
      <div
        className="mt-4 overflow-hidden rounded-[24px] p-5 text-white"
        style={{
          background: "linear-gradient(135deg, #0a84ff 0%, #5e5ce6 100%)",
          boxShadow: "0 12px 32px color-mix(in srgb, #0a84ff 30%, transparent)",
        }}
      >
        <p className="text-[0.8125rem] font-medium opacity-80">Total saldo</p>
        <p className="num mt-1 text-[2.25rem] font-bold leading-none tracking-[-0.025em]">
          {formatMoney(total, cur)}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {[
            { label: "Pemasukan", value: stats.income, icon: ArrowDownLeft },
            { label: "Pengeluaran", value: stats.expense, icon: ArrowUpRight },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl bg-white/15 px-3.5 py-2.5">
              <p className="flex items-center gap-1 text-[0.75rem] font-medium opacity-85">
                <Icon size={14} strokeWidth={2.6} />
                {label}
              </p>
              {loading ? (
                <div className="mt-1 h-5 w-20 rounded bg-white/25" />
              ) : (
                <p className="num mt-0.5 text-[1.0625rem] font-semibold">{formatMoney(value, cur)}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Accounts */}
      <Section
        title="Dompet"
        action={
          <Link href="/accounts" className="text-[0.9375rem] font-medium text-accent">
            Kelola
          </Link>
        }
      >
        {accounts.length === 0 ? (
          <Card>
            <Empty
              icon={Wallet}
              title="Belum ada dompet"
              body={isAdmin ? "Tambahkan rekening bank, e-wallet, atau uang tunai." : "Minta admin menambahkan dompet."}
              action={isAdmin && <Link href="/accounts"><Button small>Tambah dompet</Button></Link>}
            />
          </Card>
        ) : (
          <div
            className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4"
            style={{ scrollPaddingInline: "1rem" }}
          >
            {accounts.map((a) => {
              const Icon = ACCOUNT_ICONS[a.type];
              return (
                <Card key={a.id} className="min-w-[156px] shrink-0 snap-start p-4">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-soft text-accent">
                    <Icon size={16} strokeWidth={2.3} />
                  </span>
                  <p className="t-sub mt-3 truncate">{a.name}</p>
                  <p className="num t-headline mt-0.5" style={{ color: a.current_balance < 0 ? "var(--expense)" : undefined }}>
                    {formatMoney(a.current_balance, cur)}
                  </p>
                </Card>
              );
            })}
          </div>
        )}
      </Section>

      {/* Budget */}
      <Section
        title="Anggaran bulan ini"
        action={
          <Link href="/budget" className="text-[0.9375rem] font-medium text-accent">
            Detail
          </Link>
        }
      >
        <Card className="p-4">
          {budgets.length === 0 ? (
            <p className="t-sub py-2 text-center">
              {isAdmin ? "Atur batas anggaran per kategori di tab Anggaran." : "Belum ada anggaran yang diatur."}
            </p>
          ) : (
            <>
              <div className="flex items-baseline justify-between">
                <p className="t-headline num">{formatMoney(totalSpent, cur)}</p>
                <p className="t-sub num">dari {formatMoney(totalBudget, cur)}</p>
              </div>
              <div className="mt-2">
                <ProgressBar pct={budgetPercent(totalSpent, totalBudget)} height={10} />
              </div>
              <ul className="mt-4 space-y-3.5">
                {budgets.slice(0, 3).map(({ c, spent, pct }) => {
                  const Icon = categoryIcon(c.icon);
                  return (
                    <li key={c.id}>
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2 text-[0.9375rem] font-medium">
                          <Icon size={16} className="shrink-0 text-label-2" />
                          <span className="truncate">{c.name}</span>
                        </span>
                        <span className="num t-sub shrink-0">{Math.round(pct)}%</span>
                      </div>
                      <ProgressBar pct={pct} />
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>
      </Section>

      {/* Recent */}
      <Section
        title="Terbaru"
        action={
          <Link href="/transactions" className="text-[0.9375rem] font-medium text-accent">
            Semua
          </Link>
        }
      >
        <Card className="overflow-hidden">
          {loading ? (
            <div className="space-y-3 p-4">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <Empty
              icon={Receipt}
              title="Belum ada transaksi"
              body="Ketuk + untuk mencatat pengeluaran pertama."
              action={<Button small onClick={openAdd}>Catat sekarang</Button>}
            />
          ) : (
            rows.slice(0, 5).map((t, i) => (
              <div key={t.id} className={i > 0 ? "ml-[68px] border-t border-sep" : ""}>
                <TxRow tx={t} />
              </div>
            ))
          )}
        </Card>
      </Section>
    </>
  );
}
