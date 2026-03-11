import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api-dolar': {
          target: 'https://dolarapi.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-dolar/, '')
        },
        // Coin icons (avoid CORS blocking)
        '/api-coingecko-icons': {
          target: 'https://coin-images.coingecko.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-coingecko-icons/, '')
        },
        '/api-coingecko-assets': {
          target: 'https://assets.coingecko.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-coingecko-assets/, '')
        },
        // Must come after -icons / -assets (prefix match)
        '/api-coingecko': {
          target: 'https://api.coingecko.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-coingecko/, '')
        },
        '/api-caba': {
          target: 'https://apitransporte.buenosaires.gob.ar',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-caba/, '')
        },
        // Image proxies for news (avoid hotlinking)
        '/api-news-img-clarin': {
          target: 'https://www.clarin.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-news-img-clarin/, '')
        },
        '/api-news-img-ole': {
          target: 'https://www.ole.com.ar',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-news-img-ole/, '')
        },
        '/api-news-img-cronica': {
          target: 'https://www.diariocronica.com.ar',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-news-img-cronica/, '')
        },
        '/api-news-img-lanacion': {
          target: 'https://www.lanacion.com.ar',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-news-img-lanacion/, '')
        },
        '/api-news-img-glanacion': {
          target: 'https://resizer.glanacion.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-news-img-glanacion/, '')
        },
        '/api-news-img-perfil': {
          target: 'https://www.perfil.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-news-img-perfil/, '')
        },
        '/api-news-img-pagina12': {
          target: 'https://www.pagina12.com.ar',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-news-img-pagina12/, '')
        },
        '/api-news-img-pagina12-cdn': {
          target: 'https://cdn.pagina12.com.ar',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-news-img-pagina12-cdn/, '')
        },
        // More specific first so they don't get caught by /api-rss
        '/api-rss-ole': {
          target: 'https://www.ole.com.ar',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-rss-ole/, '')
        },
        '/api-rss-clarin': {
          target: 'https://www.clarin.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-rss-clarin/, '')
        },
        '/api-rss-lanacion': {
          target: 'https://www.lanacion.com.ar',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-rss-lanacion/, '')
        },
        '/api-rss-perfil': {
          target: 'https://www.perfil.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-rss-perfil/, '')
        },
        '/api-rss-pagina12': {
          target: 'https://www.pagina12.com.ar',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-rss-pagina12/, '')
        },
        '/api-rss': {
          target: 'https://www.diariocronica.com.ar',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-rss/, '/rss')
        },
        // Favicon proxies (for news source icons)
        '/api-favicon-cronica': {
          target: 'https://www.diariocronica.com.ar',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-favicon-cronica/, '')
        },
        '/api-favicon-ole': {
          target: 'https://www.ole.com.ar',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-favicon-ole/, '')
        },
        '/api-favicon-clarin': {
          target: 'https://www.clarin.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-favicon-clarin/, '')
        },
        '/api-favicon-lanacion': {
          target: 'https://www.lanacion.com.ar',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-favicon-lanacion/, '')
        },
        '/api-favicon-perfil': {
          target: 'https://www.perfil.com',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-favicon-perfil/, '')
        },
        '/api-favicon-pagina12': {
          target: 'https://www.pagina12.com.ar',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api-favicon-pagina12/, '')
        }
      }
    },
  };
});
