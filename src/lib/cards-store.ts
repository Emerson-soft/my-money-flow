import { useEffect, useState } from "react";

export interface CreditCard {
  id: string;
  name: string;
  color: string; // hex or css color
  limit?: number;
}

export interface Purchase {
  id: string;
  cardId: string;
  description: string;
  category: string;
  totalAmount: number;
  installments: number; // >=1
  firstMonth: string; // "YYYY-MM"
}

export interface Installment {
  purchaseId: string;
  cardId: string;
  description: string;
  category: string;
  index: number; // 1-based
  total: number;
  month: string; // YYYY-MM
  amount: number;
}

const CARDS_KEY = "finance-cards-v1";
const PURCHASES_KEY = "finance-purchases-v1";

export const PURCHASE_CATEGORIES = [
  "Alimentação",
  "Transporte",
  "Moradia",
  "Lazer",
  "Saúde",
  "Educação",
  "Compras",
  "Assinaturas",
  "Viagem",
  "Outros",
];

export const CARD_COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
];

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useCards() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCards(loadJSON<CreditCard[]>(CARDS_KEY, []));
    setPurchases(loadJSON<Purchase[]>(PURCHASES_KEY, []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(CARDS_KEY, JSON.stringify(cards));
  }, [cards, hydrated]);
  useEffect(() => {
    if (hydrated) localStorage.setItem(PURCHASES_KEY, JSON.stringify(purchases));
  }, [purchases, hydrated]);

  const addCard = (c: Omit<CreditCard, "id">) =>
    setCards((p) => [...p, { ...c, id: crypto.randomUUID() }]);
  const removeCard = (id: string) => {
    setCards((p) => p.filter((c) => c.id !== id));
    setPurchases((p) => p.filter((x) => x.cardId !== id));
  };

  const addPurchase = (p: Omit<Purchase, "id">) =>
    setPurchases((prev) => [{ ...p, id: crypto.randomUUID() }, ...prev]);
  const removePurchase = (id: string) =>
    setPurchases((prev) => prev.filter((p) => p.id !== id));

  return {
    cards,
    purchases,
    hydrated,
    addCard,
    removeCard,
    addPurchase,
    removePurchase,
  };
}

export function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function expandInstallments(purchases: Purchase[]): Installment[] {
  const list: Installment[] = [];
  for (const p of purchases) {
    const n = Math.max(1, Math.floor(p.installments));
    const perRaw = p.totalAmount / n;
    const per = Math.round(perRaw * 100) / 100;
    let accum = 0;
    for (let i = 0; i < n; i++) {
      const isLast = i === n - 1;
      const amount = isLast ? Math.round((p.totalAmount - accum) * 100) / 100 : per;
      accum += amount;
      list.push({
        purchaseId: p.id,
        cardId: p.cardId,
        description: p.description,
        category: p.category,
        index: i + 1,
        total: n,
        month: addMonths(p.firstMonth, i),
        amount,
      });
    }
  }
  return list;
}

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const s = new Date(y, m - 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
