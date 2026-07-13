import { useEffect, useState } from "react";
import {
  EXPENSE_CATEGORIES as DEFAULT_EXPENSE,
  INCOME_CATEGORIES as DEFAULT_INCOME,
} from "./finance-store";

export type CatType = "expense" | "income";
type CatsState = { expense: string[]; income: string[] };

const KEY = "finance-categories-v1";

const DEFAULTS: CatsState = {
  expense: [...DEFAULT_EXPENSE],
  income: [...DEFAULT_INCOME],
};

function load(): CatsState {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const p = JSON.parse(raw) as Partial<CatsState>;
    return {
      expense: Array.isArray(p.expense) ? p.expense : DEFAULTS.expense,
      income: Array.isArray(p.income) ? p.income : DEFAULTS.income,
    };
  } catch {
    return DEFAULTS;
  }
}

export function useCategories() {
  const [cats, setCats] = useState<CatsState>(DEFAULTS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCats(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(cats));
  }, [cats, hydrated]);

  const add = (type: CatType, name: string) => {
    const n = name.trim();
    if (!n) return;
    setCats((p) => (p[type].includes(n) ? p : { ...p, [type]: [...p[type], n] }));
  };

  const rename = (type: CatType, oldName: string, newName: string) => {
    const n = newName.trim();
    if (!n || n === oldName) return;
    setCats((p) => ({
      ...p,
      [type]: p[type].map((c) => (c === oldName ? n : c)),
    }));
  };

  const remove = (type: CatType, name: string) =>
    setCats((p) => ({ ...p, [type]: p[type].filter((c) => c !== name) }));

  return {
    expense: cats.expense,
    income: cats.income,
    hydrated,
    add,
    rename,
    remove,
  };
}
