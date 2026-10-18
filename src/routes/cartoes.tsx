import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CreditCard as CreditCardIcon,
  Plus,
  Trash2,
  Wallet,
  CalendarDays,
  Layers,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Undo2,
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CARD_COLORS,
  addMonths,
  brl,
  expandInstallments,
  monthLabel,
  useCards,
  type CreditCard,
  type Purchase,
  type Refund,
} from "@/lib/cards-store";
import { useCategories } from "@/lib/categories-store";

export const Route = createFileRoute("/cartoes")({
  component: CartoesPage,
});

function CartoesPage() {
  const {
    cards,
    purchases,
    hydrated,
    addCard,
    updateCard,
    removeCard,
    addPurchase,
    updatePurchase,
    removePurchase,
  } = useCards();
  const { expense: expenseCats } = useCategories();

  const [cardOpen, setCardOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [editingCard, setEditingCard] = useState<CreditCard | null>(null);
  const [refunding, setRefunding] = useState<Purchase | null>(null);
  const [selectedCard, setSelectedCard] = useState<string>("all");

  const currentMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const [viewMonth, setViewMonth] = useState<string>(currentMonth);

  const installments = useMemo(() => expandInstallments(purchases, cards), [purchases, cards]);

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
      .filter((i) => i.month === viewMonth)
      .forEach((i) => map.set(i.cardId, (map.get(i.cardId) ?? 0) + i.amount));
    return map;
  }, [installments, viewMonth]);

  // Parcelas do mês selecionado (respeita filtro de cartão)
  const monthInst = useMemo(
    () =>
      filteredInst
        .filter((i) => i.month === viewMonth)
        .sort((a, b) => (a.description || a.category).localeCompare(b.description || b.category)),
    [filteredInst, viewMonth],
  );

  const upcoming = useMemo(
    () =>
      filteredInst
        .filter((i) => i.month > viewMonth)
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(0, 40),
    [filteredInst, viewMonth],
  );

  const totalFuture = useMemo(
    () => filteredInst.filter((i) => i.month >= viewMonth).reduce((s, i) => s + i.amount, 0),
    [filteredInst, viewMonth],
  );
  const currentMonthTotal = useMemo(
    () => monthInst.reduce((s, i) => s + i.amount, 0),
    [monthInst],
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
          <div className="flex flex-wrap items-center gap-2">
            <MonthNav
              value={viewMonth}
              onChange={setViewMonth}
              onReset={() => setViewMonth(currentMonth)}
              isCurrent={viewMonth === currentMonth}
            />
            <NewCardDialog open={cardOpen} setOpen={setCardOpen} onAdd={addCard} />
            <NewPurchaseDialog
              open={buyOpen}
              setOpen={setBuyOpen}
              cards={cards}
              categories={expenseCats}
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
                        {(c.closingDay || c.dueDay) && (
                          <p className="mt-0.5 text-[11px] opacity-80">
                            {c.closingDay ? `Fecha dia ${c.closingDay}` : ""}
                            {c.closingDay && c.dueDay ? " · " : ""}
                            {c.dueDay ? `Vence dia ${c.dueDay}` : ""}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingCard(c)}
                          className="rounded-lg p-1.5 opacity-80 transition hover:bg-white/15 hover:opacity-100"
                          aria-label="Editar cartão"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeCard(c.id)}
                          className="rounded-lg p-1.5 opacity-80 transition hover:bg-white/15 hover:opacity-100"
                          aria-label="Remover cartão"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
              <span className="text-sm text-muted-foreground">Fatura do mês</span>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums">{brl(currentMonthTotal)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{monthLabel(viewMonth)}</p>
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

        {/* Purchases list (do mês selecionado) */}
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Compras</h2>
              <p className="text-xs text-muted-foreground capitalize">{monthLabel(viewMonth)}</p>
            </div>
            <span className="text-xs text-muted-foreground">
              {monthInst.length} {monthInst.length === 1 ? "lançamento" : "lançamentos"}
            </span>
          </div>
          {!hydrated ? null : monthInst.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma compra neste mês.
            </p>
          ) : (
            <ul className="divide-y">
              {monthInst.map((i, idx) => {
                const card = cards.find((c) => c.id === i.cardId);
                const p = purchases.find((x) => x.id === i.purchaseId);
                return (
                  <li key={`${i.purchaseId}-${idx}`} className="flex items-center gap-4 py-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-white"
                      style={{ background: card?.color ?? "var(--muted)" }}
                    >
                      <CreditCardIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {i.description || i.category}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {card?.name ?? "—"} · {i.category}
                        {i.total > 1 ? ` · parcela ${i.index}/${i.total}` : " · à vista"}
                        {p ? ` · total ${brl(p.totalAmount)}` : ""}
                      </p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">{brl(i.amount)}</span>
                    <button
                      type="button"
                      onClick={() => p && setRefunding(p)}
                      className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      aria-label="Reembolso"
                      title="Adicionar reembolso/estorno"
                    >
                      <Undo2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => p && setEditing(p)}
                      className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      aria-label="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removePurchase(i.purchaseId)}
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

        <EditPurchaseDialog
          purchase={editing}
          cards={cards}
          categories={expenseCats}
          onClose={() => setEditing(null)}
          onSave={(patch) => {
            if (editing) updatePurchase(editing.id, patch);
            setEditing(null);
          }}
        />

        <EditCardDialog
          card={editingCard}
          onClose={() => setEditingCard(null)}
          onSave={(patch) => {
            if (editingCard) updateCard(editingCard.id, patch);
          }}
        />

        <RefundDialog
          purchase={refunding}
          defaultMonth={viewMonth}
          onClose={() => setRefunding(null)}
          onSave={(refunds) => {
            if (refunding) updatePurchase(refunding.id, { refunds });
            setRefunding(null);
          }}
        />


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

function MonthNav({
  value,
  onChange,
  onReset,
  isCurrent,
}: {
  value: string;
  onChange: (v: string) => void;
  onReset: () => void;
  isCurrent: boolean;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl border bg-card p-1">
      <button
        type="button"
        onClick={() => onChange(addMonths(value, -1))}
        className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        aria-label="Mês anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onReset}
        className="min-w-[92px] rounded-lg px-2 py-1 text-sm font-medium capitalize transition hover:bg-muted"
        title="Voltar para o mês atual"
      >
        {shortMonth(value)}
      </button>
      <button
        type="button"
        onClick={() => onChange(addMonths(value, 1))}
        className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        aria-label="Próximo mês"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
      {!isCurrent && (
        <button
          type="button"
          onClick={onReset}
          className="rounded-lg px-2 py-1 text-xs text-primary transition hover:bg-muted"
        >
          Hoje
        </button>
      )}
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

export function NavTabs({
  current,
}: {
  current: "dashboard" | "cartoes" | "orcamento" | "investimentos";
}) {
  const tabs = [
    { id: "dashboard" as const, to: "/" as const, label: "Dashboard" },
    { id: "cartoes" as const, to: "/cartoes" as const, label: "Cartões" },
    { id: "orcamento" as const, to: "/orcamento" as const, label: "Orçamento" },
    { id: "investimentos" as const, to: "/investimentos" as const, label: "Investimentos" },
  ];

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
    <div className="inline-flex rounded-xl border bg-card p-1 shadow-sm">
      {tabs.map((t) => (
        <Link
          key={t.id}
          to={t.to}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
            current === t.id
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.label}
        </Link>
      ))}
    </div>
    <DataBackup />
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
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const l = parseFloat(limit.replace(",", "."));
    const cd = parseInt(closingDay);
    const dd = parseInt(dueDay);
    onAdd({
      name: name.trim(),
      color,
      limit: isNaN(l) ? undefined : l,
      closingDay: isNaN(cd) ? undefined : Math.min(31, Math.max(1, cd)),
      dueDay: isNaN(dd) ? undefined : Math.min(31, Math.max(1, dd)),
    });
    setName("");
    setLimit("");
    setClosingDay("");
    setDueDay("");
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cclose">Dia de fechamento</Label>
              <Input
                id="cclose"
                type="number"
                min={1}
                max={31}
                placeholder="Ex.: 15"
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cdue">Dia de vencimento</Label>
              <Input
                id="cdue"
                type="number"
                min={1}
                max={31}
                placeholder="Ex.: 22"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            Se preenchido, compras após o fechamento entram na fatura do mês seguinte automaticamente.
          </p>
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

function EditCardDialog({
  card,
  onClose,
  onSave,
}: {
  card: CreditCard | null;
  onClose: () => void;
  onSave: (patch: Partial<Omit<CreditCard, "id">>) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(CARD_COLORS[0]);
  const [limit, setLimit] = useState("");
  const [closingDay, setClosingDay] = useState("");
  const [dueDay, setDueDay] = useState("");

  useEffect(() => {
    if (card) {
      setName(card.name);
      setColor(card.color);
      setLimit(card.limit != null ? String(card.limit).replace(".", ",") : "");
      setClosingDay(card.closingDay ? String(card.closingDay) : "");
      setDueDay(card.dueDay ? String(card.dueDay) : "");
    }
  }, [card]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const l = parseFloat(limit.replace(",", "."));
    const cd = parseInt(closingDay);
    const dd = parseInt(dueDay);
    onSave({
      name: name.trim(),
      color,
      limit: isNaN(l) ? undefined : l,
      closingDay: isNaN(cd) ? undefined : Math.min(31, Math.max(1, cd)),
      dueDay: isNaN(dd) ? undefined : Math.min(31, Math.max(1, dd)),
    });
    onClose();
  };

  return (
    <Dialog open={!!card} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar cartão</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ecname">Nome</Label>
            <Input
              id="ecname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eclimit">Limite (opcional)</Label>
            <Input
              id="eclimit"
              inputMode="decimal"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="eclose">Dia de fechamento</Label>
              <Input
                id="eclose"
                type="number"
                min={1}
                max={31}
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ecdue">Dia de vencimento</Label>
              <Input
                id="ecdue"
                type="number"
                min={1}
                max={31}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            Compras feitas após o dia de fechamento entram na fatura do mês seguinte.
          </p>
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
            Salvar alterações
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
  categories,
  onAdd,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  cards: CreditCard[];
  categories: string[];
  onAdd: (p: {
    cardId: string;
    description: string;
    category: string;
    totalAmount: number;
    installments: number;
    firstMonth: string;
    purchaseDate?: string;
    inBudget?: boolean;
  }) => void;
}) {
  const nowMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);
  const [cardId, setCardId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [installments, setInstallments] = useState("1");
  const [category, setCategory] = useState(categories[0] ?? "");
  const [description, setDescription] = useState("");
  const [firstMonth, setFirstMonth] = useState(nowMonth);
  const [purchaseDate, setPurchaseDate] = useState("");
  const [inBudget, setInBudget] = useState(false);

  useEffect(() => {
    if (!category && categories[0]) setCategory(categories[0]);
  }, [categories, category]);

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
      purchaseDate: purchaseDate || undefined,
      inBudget,
    });
    setAmount("");
    setDescription("");
    setInstallments("1");
    setPurchaseDate("");
    setInBudget(false);
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
                  {categories.map((c: string) => (
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

          <div className="space-y-2">
            <Label htmlFor="pdate">Dia da compra (opcional)</Label>
            <Input
              id="pdate"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Usado no gráfico de gastos por dia da semana.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="pr-4">
              <Label htmlFor="pbudget">Entrar no orçamento</Label>
              <p className="text-xs text-muted-foreground">
                Se marcado, as parcelas contam no Orçamento mensal.
              </p>
            </div>
            <Switch id="pbudget" checked={inBudget} onCheckedChange={setInBudget} />
          </div>

          <Button type="submit" className="w-full" size="lg">
            Adicionar compra
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditPurchaseDialog({
  purchase,
  cards,
  categories,
  onClose,
  onSave,
}: {
  purchase: Purchase | null;
  cards: CreditCard[];
  categories: string[];
  onClose: () => void;
  onSave: (patch: Omit<Purchase, "id">) => void;
}) {
  const [cardId, setCardId] = useState("");
  const [amount, setAmount] = useState("");
  const [installments, setInstallments] = useState("1");
  const [category, setCategory] = useState(categories[0] ?? "");
  const [description, setDescription] = useState("");
  const [firstMonth, setFirstMonth] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [inBudget, setInBudget] = useState(false);

  useEffect(() => {
    if (purchase) {
      setCardId(purchase.cardId);
      setAmount(String(purchase.totalAmount).replace(".", ","));
      setInstallments(String(purchase.installments));
      setCategory(purchase.category);
      setDescription(purchase.description);
      setFirstMonth(purchase.firstMonth);
      setPurchaseDate(purchase.purchaseDate ?? "");
      setInBudget(purchase.inBudget ?? false);
    }
  }, [purchase]);

  const total = parseFloat(amount.replace(",", ".")) || 0;
  const nParcel = Math.max(1, parseInt(installments) || 1);
  const per = total / nParcel;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardId || total <= 0) return;
    onSave({
      cardId,
      description: description.trim(),
      category,
      totalAmount: total,
      installments: nParcel,
      firstMonth,
      purchaseDate: purchaseDate || undefined,
      inBudget,
    });
  };

  return (
    <Dialog open={!!purchase} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar compra</DialogTitle>
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
              <Label htmlFor="etotal">Valor total (R$)</Label>
              <Input
                id="etotal"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="einst">Parcelas</Label>
              <Input
                id="einst"
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
              <span className="text-muted-foreground"> a partir de {firstMonth ? monthLabel(firstMonth) : "—"}</span>
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
                  {categories.map((c: string) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emonth">Mês do gasto</Label>
              <Input
                id="emonth"
                type="month"
                value={firstMonth}
                onChange={(e) => setFirstMonth(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edesc">Descrição</Label>
            <Input
              id="edesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edate">Dia da compra (opcional)</Label>
            <Input
              id="edate"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Usado no gráfico de gastos por dia da semana.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="pr-4">
              <Label htmlFor="ebudget">Entrar no orçamento</Label>
              <p className="text-xs text-muted-foreground">
                Se marcado, as parcelas contam no Orçamento mensal.
              </p>
            </div>
            <Switch id="ebudget" checked={inBudget} onCheckedChange={setInBudget} />
          </div>

          <Button type="submit" className="w-full" size="lg">
            Salvar alterações
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RefundDialog({
  purchase,
  defaultMonth,
  onClose,
  onSave,
}: {
  purchase: Purchase | null;
  defaultMonth: string;
  onClose: () => void;
  onSave: (refunds: Refund[]) => void;
}) {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState(defaultMonth);
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (purchase) {
      setRefunds(purchase.refunds ?? []);
      setAmount("");
      setMonth(defaultMonth);
      setDescription("");
    }
  }, [purchase, defaultMonth]);

  const addRefund = () => {
    const v = Number(amount.replace(",", "."));
    if (!v || v <= 0 || !month) return;
    setRefunds((prev) => [
      ...prev,
      { id: crypto.randomUUID(), amount: v, month, description: description.trim() || undefined },
    ]);
    setAmount("");
    setDescription("");
  };

  return (
    <Dialog open={!!purchase} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reembolso — {purchase?.description || purchase?.category}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            O valor reembolsado abate da fatura do mês escolhido (aparece como crédito negativo).
          </p>

          {refunds.length > 0 && (
            <ul className="divide-y rounded-lg border">
              {refunds.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span className="flex-1 truncate">
                    {r.description || "Reembolso"} · <span className="capitalize">{monthLabel(r.month)}</span>
                  </span>
                  <span className="font-semibold tabular-nums text-emerald-600">-{brl(r.amount)}</span>
                  <button
                    type="button"
                    onClick={() => setRefunds((prev) => prev.filter((x) => x.id !== r.id))}
                    className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-destructive"
                    aria-label="Remover reembolso"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="rval">Valor</Label>
              <Input
                id="rval"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rmonth">Fatura de</Label>
              <Input
                id="rmonth"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="rdesc">Descrição (opcional)</Label>
            <Input
              id="rdesc"
              placeholder="Ex.: estorno da loja"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Button type="button" variant="outline" className="w-full" onClick={addRefund}>
            <Plus className="mr-2 h-4 w-4" /> Adicionar reembolso
          </Button>
          <Button type="button" className="w-full" size="lg" onClick={() => onSave(refunds)}>
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
