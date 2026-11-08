import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import Agenda from './components/Agenda.jsx';
import Clientes from './components/Clientes.jsx';
import Definicoes from './components/Definicoes.jsx';
import { BotaoSecundario } from './components/ui.jsx';

const SEPARADORES = [
  ['agenda', 'Agenda'],
  ['clientes', 'Clientes'],
  ['definicoes', 'Definições'],
];

export default function App() {
  const [separador, setSeparador] = useState('agenda');
  const [base, setBase] = useState(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  const carregarBase = useCallback(async () => {
    setErro('');
    try {
      const [horario, servicos, profissionais, clientes] = await Promise.all([
        api.horario(),
        api.servicos(),
        api.profissionais(),
        api.clientes(),
      ]);
      setBase({ horario, servicos, profissionais, clientes });
    } catch {
      setErro('Não foi possível ligar ao servidor. Confirma que a API está a correr.');
    }
  }, []);

  useEffect(() => {
    carregarBase();
  }, [carregarBase]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(''), 2600);
    return () => clearTimeout(t);
  }, [aviso]);

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium tracking-wide text-brand uppercase">Atelier Lisboa</p>
          <h1 className="mt-1 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
            Agendamentos
          </h1>
        </div>
        <nav className="flex gap-6 border-b border-line sm:border-0">
          {SEPARADORES.map(([chave, texto]) => (
            <button
              key={chave}
              onClick={() => setSeparador(chave)}
              className={`-mb-px border-b-2 pb-3 text-sm font-medium transition sm:mb-0 ${
                separador === chave
                  ? 'border-brand text-ink'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {texto}
            </button>
          ))}
        </nav>
      </header>

      <main className="mt-8">
        {erro ? (
          <div className="rounded-2xl border border-line bg-card p-10 text-center">
            <p className="text-danger">{erro}</p>
            <BotaoSecundario className="mt-4" onClick={carregarBase}>
              Tentar de novo
            </BotaoSecundario>
          </div>
        ) : !base ? (
          <div className="h-96 animate-pulse rounded-2xl border border-line bg-line/40" />
        ) : separador === 'agenda' ? (
          <Agenda
            profissionais={base.profissionais}
            servicos={base.servicos}
            clientes={base.clientes}
            horario={base.horario}
            aoMudarClientes={carregarBase}
            avisar={setAviso}
          />
        ) : separador === 'clientes' ? (
          <Clientes clientes={base.clientes} aoMudar={carregarBase} avisar={setAviso} />
        ) : (
          <Definicoes
            horario={base.horario}
            servicos={base.servicos}
            profissionais={base.profissionais}
            aoMudar={carregarBase}
            avisar={setAviso}
          />
        )}
      </main>

      {aviso && (
        <div className="animar fixed right-4 bottom-4 z-50 rounded-lg bg-ink px-4 py-2.5 text-sm text-white shadow-lg">
          {aviso}
        </div>
      )}
    </div>
  );
}
