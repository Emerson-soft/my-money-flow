import { useRef } from "react";
import { Download, Upload } from "lucide-react";

const PREFIX = "finance-";

export function DataBackup() {
  const inputRef = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const data: Record<string, unknown> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(PREFIX)) continue;
      try {
        data[k] = JSON.parse(localStorage.getItem(k) ?? "null");
      } catch {
        /* ignore */
      }
    }
    const payload = { app: "financa", version: 1, exportedAt: new Date().toISOString(), data };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financa-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  const importData = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      const data = parsed?.data;
      if (!data || typeof data !== "object") throw new Error();
      if (!confirm("Importar vai substituir todos os dados atuais. Continuar?")) return;
      Object.keys(localStorage)
        .filter((k) => k.startsWith(PREFIX))
        .forEach((k) => localStorage.removeItem(k));
      for (const [k, v] of Object.entries(data)) {
        if (k.startsWith(PREFIX)) localStorage.setItem(k, JSON.stringify(v));
      }
      window.location.reload();
    } catch {
      alert("Arquivo inválido.");
    }
  };

  return (
    <div className="inline-flex gap-1 rounded-xl border bg-card p-1 shadow-sm">
      <button
        type="button"
        onClick={exportData}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        title="Baixar todos os dados em JSON"
      >
        <Download className="h-4 w-4" /> Exportar
      </button>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        title="Carregar dados de um arquivo JSON"
      >
        <Upload className="h-4 w-4" /> Importar
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) importData(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
