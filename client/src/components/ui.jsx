import { useEffect } from 'react';
import { X } from 'lucide-react';

const ESTADOS = {
  marcada: { texto: 'Marcada', classe: 'bg-[#dfe8ee] text-[#2f5670]' },
  concluida: { texto: 'Concluída', classe: 'bg-brand-soft text-brand' },
  cancelada: { texto: 'Cancelada', classe: 'bg-line/70 text-muted' },
  faltou: { texto: 'Faltou', classe: 'bg-danger-soft text-danger' },
};

export function EstadoBadge({ estado }) {
  const { texto, classe } = ESTADOS[estado];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${classe}`}>
      {texto}
    </span>
  );
}

export function useEscape(aoFechar) {
  useEffect(() => {
    const fechar = (e) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', fechar);
    return () => window.removeEventListener('keydown', fechar);
  }, [aoFechar]);
}

export function Modal({ titulo, subtitulo, largura = 'max-w-md', aoFechar, children }) {
  useEscape(aoFechar);

  return (
    <div
      className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-ink/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}
    >
      <div
        className={`animar my-auto w-full ${largura} rounded-2xl border border-line bg-card p-6 shadow-xl shadow-ink/10`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-semibold">{titulo}</h2>
            {subtitulo && <p className="mt-0.5 text-sm text-muted">{subtitulo}</p>}
          </div>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-muted transition hover:bg-line/60 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export const classeInput =
  'w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[15px] outline-none transition placeholder:text-muted/60 focus:border-brand focus:ring-3 focus:ring-brand/15';

export function Campo({ rotulo, obrigatorio, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium">
        {rotulo}
        {obrigatorio && <span className="text-danger"> *</span>}
      </span>
      <input className={classeInput} {...props} />
    </label>
  );
}

export function Selecao({ rotulo, children, className = '', ...props }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium">{rotulo}</span>
      <select className={classeInput} {...props}>
        {children}
      </select>
    </label>
  );
}

export function BotaoPrimario({ className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-hover disabled:opacity-60 ${className}`}
      {...props}
    />
  );
}

export function BotaoSecundario({ className = '', ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-card px-4 py-2.5 text-sm font-medium transition hover:bg-line/50 disabled:opacity-60 ${className}`}
      {...props}
    />
  );
}

export function Erro({ children }) {
  if (!children) return null;
  return <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{children}</p>;
}

export function Vazio({ titulo, texto }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-card/60 px-6 py-14 text-center">
      <h2 className="font-serif text-xl font-semibold">{titulo}</h2>
      <p className="mt-1 text-sm text-muted">{texto}</p>
    </div>
  );
}
