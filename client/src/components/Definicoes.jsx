import { useState } from 'react';
import { Archive, Pencil, Plus, RotateCcw } from 'lucide-react';
import { api } from '../api.js';
import { DIAS_LONGOS, duracao, moeda } from '../format.js';
import {
  BotaoPrimario,
  BotaoSecundario,
  Campo,
  Erro,
  Modal,
  classeInput,
} from './ui.jsx';

function Seccao({ titulo, texto, acao, children }) {
  return (
    <section className="rounded-2xl border border-line bg-card">
      <header className="flex items-start justify-between gap-4 border-b border-line p-5">
        <div>
          <h2 className="font-serif text-xl font-semibold">{titulo}</h2>
          <p className="mt-0.5 text-sm text-muted">{texto}</p>
        </div>
        {acao}
      </header>
      {children}
    </section>
  );
}

/* ---------- horário ---------- */

function Horario({ horario, aoGuardar }) {
  const [dias, setDias] = useState(horario);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const alterado = JSON.stringify(dias) !== JSON.stringify(horario);

  const mudar = (i, campo, valor) =>
    setDias(dias.map((d, j) => (j === i ? { ...d, [campo]: valor } : d)));

  async function guardar() {
    setOcupado(true);
    setErro('');
    try {
      await aoGuardar(dias);
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Seccao
      titulo="Horário de funcionamento"
      texto="Define quando se aceitam marcações."
      acao={
        <BotaoPrimario disabled={!alterado || ocupado} onClick={guardar}>
          Guardar
        </BotaoPrimario>
      }
    >
      <ul className="divide-y divide-line">
        {dias.map((d, i) => (
          <li key={d.dia_semana} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3">
            <label className="flex w-44 items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={d.ativo}
                onChange={(e) => mudar(i, 'ativo', e.target.checked)}
                className="size-4 accent-[var(--color-brand)]"
              />
              {DIAS_LONGOS[i]}
            </label>
            {d.ativo ? (
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="time"
                  value={d.abre}
                  onChange={(e) => mudar(i, 'abre', e.target.value)}
                  className={`${classeInput} num w-28 py-1.5`}
                  aria-label={`Abertura ${DIAS_LONGOS[i]}`}
                />
                <span className="text-muted">às</span>
                <input
                  type="time"
                  value={d.fecha}
                  onChange={(e) => mudar(i, 'fecha', e.target.value)}
                  className={`${classeInput} num w-28 py-1.5`}
                  aria-label={`Fecho ${DIAS_LONGOS[i]}`}
                />
              </div>
            ) : (
              <span className="text-sm text-muted">Fechado</span>
            )}
          </li>
        ))}
      </ul>
      {erro && (
        <div className="p-5 pt-0">
          <Erro>{erro}</Erro>
        </div>
      )}
    </Seccao>
  );
}

/* ---------- serviços ---------- */

function ServicoForm({ servico, aoGuardar, aoFechar }) {
  const [dados, setDados] = useState({
    nome: servico?.nome ?? '',
    duracao_min: String(servico?.duracao_min ?? 30),
    preco: String(servico?.preco ?? ''),
  });
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const mudar = (campo) => (e) => setDados({ ...dados, [campo]: e.target.value });

  async function submeter(e) {
    e.preventDefault();
    setOcupado(true);
    setErro('');
    try {
      await aoGuardar({
        nome: dados.nome,
        duracao_min: Number(dados.duracao_min),
        preco: Number(dados.preco || 0),
      });
    } catch (err) {
      setErro(err.message);
      setOcupado(false);
    }
  }

  return (
    <Modal titulo={servico ? 'Editar serviço' : 'Novo serviço'} aoFechar={aoFechar}>
      <form onSubmit={submeter} className="space-y-4">
        <Campo rotulo="Nome" obrigatorio value={dados.nome} onChange={mudar('nome')} autoFocus />
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo
            rotulo="Duração (minutos)"
            type="number"
            min="5"
            step="5"
            value={dados.duracao_min}
            onChange={mudar('duracao_min')}
          />
          <Campo
            rotulo="Preço (€)"
            type="number"
            min="0"
            step="0.5"
            value={dados.preco}
            onChange={mudar('preco')}
          />
        </div>
        <Erro>{erro}</Erro>
        <div className="flex justify-end gap-2">
          <BotaoSecundario type="button" onClick={aoFechar}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={ocupado}>
            Guardar
          </BotaoPrimario>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- equipa ---------- */

function ProfissionalForm({ profissional, aoGuardar, aoFechar }) {
  const [nome, setNome] = useState(profissional?.nome ?? '');
  const [cor, setCor] = useState(profissional?.cor ?? '#24493c');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function submeter(e) {
    e.preventDefault();
    setOcupado(true);
    setErro('');
    try {
      await aoGuardar({ nome, cor });
    } catch (err) {
      setErro(err.message);
      setOcupado(false);
    }
  }

  return (
    <Modal titulo={profissional ? 'Editar profissional' : 'Novo profissional'} aoFechar={aoFechar}>
      <form onSubmit={submeter} className="space-y-4">
        <Campo rotulo="Nome" obrigatorio value={nome} onChange={(e) => setNome(e.target.value)} autoFocus />
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Cor na agenda</span>
          <input
            type="color"
            value={cor}
            onChange={(e) => setCor(e.target.value)}
            className="h-10 w-20 cursor-pointer rounded-lg border border-line bg-white p-1"
          />
        </label>
        <Erro>{erro}</Erro>
        <div className="flex justify-end gap-2">
          <BotaoSecundario type="button" onClick={aoFechar}>
            Cancelar
          </BotaoSecundario>
          <BotaoPrimario type="submit" disabled={ocupado}>
            Guardar
          </BotaoPrimario>
        </div>
      </form>
    </Modal>
  );
}

function BotaoIcone({ rotulo, children, ...props }) {
  return (
    <button
      aria-label={rotulo}
      title={rotulo}
      className="rounded-lg p-2 text-muted transition hover:bg-line/70 hover:text-ink"
      {...props}
    >
      {children}
    </button>
  );
}

export default function Definicoes({ horario, servicos, profissionais, aoMudar, avisar }) {
  const [servicoForm, setServicoForm] = useState(null);
  const [profForm, setProfForm] = useState(null);

  async function guardarHorario(dias) {
    await api.guardarHorario(dias);
    avisar('Horário guardado');
    await aoMudar();
  }

  async function guardarServico(dados) {
    if (servicoForm.id) await api.editarServico(servicoForm.id, dados);
    else await api.criarServico(dados);
    setServicoForm(null);
    avisar('Serviço guardado');
    await aoMudar();
  }

  async function alternarServico(s) {
    if (s.ativo) await api.arquivarServico(s.id);
    else await api.editarServico(s.id, { ...s, ativo: true });
    await aoMudar();
  }

  async function guardarProf(dados) {
    if (profForm.id) await api.editarProfissional(profForm.id, dados);
    else await api.criarProfissional(dados);
    setProfForm(null);
    avisar('Profissional guardado');
    await aoMudar();
  }

  async function alternarProf(p) {
    if (p.ativo) await api.arquivarProfissional(p.id);
    else await api.editarProfissional(p.id, { ...p, ativo: true });
    await aoMudar();
  }

  return (
    <div className="space-y-6">
      <Horario horario={horario} aoGuardar={guardarHorario} />

      <Seccao
        titulo="Serviços"
        texto="O que se pode marcar, com duração e preço."
        acao={
          <BotaoSecundario onClick={() => setServicoForm({})}>
            <Plus size={16} /> Novo
          </BotaoSecundario>
        }
      >
        <ul className="divide-y divide-line">
          {servicos.map((s) => (
            <li
              key={s.id}
              className={`flex items-center gap-4 px-5 py-3 ${s.ativo ? '' : 'opacity-50'}`}
            >
              <span className="flex-1 font-medium">
                {s.nome}
                {!s.ativo && <span className="ml-2 text-xs font-normal text-muted">arquivado</span>}
              </span>
              <span className="num text-sm text-muted">{duracao(s.duracao_min)}</span>
              <span className="num w-16 text-right text-sm font-medium">{moeda(s.preco)}</span>
              <div className="flex">
                <BotaoIcone rotulo="Editar" onClick={() => setServicoForm(s)}>
                  <Pencil size={15} />
                </BotaoIcone>
                <BotaoIcone rotulo={s.ativo ? 'Arquivar' : 'Restaurar'} onClick={() => alternarServico(s)}>
                  {s.ativo ? <Archive size={15} /> : <RotateCcw size={15} />}
                </BotaoIcone>
              </div>
            </li>
          ))}
        </ul>
      </Seccao>

      <Seccao
        titulo="Equipa"
        texto="Cada profissional tem a sua coluna na agenda."
        acao={
          <BotaoSecundario onClick={() => setProfForm({})}>
            <Plus size={16} /> Novo
          </BotaoSecundario>
        }
      >
        <ul className="divide-y divide-line">
          {profissionais.map((p) => (
            <li
              key={p.id}
              className={`flex items-center gap-4 px-5 py-3 ${p.ativo ? '' : 'opacity-50'}`}
            >
              <span className="size-3 rounded-full" style={{ backgroundColor: p.cor }} />
              <span className="flex-1 font-medium">
                {p.nome}
                {!p.ativo && <span className="ml-2 text-xs font-normal text-muted">arquivado</span>}
              </span>
              <div className="flex">
                <BotaoIcone rotulo="Editar" onClick={() => setProfForm(p)}>
                  <Pencil size={15} />
                </BotaoIcone>
                <BotaoIcone rotulo={p.ativo ? 'Arquivar' : 'Restaurar'} onClick={() => alternarProf(p)}>
                  {p.ativo ? <Archive size={15} /> : <RotateCcw size={15} />}
                </BotaoIcone>
              </div>
            </li>
          ))}
        </ul>
      </Seccao>

      {servicoForm && (
        <ServicoForm
          servico={servicoForm.id ? servicoForm : null}
          aoGuardar={guardarServico}
          aoFechar={() => setServicoForm(null)}
        />
      )}
      {profForm && (
        <ProfissionalForm
          profissional={profForm.id ? profForm : null}
          aoGuardar={guardarProf}
          aoFechar={() => setProfForm(null)}
        />
      )}
    </div>
  );
}
