import { useEffect, useState } from "react";

export type TxType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  category: string;
  description: string;
  date: string; // ISO
  /** inclui no gráfico de gastos por dia da semana (default: true) */
  inWeekday?: boolean;

}

const KEY = "finance-tx-v1";

export const EXPENSE_CATEGORIES = [
  "Alimentação",
  "Transporte",
  "Moradia",
  "Lazer",
  "Saúde",
  "Educação",
  "Compras",
  "Contas",
  "Outros",
];

export const INCOME_CATEGORIES = ["Salário", "Freelance", "Investimentos", "Presente", "Outros"];

function load(): Transaction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Transaction[]) : [];
  } catch {
    return [];
  }
}

export function useTransactions() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTxs(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(txs));
  }, [txs, hydrated]);

  const add = (t: Omit<Transaction, "id">) =>
    setTxs((p) => [{ ...t, id: crypto.randomUUID() }, ...p]);
  const update = (id: string, patch: Partial<Omit<Transaction, "id">>) =>
    setTxs((p) => p.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const remove = (id: string) => setTxs((p) => p.filter((t) => t.id !== id));
  const renameCategory = (oldName: string, newName: string) =>
    setTxs((p) => p.map((t) => (t.category === oldName ? { ...t, category: newName } : t)));

  return { txs, add, update, remove, renameCategory, hydrated };
}

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
