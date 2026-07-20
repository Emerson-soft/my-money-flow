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
  const { expense: expenseCats } = useCategories();
  const [ym, setYm] = useState(currentYm());
  const hydrated = hTx && hCards && hBudget;

  const purchasesWihtoutCard = useMemo(() => purchases.filter((item) => !item.cardId), [purchases]);

  const installments = useMemo(
    () => expandInstallments(purchasesWihtoutCard, []),
    [purchasesWihtoutCard],
  );

  const categories = useMemo(() => {
    const set = new Set<string>(expenseCats);
    txs.forEach((t) => t.type === "expense" && set.add(t.category));
    installments.forEach((i) => set.add(i.category));
    Object.values(budget).forEach((m) => Object.keys(m).forEach((c) => set.add(c)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [expenseCats, txs, installments, budget]);

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
      if (i.month !== ym) return;
      map[i.category] = (map[i.category] ?? 0) + i.amount;
    });
    return map;
  }, [txs, installments, ym]);

  const monthBudget = budget[ym] ?? {};
  const totalPlanned = Object.values(monthBudget).reduce((s, v) => s + (v || 0), 0);
  const totalUsed = Object.values(usedByCat).reduce((s, v) => s + v, 0);

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

        <section className="mb-4 grid gap-3 sm:grid-cols-3">
          <SummaryCard label="Planejado" value={brl(totalPlanned)} tone="neutral" />
          <SummaryCard label="Realizado" value={brl(totalUsed)} tone="neutral" />
          <SummaryCard
            label="Restante"
            value={brl(totalPlanned - totalUsed)}
            tone={totalPlanned - totalUsed < 0 ? "bad" : "good"}
          />
        </section>

        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="grid grid-cols-12 gap-2 border-b bg-muted/40 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <div className="col-span-4">Categoria</div>
            <div className="col-span-3 text-right">Planejado</div>
            <div className="col-span-2 text-right">Usado</div>
            <div className="col-span-3 text-right">Restante</div>
          </div>
          {!hydrated ? (
            <div className="p-6 text-sm text-muted-foreground">Carregando…</div>
          ) : (
            <ul className="divide-y">
              {categories.map((cat) => {
                const planned = monthBudget[cat] ?? 0;
                const used = usedByCat[cat] ?? 0;
                const remaining = planned - used;
                const pct =
                  planned > 0 ? Math.min(100, (used / planned) * 100) : used > 0 ? 100 : 0;
                const over = planned > 0 && used > planned;
                return (
                  <li key={cat} className="grid grid-cols-12 items-center gap-2 px-4 py-3">
                    <div className="col-span-4">
                      <div className="text-sm font-medium">{cat}</div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${over ? "bg-destructive" : "bg-primary"}`}
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
                        value={planned ? String(planned) : ""}
                        placeholder="0,00"
                        onChange={(e) => setPlanned(ym, cat, Number(e.target.value))}
                        className="ml-auto h-8 w-32 text-right"
                      />
                    </div>
                    <div className="col-span-2 text-right text-sm tabular-nums">{brl(used)}</div>
                    <div
                      className={`col-span-3 text-right text-sm font-medium tabular-nums ${
                        remaining < 0 ? "text-destructive" : "text-foreground"
                      }`}
                    >
                      {brl(remaining)}
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
              className={`col-span-3 text-right tabular-nums ${
                totalPlanned - totalUsed < 0 ? "text-destructive" : ""
              }`}
            >
              {brl(totalPlanned - totalUsed)}
            </div>
          </div>
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
