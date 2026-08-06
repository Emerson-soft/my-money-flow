import { useEffect, useState } from "react";

export interface CreditCard {
  id: string;
  name: string;
  color: string; // hex or css color
  limit?: number;
  closingDay?: number; // day of month invoice closes (1-31)
  dueDay?: number; // day of month invoice is due (1-31)
}


export interface Purchase {
  id: string;
  cardId: string;
  description: string;
  category: string;
  totalAmount: number;
  installments: number; // >=1
  firstMonth: string; // "YYYY-MM"
  purchaseDate?: string; // "YYYY-MM-DD" optional day of purchase
  inBudget?: boolean; // conta no Orçamento mensal (default: false)
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
  inBudget?: boolean;
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
  const updateCard = (id: string, patch: Partial<Omit<CreditCard, "id">>) =>
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const removeCard = (id: string) => {
    setCards((p) => p.filter((c) => c.id !== id));
    setPurchases((p) => p.filter((x) => x.cardId !== id));
  };


  const addPurchase = (p: Omit<Purchase, "id">) =>
    setPurchases((prev) => [{ ...p, id: crypto.randomUUID() }, ...prev]);
  const updatePurchase = (id: string, patch: Partial<Omit<Purchase, "id">>) =>
    setPurchases((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const removePurchase = (id: string) =>
    setPurchases((prev) => prev.filter((p) => p.id !== id));

  return {
    cards,
    purchases,
    hydrated,
    addCard,
    updateCard,
    removeCard,
    addPurchase,
    updatePurchase,
    removePurchase,
  };
}


export function addMonths(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function expandInstallments(
  purchases: Purchase[],
  cards?: CreditCard[],
): Installment[] {
  const cardMap = new Map((cards ?? []).map((c) => [c.id, c] as const));
  const list: Installment[] = [];
  for (const p of purchases) {
    const n = Math.max(1, Math.floor(p.installments));
    const perRaw = p.totalAmount / n;
    const per = Math.round(perRaw * 100) / 100;
    const card = cardMap.get(p.cardId);
    // If the card has a closing day set, apply "regime de caixa":
    // parcelas ficam no mês em que a fatura fecha/vence.
    // Regra: se o dia da compra > diaFechamento, a 1ª parcela pula 1 mês.
    let shift = 0;
    if (card?.closingDay && p.purchaseDate) {
      const day = Number(p.purchaseDate.split("-")[2]);
      if (day > card.closingDay) shift = 1;
    }
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
        month: addMonths(p.firstMonth, i + shift),
        amount,
        inBudget: p.inBudget ?? false,
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
