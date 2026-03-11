/**
 * API proxy: in dev we use Vite proxy (/api-dolar, etc.); in production we use Vercel serverless (/api/proxy/dolar/...).
 */
export const API_PROXY_BASE = '/api/proxy';

export function apiProxyPath(service: string, path: string): string {
  const p = path.replace(/^\//, '');
  if (import.meta.env.PROD) {
    return p ? `${API_PROXY_BASE}/${service}/${p}` : `${API_PROXY_BASE}/${service}`;
  }
  return p ? `/api-${service}/${p}` : `/api-${service}`;
}
