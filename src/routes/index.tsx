import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Trash2,
  Wallet,
  TrendingUp,
  TrendingDown,
  CalendarDays,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  brl,
  useTransactions,
  type TxType,
} from "@/lib/finance-store";
import { NavTabs } from "./cartoes";

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
  const { txs, add, remove, hydrated } = useTransactions();
  const [open, setOpen] = useState(false);

  const months = useMemo(() => {
    const s = new Set<string>();
    txs.forEach((t) => {
      const d = new Date(t.date);
      s.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    });
    return Array.from(s).sort().reverse();
  }, [txs]);

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

  const stats = useMemo(() => {
    const income = filtered.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = filtered.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [filtered]);

  const weekdayData = useMemo(() => {
    const map = WEEKDAYS.map((d) => ({ day: d, valor: 0 }));
    filtered
      .filter((t) => t.type === "expense")
      .forEach((t) => {
        const idx = new Date(t.date).getDay();
        map[idx].valor += t.amount;
      });
    return map;
  }, [filtered]);

  const categoryData = useMemo(() => {
    const m = new Map<string, number>();
    filtered
      .filter((t) => t.type === "expense")
      .forEach((t) => m.set(t.category, (m.get(t.category) ?? 0) + t.amount));
    return Array.from(m, ([name, value]) => ({ name, value })).sort(
      (a, b) => b.value - a.value,
    );
  }, [filtered]);

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
            <MonthSelect
              value={selectedMonth}
              onChange={setSelectedMonth}
              months={months}
              currentMonth={currentMonth}
            />
            <NewTxDialog open={open} setOpen={setOpen} onAdd={add} />
          </div>
        </header>

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
              {filtered.length} {filtered.length === 1 ? "registro" : "registros"}
            </span>
          </div>
          {!hydrated ? null : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">Nenhuma transação para este período.</p>
              <Button className="mt-4" onClick={() => setOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Adicionar primeira
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((t) => (

                <li key={t.id} className="flex items-center gap-4 py-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      t.type === "income"
                        ? "bg-[oklch(0.95_0.05_160)] text-[var(--success)] dark:bg-[oklch(0.3_0.05_160)]"
                        : "bg-[oklch(0.96_0.04_22)] text-destructive dark:bg-[oklch(0.3_0.06_22)]"
                    }`}
                  >
                    {t.type === "income" ? (
                      <ArrowUpRight className="h-5 w-5" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {t.description || t.category}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.category} · {new Date(t.date).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      t.type === "income" ? "text-[var(--success)]" : "text-destructive"
                    }`}
                  >
                    {t.type === "income" ? "+" : "−"} {brl(t.amount)}
                  </span>
                  <button
                    onClick={() => remove(t.id)}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                    aria-label="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
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

function MonthSelect({
  value,
  onChange,
  months,
  currentMonth,
}: {
  value: string;
  onChange: (v: string) => void;
  months: string[];
  currentMonth: string;
}) {
  const options = useMemo(() => {
    const all = new Set([currentMonth, ...months]);
    return Array.from(all).sort().reverse();
  }, [months, currentMonth]);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[160px] rounded-xl">
        <SelectValue placeholder="Mês" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os meses</SelectItem>
        {options.map((m) => {
          const [y, month] = m.split("-");
          const label = new Date(Number(y), Number(month) - 1).toLocaleDateString("pt-BR", {
            month: "short",
            year: "numeric",
          });
          return (
            <SelectItem key={m} value={m}>
              {label.charAt(0).toUpperCase() + label.slice(1)}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function NewTxDialog({

  open,
  setOpen,
  onAdd,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onAdd: (t: { type: TxType; amount: number; category: string; description: string; date: string }) => void;
}) {
  const [type, setType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const cats = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(amount.replace(",", "."));
    if (!n || n <= 0) return;
    onAdd({
      type,
      amount: n,
      category,
      description: description.trim(),
      date: new Date(date + "T12:00:00").toISOString(),
    });
    setAmount("");
    setDescription("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="rounded-xl shadow-sm">
          <Plus className="mr-1 h-4 w-4" /> Nova
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova transação</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Tabs
            value={type}
            onValueChange={(v) => {
              const t = v as TxType;
              setType(t);
              setCategory(t === "expense" ? EXPENSE_CATEGORIES[0] : INCOME_CATEGORIES[0]);
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

          <Button type="submit" className="w-full" size="lg">
            Adicionar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
