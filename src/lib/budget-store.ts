import { useEffect, useState } from "react";

// { "2026-01": { "Alimentação": 800, ... } }
export type BudgetMap = Record<string, Record<string, number>>;

const KEY = "finance-budget-v1";

function load(): BudgetMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BudgetMap) : {};
  } catch {
    return {};
  }
}

export function useBudget() {
  const [budget, setBudget] = useState<BudgetMap>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setBudget(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(KEY, JSON.stringify(budget));
  }, [budget, hydrated]);

  const setPlanned = (ym: string, category: string, value: number) =>
    setBudget((prev) => {
      const month = { ...(prev[ym] ?? {}) };
      if (!value || Number.isNaN(value)) delete month[category];
      else month[category] = value;
      return { ...prev, [ym]: month };
    });

  const copyFromMonth = (fromYm: string, toYm: string) =>
    setBudget((prev) => ({ ...prev, [toYm]: { ...(prev[fromYm] ?? {}) } }));

  return { budget, hydrated, setPlanned, copyFromMonth };
}
