import { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function SeletorHorario({ servicoId, data, ignorar, valor, aoMudar }) {
  const [estado, setEstado] = useState({ a_carregar: true });

  useEffect(() => {
    if (!servicoId || !data) return;
    let ativo = true;
    setEstado({ a_carregar: true });
    api
      .disponibilidade({ data, servicoId, ignorar })
      .then((r) => ativo && setEstado({ ...r }))
      .catch((e) => ativo && setEstado({ erro: e.message }));
    return () => {
      ativo = false;
    };
  }, [servicoId, data, ignorar]);

  if (estado.a_carregar) {
    return <div className="h-16 animate-pulse rounded-xl bg-line/60" />;
  }
  if (estado.erro) return <p className="text-sm text-danger">{estado.erro}</p>;
  if (!estado.aberto) {
    return <p className="rounded-xl bg-paper px-4 py-3 text-sm text-muted">Fechado neste dia.</p>;
  }

  const comHorarios = estado.profissionais.filter((p) => p.slots.length > 0);
  if (comHorarios.length === 0) {
    return (
      <p className="rounded-xl bg-paper px-4 py-3 text-sm text-muted">
        Sem horários livres neste dia. Experimenta outra data.
      </p>
    );
  }

  return (
    <div className="space-y-4 rounded-xl bg-paper p-4">
      {comHorarios.map((p) => (
        <div key={p.id}>
          <p className="mb-2 flex items-center gap-2 text-sm font-medium">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: p.cor }} />
            {p.nome}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {p.slots.map((hora) => {
              const escolhido = valor?.profissional_id === p.id && valor?.hora === hora;
              return (
                <button
                  key={hora}
                  type="button"
                  onClick={() => aoMudar({ profissional_id: p.id, hora })}
                  className={`num rounded-lg border px-2.5 py-1.5 text-sm transition ${
                    escolhido
                      ? 'border-brand bg-brand text-white'
                      : 'border-line bg-card hover:border-brand/50'
                  }`}
                >
                  {hora}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
