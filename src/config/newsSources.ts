import { apiProxyPath } from './api';

export interface NewsSource {
  id: string;
  label: string;
  /** Nombre corto con tildes para mostrar en la tarjeta (Crónica, Olé, Clarín, etc.) */
  displayName: string;
  url: string;
  /** Ruta al favicon (proxied) */
  favicon: string;
}
export const NEWS_SOURCES: NewsSource[] = [
  { id: 'cronica', label: 'Diario Crónica', displayName: 'Crónica', url: apiProxyPath('rss', 'noticias'), favicon: apiProxyPath('favicon-cronica', 'favicon.ico') },
  { id: 'ole', label: 'Olé', displayName: 'Olé', url: apiProxyPath('rss-ole', 'rss/ultimas-noticias/'), favicon: apiProxyPath('favicon-ole', 'favicon.ico') },
  { id: 'clarin', label: 'Clarín', displayName: 'Clarín', url: apiProxyPath('rss-clarin', 'rss/lo-ultimo/'), favicon: apiProxyPath('favicon-clarin', 'favicon.ico') },
  { id: 'lanacion', label: 'La Nación', displayName: 'La Nación', url: apiProxyPath('rss-lanacion', 'arc/outboundfeeds/rss/?outputType=xml'), favicon: apiProxyPath('favicon-lanacion', 'favicon.ico') },
  { id: 'perfil', label: 'Perfil (Economía)', displayName: 'Perfil', url: apiProxyPath('rss-perfil', 'feed/economia'), favicon: apiProxyPath('favicon-perfil', 'favicon.ico') },
  { id: 'pagina12', label: 'Página/12', displayName: 'Página12', url: apiProxyPath('rss-pagina12', 'rss/portada/'), favicon: apiProxyPath('favicon-pagina12', 'favicon.ico') },
];

/** Convert absolute image URL from RSS to our proxy path (avoids hotlinking). */
export function toProxyImageUrl(url: string | undefined): string | undefined {
  if (!url || !url.startsWith('http')) return undefined;
  try {
    const u = new URL(url);
    const path = (u.pathname + u.search).replace(/^\//, '');
    if (u.hostname.includes('clarin.com')) return apiProxyPath('news-img-clarin', path);
    if (u.hostname.includes('ole.com.ar')) return apiProxyPath('news-img-ole', path);
    if (u.hostname.includes('diariocronica.com.ar')) return apiProxyPath('news-img-cronica', path);
    if (u.hostname.includes('lanacion.com.ar')) return apiProxyPath('news-img-lanacion', path);
    if (u.hostname.includes('glanacion.com')) return apiProxyPath('news-img-glanacion', path);
    if (u.hostname.includes('perfil.com')) return apiProxyPath('news-img-perfil', path);
    if (u.hostname.includes('pagina12.com.ar')) return apiProxyPath('news-img-pagina12', path);
    if (u.hostname.includes('cdn.pagina12.com.ar')) return apiProxyPath('news-img-pagina12-cdn', path);
  } catch {
    return undefined;
  }
  return undefined;
}

export function shuffleArray<T>(array: T[]): T[] {
  const out = [...array];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
