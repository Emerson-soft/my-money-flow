import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Plus, RefreshCw, Trash2, TrendingUp, Wallet, Target } from "lucide-react";
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
import { brl } from "@/lib/finance-store";
import {
  assetValue,
  INV_CATEGORIES,
  INV_CATEGORY_COLORS,
  type Asset,
  type InvCategory,
  pct,
  suggestAllocation,
  useInvestments,
} from "@/lib/investments-store";
import { NavTabs } from "./cartoes";

export const Route = createFileRoute("/investimentos")({
  head: () => ({
    meta: [
      { title: "Investimentos — Finança" },
      {
        name: "description",
        content:
          "Acompanhe sua carteira por categoria, defina a porcentagem alvo de cada uma e veja onde aportar.",
      },
      { property: "og:title", content: "Investimentos — Finança" },
      {
        property: "og:description",
        content: "Carteira por categoria, alvo em % e sugestão de aporte automática.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InvestmentsPage,
});

function InvestmentsPage() {
  const {
    assets,
    targets,
    hydrated,
    addAsset,
    updateAsset,
    removeAsset,
    contribute,
    setTarget,
  } = useInvestments();
  const [open, setOpen] = useState(false);
  const [contribution, setContribution] = useState("");
  const quotesState = useQuotes(assets);
  const prices = quotesState.prices;

  const byCat = useMemo(() => {
    const map: Record<string, number> = {};
    assets.forEach((a) => {
      map[a.category] = (map[a.category] ?? 0) + assetValue(a, prices);
    });
    return map;
  }, [assets, prices]);

  const total = useMemo(
    () => assets.reduce((s, a) => s + assetValue(a, prices), 0),
    [assets, prices],
  );
  const contributionValue = Number(contribution.replace(",", ".")) || 0;
  const suggestion = useMemo(
    () => suggestAllocation(byCat, targets, contributionValue),
    [byCat, targets, contributionValue],
  );
  const totalTarget = useMemo(
    () => INV_CATEGORIES.reduce((s, c) => s + (targets[c] ?? 0), 0),
    [targets],
  );

  const pieData = useMemo(
    () =>
      INV_CATEGORIES.filter((c) => (byCat[c] ?? 0) > 0).map((c) => ({
        name: c,
        value: byCat[c] ?? 0,
      })),
    [byCat],
  );

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Investimentos</h1>
            <p className="text-sm text-muted-foreground">
              Distribua sua carteira por categoria e descubra onde aportar.
            </p>
          </div>
          <AssetDialog open={open} setOpen={setOpen} onSave={(a) => addAsset(a)} />
        </header>

        <NavTabs current="investimentos" />

        <section className="mb-6 grid gap-3 sm:grid-cols-3">
          <StatCard label="Total investido" value={brl(total)} icon={<Wallet className="h-4 w-4" />} />
          <StatCard
            label="Aporte simulado"
            value={brl(contributionValue)}
            icon={<Plus className="h-4 w-4" />}
          />
          <StatCard
            label="Total com aporte"
            value={brl(total + contributionValue)}
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </section>

        <section className="mb-6 grid gap-4 lg:grid-cols-[1fr_320px]">
          {/* Categorias */}
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Target className="h-4 w-4" /> Alvo por categoria
              </h2>
              <span
                className={`text-xs ${totalTarget > 100 ? "text-destructive" : "text-muted-foreground"}`}
              >
                Soma dos alvos: {pct(totalTarget)}
              </span>
            </div>
            <div className="grid grid-cols-12 gap-2 border-b bg-muted/40 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <div className="col-span-4">Categoria</div>
              <div className="col-span-2 text-right">Alvo %</div>
              <div className="col-span-3 text-right">Atual</div>
              <div className="col-span-3 text-right">Aportar</div>
            </div>
            <ul className="divide-y">
              {INV_CATEGORIES.map((cat) => {
                const current = byCat[cat] ?? 0;
                const currentPct = total > 0 ? (current / total) * 100 : 0;
                const target = targets[cat] ?? 0;
                const ideal = ((total + contributionValue) * target) / 100;
                const diff = current - ideal;
                const sug = suggestion[cat] ?? 0;
                return (
                  <li key={cat} className="grid grid-cols-12 items-center gap-2 px-4 py-3">
                    <div className="col-span-4 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: INV_CATEGORY_COLORS[cat] }}
                        />
                        <span className="truncate text-sm font-medium">{cat}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(100, target > 0 ? (currentPct / target) * 100 : 0)}%`,
                            background: INV_CATEGORY_COLORS[cat],
                          }}
                        />
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Input
                        inputMode="decimal"
                        value={targets[cat]?.toString() ?? ""}
                        placeholder="0"
                        onChange={(e) =>
                          setTarget(cat, Number(e.target.value.replace(",", ".")) || 0)
                        }
                        className="h-8 text-right text-sm"
                      />
                    </div>
                    <div className="col-span-3 text-right">
                      <p className="text-sm font-semibold tabular-nums">{brl(current)}</p>
                      <p
                        className={`text-xs tabular-nums ${
                          target > 0
                            ? diff < 0
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {pct(currentPct)}
                        {target > 0 ? ` de ${pct(target)}` : ""}
                      </p>
                    </div>
                    <div className="col-span-3 text-right">
                      {target === 0 ? (
                        <span className="text-xs text-muted-foreground">defina o alvo</span>
                      ) : sug > 0 ? (
                        <span className="text-sm font-semibold tabular-nums text-primary">
                          {brl(sug)}
                        </span>
                      ) : (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400">
                          no alvo ✓
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap items-end gap-3 border-t bg-muted/30 px-4 py-3">
              <div className="min-w-40">
                <Label className="text-xs text-muted-foreground">Quero investir agora</Label>
                <Input
                  inputMode="decimal"
                  placeholder="0,00"
                  value={contribution}
                  onChange={(e) => setContribution(e.target.value)}
                  className="mt-1 h-9"
                />
              </div>
              <p className="flex-1 text-xs text-muted-foreground">
                A sugestão divide o aporte apenas entre as categorias que estão abaixo da
                porcentagem definida.
              </p>
            </div>
          </div>

          {/* Pizza */}
          <div className="rounded-2xl border bg-card p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold">Distribuição atual</h2>
            {pieData.length === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Sem investimentos ainda.
              </p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                      {pieData.map((d) => (
                        <Cell key={d.name} fill={INV_CATEGORY_COLORS[d.name as InvCategory]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => brl(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>

        {/* Ativos */}
        <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">Meus ativos</h2>
          </div>
          {!hydrated ? (
            <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
          ) : assets.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              Nenhum ativo cadastrado. Adicione o que você já tem investido.
            </p>
          ) : (
            <ul className="divide-y">
              {assets.map((a) => (
                <AssetRow
                  key={a.id}
                  asset={a}
                  price={a.ticker ? prices[a.ticker] : undefined}
                  onContribute={(v) => contribute(a.id, v)}
                  onUpdate={(p) => updateAsset(a.id, p)}
                  onRemove={() => removeAsset(a.id)}
                />
              ))}
            </ul>
          )}
        </section>

        <QuotesPanel {...quotesState} />
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

function AssetRow({
  asset,
  price,
  onContribute,
  onUpdate,
  onRemove,
}: {
  asset: Asset;
  price?: number;
  onContribute: (v: number) => void;
  onUpdate: (patch: Partial<Omit<Asset, "id">>) => void;
  onRemove: () => void;
}) {
  const [add, setAdd] = useState("");
  const [edit, setEdit] = useState(false);
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <span
        className="h-9 w-9 shrink-0 rounded-xl"
        style={{ background: INV_CATEGORY_COLORS[asset.category] }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {asset.name}
          {asset.ticker ? (
            <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
              {asset.ticker}
            </span>
          ) : null}
        </p>
        <p className="text-xs text-muted-foreground">{asset.category}</p>
      </div>
      <div className="text-right">
        <span className="text-sm font-semibold tabular-nums">{brl(assetValue(asset, price && asset.ticker ? { [asset.ticker]: price } : undefined))}</span>
        {asset.quantity ? (
          <p className="text-xs text-muted-foreground tabular-nums">
            {asset.quantity.toLocaleString("pt-BR", { maximumFractionDigits: 8 })} x{" "}
            {price ? brl(price) : "sem cotação"}
          </p>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        <Input
          inputMode="decimal"
          placeholder="aporte"
          value={add}
          onChange={(e) => setAdd(e.target.value)}
          className="h-8 w-24 text-right text-sm"
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="h-8"
          onClick={() => {
            const v = Number(add.replace(",", ".")) || 0;
            if (v) onContribute(v);
            setAdd("");
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <AssetDialog
          open={edit}
          setOpen={setEdit}
          initial={asset}
          mode="edit"
          onSave={(a) => onUpdate(a)}
        />
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg p-2 text-muted-foreground transition hover:bg-muted hover:text-destructive"
          aria-label="Remover"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function AssetDialog({
  open,
  setOpen,
  onSave,
  initial,
  mode = "create",
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onSave: (a: Omit<Asset, "id">) => void;
  initial?: Asset;
  mode?: "create" | "edit";
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<InvCategory>(INV_CATEGORIES[0]);
  const [invested, setInvested] = useState("");
  const [ticker, setTicker] = useState("");
  const [byQty, setByQty] = useState(false);
  const [quantity, setQuantity] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setCategory(initial?.category ?? INV_CATEGORIES[0]);
    setInvested(initial ? String(initial.invested) : "");
    setTicker(initial?.ticker ?? "");
    setByQty(Boolean(initial?.quantity));
    setQuantity(initial?.quantity ? String(initial.quantity) : "");
  }, [open, initial]);

  const submit = () => {
    const value = Number(invested.replace(",", ".")) || 0;
    const qty = Number(quantity.replace(",", ".")) || 0;
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      category,
      invested: value,
      ticker: ticker.trim() ? ticker.trim().toUpperCase() : undefined,
      quantity: byQty && qty > 0 ? qty : undefined,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {mode === "create" ? (
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-1 h-4 w-4" /> Novo ativo
          </Button>
        </DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button type="button" size="sm" variant="ghost" className="h-8 px-2">
            editar
          </Button>
        </DialogTrigger>
      )}
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{mode === "edit" ? "Editar ativo" : "Novo ativo"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Nome</Label>
            <Input
              className="mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tesouro Selic 2029"
            />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as InvCategory)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INV_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Como controlar</Label>
            <div className="mt-1 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={byQty ? "outline" : "default"}
                onClick={() => setByQty(false)}
              >
                Por valor
              </Button>
              <Button
                type="button"
                size="sm"
                variant={byQty ? "default" : "outline"}
                onClick={() => setByQty(true)}
              >
                Por quantidade
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {byQty ? (
              <div>
                <Label>Quantidade</Label>
                <Input
                  className="mt-1"
                  inputMode="decimal"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0,0001"
                />
              </div>
            ) : null}
            <div>
              <Label>{byQty ? "Valor (fallback)" : "Valor investido"}</Label>
              <Input
                className="mt-1"
                inputMode="decimal"
                value={invested}
                onChange={(e) => setInvested(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label>Ticker {byQty ? "" : "(opcional)"}</Label>
              <Input
                className="mt-1"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="PETR4, MXRF11, BTC"
              />
            </div>
          </div>
          {byQty ? (
            <p className="text-xs text-muted-foreground">
              O valor será quantidade x cotação do ticker. Sem cotação, usamos o valor informado.
            </p>
          ) : null}
          <Button type="button" onClick={submit}>
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type Quote = { symbol: string; price: number; change?: number };

function useQuotes(assets: Asset[]) {
  const symbols = useMemo(
    () => Array.from(new Set(assets.map((a) => a.ticker).filter(Boolean) as string[])),
    [assets],
  );
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (symbols.length === 0) return;
    setLoading(true);
    setError(null);
    const out: Quote[] = [];
    try {
      const cryptos = symbols.filter((s) => ["BTC", "ETH", "SOL"].includes(s));
      const stocks = symbols.filter((s) => !cryptos.includes(s));
      if (cryptos.length) {
        const ids = cryptos
          .map((s) => ({ BTC: "bitcoin", ETH: "ethereum", SOL: "solana" })[s]!)
          .join(",");
        const r = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=brl&include_24hr_change=true`,
        );
        if (r.ok) {
          const j = (await r.json()) as Record<string, { brl: number; brl_24h_change?: number }>;
          cryptos.forEach((s) => {
            const id = { BTC: "bitcoin", ETH: "ethereum", SOL: "solana" }[s]!;
            if (j[id]) out.push({ symbol: s, price: j[id].brl, change: j[id].brl_24h_change });
          });
        }
      }
      if (stocks.length) {
        const r = await fetch(`https://brapi.dev/api/quote/${stocks.join(",")}`);
        if (r.ok) {
          const j = (await r.json()) as {
            results?: {
              symbol: string;
              regularMarketPrice: number;
              regularMarketChangePercent?: number;
            }[];
          };
          (j.results ?? []).forEach((x) =>
            out.push({
              symbol: x.symbol,
              price: x.regularMarketPrice,
              change: x.regularMarketChangePercent,
            }),
          );
        } else {
          setError("Não foi possível carregar as cotações da bolsa agora.");
        }
      }
      setQuotes(out);
    } catch {
      setError("Falha ao buscar cotações.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(",")]);

  const prices = useMemo(
    () => Object.fromEntries(quotes.map((q) => [q.symbol, q.price])) as Record<string, number>,
    [quotes],
  );

  return { symbols, quotes, prices, loading, error, reload: () => void load() };
}

function QuotesPanel({
  symbols,
  quotes,
  loading,
  error,
  reload,
}: {
  symbols: string[];
  quotes: Quote[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}) {
  if (symbols.length === 0) return null;


  return (
    <section className="mt-6 overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Cotações (somente acompanhamento)</h2>
        <Button type="button" size="sm" variant="ghost" onClick={reload}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>
      {error ? <p className="px-4 py-3 text-xs text-muted-foreground">{error}</p> : null}
      <ul className="divide-y">
        {quotes.map((q) => (
          <li key={q.symbol} className="flex items-center justify-between px-4 py-2.5">
            <span className="text-sm font-medium">{q.symbol}</span>
            <span className="flex items-center gap-3">
              <span className="text-sm font-semibold tabular-nums">{brl(q.price)}</span>
              {typeof q.change === "number" ? (
                <span
                  className={`text-xs tabular-nums ${
                    q.change >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-destructive"
                  }`}
                >
                  {q.change >= 0 ? "+" : ""}
                  {q.change.toFixed(2)}%
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
