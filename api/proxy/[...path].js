/**
 * Serverless proxy for external APIs. Request: GET /api/proxy/:service/:path...
 * Example: /api/proxy/dolar/v1/dolares -> https://dolarapi.com/v1/dolares
 */

const TARGETS = {
  dolar: { base: 'https://dolarapi.com', prefix: '' },
  coingecko: { base: 'https://api.coingecko.com', prefix: '' },
  'coingecko-icons': { base: 'https://coin-images.coingecko.com', prefix: '' },
  'coingecko-assets': { base: 'https://assets.coingecko.com', prefix: '' },
  caba: { base: 'https://apitransporte.buenosaires.gob.ar', prefix: '' },
  'news-img-clarin': { base: 'https://www.clarin.com', prefix: '' },
  'news-img-ole': { base: 'https://www.ole.com.ar', prefix: '' },
  'news-img-cronica': { base: 'https://www.diariocronica.com.ar', prefix: '' },
  'news-img-lanacion': { base: 'https://www.lanacion.com.ar', prefix: '' },
  'news-img-glanacion': { base: 'https://resizer.glanacion.com', prefix: '' },
  'news-img-perfil': { base: 'https://www.perfil.com', prefix: '' },
  'news-img-pagina12-cdn': { base: 'https://cdn.pagina12.com.ar', prefix: '' },
  'news-img-pagina12': { base: 'https://www.pagina12.com.ar', prefix: '' },
  'rss-ole': { base: 'https://www.ole.com.ar', prefix: '' },
  'rss-clarin': { base: 'https://www.clarin.com', prefix: '' },
  'rss-lanacion': { base: 'https://www.lanacion.com.ar', prefix: '' },
  'rss-perfil': { base: 'https://www.perfil.com', prefix: '' },
  'rss-pagina12': { base: 'https://www.pagina12.com.ar', prefix: '' },
  rss: { base: 'https://www.diariocronica.com.ar', prefix: 'rss' },
  'favicon-cronica': { base: 'https://www.diariocronica.com.ar', prefix: '' },
  'favicon-ole': { base: 'https://www.ole.com.ar', prefix: '' },
  'favicon-clarin': { base: 'https://www.clarin.com', prefix: '' },
  'favicon-lanacion': { base: 'https://www.lanacion.com.ar', prefix: '' },
  'favicon-perfil': { base: 'https://www.perfil.com', prefix: '' },
  'favicon-pagina12': { base: 'https://www.pagina12.com.ar', prefix: '' },
};

function buildTargetUrl(service, pathSegments, search) {
  const target = TARGETS[service];
  if (!target) return null;
  const path = pathSegments.length ? pathSegments.join('/') : '';
  const suffix = target.prefix ? `${target.prefix}/${path}` : path;
  const pathname = suffix ? `/${suffix}` : '';
  return `${target.base}${pathname}${search || ''}`;
}

export default async function handler(req, res) {
  const pathParam = req.query.path;
  const pathSegments = Array.isArray(pathParam)
    ? pathParam
    : typeof pathParam === 'string'
      ? pathParam.split('/').filter(Boolean)
      : [];
  const service = pathSegments[0];
  const rest = pathSegments.slice(1);
  const search = (req.url && req.url.includes('?') ? '?' + req.url.split('?')[1] : '') || '';

  if (!service || !TARGETS[service]) {
    res.status(404).json({ error: 'Unknown proxy service', service: service || null });
    return;
  }

  const targetUrl = buildTargetUrl(service, rest, search);
  if (!targetUrl) {
    res.status(500).end();
    return;
  }

  try {
    const headers = {};
    if (req.headers['accept']) headers['Accept'] = req.headers['accept'];
    if (req.headers['user-agent']) headers['User-Agent'] = req.headers['user-agent'];
    const fetchRes = await fetch(targetUrl, { headers });
    const contentType = fetchRes.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    if (fetchRes.headers.get('cache-control')) res.setHeader('Cache-Control', fetchRes.headers.get('cache-control'));
    res.status(fetchRes.status);
    const body = await fetchRes.arrayBuffer();
    res.end(Buffer.from(body));
  } catch (err) {
    console.error('Proxy error:', err.message);
    res.status(502).json({ error: 'Proxy fetch failed' });
  }
}
