"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { Account, Category, Household, Member, Profile, Role, Transaction } from "@/lib/types";

interface AppData {
  ready: boolean;
  userId: string;
  profile: Profile | null;
  household: Household | null;
  role: Role | null;
  isAdmin: boolean;
  members: Member[];
  accounts: Account[];
  categories: Category[];
  accountsById: Map<string, Account>;
  categoriesById: Map<string, Category>;
  membersById: Map<string, Member>;
  /** bumps whenever any household data changes (local write or realtime) */
  txVersion: number;
  bump: () => void;
  reload: () => Promise<void>;
  txSheet: { open: boolean; editing?: Transaction };
  openAdd: () => void;
  openEdit: (t: Transaction) => void;
  closeTx: () => void;
}

const Ctx = createContext<AppData | null>(null);
export const useApp = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useApp outside AppProvider");
  return v;
};

const num = <T extends object>(row: T, keys: (keyof T)[]) => {
  const out = { ...row };
  keys.forEach((k) => ((out as Record<keyof T, unknown>)[k] = Number(row[k])));
  return out;
};

export function AppProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabase();
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [txVersion, setTxVersion] = useState(0);
  const [txSheet, setTxSheet] = useState<AppData["txSheet"]>({ open: false });

  const bumpTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const bump = useCallback(() => {
    clearTimeout(bumpTimer.current);
    bumpTimer.current = setTimeout(() => setTxVersion((v) => v + 1), 120);
  }, []);

  const loadHousehold = useCallback(
    async (hid: string) => {
      const [a, c, m] = await Promise.all([
        supabase.from("accounts").select("*").eq("household_id", hid).order("created_at"),
        supabase.from("categories").select("*").eq("household_id", hid).order("created_at"),
        supabase
          .from("household_members")
          .select("id, user_id, role, profiles(full_name, avatar_url)")
          .eq("household_id", hid)
          .order("created_at"),
      ]);
      setAccounts(((a.data ?? []) as Account[]).map((r) => num(r, ["initial_balance", "current_balance"])));
      setCategories(((c.data ?? []) as Category[]).map((r) => num(r, ["monthly_budget"])));
      setMembers((m.data ?? []) as unknown as Member[]);
    },
    [supabase],
  );

  const reload = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    setUserId(user.id);
    const [p, m] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("household_members")
        .select("role, households(id, name, currency, invite_code)")
        .eq("user_id", user.id)
        .order("created_at")
        .limit(1)
        .maybeSingle(),
    ]);
    setProfile((p.data as Profile) ?? null);
    const hh = (m.data as unknown as { role: Role; households: Household } | null)?.households;
    if (!m.data || !hh) {
      router.replace("/onboarding");
      return;
    }
    setHousehold(hh);
    setRole((m.data as unknown as { role: Role }).role);
    await loadHousehold(hh.id);
    setReady(true);
  }, [supabase, router, loadHousehold]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Realtime: any change by any member refreshes lists + balances instantly.
  const hid = household?.id;
  useEffect(() => {
    if (!hid) return;
    const refresh = () => {
      loadHousehold(hid);
      bump();
    };
    const channel = supabase
      .channel(`household-${hid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `household_id=eq.${hid}` }, refresh)
      // DELETE payloads carry only the primary key, so they can't be filtered by household
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "transactions" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "accounts", filter: `household_id=eq.${hid}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "categories", filter: `household_id=eq.${hid}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "household_members", filter: `household_id=eq.${hid}` }, refresh)
      .subscribe();

    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(channel);
    };
  }, [hid, supabase, loadHousehold, bump]);

  const value = useMemo<AppData>(
    () => ({
      ready,
      userId,
      profile,
      household,
      role,
      isAdmin: role === "owner" || role === "admin",
      members,
      accounts,
      categories,
      accountsById: new Map(accounts.map((a) => [a.id, a])),
      categoriesById: new Map(categories.map((c) => [c.id, c])),
      membersById: new Map(members.map((m) => [m.user_id, m])),
      txVersion,
      bump: () => {
        if (hid) loadHousehold(hid);
        setTxVersion((v) => v + 1);
      },
      reload,
      txSheet,
      openAdd: () => setTxSheet({ open: true }),
      openEdit: (t) => setTxSheet({ open: true, editing: t }),
      closeTx: () => setTxSheet({ open: false }),
    }),
    [ready, userId, profile, household, role, members, accounts, categories, txVersion, txSheet, hid, loadHousehold, reload],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Transactions for [start, end] (YYYY-MM-DD), kept live through `txVersion`. */
export function useTransactions(start: string, end: string) {
  const supabase = getSupabase();
  const { household, txVersion } = useApp();
  const hid = household?.id;
  const key = `${hid}|${start}|${end}`;
  const [state, setState] = useState<{ key: string; rows: Transaction[] }>({ key: "", rows: [] });

  useEffect(() => {
    if (!hid) return;
    let cancelled = false;
    supabase
      .from("transactions")
      .select("*")
      .eq("household_id", hid)
      .gte("transaction_date", start)
      .lte("transaction_date", end)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(2000)
      .then(({ data }: { data: unknown[] | null }) => {
        if (cancelled) return;
        setState({
          key,
          rows: ((data ?? []) as Transaction[]).map((r) => num(r, ["amount"])),
        });
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, hid, start, end, key, txVersion]);

  return { rows: state.rows, loading: state.key !== key };
}
