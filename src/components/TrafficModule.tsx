import React, { useState } from 'react';
import { Map, Send } from 'lucide-react';

const CONTACT_EMAIL = import.meta.env.VITE_CONTACT_EMAIL as string | undefined;

export function TrafficModule() {
  const [link, setLink] = useState('');
  const [title, setTitle] = useState('');

  const getSubjectAndBody = () => {
    const url = (link || '').trim();
    const note = title.trim();
    const subject = note
      ? `Link reunion - ${note.slice(0, 40)}${note.length > 40 ? '...' : ''}`
      : 'Link reunion (B4_EXIT)';
    const body = url;
    return { subject, body };
  };

  const handleSendGmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!link.trim()) return;
    const to = CONTACT_EMAIL?.trim() || '';
    if (!to) return;
    const { subject, body } = getSubjectAndBody();
    const params = new URLSearchParams({ to, su: subject, body });
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&${params.toString()}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="border border-[#00ff41]/30 bg-[#020a02]/80 p-4 rounded-sm relative overflow-hidden flex flex-col flex-1 min-h-0 group">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00ff41] to-transparent opacity-50" />
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#00ff41]/50" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#00ff41]/50" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#00ff41]/50" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#00ff41]/50" />

      <h2 className="text-lg font-bold mb-4 flex items-center gap-2 border-b border-[#008f11]/50 pb-2">
        <Map size={18} />
        [REUNIONES_CONTACTO]
      </h2>

      <div className="flex flex-col gap-3 text-[#008f11]">
        <p className="text-sm font-mono">
        Mandame el link de la reunión y lo recibo al instante para agendar la entrevista.
        </p>
        <form onSubmit={handleSendGmail} className="flex flex-col gap-3">
          <div>
            <label htmlFor="meeting-link" className="block text-[10px] font-mono uppercase tracking-widest mb-1 text-[#008f11]/80">
              Enlace
            </label>
            <input
              id="meeting-link"
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://calendly.com/..."
              className="w-full bg-black/50 border border-[#008f11]/40 rounded-sm px-3 py-2 text-[#00ff41] font-mono text-sm placeholder:text-[#008f11]/40 focus:outline-none focus:border-[#00ff41]/60"
            />
          </div>
          <div>
            <label htmlFor="meeting-title" className="block text-[10px] font-mono uppercase tracking-widest mb-1 text-[#008f11]/80">
              Título o nota (opcional)
            </label>
            <input
              id="meeting-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Llamada con cliente X"
              className="w-full bg-black/50 border border-[#008f11]/40 rounded-sm px-3 py-2 text-[#00ff41] font-mono text-sm placeholder:text-[#008f11]/40 focus:outline-none focus:border-[#00ff41]/60"
            />
          </div>
          <button
            type="submit"
            disabled={!link.trim() || !CONTACT_EMAIL?.trim()}
            className="mt-3 flex items-center justify-center gap-2 border border-[#008f11]/40 bg-black/40 px-3 py-2 rounded-sm hover:border-[#00ff41]/60 hover:text-[#00ff41] disabled:opacity-50 disabled:cursor-not-allowed text-[#008f11] font-mono text-xs uppercase tracking-widest"
          >
            <Send size={14} />
            Abrir en Gmail
          </button>
        </form>
        {!CONTACT_EMAIL?.trim() && (
          <p className="text-[10px] text-[#008f11]/60 font-mono">
            Configure VITE_CONTACT_EMAIL en .env para recibir los enlaces.
          </p>
        )}
      </div>
    </div>
  );
}
