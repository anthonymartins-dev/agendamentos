import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { api } from '../api.js';
import { dataCurta, dataDe, horaDe, iniciais } from '../format.js';
import {
  BotaoPrimario,
  BotaoSecundario,
  Campo,
  Erro,
  Modal,
  Vazio,
} from './ui.jsx';

function ClienteForm({ cliente, aoGuardar, aoApagar, aoFechar }) {
  const [dados, setDados] = useState({
    nome: cliente?.nome ?? '',
    telefone: cliente?.telefone ?? '',
    email: cliente?.email ?? '',
  });
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const mudar = (campo) => (e) => setDados({ ...dados, [campo]: e.target.value });

  async function executar(fn) {
    setOcupado(true);
    setErro('');
    try {
      await fn();
    } catch (e) {
      setErro(e.message);
      setOcupado(false);
    }
  }

  return (
    <Modal titulo={cliente ? 'Editar cliente' : 'Novo cliente'} aoFechar={aoFechar}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          executar(() => aoGuardar(dados));
        }}
        className="space-y-4"
      >
        <Campo rotulo="Nome" obrigatorio value={dados.nome} onChange={mudar('nome')} autoFocus />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo rotulo="Telefone" value={dados.telefone} onChange={mudar('telefone')} />
          <Campo rotulo="Email" type="email" value={dados.email} onChange={mudar('email')} />
        </div>
        <Erro>{erro}</Erro>
        <div className="flex items-center justify-between gap-2">
          {cliente ? (
            <button
              type="button"
              disabled={ocupado}
              onClick={() => executar(aoApagar)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-danger transition hover:bg-danger-soft"
            >
              Apagar
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <BotaoSecundario type="button" onClick={aoFechar}>
              Cancelar
            </BotaoSecundario>
            <BotaoPrimario type="submit" disabled={ocupado}>
              Guardar
            </BotaoPrimario>
          </div>
        </div>
      </form>
    </Modal>
  );
}

export default function Clientes({ clientes, aoMudar, avisar }) {
  const [busca, setBusca] = useState('');
  const [formulario, setFormulario] = useState(null);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return clientes;
    return clientes.filter((c) =>
      [c.nome, c.telefone, c.email].some((v) => v?.toLowerCase().includes(termo))
    );
  }, [clientes, busca]);

  async function guardar(dados) {
    if (formulario.id) await api.editarCliente(formulario.id, dados);
    else await api.criarCliente(dados);
    setFormulario(null);
    avisar(formulario.id ? 'Cliente atualizado' : 'Cliente adicionado');
    await aoMudar();
  }

  async function apagar() {
    await api.apagarCliente(formulario.id);
    setFormulario(null);
    avisar('Cliente apagado');
    await aoMudar();
  }

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-80">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
          />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar por nome, telefone ou email"
            className="w-full rounded-lg border border-line bg-card py-2.5 pr-3 pl-9 text-sm outline-none transition focus:border-brand focus:ring-3 focus:ring-brand/15"
          />
        </div>
        <BotaoPrimario onClick={() => setFormulario({})}>
          <Plus size={17} /> Novo cliente
        </BotaoPrimario>
      </div>

      <div className="mt-4">
        {filtrados.length === 0 ? (
          <Vazio
            titulo={clientes.length === 0 ? 'Ainda não há clientes' : 'Nenhum resultado'}
            texto={
              clientes.length === 0
                ? 'Os clientes são criados ao fazer uma marcação ou aqui.'
                : 'Experimenta outra pesquisa.'
            }
          />
        ) : (
          <ul className="animar divide-y divide-line overflow-hidden rounded-2xl border border-line bg-card">
            {filtrados.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setFormulario(c)}
                  className="flex w-full items-center gap-4 p-4 text-left transition hover:bg-paper/70 sm:px-5"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-[13px] font-semibold text-brand">
                    {iniciais(c.nome)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{c.nome}</span>
                    <span className="block truncate text-sm text-muted">
                      {[c.telefone, c.email].filter(Boolean).join(' · ') || 'Sem contacto'}
                    </span>
                  </span>
                  <span className="hidden text-right text-sm sm:block">
                    <span className="num block">{c.visitas} visitas</span>
                    <span className="block text-muted">
                      {c.proxima
                        ? `Próxima: ${dataCurta(dataDe(c.proxima))}, ${horaDe(c.proxima)}`
                        : 'Sem marcação'}
                    </span>
                  </span>
                  {c.faltas > 0 && (
                    <span className="rounded-full bg-danger-soft px-2.5 py-0.5 text-xs font-medium text-danger">
                      {c.faltas} {c.faltas === 1 ? 'falta' : 'faltas'}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {formulario && (
        <ClienteForm
          cliente={formulario.id ? formulario : null}
          aoGuardar={guardar}
          aoApagar={apagar}
          aoFechar={() => setFormulario(null)}
        />
      )}
    </section>
  );
}
