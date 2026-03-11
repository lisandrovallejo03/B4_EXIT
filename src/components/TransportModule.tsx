import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Train, Bus, AlertCircle, CheckCircle2, Clock, Link2Off, MapPin, Info } from 'lucide-react';
import Papa from 'papaparse';
import type {
  CabaFeedResponse,
  CabaEntity,
  CabaAlertsResponse,
  CabaAlertEntity,
} from '../types/transport';
import { apiProxyPath } from '../config/api';

interface TransportStatus {
  id: string;
  name: string;
  subtitle?: string;
  type: 'subte' | 'tren' | 'colectivo';
  status: 'normal' | 'demora' | 'interrumpido';
  message?: string;
  bearing?: number; // degrees
  occupancyStatus?: number;
}

type TooltipPos = { top: number; left: number };

function getOccupancyText(status: number): string {
  switch(status) {
    case 0: return 'Vacío';
    case 1: return 'Muchos asientos';
    case 2: return 'Pocos asientos';
    case 3: return 'Solo de pie';
    case 4: return 'Apretados';
    case 5: return 'Lleno';
    case 6: return 'No acepta pasajeros';
    case 7: return 'Sin datos';
    case 8: return 'No abordable';
    default: return 'Desconocido';
  }
}

function getOccupancyColor(status: number): string {
  if (status === 6 || status === 8) return 'text-red-500';
  if (status === 0) return 'text-green-500';
  switch(status) {
    case 1: return 'text-green-500';
    case 2: return 'text-green-400';
    case 3: return 'text-yellow-400';
    case 4: return 'text-orange-400';
    case 5: return 'text-orange-600';
    case 7:
    default: return 'text-gray-500';
  }
}

// Fórmula de Haversine para calcular distancia en KM entre dos coordenadas
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const DEFAULT_USER_LOC = { lat: -34.6037, lon: -58.3816 }; // CABA fallback si geolocalización se niega o falla

export function TransportModule() {
  const [data, setData] = useState<TransportStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLoc, setUserLoc] = useState<{lat: number, lon: number} | null>(null);
  const [routeMap, setRouteMap] = useState<Record<string, { shortName: string; longName: string }>>({});
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [radiusKm, setRadiusKm] = useState<number>(1.0);
  const [radiusOpen, setRadiusOpen] = useState<boolean>(false);
  const [showOverlay, setShowOverlay] = useState<boolean>(true);

  // 0. Cargar routes.txt liviano desde /public (subset curado)
  useEffect(() => {
    Papa.parse('/routes.txt', {
      download: true,
      header: true,
      complete: (results) => {
        const rMap: Record<string, { shortName: string; longName: string }> = {};
        (results.data as any[]).forEach((row: any) => {
          if (row.route_id) {
            rMap[row.route_id] = {
              shortName: row.route_short_name || 'Desconocida',
              longName: row.route_desc || row.route_long_name || ''
            };
          }
        });
        setRouteMap(rMap);
        setIsMapLoaded(true);
      },
      error: (err) => {
        console.warn("No se pudo cargar routes.txt", err);
        setIsMapLoaded(true);
      }
    });
  }, []);

  // 1. Obtener la ubicación del usuario (geolocalización del navegador)
  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLoc(DEFAULT_USER_LOC);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLoc({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      () => setUserLoc(DEFAULT_USER_LOC)
    );
  }, []);

  // 2. Fetch de datos de la API de CABA
  useEffect(() => {
    if (!userLoc || !isMapLoaded) return; // Esperar a tener la ubicación y el mapa de rutas

    const fetchData = async (opts?: { showOverlay?: boolean }) => {
      try {
        if (opts?.showOverlay) {
          setShowOverlay(true);
        }
        setLoading(true);
        const results: TransportStatus[] = [];

        const cabaApiUrl = import.meta.env.VITE_CABA_API_URL || apiProxyPath('caba', '');
        const clientId = import.meta.env.VITE_CABA_CLIENT_ID;
        const clientSecret = import.meta.env.VITE_CABA_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
          setError("CREDENCIALES DE API CABA NO DETECTADAS (CLIENT_ID / CLIENT_SECRET)");
          setLoading(false);
          return;
        }

        const authParams = `client_id=${clientId}&client_secret=${clientSecret}`;

        // ========================================================================
        // A. Fetch Colectivos - Service Alerts (para estado de líneas)
        // ========================================================================
        const routeAlertStatus: Record<string, 'normal' | 'demora' | 'interrumpido'> = {};
        const routeAlertMessage: Record<string, string> = {};
        try {
          const alertsRes = await fetch(`${cabaApiUrl}/colectivos/serviceAlerts?${authParams}&json=1`);
          if (alertsRes.ok) {
            const alertsData: CabaAlertsResponse = await alertsRes.json();
            const alertEntities = alertsData.entity || alertsData._entity;
            if (alertEntities && Array.isArray(alertEntities)) {
              alertEntities.forEach((item: CabaAlertEntity) => {
                const alert = item.alert || item._alert;
                if (!alert) return;
                const informedEntity = alert.informed_entity || alert._informed_entity;
                const routeId = informedEntity?.[0]?.route_id || informedEntity?.[0]?._route_id;
                if (!routeId) return;

                const headerText = alert.header_text || alert._header_text;
                const text =
                  headerText?.translation?.[0]?.text ||
                  headerText?._translation?.[0]?._text ||
                  'Alerta de servicio';

                const effect = (alert.effect || alert._effect || '').toString().toUpperCase();
                let status: 'demora' | 'interrumpido' = 'demora';
                if (effect.includes('NO_SERVICE') || effect.includes('SUSPEND')) {
                  status = 'interrumpido';
                }

                routeAlertStatus[routeId] = status;
                routeAlertMessage[routeId] = text;
              });
            }
          }
        } catch (e) {
          console.warn("Fallo al obtener serviceAlerts de colectivos", e);
        }

        // ========================================================================
        // B. Fetch Colectivos (Vehicle Positions)
        // ========================================================================
        try {
          const colRes = await fetch(`${cabaApiUrl}/colectivos/vehiclePositions?${authParams}&json=1`);
          if (colRes.ok) {
            const colData: CabaFeedResponse = await colRes.json();
            const entities = colData.entity || colData._entity;
            
            if (entities && Array.isArray(entities)) {
              const lineFromEntity = (e: CabaEntity, rMap: Record<string, { shortName: string; longName: string }>): string | null => {
                const vehicle = e.vehicle || e._vehicle;
                const trip = vehicle?.trip || vehicle?._trip;
                const routeId = trip?.route_id ?? trip?._route_id;
                let short = '';
                if (routeId && rMap[routeId]) short = rMap[routeId].shortName;
                else {
                  const inner = vehicle?.vehicle || vehicle?._vehicle;
                  const label = inner?.label ?? inner?._label ?? '';
                  const parts = label.split('-');
                  if (parts.length > 1) short = parts[1];
                  else if (routeId) short = String(routeId);
                }
                const num = short.match(/\d+/)?.[0];
                return num ?? (short || null);
              };
              const inCabaSet = new Set<string>();
              entities.forEach((e: CabaEntity) => {
                const pos = (e.vehicle || e._vehicle)?.position || (e.vehicle || e._vehicle)?._position;
                const lat = pos?.latitude ?? pos?._latitude;
                const lon = pos?.longitude ?? pos?._longitude;
                if (lat == null || lon == null) return;
                if (lat >= -34.72 && lat <= -34.53 && lon >= -58.53 && lon <= -58.34) {
                  const line = lineFromEntity(e, routeMap);
                  if (line && !/^\d{4,}$/.test(line)) inCabaSet.add(line);
                }
              });

              const nearbyBuses = entities.filter((e: CabaEntity) => {
                const vehicle = e.vehicle || e._vehicle;
                if (!vehicle) return false;
                
                const position = vehicle.position || vehicle._position;
                if (!position) return false;
                
                const lat = position.latitude || position._latitude;
                const lon = position.longitude || position._longitude;
                
                if (!lat || !lon) return false;

                // Aproximación: limitar a un bounding box de CABA
                const inCaba =
                  lat >= -34.72 && lat <= -34.53 &&  // norte-sur aproximado
                  lon >= -58.53 && lon <= -58.34;    // oeste-este aproximado
                if (!inCaba) return false;

                const dist = getDistance(userLoc.lat, userLoc.lon, lat, lon);
                return dist <= radiusKm;
              });

              nearbyBuses.sort((a: CabaEntity, b: CabaEntity) => {
                const posA = (a.vehicle || a._vehicle)?.position || (a.vehicle || a._vehicle)?._position;
                const posB = (b.vehicle || b._vehicle)?.position || (b.vehicle || b._vehicle)?._position;
                
                const distA = getDistance(userLoc.lat, userLoc.lon, posA?.latitude || posA?._latitude, posA?.longitude || posA?._longitude);
                const distB = getDistance(userLoc.lat, userLoc.lon, posB?.latitude || posB?._latitude, posB?.longitude || posB?._longitude);
                return distA - distB;
              });

              let validBusesCount = 0;
              const seenLines = new Set<string>();

              for (const e of nearbyBuses) {
                if (validBusesCount >= 30) break; // Limitar a los 30 más cercanos válidos

                const vehicle = e.vehicle || e._vehicle;
                const position = vehicle.position || vehicle._position;
                const trip = vehicle.trip || vehicle._trip;
                
                const lat = position.latitude || position._latitude;
                const lon = position.longitude || position._longitude;
                const bearing = position.bearing || position._bearing;
                let occupancy = vehicle.occupancy_status ?? vehicle._occupancy_status;
                
                // La API de CABA devuelve 0 por defecto para todos los vehículos sin sensor.
                // Lo tratamos como 7 (Sin datos) para no mostrar "Vacío" falsamente.
                if (occupancy === 0) occupancy = 7;

                const dist = getDistance(userLoc.lat, userLoc.lon, lat, lon);
                
                let routeId = trip?.route_id || trip?._route_id;
                
                let shortName = 'Desconocida';
                let longName = '';

                // Mapear route_id a shortName/longName si existe en routes.txt
                if (routeId && routeMap[routeId]) {
                  shortName = routeMap[routeId].shortName;
                  longName = routeMap[routeId].longName || '';
                } else {
                  // Fallback: extraer línea del label del vehículo (ej: "4019-45" -> "45")
                  const innerVehicle = vehicle.vehicle || vehicle._vehicle;
                  const label = innerVehicle?.label || innerVehicle?._label || '';
                  const labelParts = label.split('-');
                  if (labelParts.length > 1) {
                    shortName = labelParts[1];
                    const possibleRoute = (Object.values(routeMap) as Array<{ shortName: string; longName: string }>).find((r) => {
                      const s = r.shortName ?? '';
                      return s === shortName || s.replace(/\D/g, '') === shortName;
                    });
                    if (possibleRoute) {
                      longName = possibleRoute.longName ?? '';
                    }
                  } else if (routeId) {
                    shortName = routeId;
                  }
                }

                // No mostrar colectivos sin descripción (longName)
                if (!longName || !longName.trim()) {
                  continue;
                }
                
                const hasNumbers = /\d/.test(shortName);
                const displayName = hasNumbers ? (shortName.match(/\d+/)?.[0] || '?') : shortName;
                
                // En CABA solo nos interesan líneas con hasta 3 dígitos
                if (/\d{4,}/.test(displayName)) {
                  continue;
                }

                if (shortName === 'Desconocida' || displayName === '?') {
                  continue;
                }

                // Evitar duplicados de la misma línea (displayName)
                if (seenLines.has(displayName)) {
                  continue;
                }
                seenLines.add(displayName);
                
                // Estado según serviceAlerts (si existe)
                let status: 'normal' | 'demora' | 'interrumpido' = 'normal';
                let message = `A ${dist.toFixed(2)} km de tu posición`;
                if (routeId && routeAlertStatus[routeId]) {
                  status = routeAlertStatus[routeId];
                  if (routeAlertMessage[routeId]) {
                    message = routeAlertMessage[routeId];
                  }
                }

                validBusesCount++;
                results.push({
                  id: (e.id ?? e._id) ?? '',
                  name: displayName,
                  subtitle: longName,
                  type: 'colectivo',
                  status,
                  message,
                  bearing: bearing,
                  occupancyStatus: occupancy
                });
              }

              const shownLines = results.filter((r) => r.type === 'colectivo').map((r) => r.name);
            }
          }
        } catch (e) {
          console.warn("Fallo al obtener datos de Colectivos", e);
        }

        // ========================================================================
        // B. Fetch Subtes
        // ========================================================================
        try {
          const subteRes = await fetch(`${cabaApiUrl}/subtes/serviceAlerts?${authParams}&json=1`);
          if (subteRes.ok) {
            const subteData: CabaAlertsResponse = await subteRes.json();
            const entities = subteData.entity || subteData._entity;
            
            if (entities && Array.isArray(entities)) {
              entities.forEach((item: CabaAlertEntity) => {
                const alert = item.alert || item._alert;
                if (!alert) return;
                
                const informedEntity = alert.informed_entity || alert._informed_entity;
                const routeId = informedEntity?.[0]?.route_id || informedEntity?.[0]?._route_id || 'Subte';
                
                const headerText = alert.header_text || alert._header_text;
                const text = headerText?.translation?.[0]?.text || headerText?._translation?.[0]?._text || 'Alerta de servicio';
                
                results.push({
                  id: item.id || item._id || `subte-${Math.random()}`,
                  name: routeId.replace('Linea', 'Línea '),
                  type: 'subte',
                  status: 'demora', // Las alertas suelen implicar demoras o interrupciones
                  message: text
                });
              });
            }
          }
        } catch (e) {
          console.warn("Fallo al obtener datos de Subtes", e);
        }

        setData(results);
        if (results.length === 0) {
          setError("CONEXIÓN ESTABLECIDA PERO NO SE ENCONTRARON VEHÍCULOS EN TU RADIO (1KM).");
        } else {
          setError(null);
        }
      } catch (err) {
        console.error("Error fetching transport data:", err);
        setError("ERROR DE CONEXIÓN A LOS SERVIDORES DE TRANSPORTE");
      } finally {
        setLoading(false);
        if (opts?.showOverlay) {
          setShowOverlay(false);
        }
      }
    };

    // Primera carga o cambio de radio: mostrar overlay
    fetchData({ showOverlay: true });
    // Refrescos automáticos: actualizar en segundo plano sin overlay
    const interval = setInterval(() => fetchData({ showOverlay: false }), 120000); // Actualizar cada 120s
    return () => clearInterval(interval);
  }, [userLoc, routeMap, isMapLoaded, radiusKm]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal': return <CheckCircle2 size={16} className="text-[#00ff41]" />;
      case 'demora': return <Clock size={16} className="text-yellow-500" />;
      case 'interrumpido': return <AlertCircle size={16} className="text-red-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-[#00ff41] border-[#00ff41]/30';
      case 'demora': return 'text-yellow-500 border-yellow-500/30';
      case 'interrumpido': return 'text-red-500 border-red-500/30';
      default: return 'text-gray-500 border-gray-500/30';
    }
  };

  const [showBusTip, setShowBusTip] = useState(false);
  const busTipAnchorRef = useRef<HTMLSpanElement>(null);

  const busTipPos: TooltipPos | null = useMemo(() => {
    if (!showBusTip) return null;
    const el = busTipAnchorRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      left: r.left + r.width / 2,
      top: r.top, // anchor top; tooltip renders above
    };
  }, [showBusTip]);

  const renderSection = (title: string, type: 'subte' | 'tren' | 'colectivo', icon: React.ReactNode) => {
    const items = data.filter(d => d.type === type);
    if (items.length === 0) return null;
    
    return (
      <div className="mb-6 last:mb-0">
        <h3 className="text-md font-bold mb-3 flex items-center gap-2 text-[#008f11]">
          {icon}
          {title}
          {type === 'colectivo' && (
            <>
              <span
                ref={busTipAnchorRef}
                className="ml-1 inline-flex"
                onMouseEnter={() => setShowBusTip(true)}
                onMouseLeave={() => setShowBusTip(false)}
              >
                <Info
                  size={14}
                  className="text-[#008f11] cursor-help shrink-0"
                  aria-label="Atención"
                />
              </span>

              {showBusTip && busTipPos && (
                <div
                  className="fixed z-[9999] w-72 p-3 text-left text-[11px] bg-[#020a02] border border-[#00ff41]/40 rounded-sm shadow-lg text-[#008f11]"
                  style={{
                    left: `${busTipPos.left}px`,
                    top: `${busTipPos.top}px`,
                    transform: 'translate(-50%, calc(-100% - 10px))',
                  }}
                  onMouseEnter={() => setShowBusTip(true)}
                  onMouseLeave={() => setShowBusTip(false)}
                  role="tooltip"
                >
                  <p className="font-semibold mb-1 text-[#00ff41]">ATENCION</p>
                  <p>
                    La ubicación de los colectivos se basa en datos de la API de Transporte de CABA.
                    La precisión de la posición y de los detalles asociados está sujeta a la calidad del feed oficial.
                  </p>
                </div>
              )}
            </>
          )}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {items.map(item => (
            <div key={item.id} className={`border p-2 flex flex-col gap-1 bg-black/50 ${getStatusColor(item.status)}`}>
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">{item.name}</span>
                <div className="flex items-center gap-1 text-xs uppercase">
                  {getStatusIcon(item.status)}
                  {item.status}
                </div>
              </div>
              {item.subtitle && (
                <div className="text-[10px] opacity-70 uppercase tracking-wider leading-tight">
                  {item.subtitle}
                </div>
              )}
              {item.occupancyStatus !== undefined && item.occupancyStatus !== 7 && (
                <div className={`text-[10px] font-bold mt-1 uppercase tracking-wider ${getOccupancyColor(item.occupancyStatus)}`}>
                  {getOccupancyText(item.occupancyStatus)}
                </div>
              )}
              {item.message && (
                <div className="text-xs opacity-80 mt-1 border-t border-current/20 pt-1">
                  &gt; {item.message}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="border border-red-500/30 bg-[#020a02]/80 p-4 rounded-sm relative overflow-hidden h-full flex flex-col group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50"></div>
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-red-500/50"></div>
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-red-500/50"></div>
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-red-500/50"></div>
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-red-500/50"></div>
        
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-red-500/50 pb-2 text-red-500">
          <Link2Off size={18} />
          [RED_TRANSPORTE_PUBLICO] - OFFLINE
        </h2>
        <div className="text-red-500 text-sm font-mono flex flex-col gap-2">
          <p>&gt; {error}</p>
          <p>&gt; CONFIGURE LAS VARIABLES EN SU ENTORNO (.env):</p>
          <ul className="list-disc pl-4 opacity-80">
            <li>VITE_CABA_CLIENT_ID</li>
            <li>VITE_CABA_CLIENT_SECRET</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-[#00ff41]/30 bg-[#020a02]/80 p-4 rounded-sm relative overflow-hidden h-full min-h-0 flex flex-col group">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00ff41] to-transparent opacity-50"></div>
      
      {/* Circuit board decorative corners */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#00ff41]/50"></div>
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#00ff41]/50"></div>
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#00ff41]/50"></div>
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#00ff41]/50"></div>
      
      <h2 className="text-lg font-bold mb-4 flex items-center justify-between border-b border-[#008f11]/50 pb-2 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Train size={18} />
          <span className="truncate">[RED_TRANSPORTE_PUBLICO]</span>
        </div>
        {userLoc && (
          <div className="flex items-center gap-2 text-[10px] text-[#008f11] relative">
            <button
              type="button"
              onClick={() => setRadiusOpen((open) => !open)}
              className="flex items-center gap-[2px] whitespace-nowrap border border-[#008f11]/40 bg-black/40 px-2 py-[2px] rounded-sm hover:border-[#00ff41]/60 hover:text-[#00ff41]"
            >
              <MapPin size={12} />
              <span className="font-mono tracking-tight">
                RAD:{' '}
                {radiusKm < 1
                  ? `${Math.round(radiusKm * 1000)}M`
                  : `${radiusKm.toFixed(1).replace('.0', '')}KM`}
              </span>
            </button>
            {radiusOpen && (
              <div className="absolute right-0 top-full mt-1 border border-[#008f11]/60 bg-black/95 rounded-sm shadow-lg z-10">
                <div className="flex flex-col min-w-[80px]">
                  {[0.5, 1, 2].map((value) => {
                    const label = value < 1 ? `${value * 1000}M` : `${value}KM`;
                    const active = radiusKm === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setRadiusKm(value);
                          setRadiusOpen(false);
                        }}
                        className={`px-2 py-1 text-[10px] font-mono text-left tracking-tight border-b border-[#008f11]/30 last:border-b-0 ${
                          active
                            ? 'bg-[#00ff41]/20 text-[#00ff41]'
                            : 'text-[#008f11] hover:bg-[#00ff41]/10 hover:text-[#00ff41]'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </h2>

      {showOverlay ? (
        <div className="flex flex-col gap-2 flex-1">
          <div className="h-12 border border-[#008f11]/30 bg-[#008f11]/10 animate-pulse flex items-center justify-center text-[#008f11] font-mono text-sm">
            CARGANDO DATOS...
          </div>
        </div>
      ) : (
        <div className="overflow-y-auto pr-2 flex-1">
          {renderSection('SUBTES', 'subte', <Train size={14} />)}
          {renderSection('COLECTIVOS CERCANOS', 'colectivo', <Bus size={14} />)}
        </div>
      )}
    </div>
  );
}
