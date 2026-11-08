import { useState } from 'react';
import { dataLonga, duracao, hoje, moeda } from '../format.js';
import {
  BotaoPrimario,
  BotaoSecundario,
  Campo,
  Erro,
  Modal,
  Selecao,
  classeInput,
} from './ui.jsx';
import SeletorHorario from './SeletorHorario.jsx';

export default function MarcacaoForm({ servicos, clientes, prefill, aoGuardar, aoFechar }) {
  const ativos = servicos.filter((s) => s.ativo);
  const [servicoId, setServicoId] = useState(String(ativos[0]?.id ?? ''));
  const [data, setData] = useState(prefill?.data ?? hoje());
  const [escolha, setEscolha] = useState(
    prefill?.hora ? { profissional_id: prefill.profissional_id, hora: prefill.hora } : null
  );
  const [modo, setModo] = useState(clientes.length > 0 ? 'existente' : 'novo');
  const [clienteId, setClienteId] = useState('');
  const [novo, setNovo] = useState({ nome: '', telefone: '', email: '' });
  const [notas, setNotas] = useState('');
  const [erro, setErro] = useState('');
  const [aGuardar, setAGuardar] = useState(false);

  const servico = ativos.find((s) => String(s.id) === servicoId);

  const mudarServico = (e) => {
    setServicoId(e.target.value);
    setEscolha(null);
  };
  const mudarData = (e) => {
    setData(e.target.value);
    setEscolha(null);
  };

  async function submeter(e) {
    e.preventDefault();
    if (!escolha) return setErro('Escolhe um horário');
    if (modo === 'existente' && !clienteId) return setErro('Escolhe um cliente');

    setAGuardar(true);
    setErro('');
    try {
      await aoGuardar({
        servico_id: Number(servicoId),
        profissional_id: escolha.profissional_id,
        inicio: `${data}T${escolha.hora}`,
        notas,
        ...(modo === 'existente' ? { cliente_id: Number(clienteId) } : { cliente: novo }),
      });
    } catch (err) {
      setErro(err.message);
      setAGuardar(false);
    }
  }

  return (
    <Modal
      titulo="Nova marcação"
      subtitulo="Escolhe o serviço, o dia e um horário livre."
      largura="max-w-2xl"
      aoFechar={aoFechar}
    >
      <form onSubmit={submeter} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <Selecao rotulo="Serviço" value={servicoId} onChange={mudarServico}>
            {ativos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} · {duracao(s.duracao_min)} · {moeda(s.preco)}
              </option>
            ))}
          </Selecao>
          <Campo rotulo="Data" type="date" min={hoje()} value={data} onChange={mudarData} />
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">
            Horário{' '}
            <span className="font-normal text-muted">
              · {dataLonga(data)}
              {servico && `, ${duracao(servico.duracao_min)}`}
            </span>
          </p>
          <SeletorHorario servicoId={servicoId} data={data} valor={escolha} aoMudar={setEscolha} />
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium">Cliente</legend>
          <div className="mb-3 inline-flex rounded-lg bg-line/50 p-0.5 text-sm">
            {[
              ['existente', 'Já registado'],
              ['novo', 'Novo cliente'],
            ].map(([chave, texto]) => (
              <button
                key={chave}
                type="button"
                onClick={() => setModo(chave)}
                className={`rounded-md px-3 py-1.5 transition ${
                  modo === chave ? 'bg-card font-medium shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                {texto}
              </button>
            ))}
          </div>

          {modo === 'existente' ? (
            <select
              className={classeInput}
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              aria-label="Cliente"
            >
              <option value="">Escolhe um cliente…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                  {c.telefone ? ` · ${c.telefone}` : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <Campo
                rotulo="Nome"
                obrigatorio
                value={novo.nome}
                onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
              />
              <Campo
                rotulo="Telefone"
                value={novo.telefone}
                onChange={(e) => setNovo({ ...novo, telefone: e.target.value })}
              />
              <Campo
                rotulo="Email"
                type="email"
                value={novo.email}
                onChange={(e) => setNovo({ ...novo, email: e.target.value })}
              />
            </div>
          )}
        </fieldset>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Notas</span>
          <input
            className={classeInput}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Opcional"
          />
        </label>

        <Erro>{erro}</Erro>

        <div className="flex justify-end gap-2">
          <BotaoSecundario type="button" onClick={aoFechar}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={aGuardar}>
            {aGuardar ? 'A marcar…' : 'Marcar'}
          </BotaoPrimario>
        </div>
      </form>
    </Modal>
  );
}
