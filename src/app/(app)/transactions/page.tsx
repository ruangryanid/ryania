"use client";

import { Download, Receipt, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useApp, useTransactions } from "@/components/app-provider";
import { MonthNav } from "@/components/month-nav";
import { TxRow } from "@/components/tx-row";
import { Card, Empty, IconButton, PageHeader, Segmented, Skeleton, inputCls, useToast } from "@/components/ui";
import { dayLabel, formatMoney, monthRange } from "@/lib/format";
import { exportTransactionsCsv } from "@/lib/export";
import type { TxType } from "@/lib/types";

export default function TransactionsPage() {
  const { household, accountsById, categoriesById } = useApp();
  const toast = useToast();
  const cur = household?.currency ?? "IDR";
  const [month, setMonth] = useState(() => new Date());
  const [filter, setFilter] = useState<"all" | TxType>("all");
  const [q, setQ] = useState("");
  const { start, end } = monthRange(month);
  const { rows, loading } = useTransactions(start, end);

  const groups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = rows.filter((t) => {
      if (filter !== "all" && t.type !== filter) return false;
      if (!needle) return true;
      const hay = [
        t.notes,
        t.category_id && categoriesById.get(t.category_id)?.name,
        accountsById.get(t.account_id)?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
    const map = new Map<string, typeof rows>();
    filtered.forEach((t) => map.set(t.transaction_date, [...(map.get(t.transaction_date) ?? []), t]));
    return [...map.entries()];
  }, [rows, filter, q, accountsById, categoriesById]);

  const dayNet = (list: typeof rows) =>
    list.reduce((s, t) => s + (t.type === "income" ? t.amount : t.type === "expense" ? -t.amount : 0), 0);

  return (
    <>
      <PageHeader
        title="Transaksi"
        right={
          <IconButton
            label="Ekspor CSV"
            onClick={() => {
              if (!rows.length) return toast("Tidak ada data untuk diekspor", "info");
              exportTransactionsCsv(rows, accountsById, categoriesById, start);
              toast("CSV diunduh", "success");
            }}
          >
            <Download size={18} />
          </IconButton>
        }
      />
      <MonthNav value={month} onChange={setMonth} />

      <div className="mt-3 space-y-3">
        <Segmented
          id="tx-filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Semua" },
            { value: "expense", label: "Keluar" },
            { value: "income", label: "Masuk" },
            { value: "transfer", label: "Transfer" },
          ]}
        />
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-label-2" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari catatan, kategori, dompet"
            enterKeyHint="search"
            className={`${inputCls} pl-10`}
          />
        </div>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full !rounded-[16px]" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <Card className="mt-6">
          <Empty icon={Receipt} title="Tidak ada transaksi" body={q || filter !== "all" ? "Coba ubah filter atau kata kunci." : "Belum ada catatan di bulan ini."} />
        </Card>
      ) : (
        groups.map(([date, list]) => (
          <section key={date} className="mt-6">
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h2 className="t-section normal-case">{dayLabel(date)}</h2>
              <span className="t-cap num">{formatMoney(dayNet(list), cur)}</span>
            </div>
            <Card className="overflow-hidden">
              {list.map((t, i) => (
                <div key={t.id} className={i > 0 ? "ml-[68px] border-t border-sep" : ""}>
                  <TxRow tx={t} />
                </div>
              ))}
            </Card>
          </section>
        ))
      )}
    </>
  );
}
