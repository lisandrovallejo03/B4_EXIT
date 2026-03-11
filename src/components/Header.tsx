import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, Cpu, Activity, Wifi } from 'lucide-react';

interface HeaderProps {
  onCpuClick?: () => void;
}

export function Header({ onCpuClick }: HeaderProps) {
  const [time, setTime] = useState(new Date());
  const [location, setLocation] = useState<string>('Detectando ubicación...');
  const [status, setStatus] = useState<string>('ONLINE');
  const [downloadMb, setDownloadMb] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation(`CABA (${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)})`);
        },
        () => setLocation('Ubicación no disponible')
      );
    } else {
      setLocation('Geolocalización no soportada');
    }

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const start = performance.now();
        const url = `${window.location.origin}/routes.txt?t=${Date.now()}`;
        const res = await fetch(url, { cache: 'no-store' });
        const blob = await res.blob();
        const elapsedSec = (performance.now() - start) / 1000;
        if (elapsedSec > 0 && blob.size > 0) {
          const mb = (blob.size / 1024 / 1024) / elapsedSec;
          setDownloadMb(mb);
        }
      } catch {
        try {
          const start2 = performance.now();
          const res2 = await fetch(`${window.location.origin}/?t=${Date.now()}`, { cache: 'no-store' });
          const blob2 = await res2.blob();
          const elapsed2 = (performance.now() - start2) / 1000;
          if (elapsed2 > 0 && blob2.size > 0) {
            setDownloadMb((blob2.size / 1024 / 1024) / elapsed2);
          }
        } catch {
          setDownloadMb(null);
        }
      }
    })();
  }, []);

  return (
    <header className="border-b border-[#00ff41]/30 pt-2 pb-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
      <div>
        <h1 className="text-4xl font-bold tracking-widest uppercase">
          B4_EXIT
        </h1>
        <div className="text-[#008f11] text-sm mt-2 flex items-center gap-2">
          {onCpuClick ? (
            <button
              type="button"
              onClick={onCpuClick}
              className="flex items-center gap-2 cursor-pointer hover:text-[#00ff41] transition-colors border-0 bg-transparent p-0"
              aria-label="Clic para easter egg"
            >
              <Cpu size={14} />
              <span>SYS.INIT // {format(time, "dd.MM.yyyy", { locale: es })}</span>
            </button>
          ) : (
            <>
              <Cpu size={14} />
              <span>SYS.INIT // {format(time, "dd.MM.yyyy", { locale: es })}</span>
            </>
          )}
        </div>
      </div>
      
      <div className="flex flex-col items-start md:items-end gap-1 text-sm">
        <div className="text-2xl font-bold">
          {format(time, 'HH:mm:ss')}
        </div>
        <div className="flex items-center gap-2 text-[#008f11]">
          <MapPin size={14} />
          <span>{location}</span>
        </div>
        <div className="flex items-center gap-4 mt-1">
          <div className="flex items-center gap-1 text-[#00ff41]">
            <Wifi size={14} />
            <span>{status}</span>
          </div>
          <div className="flex items-center gap-1 text-[#008f11]">
            <Activity size={14} />
            <span>
              {downloadMb != null ? `${downloadMb.toFixed(2)} MB/s` : '— MB/s'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
