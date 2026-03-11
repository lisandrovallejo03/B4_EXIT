import React from 'react';

export interface CryptoTickerItem {
  id?: string;
  name?: string;
  symbol: string;
  iconUrl?: string;
  priceUsd: number;
  changePct24h: number | null;
}

interface CryptoTickerProps {
  items: CryptoTickerItem[];
}

const fmtPrice = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const fmtPct = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 2,
});

export function CryptoTicker({ items }: CryptoTickerProps) {
  const displayItems = items.length > 0 ? items : [
    { symbol: 'BTC', priceUsd: 0, changePct24h: null },
    { symbol: 'ETH', priceUsd: 0, changePct24h: null },
    { symbol: 'SOL', priceUsd: 0, changePct24h: null },
  ];
  const duplicated = [...displayItems, ...displayItems];

  return (
    <div className="w-full h-8 border-y border-[#00ff41]/25 bg-black/60 overflow-hidden flex-shrink-0 relative">
      <div
        className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,255,65,0.03)_2px,rgba(0,255,65,0.03)_4px)] pointer-events-none z-[1]"
        aria-hidden
      />
      <div
        className="ticker-sharp flex h-full items-center whitespace-nowrap animate-[ticker-scroll_45s_linear_infinite]"
        style={{ width: 'max-content' }}
      >
        <span className="ticker-sharp inline-flex items-center gap-6 px-4 font-mono text-xs tracking-widest uppercase font-bold">
          {duplicated.map((it, i) => {
            const hasChange = typeof it.changePct24h === 'number';
            const absChangePct = hasChange ? Math.abs(it.changePct24h) : null;
            const isNeutral = hasChange ? (absChangePct ?? 0) < 0.99 : true;
            const isDown = hasChange ? (it.changePct24h ?? 0) < 0 : false;
            const colorClass = isNeutral ? 'text-slate-400' : (isDown ? 'text-red-500' : 'text-[#00ff41]');
            const changeAbs = hasChange ? Math.abs(it.changePct24h) / 100 : null;
            return (
              <React.Fragment key={`${it.symbol}-${i}`}>
                <span className={`inline-flex items-center gap-2 ${colorClass}`}>
                  {it.iconUrl ? (
                    <img
                      src={it.iconUrl}
                      alt=""
                      className="w-4 h-4 shrink-0 object-contain"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : null}
                  <span className="tabular-nums">{it.symbol}</span>
                  <span className="tabular-nums">
                    {it.priceUsd > 0 ? fmtPrice.format(it.priceUsd) : '—'}
                  </span>
                  {hasChange ? (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <span className="text-[10px] leading-none">{isDown ? '▼' : '▲'}</span>
                      {fmtPct.format(changeAbs ?? 0)}
                    </span>
                  ) : (
                    <span className="opacity-60">—</span>
                  )}
                </span>
                <span className="text-[#00ff41]/40">◆</span>
              </React.Fragment>
            );
          })}
        </span>
      </div>
    </div>
  );
}

