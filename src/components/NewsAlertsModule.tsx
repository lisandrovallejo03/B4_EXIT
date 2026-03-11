import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Rss, Twitter, AlertOctagon, MessageSquareWarning, ChevronLeft, ChevronRight, Radio, ChevronDown } from 'lucide-react';
import { NEWS_SOURCES, toProxyImageUrl } from '../config/newsSources';

interface Alert {
  id: string;
  source: string;
  author: string;
  /** Id de la fuente en NEWS_SOURCES (crónica, ole, clarin, etc.) para mostrar displayName y favicon */
  sourceId?: string;
  content: string;
  time: string;
  type: 'paro' | 'noticia' | 'tweet';
  timestamp?: number;
  link?: string;
  imageUrl?: string;
}

const CAROUSEL_AUTOPLAY_MS = 6000;
const DEFAULT_SELECTED_IDS = NEWS_SOURCES.map((s) => s.id);

const BLOCKED_NEWS_RE = /\bhor[oó]scopo\b/i;

const isBlockedNews = (text: string) => BLOCKED_NEWS_RE.test(text);

const PLACEHOLDER_ALERTS: Alert[] = [
  {
    id: 'ph-1',
    source: 'Transporte CABA',
    author: '@MovilidadCABA',
    content: 'Línea D de subte: demoras de 15 min por tareas de mantenimiento entre Plaza de Mayo y Catedral.',
    time: '08:42:33',
    type: 'noticia',
  },
  {
    id: 'ph-2',
    source: 'Gremio UTA',
    author: 'UTA Capital',
    content: 'Paro de colectivos desde las 00:00. Se normaliza a partir de las 10:00. Verificar antes de salir.',
    time: '00:01:15',
    type: 'paro',
  },
  {
    id: 'ph-3',
    source: 'Tránsito CABA',
    author: '@AlertasTransito',
    content: 'Corte total Av. 9 de Julio x Av. Corrientes hasta las 14:00 por manifestación. Usar alternativas.',
    time: '09:15:02',
    type: 'tweet',
  },
  {
    id: 'ph-4',
    source: 'Metrovías',
    author: 'Línea Mitre',
    content: 'Servicio normal con frecuencias cada 8 min. Sin cortes programados para hoy.',
    time: '07:30:00',
    type: 'noticia',
  },
  {
    id: 'ph-5',
    source: 'B4_EXIT',
    author: 'Sistema',
    content: 'Próximamente: configure VITE_NEWS_API_URL para conectar su feed RSS o API de noticias.',
    time: '--:--:--',
    type: 'noticia',
  },
];

const getTagText = (parent: Element, tags: string[]) => {
  for (const tag of tags) {
    const content = parent.getElementsByTagName(tag)[0]?.textContent?.trim();
    if (content) return content;
  }
  return '';
};

const toTimeDisplay = (pubDate: string) => {
  if (!pubDate) return '--:--:--';
  const parsed = new Date(pubDate);
  if (Number.isNaN(parsed.getTime())) return '--:--:--';
  return parsed.toLocaleTimeString('es-AR', { hour12: false });
};

const parseRssToAlerts = (xmlText: string, sourceLabel: string, sourceId: string): Alert[] => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  const parserError = xmlDoc.getElementsByTagName('parsererror')[0];
  if (parserError) {
    throw new Error('RSS XML invalido');
  }

  const itemNodes = Array.from(xmlDoc.getElementsByTagName('item'));
  return itemNodes
    .map((item, index) => {
    const title = getTagText(item, ['title']) || `Noticia ${index + 1}`;
    const author =
      getTagText(item, ['dc:creator', 'creator', 'author']) || sourceLabel;
    const pubDate = getTagText(item, ['pubDate']);
    const source = getTagText(item, ['source']) || sourceLabel;
    const link = getTagText(item, ['link']);
    const enclosure = item.getElementsByTagName('enclosure')[0];
    let imageUrl = enclosure?.getAttribute('url') || undefined;
    if (!imageUrl) {
      const mediaContent = item.getElementsByTagName('media:content')[0];
      imageUrl = mediaContent?.getAttribute('url') || undefined;
    }
    if (!imageUrl) {
      const mediaThumb = item.getElementsByTagName('media:thumbnail')[0];
      imageUrl = mediaThumb?.getAttribute('url') || undefined;
    }
    const timestamp = pubDate ? new Date(pubDate).getTime() : 0;

    const alert: Alert = {
      id: `${sourceLabel}-${pubDate || 'sin-fecha'}-${index}`,
      source,
      author,
      sourceId,
      content: title,
      time: toTimeDisplay(pubDate),
      type: 'noticia',
      timestamp: Number.isNaN(timestamp) ? 0 : timestamp,
      link: link || undefined,
      imageUrl,
    };
    return alert;
    })
    .filter((a) => !isBlockedNews(a.content));
};

export function NewsAlertsModule() {
  const [alerts, setAlerts] = useState<Alert[]>(PLACEHOLDER_ALERTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(DEFAULT_SELECTED_IDS);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hasLoadedOnceRef = useRef(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [dropdownOpen]);

  const toggleSource = (id: string) => {
    setSelectedSourceIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      return next.length > 0 ? next : DEFAULT_SELECTED_IDS;
    });
  };

  useEffect(() => {
    const fetchAlerts = async () => {
      if (selectedSourceIds.length === 0) {
        setAlerts(PLACEHOLDER_ALERTS);
        setLoading(false);
        return;
      }
      try {
        if (!hasLoadedOnceRef.current) setLoading(true);
        const allAlerts: Alert[] = [];
        for (const id of selectedSourceIds) {
          const source = NEWS_SOURCES.find((s) => s.id === id);
          if (!source) continue;
          try {
            const res = await fetch(source.url, {
              headers: {
                Accept: 'application/rss+xml, application/xml, text/xml',
              },
            });
            if (!res.ok) continue;
            const rssXml = await res.text();
            const rssAlerts = parseRssToAlerts(rssXml, source.label, source.id);
            allAlerts.push(...rssAlerts);
          } catch (e) {
            console.warn(`News feed ${source.label} failed`, e);
          }
        }
        const withImage = allAlerts.filter(
          (a) => !isBlockedNews(a.content) && a.imageUrl && toProxyImageUrl(a.imageUrl)
        );
        if (withImage.length > 0) {
          hasLoadedOnceRef.current = true;
          const byDate = [...withImage].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
          setAlerts(byDate.slice(0, 10));
          setError(null);
        } else {
          setAlerts(PLACEHOLDER_ALERTS);
          setError('Ninguna noticia con imagen. Mostrando placeholders.');
        }
      } catch (err) {
        console.error("Error fetching news alerts:", err);
        setAlerts(PLACEHOLDER_ALERTS);
        setError("No se pudo cargar RSS. Mostrando placeholders.");
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, [selectedSourceIds]);

  const items = alerts;
  const maxIndex = Math.max(0, items.length - 1);

  const goTo = useCallback((index: number, dir: 'next' | 'prev') => {
    setDirection(dir);
    setCarouselIndex((i) => {
      if (items.length <= 1) return 0;
      let next = index;
      if (next < 0) next = maxIndex;
      if (next > maxIndex) next = 0;
      return next;
    });
  }, [items.length, maxIndex]);

  useEffect(() => {
    if (items.length <= 1) return;
    if (isHovered) return;
    const t = setInterval(() => goTo(carouselIndex + 1, 'next'), CAROUSEL_AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [carouselIndex, items.length, goTo, isHovered]);

  const getAlertIcon = (alert: Alert) => {
    switch (alert.type) {
      case 'tweet': return <Twitter size={12} className="text-[#00ff41] shrink-0" />;
      case 'paro': return <AlertOctagon size={12} className="text-red-500 shrink-0" />;
      case 'noticia': {
        const src = alert.sourceId ? NEWS_SOURCES.find((s) => s.id === alert.sourceId) : null;
        if (src?.favicon) {
          return (
            <img src={src.favicon} alt="" className="w-3 h-3 shrink-0 object-contain" />
          );
        }
        return <Rss size={12} className="text-amber-400 shrink-0" />;
      }
      default: return <MessageSquareWarning size={12} className="shrink-0" />;
    }
  };

  const getSourceDisplayName = (alert: Alert): string => {
    if (alert.sourceId) {
      const s = NEWS_SOURCES.find((x) => x.id === alert.sourceId);
      if (s) return s.displayName;
    }
    return alert.author;
  };

  return (
    <div
      className="border border-[#00ff41]/30 bg-[#020a02]/80 p-4 rounded-sm relative overflow-hidden h-full flex flex-col group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00ff41] to-transparent opacity-50"></div>
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#00ff41]/50"></div>
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#00ff41]/50"></div>
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#00ff41]/50"></div>
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#00ff41]/50"></div>

      <div className="flex flex-wrap items-center gap-2 mb-2 border-b border-[#008f11]/50 pb-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <MessageSquareWarning size={18} />
          [NOTICIAS]
        </h2>
        <div className="relative ml-auto" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-1 border border-[#00ff41]/40 bg-[#020a02] text-[#00ff41] text-[10px] font-mono uppercase tracking-widest rounded-sm px-2 py-1.5 hover:border-[#00ff41]/60 focus:outline-none focus:border-[#00ff41]/70"
            aria-label="Seleccionar fuentes"
            aria-expanded={dropdownOpen}
          >
            FUENTES
            <ChevronDown size={12} className={`shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 z-10 min-w-[160px] border border-[#00ff41]/40 bg-[#020a02] rounded-sm shadow-lg py-1">
              {NEWS_SOURCES.map((s) => (
                <label
                  key={s.id}
                  className="flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-[#00ff41]/10 text-[#00ff41] text-[10px] font-mono"
                >
                  <input
                    type="checkbox"
                    checked={selectedSourceIds.includes(s.id)}
                    onChange={() => toggleSource(s.id)}
                    className="rounded border-[#008f11] bg-[#020a02] text-[#00ff41] focus:ring-[#00ff41]/50"
                  />
                  {s.displayName}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      {error && (
        <div className="mb-2 border border-amber-500/40 bg-amber-500/10 text-amber-300 text-[10px] px-2 py-1 rounded-sm font-mono">
          {error}
        </div>
      )}

      {/* Carousel */}
      <div className="mt-2 flex-1 min-h-0 flex flex-col relative">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.1)_50%,transparent_100%)] pointer-events-none animate-[scanline_4s_ease-in-out_infinite] rounded-sm" aria-hidden />
        {loading ? (
          <div className="flex flex-col gap-2 flex-1">
            <div className="h-24 border border-[#008f11]/30 bg-[#008f11]/10 animate-pulse rounded-sm flex items-center justify-center text-[#008f11] text-xs font-mono">
              CARGANDO FEED...
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex-1 border border-[#008f11]/30 bg-black/40 rounded-sm flex flex-col items-center justify-center text-[#008f11] text-center p-4">
            <Radio size={28} className="mb-2 opacity-60 animate-[live-pulse_2s_ease-in-out_infinite]" />
            <p className="text-xs font-mono uppercase tracking-wider">En espera de datos</p>
            <p className="text-[10px] opacity-70 mt-1">Configure el mapeo de API en el código.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-hidden rounded-sm border border-[#00ff41]/25 bg-black/40 relative">
              <div
                key={carouselIndex}
                className={`absolute inset-0 p-3 flex flex-col justify-between ${
                  direction === 'next'
                    ? 'animate-[carousel-enter-right_0.35s_ease-out]'
                    : 'animate-[carousel-exit-left_0.35s_ease-out]'
                }`}
              >
                <div className="flex items-start justify-between gap-2 border-b border-[#00ff41]/20 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {getAlertIcon(items[carouselIndex])}
                    <span className={`text-[10px] font-mono uppercase tracking-wider truncate ${items[carouselIndex].type === 'paro' ? 'text-red-500' : 'text-[#008f11]'}`}>
                      {getSourceDisplayName(items[carouselIndex])}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#008f11] tabular-nums shrink-0">
                    {items[carouselIndex].time}
                  </span>
                </div>
                {items[carouselIndex].link ? (
                  <a
                    href={items[carouselIndex].link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col gap-1.5 mt-2 min-w-0 group flex-1 min-h-0"
                  >
                    {items[carouselIndex].imageUrl && toProxyImageUrl(items[carouselIndex].imageUrl) && (
                      <div className="w-full h-36 flex-shrink-0 rounded-sm border border-[#00ff41]/20 overflow-hidden bg-black/40 group-hover:border-[#00ff41]/50 transition-colors">
                        <img
                          src={toProxyImageUrl(items[carouselIndex].imageUrl)!}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <p className={`text-sm font-semibold leading-snug flex-shrink-0 ${items[carouselIndex].type === 'paro' ? 'text-red-400' : 'text-[#00ff41]/95'} group-hover:underline`}>
                      {items[carouselIndex].content}
                    </p>
                  </a>
                ) : (
                  <>
                    {items[carouselIndex].imageUrl && toProxyImageUrl(items[carouselIndex].imageUrl) && (
                      <div className="w-full h-36 flex-shrink-0 rounded-sm border border-[#00ff41]/20 overflow-hidden bg-black/40 mt-2">
                        <img
                          src={toProxyImageUrl(items[carouselIndex].imageUrl)!}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <p className={`text-sm font-semibold leading-snug mt-2 flex-shrink-0 ${items[carouselIndex].type === 'paro' ? 'text-red-400' : 'text-[#00ff41]/95'}`}>
                      {items[carouselIndex].content}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-2 gap-2">
              <button
                type="button"
                onClick={() => goTo(carouselIndex - 1, 'prev')}
                className="p-1.5 border border-[#008f11]/40 rounded-sm hover:border-[#00ff41]/60 hover:text-[#00ff41] hover:bg-[#00ff41]/5 transition-colors text-[#008f11] disabled:opacity-40 disabled:pointer-events-none"
                disabled={items.length <= 1}
                aria-label="Anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="flex gap-1">
                {items.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => goTo(i, i > carouselIndex ? 'next' : 'prev')}
                    className={`w-2 h-2 rounded-full transition-all ${i === carouselIndex ? 'bg-[#00ff41] shadow-[0_0_8px_2px_rgba(0,255,65,0.4)] scale-110' : 'bg-[#008f11]/40 hover:bg-[#008f11]/70'}`}
                    aria-label={`Ir a noticia ${i + 1}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => goTo(carouselIndex + 1, 'next')}
                className="p-1.5 border border-[#008f11]/40 rounded-sm hover:border-[#00ff41]/60 hover:text-[#00ff41] hover:bg-[#00ff41]/5 transition-colors text-[#008f11] disabled:opacity-40 disabled:pointer-events-none"
                disabled={items.length <= 1}
                aria-label="Siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
