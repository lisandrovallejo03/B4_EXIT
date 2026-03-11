import React, { useMemo, useState } from 'react';
import { DollarSign } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';

interface DolarApiItem {
  moneda: string;
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

interface DolarQuote {
  casa: 'oficial' | 'blue';
  label: string;
  compra: number;
  venta: number;
  updatedAt: string;
}

function parseQuotes(data: DolarApiItem[]): DolarQuote[] {
  const wanted: Array<DolarQuote['casa']> = ['oficial', 'blue'];
  const labels: Record<DolarQuote['casa'], string> = { oficial: 'DÓLAR OFICIAL', blue: 'DÓLAR BLUE' };

  return wanted
    .map((casa) => {
      const item = data.find((d) => d.casa === casa);
      if (!item) return null;

      let updatedAt = '—';
      if (item.fechaActualizacion) {
        const d = new Date(item.fechaActualizacion);
        if (!Number.isNaN(d.getTime())) {
          updatedAt = d.toLocaleString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
        }
      }

      return {
        casa,
        label: labels[casa] ?? item.nombre,
        compra: item.compra,
        venta: item.venta,
        updatedAt,
      };
    })
    .filter((x): x is DolarQuote => x !== null);
}

const fmtArs = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

export function DolarModule() {
  const [selectedCasa, setSelectedCasa] = useState<DolarQuote['casa']>('oficial');

  const { data: quotes, loading, error } = useFetch<DolarQuote[]>(
    async () => {
      const res = await fetch('/api-dolar/v1/dolares', {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`DolarAPI HTTP ${res.status}`);
      const json: DolarApiItem[] = await res.json();
      return parseQuotes(json);
    },
    []
  );

  const quoteByCasa = useMemo(() => {
    const map = new Map<DolarQuote['casa'], DolarQuote>();
    for (const q of quotes ?? []) map.set(q.casa, q);
    return map;
  }, [quotes]);

  const selected = quoteByCasa.get(selectedCasa) ?? null;

  return (
    <div className="border border-[#00ff41]/30 bg-[#020a02]/80 p-6 rounded-sm relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00ff41] to-transparent opacity-50"></div>
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#00ff41]/50"></div>
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#00ff41]/50"></div>
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#00ff41]/50"></div>
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#00ff41]/50"></div>

      <h2 className="text-lg font-bold mb-5 flex items-center gap-2 border-b border-[#008f11]/50 pb-2">
        <DollarSign size={18} />
        [COTIZACIÓN_DÓLAR]
      </h2>

      {loading ? (
        <div className="animate-pulse text-[#008f11]">CONSULTANDO MERCADO CAMBIARIO...</div>
      ) : error ? (
        <div className="text-red-500 text-sm">ERROR DE CONEXIÓN A DOLAR API</div>
      ) : !selected ? (
        <div className="text-[#008f11] text-sm">SIN DATOS DE COTIZACIÓN</div>
      ) : (
        <div className="border border-[#008f11]/30 bg-black/50 px-6 py-5 flex flex-col items-center">
          <div className="text-base font-mono font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedCasa('oficial')}
              className={
                selectedCasa === 'oficial'
                  ? 'text-[#00ff41] hover:opacity-90'
                  : 'text-slate-400 hover:text-slate-200'
              }
            >
              DÓLAR OFICIAL
            </button>
            <span className="text-[#008f11]/50">/</span>
            <button
              type="button"
              onClick={() => setSelectedCasa('blue')}
              className={
                selectedCasa === 'blue'
                  ? 'text-[#00ff41] hover:opacity-90'
                  : 'text-slate-400 hover:text-slate-200'
              }
            >
              DÓLAR BLUE
            </button>
          </div>

          <div className="flex justify-center gap-12 w-full">
            <div className="text-center">
              <div className="text-sm text-[#008f11]/70 font-mono uppercase tracking-widest mb-2">Compra</div>
              <div className="text-4xl font-bold text-[#00ff41] tabular-nums leading-tight">
                {fmtArs.format(selected.compra)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-[#008f11]/70 font-mono uppercase tracking-widest mb-2">Venta</div>
              <div className="text-4xl font-bold text-[#00ff41] tabular-nums leading-tight">
                {fmtArs.format(selected.venta)}
              </div>
            </div>
          </div>

          <div className="text-xs text-[#008f11]/60 font-mono mt-4">
            Actualizado: {selected.updatedAt}
          </div>
        </div>
      )}
    </div>
  );
}
