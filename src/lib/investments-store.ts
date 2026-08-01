import { useEffect, useState } from "react";

export const INV_CATEGORIES = [
  "Título do governo",
  "Renda fixa",
  "Bolsa",
  "BTC",
  "Fundo imobiliário",
] as const;

export type InvCategory = (typeof INV_CATEGORIES)[number];

export const INV_CATEGORY_COLORS: Record<InvCategory, string> = {
  "Título do governo": "#0ea5e9",
  "Renda fixa": "#10b981",
  Bolsa: "#6366f1",
  BTC: "#f59e0b",
  "Fundo imobiliário": "#ec4899",
};

export interface Asset {
  id: string;
  name: string;
  category: InvCategory;
  invested: number; // valor já investido
  ticker?: string; // opcional, para acompanhar preço
}

export type TargetMap = Partial<Record<InvCategory, number>>; // % do total

const ASSETS_KEY = "finance-investments-v1";
const TARGETS_KEY = "finance-inv-targets-v1";

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useInvestments() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [targets, setTargets] = useState<TargetMap>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setAssets(load<Asset[]>(ASSETS_KEY, []));
    setTargets(load<TargetMap>(TARGETS_KEY, {}));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
  }, [assets, hydrated]);
  useEffect(() => {
    if (hydrated) localStorage.setItem(TARGETS_KEY, JSON.stringify(targets));
  }, [targets, hydrated]);

  const addAsset = (a: Omit<Asset, "id">) =>
    setAssets((prev) => [...prev, { ...a, id: crypto.randomUUID() }]);
  const updateAsset = (id: string, patch: Partial<Omit<Asset, "id">>) =>
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const removeAsset = (id: string) => setAssets((prev) => prev.filter((a) => a.id !== id));
  const contribute = (id: string, amount: number) =>
    setAssets((prev) =>
      prev.map((a) => (a.id === id ? { ...a, invested: Math.round((a.invested + amount) * 100) / 100 } : a)),
    );
  const setTarget = (cat: InvCategory, pct: number) =>
    setTargets((prev) => {
      const next = { ...prev };
      if (!pct || Number.isNaN(pct)) delete next[cat];
      else next[cat] = pct;
      return next;
    });

  return {
    assets,
    targets,
    hydrated,
    addAsset,
    updateAsset,
    removeAsset,
    contribute,
    setTarget,
  };
}

/** Distribui um novo aporte priorizando as categorias abaixo do alvo. */
export function suggestAllocation(
  currentByCat: Record<string, number>,
  targets: TargetMap,
  contribution: number,
): Record<string, number> {
  const total = Object.values(currentByCat).reduce((s, v) => s + v, 0) + contribution;
  const deficits: Record<string, number> = {};
  let sum = 0;
  for (const cat of INV_CATEGORIES) {
    const pct = targets[cat];
    if (!pct) continue;
    const ideal = (total * pct) / 100;
    const deficit = ideal - (currentByCat[cat] ?? 0);
    if (deficit > 0) {
      deficits[cat] = deficit;
      sum += deficit;
    }
  }
  const out: Record<string, number> = {};
  if (sum <= 0 || contribution <= 0) return out;
  for (const [cat, d] of Object.entries(deficits)) {
    out[cat] = Math.round(((d / sum) * contribution) * 100) / 100;
  }
  return out;
}

export const pct = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
