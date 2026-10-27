"use client";

import { ArrowLeftRight } from "lucide-react";
import { formatMoney } from "@/lib/format";
import type { Transaction } from "@/lib/types";
import { useApp } from "./app-provider";
import { IconBadge, categoryIcon } from "./ui";

const SOURCE_LABEL: Record<string, string> = { telegram: "Telegram", whatsapp: "WhatsApp", api: "API" };

export function TxRow({ tx }: { tx: Transaction }) {
  const { accountsById, categoriesById, membersById, household, openEdit } = useApp();
  const cat = tx.category_id ? categoriesById.get(tx.category_id) : undefined;
  const from = accountsById.get(tx.account_id)?.name ?? "—";
  const to = tx.to_account_id ? accountsById.get(tx.to_account_id)?.name : undefined;
  const author = tx.created_by ? membersById.get(tx.created_by)?.profiles?.full_name?.split(" ")[0] : undefined;

  const title =
    tx.type === "transfer" ? "Transfer" : cat?.name ?? (tx.type === "income" ? "Pemasukan" : "Tanpa kategori");
  const sub = [tx.type === "transfer" ? `${from} → ${to ?? "—"}` : from, tx.notes, author]
    .filter(Boolean)
    .join(" · ");

  const sign = tx.type === "income" ? "+" : tx.type === "expense" ? "−" : "";
  const color =
    tx.type === "income" ? "var(--income)" : tx.type === "expense" ? "var(--label)" : "var(--label-2)";

  return (
    <button
      onClick={() => openEdit(tx)}
      className="press-row flex w-full items-center gap-3 px-4 py-3 text-left"
    >
      <IconBadge
        icon={tx.type === "transfer" ? ArrowLeftRight : categoryIcon(cat?.icon)}
        tone={tx.type === "income" ? "income" : tx.type === "transfer" ? "neutral" : "accent"}
      />
      <span className="min-w-0 flex-1">
        <span className="t-body block truncate font-medium">{title}</span>
        <span className="t-sub block truncate">
          {SOURCE_LABEL[tx.source] && (
            <span className="mr-1.5 rounded bg-sep px-1.5 py-px text-[0.6875rem] font-semibold">
              {SOURCE_LABEL[tx.source]}
            </span>
          )}
          {sub}
        </span>
      </span>
      <span className="num t-body shrink-0 font-semibold" style={{ color }}>
        {sign}
        {formatMoney(tx.amount, household?.currency)}
      </span>
    </button>
  );
}

/** Hairline-separated list inside a Card. */
export function Divided({ children }: { children: React.ReactNode[] | React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <>
      {items.map((c, i) => (
        <div key={i} className={i > 0 ? "border-t border-sep ml-[68px]" : ""}>
          {c}
        </div>
      ))}
    </>
  );
}
