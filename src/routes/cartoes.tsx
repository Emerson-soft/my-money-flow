import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  CreditCard as CreditCardIcon,
  Plus,
  Trash2,
  Wallet,
  CalendarDays,
  Layers,
  Pencil,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
import {
  CARD_COLORS,
  PURCHASE_CATEGORIES,
  addMonths,
  brl,
  expandInstallments,
  monthLabel,
  useCards,
  type CreditCard,
} from "@/lib/cards-store";

export const Route = createFileRoute("/cartoes")({
  component: CartoesPage,
});

function CartoesPage() {
  const {
    cards,
    purchases,
    hydrated,
    addCard,
    removeCard,
    addPurchase,
    removePurchase,
  } = useCards();

  const [cardOpen, setCardOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string>("all");

  const installments = useMemo(() => expandInstallments(purchases), [purchases]);

  const currentMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const filteredInst = useMemo(
    () => (selectedCard === "all" ? installments : installments.filter((i) => i.cardId === selectedCard)),
    [installments, selectedCard],
  );

  const monthly = useMemo(() => {
    const map = new Map<string, number>();
    filteredInst.forEach((i) => map.set(i.month, (map.get(i.month) ?? 0) + i.amount));
    // Ensure we show at least next 6 months from now
    for (let k = 0; k < 6; k++) {
      const m = addMonths(currentMonth, k);
      if (!map.has(m)) map.set(m, 0);
    }
    return Array.from(map, ([month, valor]) => ({ month, valor }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((r) => ({ ...r, label: shortMonth(r.month) }));
  }, [filteredInst, currentMonth]);

  const cardTotals = useMemo(() => {
    const map = new Map<string, number>();
    installments
      .filter((i) => i.month >= currentMonth)
      .forEach((i) => map.set(i.cardId, (map.get(i.cardId) ?? 0) + i.amount));
    return map;
  }, [installments, currentMonth]);

  const upcoming = useMemo(
    () =>
      filteredInst
        .filter((i) => i.month >= currentMonth)
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(0, 40),
    [filteredInst, currentMonth],
  );

  const totalFuture = useMemo(
    () => filteredInst.filter((i) => i.month >= currentMonth).reduce((s, i) => s + i.amount, 0),
    [filteredInst, currentMonth],
  );
  const currentMonthTotal = useMemo(
    () => filteredInst.filter((i) => i.month === currentMonth).reduce((s, i) => s + i.amount, 0),
    [filteredInst, currentMonth],
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
              <CreditCardIcon className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Cartões</h1>
              <p className="text-xs text-muted-foreground">Compras parceladas por mês</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NewCardDialog open={cardOpen} setOpen={setCardOpen} onAdd={addCard} />
            <NewPurchaseDialog
              open={buyOpen}
              setOpen={setBuyOpen}
              cards={cards}
              onAdd={addPurchase}
            />
          </div>
        </header>

        <NavTabs current="cartoes" />

        {/* Cards row */}
        <section className="mb-6">
          {!hydrated ? null : cards.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
              <p className="text-sm text-muted-foreground">
                Nenhum cartão cadastrado. Adicione um cartão para começar.
              </p>
              <Button className="mt-4" onClick={() => setCardOpen(true)}>
                <Plus className="mr-1 h-4 w-4" /> Adicionar cartão
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((c) => {
                const future = cardTotals.get(c.id) ?? 0;
                return (
                  <div
                    key={c.id}
                    className="relative overflow-hidden rounded-2xl p-5 text-white shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, ${c.color} 0%, ${shade(c.color, -30)} 100%)`,
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs opacity-80">Cartão</p>
                        <p className="text-lg font-semibold">{c.name}</p>
                      </div>
                      <button
                        onClick={() => removeCard(c.id)}
                        className="rounded-lg p-1.5 opacity-80 transition hover:bg-white/15 hover:opacity-100"
                        aria-label="Remover cartão"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-6 flex items-end justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider opacity-75">A pagar</p>
                        <p className="text-xl font-bold tabular-nums">{brl(future)}</p>
                      </div>
                      {c.limit ? (
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-wider opacity-75">Limite</p>
                          <p className="text-sm font-medium tabular-nums">{brl(c.limit)}</p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Filter + stats */}
        <section className="mb-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Fatura deste mês</span>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums">{brl(currentMonthTotal)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{monthLabel(currentMonth)}</p>
          </div>
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Comprometido futuro</span>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums">{brl(totalFuture)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Parcelas restantes</p>
          </div>
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <span className="text-sm text-muted-foreground">Filtrar por cartão</span>
            <div className="mt-2">
              <Select value={selectedCard} onValueChange={setSelectedCard}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os cartões</SelectItem>
                  {cards.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        {/* Chart */}
        <section className="mb-6 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-semibold">Faturas por mês</h2>
            <span className="text-xs text-muted-foreground">Projeção das parcelas</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 20, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                  }}
                  formatter={(v: number) => [brl(v), "Fatura"]}
                />
                <Bar dataKey="valor" fill="var(--primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Purchases list */}
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Compras</h2>
            <span className="text-xs text-muted-foreground">
              {purchases.length} {purchases.length === 1 ? "compra" : "compras"}
            </span>
          </div>
          {!hydrated ? null : purchases.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma compra registrada.
            </p>
          ) : (
            <ul className="divide-y">
              {purchases.map((p) => {
                const card = cards.find((c) => c.id === p.cardId);
                const per = p.totalAmount / Math.max(1, p.installments);
                return (
                  <li key={p.id} className="flex items-center gap-4 py-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                      style={{ background: card?.color ?? "var(--muted)" }}
                    >
                      <CreditCardIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {p.description || p.category}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {card?.name ?? "—"} · {p.category} · {p.installments}x de {brl(per)} · início {monthLabel(p.firstMonth)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{brl(p.totalAmount)}</span>
                    <button
                      onClick={() => removePurchase(p.id)}
                      className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-destructive"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Upcoming installments */}
        {upcoming.length > 0 && (
          <section className="mt-6 rounded-2xl border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold">Próximas parcelas</h2>
            </div>
            <ul className="divide-y">
              {upcoming.map((i, idx) => {
                const card = cards.find((c) => c.id === i.cardId);
                return (
                  <li key={`${i.purchaseId}-${idx}`} className="flex items-center gap-3 py-2.5">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: card?.color ?? "var(--muted)" }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{i.description || i.category}</p>
                      <p className="text-xs text-muted-foreground">
                        {monthLabel(i.month)} · parcela {i.index}/{i.total} · {card?.name ?? "—"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{brl(i.amount)}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}

function shortMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1)
    .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
    .replace(".", "");
}

// Simple hex shade helper (negative = darker)
function shade(hex: string, percent: number) {
  const h = hex.replace("#", "");
  const num = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent) / 100;
  const nr = Math.round((t - r) * p) + r;
  const ng = Math.round((t - g) * p) + g;
  const nb = Math.round((t - b) * p) + b;
  return `#${((1 << 24) + (nr << 16) + (ng << 8) + nb).toString(16).slice(1)}`;
}

export function NavTabs({ current }: { current: "dashboard" | "cartoes" }) {
  return (
    <div className="mb-6 inline-flex rounded-xl border bg-card p-1 shadow-sm">
      <Link
        to="/"
        className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
          current === "dashboard"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Dashboard
      </Link>
      <Link
        to="/cartoes"
        className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
          current === "cartoes"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Cartões
      </Link>
    </div>
  );
}

function NewCardDialog({
  open,
  setOpen,
  onAdd,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onAdd: (c: Omit<CreditCard, "id">) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(CARD_COLORS[0]);
  const [limit, setLimit] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const l = parseFloat(limit.replace(",", "."));
    onAdd({ name: name.trim(), color, limit: isNaN(l) ? undefined : l });
    setName("");
    setLimit("");
    setColor(CARD_COLORS[0]);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="rounded-xl">
          <Plus className="mr-1 h-4 w-4" /> Cartão
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo cartão</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cname">Nome</Label>
            <Input
              id="cname"
              placeholder="Ex.: Nubank, Inter..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="climit">Limite (opcional)</Label>
            <Input
              id="climit"
              inputMode="decimal"
              placeholder="0,00"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {CARD_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full ring-offset-2 transition ${
                    color === c ? "ring-2 ring-foreground" : ""
                  }`}
                  style={{ background: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full" size="lg">
            Adicionar cartão
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function NewPurchaseDialog({
  open,
  setOpen,
  cards,
  onAdd,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  cards: CreditCard[];
  onAdd: (p: {
    cardId: string;
    description: string;
    category: string;
    totalAmount: number;
    installments: number;
    firstMonth: string;
  }) => void;
}) {
  const nowMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const [cardId, setCardId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [installments, setInstallments] = useState("1");
  const [category, setCategory] = useState(PURCHASE_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [firstMonth, setFirstMonth] = useState(nowMonth);

  const total = parseFloat(amount.replace(",", ".")) || 0;
  const nParcel = Math.max(1, parseInt(installments) || 1);
  const per = total / nParcel;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardId || total <= 0) return;
    onAdd({
      cardId,
      description: description.trim(),
      category,
      totalAmount: total,
      installments: nParcel,
      firstMonth,
    });
    setAmount("");
    setDescription("");
    setInstallments("1");
    setOpen(false);
  };

  const disabled = cards.length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v && !cardId && cards[0]) setCardId(cards[0].id);
        setOpen(v);
      }}
    >
      <DialogTrigger asChild>
        <Button size="lg" className="rounded-xl shadow-sm" disabled={disabled}>
          <Plus className="mr-1 h-4 w-4" /> Compra
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova compra parcelada</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Cartão</Label>
            <Select value={cardId} onValueChange={setCardId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {cards.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ptotal">Valor total (R$)</Label>
              <Input
                id="ptotal"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pinst">Parcelas</Label>
              <Input
                id="pinst"
                type="number"
                min={1}
                max={60}
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                required
              />
            </div>
          </div>

          {total > 0 && (
            <div className="rounded-xl bg-muted p-3 text-sm">
              <span className="text-muted-foreground">Ficará </span>
              <span className="font-semibold">
                {nParcel}x de {brl(per)}
              </span>
              <span className="text-muted-foreground"> a partir de {monthLabel(firstMonth)}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PURCHASE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pmonth">Mês inicial</Label>
              <Input
                id="pmonth"
                type="month"
                value={firstMonth}
                onChange={(e) => setFirstMonth(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pdesc">Descrição</Label>
            <Input
              id="pdesc"
              placeholder="Ex.: Notebook, viagem..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full" size="lg">
            Adicionar compra
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
