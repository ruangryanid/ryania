import type { Account, Category, Transaction } from "./types";

const esc = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function exportTransactionsCsv(
  rows: Transaction[],
  accounts: Map<string, Account>,
  categories: Map<string, Category>,
  monthStart: string,
) {
  const header = ["Tanggal", "Tipe", "Jumlah", "Dompet", "Ke dompet", "Kategori", "Catatan", "Sumber"];
  const lines = rows.map((t) =>
    [
      t.transaction_date,
      t.type,
      t.amount,
      accounts.get(t.account_id)?.name,
      t.to_account_id ? accounts.get(t.to_account_id)?.name : "",
      t.category_id ? categories.get(t.category_id)?.name : "",
      t.notes,
      t.source,
    ]
      .map(esc)
      .join(","),
  );
  // BOM so Excel opens UTF-8 correctly
  const blob = new Blob(["﻿" + [header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transaksi-${monthStart.slice(0, 7)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
