export type TxType = "expense" | "income" | "transfer";
export type AccountType = "bank" | "ewallet" | "cash" | "investment";
export type Role = "owner" | "admin" | "member";
export type TxSource = "pwa" | "telegram" | "whatsapp" | "api";

export interface Household {
  id: string;
  name: string;
  currency: string;
  invite_code: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  telegram_chat_id: string | null;
  whatsapp_number: string | null;
}

export interface Member {
  id: string;
  user_id: string;
  role: Role;
  profiles: Pick<Profile, "full_name" | "avatar_url"> | null;
}

export interface Account {
  id: string;
  household_id: string;
  name: string;
  type: AccountType;
  initial_balance: number;
  current_balance: number;
}

export interface Category {
  id: string;
  household_id: string;
  name: string;
  type: "expense" | "income";
  monthly_budget: number;
  icon: string | null;
}

export interface Transaction {
  id: string;
  household_id: string;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  created_by: string | null;
  amount: number;
  type: TxType;
  transaction_date: string;
  notes: string | null;
  receipt_url: string | null;
  source: TxSource;
  created_at: string;
}

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  bank: "Bank",
  ewallet: "E-Wallet",
  cash: "Tunai",
  investment: "Investasi",
};
