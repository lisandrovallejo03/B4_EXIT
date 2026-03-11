/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { CryptoTicker, type CryptoTickerItem } from './components/CryptoTicker';
import { WeatherModule } from './components/WeatherModule';
import { TransportModule } from './components/TransportModule';
import { TrafficModule } from './components/TrafficModule';
import { DolarModule } from './components/DolarModule';
import { NewsAlertsModule } from './components/NewsAlertsModule';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Minesweeper } from './components/Minesweeper';
import { apiProxyPath } from './config/api';

const CPU_CLICKS_TO_ACTIVATE = 3;
const CPU_CLICK_RESET_MS = 1500;
const DASHBOARD_EXIT_MS = 450;

const CRYPTO_PLACEHOLDER: CryptoTickerItem[] = [
  { symbol: 'BTC', priceUsd: 0, changePct24h: null },
  { symbol: 'ETH', priceUsd: 0, changePct24h: null },
  { symbol: 'SOL', priceUsd: 0, changePct24h: null },
  { symbol: 'XRP', priceUsd: 0, changePct24h: null },
  { symbol: 'BNB', priceUsd: 0, changePct24h: null },
];

function toProxyCoinIconUrl(url: string | undefined): string | undefined {
  if (!url || !url.startsWith('http')) return undefined;
  try {
    const u = new URL(url);
    const path = (u.pathname + u.search).replace(/^\//, '');
    if (u.hostname === 'coin-images.coingecko.com') return apiProxyPath('coingecko-icons', path);
    if (u.hostname === 'assets.coingecko.com') return apiProxyPath('coingecko-assets', path);
  } catch {
    return undefined;
  }
  return undefined;
}

export default function App() {
  const [tickerItems, setTickerItems] = useState<CryptoTickerItem[]>(CRYPTO_PLACEHOLDER);
  const [minesweeperActive, setMinesweeperActive] = useState(false);
  const [dashboardVisible, setDashboardVisible] = useState(true);
  const [cpuClicks, setCpuClicks] = useState(0);
  const cpuResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onCpuClick = useCallback(() => {
    if (cpuResetRef.current) {
      clearTimeout(cpuResetRef.current);
      cpuResetRef.current = null;
    }
    setCpuClicks((prev) => {
      const next = prev + 1;
      if (next >= CPU_CLICKS_TO_ACTIVATE) {
        setDashboardVisible(false);
        setTimeout(() => {
          setMinesweeperActive(true);
          setCpuClicks(0);
        }, DASHBOARD_EXIT_MS);
        return 0;
      }
      cpuResetRef.current = setTimeout(() => setCpuClicks(0), CPU_CLICK_RESET_MS);
      return next;
    });
  }, []);

  useEffect(() => {
    console.log('Hint: click the system;)');
    return () => {
      if (cpuResetRef.current) clearTimeout(cpuResetRef.current);
    };
  }, []);

  const onMinesweeperEnd = useCallback(() => {
    setMinesweeperActive(false);
    setDashboardVisible(true);
  }, []);

  const fetchTicker = useCallback(async () => {
    try {
      const url = `${apiProxyPath('coingecko', 'api/v3/coins/markets')}?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&price_change_percentage=24h`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return;
      const data = (await res.json()) as Array<{
        id?: string;
        name?: string;
        symbol?: string;
        image?: string;
        current_price?: number;
        price_change_percentage_24h?: number | null;
      }>;
      const mapped: CryptoTickerItem[] = data
        .map((c) => ({
          id: c.id,
          name: c.name,
          symbol: (c.symbol || '').toUpperCase(),
          iconUrl: toProxyCoinIconUrl(c.image) ?? c.image,
          priceUsd: typeof c.current_price === 'number' ? c.current_price : 0,
          changePct24h: typeof c.price_change_percentage_24h === 'number' ? c.price_change_percentage_24h : null,
        }))
        .filter((x) => x.symbol && x.symbol !== 'USDT' && x.symbol !== 'USDC');
      if (mapped.length > 0) setTickerItems(mapped);
    } catch (e) {
      console.warn('CoinGecko ticker failed', e);
    }
  }, []);

  useEffect(() => {
    fetchTicker();
    const interval = setInterval(fetchTicker, 60000);
    return () => clearInterval(interval);
  }, [fetchTicker]);

  return (
    <div className="h-screen p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-6">
      <div
        className={`flex flex-col flex-1 min-h-0 transition-all ease-out ${
          dashboardVisible ? '' : 'dashboard-exit pointer-events-none'
        }`}
        style={{ transitionDuration: `${DASHBOARD_EXIT_MS}ms` }}
      >
        <div className="flex flex-col gap-1 flex-shrink-0 dashboard-exit-up transition-all" style={{ transitionDuration: `${DASHBOARD_EXIT_MS}ms` }}>
          <CryptoTicker items={tickerItems} />
          <Header onCpuClick={onCpuClick} />
        </div>
        <ErrorBoundary>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow overflow-hidden min-h-0 transition-all" style={{ transitionDuration: `${DASHBOARD_EXIT_MS}ms` }}>
            <div className="flex flex-col gap-6 lg:col-span-1 min-h-0 dashboard-exit-left transition-all" style={{ transitionDuration: `${DASHBOARD_EXIT_MS}ms` }}>
              <WeatherModule />
              <div className="flex-grow min-h-0">
                <NewsAlertsModule />
              </div>
            </div>
            <div className="lg:col-span-1 h-full min-h-0 dashboard-exit-up transition-all" style={{ transitionDuration: `${DASHBOARD_EXIT_MS}ms` }}>
              <TransportModule />
            </div>
            <div className="flex flex-col gap-6 lg:col-span-1 min-h-0 dashboard-exit-right transition-all" style={{ transitionDuration: `${DASHBOARD_EXIT_MS}ms` }}>
              <DolarModule />
              <TrafficModule />
            </div>
          </div>
        </ErrorBoundary>
        <footer className="mt-8 border-t border-[#00ff41]/30 pt-4 text-center text-xs text-[#008f11] flex justify-between items-center dashboard-exit-footer transition-all" style={{ transitionDuration: `${DASHBOARD_EXIT_MS}ms` }}>
          <div className="flex items-center gap-1.5">
            <span>B4_EXIT v1.0.4</span>
          </div>
          <div className="flex gap-4">
            <span>SEC: ENCRYPTED</span>
            <span>LINK: STABLE</span>
          </div>
        </footer>
      </div>
      {minesweeperActive && <Minesweeper onGameEnd={onMinesweeperEnd} />}
    </div>
  );
}
