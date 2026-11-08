import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { api } from '../api.js';
import {
  addDias,
  DIAS_CURTOS,
  dataDe,
  dataLonga,
  diaISO,
  emHHMM,
  hoje,
  moeda,
  parseData,
  segundaDe,
  tituloSemana,
} from '../format.js';
import Grade from './Grade.jsx';
import MarcacaoDetalhe from './MarcacaoDetalhe.jsx';
import MarcacaoForm from './MarcacaoForm.jsx';
import { BotaoPrimario, BotaoSecundario } from './ui.jsx';

function proximoAberto(horario, inicio) {
  let d = inicio;
  for (let i = 0; i < 7; i++) {
    if (horario[diaISO(d) - 1]?.ativo) return d;
    d = addDias(d, 1);
  }
  return inicio;
}

function Indicador({ rotulo, valor }) {
  return (
    <div className="rounded-xl border border-line bg-card px-4 py-3">
      <p className="text-xs text-muted">{rotulo}</p>
      <p className="num mt-0.5 font-serif text-2xl font-semibold">{valor}</p>
    </div>
  );
}

export default function Agenda({ profissionais, servicos, clientes, horario, aoMudarClientes, avisar }) {
  const ativos = useMemo(() => profissionais.filter((p) => p.ativo), [profissionais]);

  const [vista, setVista] = useState('dia');
  const [dataRef, setDataRef] = useState(() => proximoAberto(horario, hoje()));
  const [profSel, setProfSel] = useState(ativos[0]?.id ?? null);
  const [marcacoes, setMarcacoes] = useState([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erro, setErro] = useState('');
  const [formulario, setFormulario] = useState(null);
  const [detalhe, setDetalhe] = useState(null);

  const de = vista === 'dia' ? dataRef : segundaDe(dataRef);
  const ate = vista === 'dia' ? dataRef : addDias(de, 6);

  const carregar = useCallback(async () => {
    setErro('');
    try {
      setMarcacoes(await api.marcacoes(de, ate));
    } catch {
      setErro('Não foi possível carregar as marcações.');
    } finally {
      setACarregar(false);
    }
  }, [de, ate]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const visiveis = useMemo(
    () =>
      marcacoes.filter(
        (m) => m.estado !== 'cancelada' && (vista === 'dia' || m.profissional_id === profSel)
      ),
    [marcacoes, vista, profSel]
  );

  const colunas = useMemo(() => {
    if (vista === 'dia') {
      return ativos.map((p) => ({
        chave: p.id,
        titulo: p.nome,
        cor: p.cor,
        data: dataRef,
        horario: horario[diaISO(dataRef) - 1],
      }));
    }
    return DIAS_CURTOS.map((nome, i) => {
      const d = addDias(de, i);
      return {
        chave: d,
        titulo: `${nome} ${parseData(d).getDate()}`,
        data: d,
        horario: horario[i],
      };
    });
  }, [vista, ativos, dataRef, de, horario]);

  const porColuna = useMemo(() => {
    const mapa = {};
    visiveis.forEach((m) => {
      const chave = vista === 'dia' ? m.profissional_id : dataDe(m.inicio);
      (mapa[chave] ??= []).push(m);
    });
    return mapa;
  }, [visiveis, vista]);

  const indicadores = useMemo(() => {
    const valem = visiveis.filter((m) => m.estado === 'marcada' || m.estado === 'concluida');
    return {
      total: visiveis.length,
      concluidas: visiveis.filter((m) => m.estado === 'concluida').length,
      faltas: visiveis.filter((m) => m.estado === 'faltou').length,
      receita: valem.reduce((s, m) => s + m.preco, 0),
    };
  }, [visiveis]);

  const mover = (n) => setDataRef(addDias(dataRef, vista === 'dia' ? n : n * 7));

  function clicarVazio(coluna, min) {
    setFormulario({
      data: coluna.data,
      profissional_id: vista === 'dia' ? coluna.chave : profSel,
      hora: emHHMM(min),
    });
  }

  async function guardar(dados) {
    const criada = await api.criarMarcacao(dados);
    setFormulario(null);
    avisar(`Marcação criada para ${criada.cliente_nome}`);
    await Promise.all([carregar(), aoMudarClientes()]);
  }

  async function mudarEstado(estado) {
    const atualizada = await api.mudarEstado(detalhe.id, estado);
    setDetalhe(atualizada);
    avisar('Estado atualizado');
    await carregar();
  }

  async function reagendar(dados) {
    await api.reagendar(detalhe.id, dados);
    setDetalhe(null);
    avisar('Marcação reagendada');
    setDataRef(dados.inicio.slice(0, 10));
    await carregar();
  }

  const titulo = vista === 'dia' ? dataLonga(dataRef) : tituloSemana(dataRef);
  const eHoje = dataRef === hoje();

  return (
    <section>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <BotaoSecundario className="px-2.5" onClick={() => mover(-1)} aria-label="Anterior">
            <ChevronLeft size={17} />
          </BotaoSecundario>
          <BotaoSecundario className="px-2.5" onClick={() => mover(1)} aria-label="Seguinte">
            <ChevronRight size={17} />
          </BotaoSecundario>
          <BotaoSecundario
            disabled={eHoje && vista === 'dia'}
            onClick={() => setDataRef(hoje())}
          >
            Hoje
          </BotaoSecundario>
          <h2 className="ml-2 font-serif text-2xl font-semibold">{titulo}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-line/50 p-0.5 text-sm">
            {[
              ['dia', 'Dia'],
              ['semana', 'Semana'],
            ].map(([chave, texto]) => (
              <button
                key={chave}
                onClick={() => setVista(chave)}
                className={`rounded-md px-3.5 py-1.5 transition ${
                  vista === chave ? 'bg-card font-medium shadow-sm' : 'text-muted hover:text-ink'
                }`}
              >
                {texto}
              </button>
            ))}
          </div>
          {vista === 'semana' && (
            <select
              value={profSel ?? ''}
              onChange={(e) => setProfSel(Number(e.target.value))}
              aria-label="Profissional"
              className="rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-brand"
            >
              {ativos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          )}
          <BotaoPrimario
            onClick={() => setFormulario({ data: dataRef })}
            disabled={ativos.length === 0 || servicos.filter((s) => s.ativo).length === 0}
          >
            <Plus size={17} /> Nova marcação
          </BotaoPrimario>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Indicador rotulo="Marcações" valor={indicadores.total} />
        <Indicador rotulo="Concluídas" valor={indicadores.concluidas} />
        <Indicador rotulo="Faltas" valor={indicadores.faltas} />
        <Indicador rotulo="Receita prevista" valor={moeda(indicadores.receita)} />
      </div>

      <div className="mt-5">
        {erro ? (
          <div className="rounded-2xl border border-line bg-card p-10 text-center">
            <p className="text-danger">{erro}</p>
            <BotaoSecundario className="mt-4" onClick={carregar}>
              Tentar de novo
            </BotaoSecundario>
          </div>
        ) : aCarregar ? (
          <div className="h-96 animate-pulse rounded-2xl border border-line bg-line/40" />
        ) : (
          <Grade
            colunas={colunas}
            marcacoesPorColuna={porColuna}
            aoClicarVazio={clicarVazio}
            aoAbrir={setDetalhe}
          />
        )}
      </div>

      {formulario && (
        <MarcacaoForm
          servicos={servicos}
          clientes={clientes}
          prefill={formulario}
          aoGuardar={guardar}
          aoFechar={() => setFormulario(null)}
        />
      )}

      {detalhe && (
        <MarcacaoDetalhe
          key={`${detalhe.id}-${detalhe.estado}`}
          marcacao={detalhe}
          aoMudarEstado={mudarEstado}
          aoReagendar={reagendar}
          aoFechar={() => setDetalhe(null)}
        />
      )}
    </section>
  );
}
