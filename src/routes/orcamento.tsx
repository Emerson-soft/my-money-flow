import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Copy, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { brl, useTransactions } from "@/lib/finance-store";
import { addMonths, expandInstallments, monthLabel, useCards } from "@/lib/cards-store";
import { useBudget } from "@/lib/budget-store";
import { useCategories } from "@/lib/categories-store";
import { NavTabs } from "./cartoes";

export const Route = createFileRoute("/orcamento")({
  head: () => ({
    meta: [
      { title: "Orçamento — Finança" },
      {
        name: "description",
        content: "Planeje o valor de cada categoria por mês e acompanhe o quanto já foi gasto.",
      },
    ],
  }),
  component: BudgetPage,
});

function currentYm() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function BudgetPage() {
  const { txs, hydrated: hTx } = useTransactions();
  const { cards, purchases, hydrated: hCards } = useCards();
  const { budget, setPlanned, copyFromMonth, hydrated: hBudget } = useBudget();
  const { expense: expenseCats, income: incomeCats } = useCategories();
  const [ym, setYm] = useState(currentYm());
  const hydrated = hTx && hCards && hBudget;

  const installments = useMemo(() => expandInstallments(purchases, cards), [purchases, cards]);

  const monthBudget = budget[ym] ?? {};

  const categories = useMemo(() => {
    const set = new Set<string>(expenseCats);
    txs.forEach((t) => t.type === "expense" && set.add(t.category));
    installments.forEach((i) => i.inBudget && set.add(i.category));
    Object.values(budget).forEach((m) =>
      Object.keys(m).forEach((c) => !c.startsWith("in:") && set.add(c)),
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [expenseCats, txs, installments, budget]);

  const incomeCategories = useMemo(() => {
    const set = new Set<string>(incomeCats);
    txs.forEach((t) => t.type === "income" && set.add(t.category));
    Object.values(budget).forEach((m) =>
      Object.keys(m).forEach((c) => c.startsWith("in:") && set.add(c.slice(3))),
    );
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [incomeCats, txs, budget]);

  const usedByCat = useMemo(() => {
    const map: Record<string, number> = {};
    txs.forEach((t) => {
      if (t.type !== "expense") return;
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key !== ym) return;
      map[t.category] = (map[t.category] ?? 0) + t.amount;
    });
    installments.forEach((i) => {
      if (!i.inBudget) return;
      if (i.month !== ym) return;
      map[i.category] = (map[i.category] ?? 0) + i.amount;
    });
    return map;
  }, [txs, installments, ym]);

  const incomeUsedByCat = useMemo(() => {
    const map: Record<string, number> = {};
    txs.forEach((t) => {
      if (t.type !== "income") return;
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (key !== ym) return;
      map[t.category] = (map[t.category] ?? 0) + t.amount;
    });
    return map;
  }, [txs, ym]);

  const totalPlanned = categories.reduce((s, c) => s + (monthBudget[c] ?? 0), 0);
  const totalUsed = Object.values(usedByCat).reduce((s, v) => s + v, 0);
  const totalPlannedIncome = incomeCategories.reduce((s, c) => s + (monthBudget[`in:${c}`] ?? 0), 0);
  const totalUsedIncome = Object.values(incomeUsedByCat).reduce((s, v) => s + v, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="h-4 w-4" />
              <span>Orçamento mensal</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Orçamento</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Defina o valor planejado por categoria e compare com o realizado.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyFromMonth(addMonths(ym, -1), ym)}
              title="Copiar planejamento do mês anterior"
            >
              <Copy className="mr-1 h-4 w-4" /> Copiar mês anterior
            </Button>
            <div className="inline-flex items-center gap-1 rounded-lg border bg-card p-1">
              <button
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setYm(addMonths(ym, -1))}
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-[10rem] px-2 text-center text-sm font-medium capitalize">
                {monthLabel(ym)}
              </div>
              <button
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setYm(addMonths(ym, 1))}
                aria-label="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <NavTabs current="orcamento" />

        <section className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Entradas planejadas" value={brl(totalPlannedIncome)} tone="neutral" />
          <SummaryCard label="Entradas realizadas" value={brl(totalUsedIncome)} tone="good" />
          <SummaryCard label="Saídas realizadas" value={brl(totalUsed)} tone="bad" />
          <SummaryCard
            label="Diferença (realizado)"
            value={brl(totalUsedIncome - totalUsed)}
            tone={totalUsedIncome - totalUsed < 0 ? "bad" : "good"}
          />
        </section>

        <section className="mb-4 grid gap-3 sm:grid-cols-2">
          <SummaryCard label="Saídas planejadas" value={brl(totalPlanned)} tone="neutral" />
          <SummaryCard
            label="Diferença (planejado)"
            value={brl(totalPlannedIncome - totalPlanned)}
            tone={totalPlannedIncome - totalPlanned < 0 ? "bad" : "good"}
          />
        </section>

        <BudgetTable
          title="Entradas"
          hydrated={hydrated}
          categories={incomeCategories}
          planned={(c) => monthBudget[`in:${c}`] ?? 0}
          used={(c) => incomeUsedByCat[c] ?? 0}
          onPlanned={(c, v) => setPlanned(ym, `in:${c}`, v)}
          totalPlanned={totalPlannedIncome}
          totalUsed={totalUsedIncome}
          positiveIsGood
        />

        <div className="h-4" />

        <BudgetTable
          title="Saídas"
          hydrated={hydrated}
          categories={categories}
          planned={(c) => monthBudget[c] ?? 0}
          used={(c) => usedByCat[c] ?? 0}
          onPlanned={(c, v) => setPlanned(ym, c, v)}
          totalPlanned={totalPlanned}
          totalUsed={totalUsed}
        />
      </div>
    </div>
  );
}

function BudgetTable({
  title,
  hydrated,
  categories,
  planned,
  used,
  onPlanned,
  totalPlanned,
  totalUsed,
  positiveIsGood = false,
}: {
  title: string;
  hydrated: boolean;
  categories: string[];
  planned: (c: string) => number;
  used: (c: string) => number;
  onPlanned: (c: string, v: number) => void;
  totalPlanned: number;
  totalUsed: number;
  positiveIsGood?: boolean;
}) {
  const diffTotal = positiveIsGood ? totalUsed - totalPlanned : totalPlanned - totalUsed;
  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="border-b px-4 py-2.5 text-sm font-semibold">{title}</div>
      <div className="grid grid-cols-12 gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <div className="col-span-4">Categoria</div>
        <div className="col-span-3 text-right">Planejado</div>
        <div className="col-span-2 text-right">{positiveIsGood ? "Recebido" : "Usado"}</div>
        <div className="col-span-3 text-right">{positiveIsGood ? "Diferença" : "Restante"}</div>
      </div>
      {!hydrated ? (
        <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
      ) : (
        <ul className="divide-y">
          {categories.map((cat) => {
            const p = planned(cat);
            const u = used(cat);
            const diff = positiveIsGood ? u - p : p - u;
            const pct = p > 0 ? Math.min(100, (u / p) * 100) : u > 0 ? 100 : 0;
            const bad = positiveIsGood ? p > 0 && u < p : p > 0 && u > p;
            return (
              <li key={cat} className="grid grid-cols-12 items-center gap-2 px-4 py-3">
                <div className="col-span-4">
                  <div className="text-sm font-medium">{cat}</div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${
                        bad ? (positiveIsGood ? "bg-amber-500" : "bg-destructive") : "bg-primary"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <div className="col-span-3 text-right">
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={p ? String(p) : ""}
                    placeholder="0,00"
                    onChange={(e) => onPlanned(cat, Number(e.target.value))}
                    className="ml-auto h-8 w-32 text-right"
                  />
                </div>
                <div className="col-span-2 text-right text-sm tabular-nums">{brl(u)}</div>
                <div
                  className={`col-span-3 text-right text-sm font-medium tabular-nums ${
                    diff < 0 ? "text-destructive" : "text-foreground"
                  }`}
                >
                  {brl(diff)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="grid grid-cols-12 gap-2 border-t bg-muted/30 px-4 py-3 text-sm font-semibold">
        <div className="col-span-4">Total</div>
        <div className="col-span-3 text-right tabular-nums">{brl(totalPlanned)}</div>
        <div className="col-span-2 text-right tabular-nums">{brl(totalUsed)}</div>
        <div
          className={`col-span-3 text-right tabular-nums ${diffTotal < 0 ? "text-destructive" : ""}`}
        >
          {brl(diffTotal)}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "good" | "bad" | "neutral";
}) {
  const color =
    tone === "good" ? "text-emerald-600" : tone === "bad" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}
