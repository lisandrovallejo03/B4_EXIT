import React from 'react';

interface TickerProps {
  items: string[];
}

export function Ticker({ items }: TickerProps) {
  const displayItems = items.length > 0 ? items : ['SISTEMA DE NOTICIAS — EN ESPERA DE FEED'];
  const duplicated = [...displayItems, ...displayItems];

  return (
    <div className="w-full h-8 border-y border-[#00ff41]/25 bg-black/60 overflow-hidden flex-shrink-0 relative">
      <div
        className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,255,65,0.04)_2px,rgba(0,255,65,0.04)_4px)] pointer-events-none z-[1]"
        aria-hidden
      />
      <div
        className="flex h-full items-center whitespace-nowrap animate-[ticker-scroll_60s_linear_infinite]"
        style={{ width: 'max-content' }}
      >
        <span className="inline-flex items-center gap-6 px-4 text-[#00ff41] font-mono text-xs tracking-widest uppercase">
          {duplicated.map((text, i) => (
            <React.Fragment key={i}>
              <span className="text-[#008f11]/90">{text}</span>
              <span className="text-[#00ff41]/50">◆</span>
            </React.Fragment>
          ))}
        </span>
      </div>
    </div>
  );
}
