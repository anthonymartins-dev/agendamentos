import { useState } from 'react';
import { Check, CalendarClock, Phone, RotateCcw, UserX, X, XCircle } from 'lucide-react';
import { dataDe, dataLonga, duracao, hoje, horaDe, moeda } from '../format.js';
import { BotaoPrimario, BotaoSecundario, Campo, Erro, EstadoBadge, useEscape } from './ui.jsx';
import SeletorHorario from './SeletorHorario.jsx';

export default function MarcacaoDetalhe({ marcacao: m, aoMudarEstado, aoReagendar, aoFechar }) {
  useEscape(aoFechar);
  const [reagendar, setReagendar] = useState(false);
  const [data, setData] = useState(dataDe(m.inicio));
  const [escolha, setEscolha] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');

  async function executar(fn) {
    setOcupado(true);
    setErro('');
    try {
      await fn();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  }

  const estado = (novo) => executar(() => aoMudarEstado(novo));
  const confirmarReagendamento = () =>
    executar(() =>
      aoReagendar({ inicio: `${data}T${escolha.hora}`, profissional_id: escolha.profissional_id })
    );

  return (
    <div
      className="fixed inset-0 z-30 flex justify-end bg-ink/30"
      onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}
    >
      <aside className="painel flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line bg-card shadow-2xl shadow-ink/10">
        <div className="flex items-start justify-between gap-4 border-b border-line p-6">
          <div>
            <EstadoBadge estado={m.estado} />
            <h2 className="mt-2 font-serif text-2xl font-semibold">{m.cliente_nome}</h2>
            <p className="mt-0.5 text-sm text-muted">{m.servico_nome}</p>
          </div>
          <button
            onClick={aoFechar}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-muted transition hover:bg-line/60 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-6 p-6">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Data</dt>
              <dd className="text-right font-medium">{dataLonga(dataDe(m.inicio))}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Hora</dt>
              <dd className="num font-medium">
                {horaDe(m.inicio)} – {horaDe(m.fim)} ({duracao(m.duracao_min)})
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Profissional</dt>
              <dd className="flex items-center gap-2 font-medium">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: m.cor }} />
                {m.profissional_nome}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Preço</dt>
              <dd className="num font-medium">{moeda(m.preco)}</dd>
            </div>
            {m.cliente_telefone && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Telefone</dt>
                <dd>
                  <a
                    href={`tel:${m.cliente_telefone.replace(/\s/g, '')}`}
                    className="inline-flex items-center gap-1.5 font-medium text-brand hover:underline"
                  >
                    <Phone size={13} /> {m.cliente_telefone}
                  </a>
                </dd>
              </div>
            )}
            {m.notas && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Notas</dt>
                <dd className="text-right">{m.notas}</dd>
              </div>
            )}
          </dl>

          {reagendar && (
            <section className="space-y-3 rounded-xl border border-line p-4">
              <h3 className="text-sm font-semibold">Escolhe o novo horário</h3>
              <Campo
                rotulo="Data"
                type="date"
                min={hoje()}
                value={data}
                onChange={(e) => {
                  setData(e.target.value);
                  setEscolha(null);
                }}
              />
              <SeletorHorario
                servicoId={m.servico_id}
                data={data}
                ignorar={m.id}
                valor={escolha}
                aoMudar={setEscolha}
              />
              <div className="flex justify-end gap-2">
                <BotaoSecundario onClick={() => setReagendar(false)}>Voltar</BotaoSecundario>
                <BotaoPrimario disabled={!escolha || ocupado} onClick={confirmarReagendamento}>
                  Confirmar
                </BotaoPrimario>
              </div>
            </section>
          )}

          <Erro>{erro}</Erro>
        </div>

        <div className="space-y-2 border-t border-line p-4">
          {m.estado === 'marcada' && !reagendar && (
            <>
              <BotaoPrimario className="w-full" disabled={ocupado} onClick={() => estado('concluida')}>
                <Check size={16} /> Marcar como concluída
              </BotaoPrimario>
              <div className="grid grid-cols-3 gap-2">
                <BotaoSecundario disabled={ocupado} onClick={() => setReagendar(true)}>
                  <CalendarClock size={15} /> Reagendar
                </BotaoSecundario>
                <BotaoSecundario disabled={ocupado} onClick={() => estado('faltou')}>
                  <UserX size={15} /> Faltou
                </BotaoSecundario>
                <BotaoSecundario
                  className="text-danger"
                  disabled={ocupado}
                  onClick={() => estado('cancelada')}
                >
                  <XCircle size={15} /> Cancelar
                </BotaoSecundario>
              </div>
            </>
          )}
          {m.estado !== 'marcada' && (
            <BotaoSecundario className="w-full" disabled={ocupado} onClick={() => estado('marcada')}>
              <RotateCcw size={15} /> {m.estado === 'cancelada' ? 'Restaurar marcação' : 'Reabrir'}
            </BotaoSecundario>
          )}
        </div>
      </aside>
    </div>
  );
}
