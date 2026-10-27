import { NextResponse, type NextRequest } from "next/server";
import { createAdminSupabase } from "@/lib/supabase/admin";

/**
 * POST /api/v1/transactions/ingest
 * Auth: `x-api-key: <household api_secret_key>` (or `Authorization: Bearer <key>`).
 * Used by Telegram / WhatsApp bots. Writes with the service role, scoped to the household the key belongs to.
 */

const TYPES = ["expense", "income", "transfer"] as const;
const SOURCES = ["telegram", "whatsapp", "api"] as const;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const fail = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ success: false, error, ...extra }, { status });

function match<T extends { name: string }>(list: T[], wanted?: string): T | undefined {
  if (!wanted) return undefined;
  const w = norm(wanted);
  if (!w) return undefined;
  return (
    list.find((i) => norm(i.name) === w) ??
    list
      .filter((i) => norm(i.name).includes(w) || w.includes(norm(i.name)))
      .sort((a, b) => b.name.length - a.name.length)[0]
  );
}

const jakartaToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());

export async function POST(req: NextRequest) {
  const key = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!key) return fail(401, "missing_api_key");

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, "invalid_json");
  }

  let db: ReturnType<typeof createAdminSupabase>;
  try {
    db = createAdminSupabase();
  } catch {
    return fail(500, "server_not_configured");
  }

  const { data: hh } = await db.from("households").select("id").eq("api_secret_key", key).maybeSingle();
  if (!hh) return fail(401, "invalid_api_key");
  if (body.household_id && body.household_id !== hh.id) return fail(403, "household_mismatch");

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e13) return fail(400, "invalid_amount");
  const type = String(body.type ?? "expense").toLowerCase() as (typeof TYPES)[number];
  if (!TYPES.includes(type)) return fail(400, "invalid_type");
  const source = (SOURCES as readonly string[]).includes(String(body.source)) ? String(body.source) : "api";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(body.transaction_date)) ? String(body.transaction_date) : jakartaToday();

  const [{ data: accounts }, { data: categories }] = await Promise.all([
    db.from("accounts").select("id, name, current_balance").eq("household_id", hh.id),
    db.from("categories").select("id, name, type, monthly_budget").eq("household_id", hh.id),
  ]);
  if (!accounts?.length) return fail(422, "no_accounts");

  const accountName = body.account_name ? String(body.account_name) : undefined;
  const account = accountName ? match(accounts, accountName) : accounts.length === 1 ? accounts[0] : undefined;
  if (!account) {
    return fail(422, "account_not_found", { available_accounts: accounts.map((a) => a.name) });
  }

  let toAccountId: string | null = null;
  if (type === "transfer") {
    const to = match(accounts, body.to_account_name ? String(body.to_account_name) : undefined);
    if (!to || to.id === account.id) {
      return fail(422, "to_account_not_found", { available_accounts: accounts.map((a) => a.name) });
    }
    toAccountId = to.id;
  }

  const category =
    type === "transfer"
      ? undefined
      : match(
          (categories ?? []).filter((c) => c.type === (type === "income" ? "income" : "expense")),
          body.category_name ? String(body.category_name) : undefined,
        );

  // Optional sender -> must be an active member of this household
  let createdBy: string | null = null;
  if (body.sender) {
    const sender = String(body.sender).trim();
    const { data: prof } = await db
      .from("profiles")
      .select("id")
      .or(`telegram_chat_id.eq.${sender.replace(/[^\w+-]/g, "")},whatsapp_number.eq.${sender.replace(/[^\d+]/g, "")}`)
      .maybeSingle();
    if (!prof) return fail(403, "unknown_sender");
    const { data: member } = await db
      .from("household_members")
      .select("id")
      .eq("household_id", hh.id)
      .eq("user_id", prof.id)
      .maybeSingle();
    if (!member) return fail(403, "sender_not_in_household");
    createdBy = prof.id;
  }

  const notes = [body.notes, body.raw_text && !body.notes ? body.raw_text : null].find(Boolean);
  const { data: tx, error } = await db
    .from("transactions")
    .insert({
      household_id: hh.id,
      account_id: account.id,
      to_account_id: toAccountId,
      category_id: category?.id ?? null,
      created_by: createdBy,
      amount,
      type,
      transaction_date: date,
      notes: notes ? String(notes).slice(0, 500) : null,
      source,
    })
    .select("id")
    .single();
  if (error || !tx) return fail(500, "insert_failed", { detail: error?.message });

  // Fresh balance (trigger already applied) + budget usage for the month of the transaction
  const { data: acc } = await db.from("accounts").select("current_balance").eq("id", account.id).single();

  let budgetPct: number | null = null;
  if (type === "expense" && category && Number(category.monthly_budget) > 0) {
    const [y, m] = date.split("-").map(Number);
    const first = `${y}-${String(m).padStart(2, "0")}-01`;
    const last = `${y}-${String(m).padStart(2, "0")}-${new Date(y, m, 0).getDate()}`;
    const { data: spent } = await db
      .from("transactions")
      .select("amount")
      .eq("household_id", hh.id)
      .eq("type", "expense")
      .eq("category_id", category.id)
      .gte("transaction_date", first)
      .lte("transaction_date", last);
    const total = (spent ?? []).reduce((s, r) => s + Number(r.amount), 0);
    budgetPct = Math.round((total / Number(category.monthly_budget)) * 1000) / 10;
  }

  return NextResponse.json({
    success: true,
    transaction_id: tx.id,
    account_name: account.name,
    category_name: category?.name ?? null,
    balance_remaining: Number(acc?.current_balance ?? 0),
    category_budget_used_percentage: budgetPct,
    ...(type !== "transfer" && !category && body.category_name ? { warning: "category_not_found" } : {}),
  });
}
