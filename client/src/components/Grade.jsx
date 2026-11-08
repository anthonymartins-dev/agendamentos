import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { emHHMM, hoje, horaDe, minutos } from '../format.js';

const PX_HORA = 72;
const PASSO = 15;

function useAgora() {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return agora;
}

function Bloco({ m, topo, aoAbrir }) {
  const inicio = minutos(horaDe(m.inicio));
  const altura = (m.duracao_min * PX_HORA) / 60 - 3;
  const apertado = altura < 44;
  const faltou = m.estado === 'faltou';
  const concluida = m.estado === 'concluida';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        aoAbrir(m);
      }}
      title={`${horaDe(m.inicio)} · ${m.cliente_nome} · ${m.servico_nome}`}
      style={{
        top: ((inicio - topo) * PX_HORA) / 60 + 1,
        height: altura,
        backgroundColor: faltou
          ? '#f6e4e0'
          : `color-mix(in srgb, ${m.cor} 13%, #fdfcf9)`,
        borderLeftColor: faltou ? '#a63a2b' : m.cor,
      }}
      className={`absolute right-1 left-1 overflow-hidden rounded-md border-l-[3px] px-2 text-left text-xs leading-tight transition hover:brightness-95 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-brand ${
        concluida ? 'opacity-70' : ''
      } ${apertado ? 'flex items-center gap-1.5 py-0' : 'py-1.5'}`}
    >
      {apertado ? (
        <>
          <span className="num shrink-0 text-muted">{horaDe(m.inicio)}</span>
          <span className="truncate font-medium">{m.cliente_nome}</span>
        </>
      ) : (
        <>
          <span className="flex items-center justify-between gap-1">
            <span className="truncate font-medium">{m.cliente_nome}</span>
            {concluida && <Check size={12} className="shrink-0 text-brand" />}
            {faltou && <span className="shrink-0 text-[10px] font-semibold text-danger">FALTOU</span>}
          </span>
          <span className="block truncate text-muted">{m.servico_nome}</span>
          <span className="num block text-muted">{horaDe(m.inicio)}</span>
        </>
      )}
    </button>
  );
}

export default function Grade({ colunas, marcacoesPorColuna, aoClicarVazio, aoAbrir }) {
  const agora = useAgora();
  const hojeTexto = hoje();

  const abertas = colunas.filter((c) => c.horario?.ativo);
  if (abertas.length === 0) {
    return (
      <div className="fechado rounded-2xl border border-line bg-card px-6 py-16 text-center text-muted">
        Fechado neste período.
      </div>
    );
  }

  const comeco = Math.floor(Math.min(...abertas.map((c) => minutos(c.horario.abre))) / 60) * 60;
  const fim = Math.ceil(Math.max(...abertas.map((c) => minutos(c.horario.fecha))) / 60) * 60;
  const altura = ((fim - comeco) * PX_HORA) / 60;
  const horas = [];
  for (let m = comeco; m < fim; m += 60) horas.push(m);

  const agoraMin = agora.getHours() * 60 + agora.getMinutes();

  function clicar(e, coluna) {
    const caixa = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - caixa.top;
    const min = comeco + Math.floor(((y / PX_HORA) * 60) / PASSO) * PASSO;
    if (min < minutos(coluna.horario.abre) || min >= minutos(coluna.horario.fecha)) return;
    aoClicarVazio(coluna, min);
  }

  const grelha = {
    gridTemplateColumns: `52px repeat(${colunas.length}, minmax(130px, 1fr))`,
  };

  return (
    <div className="animar overflow-x-auto rounded-2xl border border-line bg-card">
      <div className="grid min-w-max" style={{ ...grelha, width: '100%' }}>
        <div className="sticky left-0 z-10 border-b border-line bg-card" />
        {colunas.map((c) => (
          <div
            key={c.chave}
            className={`border-b border-l border-line px-3 py-2.5 ${c.data === hojeTexto ? 'bg-brand-soft/60' : ''}`}
          >
            <p className="flex items-center gap-2 text-sm font-medium">
              {c.cor && <span className="size-2.5 rounded-full" style={{ backgroundColor: c.cor }} />}
              {c.titulo}
            </p>
            {c.subtitulo && <p className="text-xs text-muted">{c.subtitulo}</p>}
          </div>
        ))}

        <div className="sticky left-0 z-10 bg-card" style={{ height: altura }}>
          {horas.map((m) => (
            <span
              key={m}
              className="num absolute right-2 -translate-y-1/2 text-[11px] text-muted"
              style={{ top: ((m - comeco) * PX_HORA) / 60 + (m === comeco ? 8 : 0) }}
            >
              {emHHMM(m)}
            </span>
          ))}
        </div>

        {colunas.map((c) => {
          const aberta = c.horario?.ativo;
          const abre = aberta ? minutos(c.horario.abre) : comeco;
          const fecha = aberta ? minutos(c.horario.fecha) : fim;
          const eHoje = c.data === hojeTexto;

          return (
            <div
              key={c.chave}
              onClick={aberta ? (e) => clicar(e, c) : undefined}
              className={`relative border-l border-line ${aberta ? 'cursor-pointer' : 'fechado'}`}
              style={{
                height: altura,
                backgroundImage: aberta
                  ? `linear-gradient(to bottom, var(--color-line) 1px, transparent 1px), linear-gradient(to bottom, rgb(228 224 214 / 0.45) 1px, transparent 1px)`
                  : undefined,
                backgroundSize: aberta
                  ? `100% ${PX_HORA}px, 100% ${PX_HORA / 2}px`
                  : undefined,
              }}
            >
              {aberta && abre > comeco && (
                <div
                  className="fechado pointer-events-none absolute inset-x-0 top-0 bg-paper/60"
                  style={{ height: ((abre - comeco) * PX_HORA) / 60 }}
                />
              )}
              {aberta && fecha < fim && (
                <div
                  className="fechado pointer-events-none absolute inset-x-0 bottom-0 bg-paper/60"
                  style={{ height: ((fim - fecha) * PX_HORA) / 60 }}
                />
              )}
              {!aberta && (
                <span className="absolute inset-x-0 top-6 text-center text-xs text-muted">Fechado</span>
              )}

              {(marcacoesPorColuna[c.chave] ?? []).map((m) => (
                <Bloco key={m.id} m={m} topo={comeco} aoAbrir={aoAbrir} />
              ))}

              {eHoje && agoraMin >= comeco && agoraMin <= fim && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-[5] h-px bg-danger"
                  style={{ top: ((agoraMin - comeco) * PX_HORA) / 60 }}
                >
                  <span className="absolute -top-[3px] -left-1 size-[7px] rounded-full bg-danger" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
