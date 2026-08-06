import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Wallet,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  CreditCard as CreditCardIcon,
  Pencil,
  Tags,
  X,
  Check,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  brl,
  useTransactions,
  type Transaction,
  type TxType,
} from "@/lib/finance-store";
import { useCategories, type CatType } from "@/lib/categories-store";
import { NavTabs } from "./cartoes";
import { expandInstallments, useCards } from "@/lib/cards-store";

export const Route = createFileRoute("/")({
  component: Home,
});

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function Home() {
  const { txs, add, update, remove, renameCategory, hydrated } = useTransactions();
  const { cards, purchases } = useCards();
  const categories = useCategories();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [catsOpen, setCatsOpen] = useState(false);


  const installments = useMemo(() => expandInstallments(purchases, cards), [purchases, cards]);

  const months = useMemo(() => {
    const s = new Set<string>();
    txs.forEach((t) => {
      const d = new Date(t.date);
      s.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    });
    installments.forEach((i) => s.add(i.month));
    return Array.from(s).sort().reverse();
  }, [txs, installments]);

  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  const activeMonth = selectedMonth === "all" && months.length > 0 ? currentMonth : selectedMonth;

  const filtered = useMemo(() => {
    if (activeMonth === "all") return txs;
    return txs.filter((t) => {
      const d = new Date(t.date);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return m === activeMonth;
    });
  }, [txs, activeMonth]);

  const filteredInstallments = useMemo(() => {
    if (activeMonth === "all") return installments;
    return installments.filter((i) => i.month === activeMonth);
  }, [installments, activeMonth]);

  const installmentsExpense = useMemo(
    () => filteredInstallments.reduce((s, i) => s + i.amount, 0),
    [filteredInstallments],
  );

  const stats = useMemo(() => {
    const income = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expenseTx = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const expense = expenseTx + installmentsExpense;
    return { income, expense, balance: income - expense };
  }, [filtered, installmentsExpense]);

  const weekdayData = useMemo(() => {
    const map = WEEKDAYS.map((d) => ({ day: d, valor: 0 }));
    filtered
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const idx = new Date(t.date).getDay();
        map[idx].valor += t.amount;
      });
    purchases.forEach((p) => {
      if (!p.purchaseDate) return;
      const inMonth = activeMonth === "all" || p.purchaseDate.startsWith(activeMonth);
      if (!inMonth) return;
      const [y, m, d] = p.purchaseDate.split("-").map(Number);
      const idx = new Date(y, m - 1, d).getDay();
      map[idx].valor += p.totalAmount;
    });
    return map;
  }, [filtered, purchases, activeMonth]);

  const categoryData = useMemo(() => {
    const m = new Map<string, number>();
    filtered
      .filter((t) => t.type === "expense")
      .forEach((t) => m.set(t.category, (m.get(t.category) ?? 0) + t.amount));
    filteredInstallments.forEach((i) =>
      m.set(i.category, (m.get(i.category) ?? 0) + i.amount),
    );
    return Array.from(m, ([name, value]) => ({ name, value })).sort(
      (a, b) => b.value - a.value,
    );
  }, [filtered, filteredInstallments]);

  // Merge real transactions + installments for the list view, sorted by date desc
  const listItems = useMemo(() => {
    type Row = {
      key: string;
      type: "income" | "expense" | "installment";
      amount: number;
      title: string;
      subtitle: string;
      dateSort: string; // ISO for sorting
      color?: string;
      onRemove?: () => void;
      onEdit?: () => void;
    };
    const rows: Row[] = [];
    filtered.forEach((t) => {
      rows.push({
        key: t.id,
        type: t.type,
        amount: t.amount,
        title: t.description || t.category,
        subtitle: `${t.category} · ${new Date(t.date).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}`,
        dateSort: t.date,
        onRemove: () => remove(t.id),
        onEdit: () => setEditing(t),
      });
    });
    filteredInstallments.forEach((i, idx) => {
      const card = cards.find((c) => c.id === i.cardId);
      const [y, m] = i.month.split("-").map(Number);
      const iso = new Date(y, m - 1, 1).toISOString();
      rows.push({
        key: `${i.purchaseId}-${idx}`,
        type: "installment",
        amount: i.amount,
        title: i.description || i.category,
        subtitle: `${card?.name ?? "Cartão"} · ${i.category} · parcela ${i.index}/${i.total}`,
        dateSort: iso,
        color: card?.color,
      });
    });
    return rows.sort((a, b) => b.dateSort.localeCompare(a.dateSort));
  }, [filtered, filteredInstallments, cards, remove]);



  const monthLabel = useMemo(() => {
    if (activeMonth === "all") return "Todos os meses";
    const [y, m] = activeMonth.split("-");
    return new Date(Number(y), Number(m) - 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  }, [activeMonth]);


  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Finança</h1>
              <p className="text-xs text-muted-foreground">Seu controle pessoal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MonthFilter
              value={selectedMonth}
              onChange={setSelectedMonth}
              activeMonth={activeMonth}
            />
            <Button
              variant="outline"
              size="lg"
              className="rounded-xl"
              onClick={() => setCatsOpen(true)}
            >
              <Tags className="mr-1 h-4 w-4" /> Categorias
            </Button>
            <TxDialog
              open={open}
              setOpen={setOpen}
              onSubmit={(t) => add(t)}
              expenseCats={categories.expense}
              incomeCats={categories.income}
            />
          </div>
        </header>


        <NavTabs current="dashboard" />

        {/* Period label */}
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span>Visão: </span>
          <span className="font-medium text-foreground capitalize">{monthLabel}</span>
        </div>


        {/* Stats */}
        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Saldo atual"
            value={brl(stats.balance)}
            icon={<Wallet className="h-4 w-4" />}
            highlight
          />
          <StatCard
            label="Entradas"
            value={brl(stats.income)}
            icon={<TrendingUp className="h-4 w-4 text-[var(--success)]" />}
            sub="Total recebido"
          />
          <StatCard
            label="Saídas"
            value={brl(stats.expense)}
            icon={<TrendingDown className="h-4 w-4 text-destructive" />}
            sub="Total gasto"
          />
        </section>

        {/* Charts */}
        <section className="mb-8 grid gap-4 lg:grid-cols-5">
          <div className="rounded-2xl border bg-card p-6 shadow-sm lg:col-span-3">
            <div className="mb-1 flex items-baseline justify-between">
              <h2 className="font-semibold">Gastos por dia da semana</h2>
              <span className="text-xs text-muted-foreground">Onde você mais gasta</span>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekdayData} margin={{ top: 20, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      color: "var(--popover-foreground)",
                    }}
                    formatter={(v: number) => [brl(v), "Gasto"]}
                  />
                  <Bar dataKey="valor" fill="var(--primary)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-sm lg:col-span-2">
            <h2 className="mb-1 font-semibold">Por categoria</h2>
            <span className="text-xs text-muted-foreground">Distribuição das saídas</span>
            <div className="mt-2 h-72 w-full">
              {categoryData.length === 0 ? (
                <EmptyChart text="Nenhum gasto ainda" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                      }}
                      formatter={(v: number) => brl(v)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <ul className="mt-2 space-y-1.5">
              {categoryData.slice(0, 4).map((c, i) => (
                <li key={c.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    {c.name}
                  </span>
                  <span className="font-medium">{brl(c.value)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Transactions */}
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Transações</h2>
            <span className="text-xs text-muted-foreground">
              {listItems.length} {listItems.length === 1 ? "registro" : "registros"}
            </span>
          </div>
          {!hydrated ? null : listItems.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">Nenhuma transação para este período.</p>
              <Button className="mt-4" onClick={() => setOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Adicionar primeira
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {listItems.map((r) => (
                <li key={r.key} className="flex items-center gap-4 py-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      r.type === "income"
                        ? "bg-[oklch(0.95_0.05_160)] text-[var(--success)] dark:bg-[oklch(0.3_0.05_160)]"
                        : r.type === "expense"
                          ? "bg-[oklch(0.96_0.04_22)] text-destructive dark:bg-[oklch(0.3_0.06_22)]"
                          : "text-white"
                    }`}
                    style={r.type === "installment" ? { background: r.color ?? "var(--muted)" } : undefined}
                  >
                    {r.type === "income" ? (
                      <ArrowUpRight className="h-5 w-5" />
                    ) : r.type === "expense" ? (
                      <ArrowDownRight className="h-5 w-5" />
                    ) : (
                      <CreditCardIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.subtitle}</p>
                  </div>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      r.type === "income" ? "text-[var(--success)]" : "text-destructive"
                    }`}
                  >
                    {r.type === "income" ? "+" : "−"} {brl(r.amount)}
                  </span>
                  <div className="flex items-center gap-1">
                    {r.onEdit ? (
                      <button
                        type="button"
                        onClick={r.onEdit}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        aria-label="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    ) : null}
                    {r.onRemove ? (
                      <button
                        type="button"
                        onClick={r.onRemove}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                        aria-label="Remover"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="w-8" aria-hidden />
                    )}
                  </div>

                </li>
              ))}
            </ul>
          )}
        </section>


      </div>

      <TxDialog
        mode="edit"
        open={editing !== null}
        setOpen={(v) => !v && setEditing(null)}
        initial={editing}
        onSubmit={(t) => {
          if (editing) update(editing.id, t);
        }}
        expenseCats={categories.expense}
        incomeCats={categories.income}
      />

      <CategoriesDialog
        open={catsOpen}
        setOpen={setCatsOpen}
        categories={categories}
        onRename={(_type, oldName, newName) => renameCategory(oldName, newName)}
      />
    </div>
  );
}


function StatCard({
  label,
  value,
  icon,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 shadow-sm ${
        highlight
          ? "border-transparent bg-[var(--gradient-hero)] text-primary-foreground"
          : "bg-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-sm ${highlight ? "opacity-90" : "text-muted-foreground"}`}>
          {label}
        </span>
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
            highlight ? "bg-white/15" : "bg-muted"
          }`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums tracking-tight">{value}</p>
      {sub && (
        <p className={`mt-1 text-xs ${highlight ? "opacity-80" : "text-muted-foreground"}`}>
          {sub}
        </p>
      )}
    </div>
  );
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function MonthFilter({
  value,
  onChange,
  activeMonth,
}: {
  value: string;
  onChange: (v: string) => void;
  activeMonth: string;
}) {
  const label = useMemo(() => {
    if (activeMonth === "all") return "—";
    const [y, m] = activeMonth.split("-");
    const s = new Date(Number(y), Number(m) - 1).toLocaleDateString("pt-BR", {
      month: "short",
      year: "2-digit",
    });
    return s.charAt(0).toUpperCase() + s.slice(1).replace(".", "");
  }, [activeMonth]);

  const shift = (delta: number) => {
    const base = activeMonth === "all"
      ? (() => {
          const d = new Date();
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        })()
      : activeMonth;
    const [y, m] = base.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    onChange(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };

  const showingAll = value === "all";

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border bg-card p-1 shadow-sm">
      <button
        type="button"
        onClick={() => shift(-1)}
        className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        aria-label="Mês anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange(showingAll ? activeMonth : "all")}
        className={`min-w-[92px] rounded-lg px-2 py-1 text-sm font-medium transition ${
          showingAll
            ? "bg-primary text-primary-foreground"
            : "hover:bg-muted"
        }`}
      >
        {showingAll ? "Todos" : label}
      </button>
      <button
        type="button"
        onClick={() => shift(1)}
        className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        aria-label="Próximo mês"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

type TxSubmit = {
  type: TxType;
  amount: number;
  category: string;
  description: string;
  date: string;
  inWeekday: boolean;
};


function TxDialog({
  open,
  setOpen,
  onSubmit,
  initial,
  expenseCats,
  incomeCats,
  mode = "create",
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onSubmit: (t: TxSubmit) => void;
  initial?: Transaction | null;
  expenseCats: string[];
  incomeCats: string[];
  mode?: "create" | "edit";
}) {
  const isEdit = mode === "edit";
  const [type, setType] = useState<TxType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [category, setCategory] = useState(
    initial?.category ?? expenseCats[0] ?? "",
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [inWeekday, setInWeekday] = useState(initial?.inWeekday ?? true);
  const [date, setDate] = useState(() =>
    initial
      ? new Date(initial.date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  );


  // Sync state when initial changes (edit mode)
  const initialId = initial?.id;
  useEffect(() => {
    if (initial) {
      setType(initial.type);
      setAmount(String(initial.amount));
      setCategory(initial.category);
      setDescription(initial.description);
      setDate(new Date(initial.date).toISOString().slice(0, 10));
      setInWeekday(initial.inWeekday ?? true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialId]);

  const cats = type === "expense" ? expenseCats : incomeCats;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(amount.replace(",", "."));
    if (!n || n <= 0) return;
    onSubmit({
      type,
      amount: n,
      category,
      description: description.trim(),
      date: new Date(date + "T12:00:00").toISOString(),
      inWeekday,
    });

    if (!isEdit) {
      setAmount("");
      setDescription("");
    }
    setOpen(false);
  };

  const content = (
    <DialogContent
      className="sm:max-w-md"
      onOpenAutoFocus={isEdit ? (e) => e.preventDefault() : undefined}
    >
      <DialogHeader>
        <DialogTitle>{isEdit ? "Editar transação" : "Nova transação"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <Tabs
          value={type}
          onValueChange={(v) => {
            const t = v as TxType;
            setType(t);
            const nextCats = t === "expense" ? expenseCats : incomeCats;
            if (!nextCats.includes(category)) setCategory(nextCats[0] ?? "");
          }}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expense">Saída</TabsTrigger>
            <TabsTrigger value="income">Entrada</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-2">
          <Label htmlFor="amount">Valor (R$)</Label>
          <Input
            id="amount"
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {cats.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Descrição</Label>
            <Input
              id="desc"
              placeholder="Opcional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-start justify-between gap-3 rounded-xl border bg-muted/30 p-3">
          <div className="space-y-0.5">
            <Label htmlFor="inWeekday" className="text-sm">
              Contar no gráfico por dia da semana
            </Label>
            <p className="text-xs text-muted-foreground">
              Desmarque para lançamentos que não representam um gasto do dia (ex.: fatura, ajustes).
            </p>
          </div>
          <Switch id="inWeekday" checked={inWeekday} onCheckedChange={setInWeekday} />
        </div>



        <Button type="submit" className="w-full" size="lg">
          {isEdit ? "Salvar" : "Adicionar"}
        </Button>
      </form>
    </DialogContent>
  );

  if (isEdit) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        {content}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="rounded-xl shadow-sm">
          <Plus className="mr-1 h-4 w-4" /> Nova
        </Button>
      </DialogTrigger>
      {content}
    </Dialog>
  );
}

function CategoriesDialog({
  open,
  setOpen,
  categories,
  onRename,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  categories: ReturnType<typeof useCategories>;
  onRename: (type: CatType, oldName: string, newName: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gerenciar categorias</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="expense">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="expense">Saídas</TabsTrigger>
            <TabsTrigger value="income">Entradas</TabsTrigger>
          </TabsList>
          <TabsContent value="expense" className="mt-4">
            <CategoryList
              items={categories.expense}
              onAdd={(n) => categories.add("expense", n)}
              onRename={(o, n) => {
                categories.rename("expense", o, n);
                onRename("expense", o, n);
              }}
              onRemove={(n) => categories.remove("expense", n)}
            />
          </TabsContent>
          <TabsContent value="income" className="mt-4">
            <CategoryList
              items={categories.income}
              onAdd={(n) => categories.add("income", n)}
              onRename={(o, n) => {
                categories.rename("income", o, n);
                onRename("income", o, n);
              }}
              onRemove={(n) => categories.remove("income", n)}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function CategoryList({
  items,
  onAdd,
  onRename,
  onRemove,
}: {
  items: string[];
  onAdd: (name: string) => void;
  onRename: (oldName: string, newName: string) => void;
  onRemove: (name: string) => void;
}) {
  const [newName, setNewName] = useState("");
  const [editingName, setEditingName] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const submitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAdd(newName);
    setNewName("");
  };

  return (
    <div className="space-y-4">
      <form onSubmit={submitAdd} className="flex items-center gap-2">
        <Input
          placeholder="Nova categoria"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <Button type="submit" size="sm">
          <Plus className="h-4 w-4" />
        </Button>
      </form>
      <ul className="max-h-72 divide-y overflow-auto rounded-lg border">
        {items.length === 0 ? (
          <li className="p-4 text-center text-sm text-muted-foreground">
            Nenhuma categoria.
          </li>
        ) : (
          items.map((c) => (
            <li key={c} className="flex items-center gap-2 px-3 py-2">
              {editingName === c ? (
                <>
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="h-8"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (draft.trim() && draft !== c) onRename(c, draft.trim());
                      setEditingName(null);
                    }}
                    className="rounded-md p-1.5 text-emerald-600 hover:bg-muted"
                    aria-label="Salvar"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingName(null)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                    aria-label="Cancelar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{c}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingName(c);
                      setDraft(c);
                    }}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Renomear"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(c)}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive"
                    aria-label="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

