import React, { useState, useEffect } from 'react';
import { Cloud, CloudRain, Sun, Wind, Droplets, AlertTriangle } from 'lucide-react';
import { useFetch } from '../hooks/useFetch';
import type { OpenMeteoResponse, WeatherData } from '../types/weather';

const DEFAULT_COORDS = { lat: -34.6037, lon: -58.3816 };

function parseWeatherResponse(data: OpenMeteoResponse): WeatherData {
  const c = data.current_weather;
  const h = data.hourly?.relative_humidity_2m;
  return {
    temperature: c.temperature,
    windspeed: c.windspeed,
    weathercode: c.weathercode,
    humidity: h?.[0] ?? 60,
  };
}

export function WeatherModule() {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setCoords(DEFAULT_COORDS);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setCoords(DEFAULT_COORDS)
    );
  }, []);

  const { data: weather, loading, error } = useFetch<WeatherData>(
    async () => {
      const { lat, lon } = coords ?? DEFAULT_COORDS;
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relative_humidity_2m`
      );
      if (!res.ok) throw new Error('Weather API error');
      const json: OpenMeteoResponse = await res.json();
      return parseWeatherResponse(json);
    },
    [coords?.lat, coords?.lon],
    { enabled: coords !== null }
  );

  const getWeatherIcon = (code: number) => {
    if (code <= 3) return <Sun className="text-[#00ff41]" size={48} />;
    if (code >= 50 && code <= 69) return <CloudRain className="text-[#00ff41]" size={48} />;
    if (code >= 95) return <AlertTriangle className="text-red-500" size={48} />;
    return <Cloud className="text-[#00ff41]" size={48} />;
  };

  const getWeatherDesc = (code: number) => {
    if (code === 0) return 'DESPEJADO';
    if (code <= 3) return 'PARCIALMENTE NUBLADO';
    if (code >= 50 && code <= 69) return 'LLUVIA LIGERA';
    if (code >= 80 && code <= 82) return 'CHUBASCOS';
    if (code >= 95) return 'TORMENTA ELÉCTRICA';
    return 'NUBLADO';
  };

  return (
    <div className="border border-[#00ff41]/30 bg-[#020a02]/80 p-4 rounded-sm relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00ff41] to-transparent opacity-50"></div>
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#00ff41]/50"></div>
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#00ff41]/50"></div>
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#00ff41]/50"></div>
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#00ff41]/50"></div>

      <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-[#008f11]/50 pb-2">
        <Cloud size={18} />
        [MODULO_CLIMA]
      </h2>

      {loading ? (
        <div className="animate-pulse text-[#008f11]">CARGANDO DATOS ATMOSFÉRICOS...</div>
      ) : error ? (
        <div className="text-red-500">ERROR DE CONEXIÓN AL SATÉLITE</div>
      ) : weather ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getWeatherIcon(weather.weathercode)}
              <div>
                <div className="text-4xl font-bold">{weather.temperature}°C</div>
                <div className="text-sm text-[#008f11]">{getWeatherDesc(weather.weathercode)}</div>
              </div>
            </div>
            {weather.weathercode >= 95 && (
              <div className="animate-pulse bg-red-900/30 text-red-500 border border-red-500 px-2 py-1 text-xs font-bold flex items-center gap-1">
                <AlertTriangle size={12} />
                ALERTA SMN
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm mt-2">
            <div className="flex items-center gap-2 border border-[#008f11]/30 p-2">
              <Wind size={14} className="text-[#008f11]" />
              <span>VIENTO: {weather.windspeed} km/h</span>
            </div>
            <div className="flex items-center gap-2 border border-[#008f11]/30 p-2">
              <Droplets size={14} className="text-[#008f11]" />
              <span>HUMEDAD: {weather.humidity}%</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
