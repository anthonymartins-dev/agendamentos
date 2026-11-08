const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3003';

async function pedir(caminho, opcoes = {}) {
  const resposta = await fetch(`${BASE}${caminho}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opcoes,
  });

  if (resposta.status === 204) return null;

  const dados = await resposta.json();
  if (!resposta.ok) throw new Error(dados.erro || 'Algo correu mal');
  return dados;
}

const enviar = (metodo, corpo) => ({ method: metodo, body: JSON.stringify(corpo) });

export const api = {
  horario: () => pedir('/horario'),
  guardarHorario: (dias) => pedir('/horario', enviar('PUT', dias)),

  servicos: () => pedir('/servicos'),
  criarServico: (d) => pedir('/servicos', enviar('POST', d)),
  editarServico: (id, d) => pedir(`/servicos/${id}`, enviar('PUT', d)),
  arquivarServico: (id) => pedir(`/servicos/${id}`, { method: 'DELETE' }),

  profissionais: () => pedir('/profissionais'),
  criarProfissional: (d) => pedir('/profissionais', enviar('POST', d)),
  editarProfissional: (id, d) => pedir(`/profissionais/${id}`, enviar('PUT', d)),
  arquivarProfissional: (id) => pedir(`/profissionais/${id}`, { method: 'DELETE' }),

  clientes: () => pedir('/clientes'),
  criarCliente: (d) => pedir('/clientes', enviar('POST', d)),
  editarCliente: (id, d) => pedir(`/clientes/${id}`, enviar('PUT', d)),
  apagarCliente: (id) => pedir(`/clientes/${id}`, { method: 'DELETE' }),

  marcacoes: (de, ate) => pedir(`/marcacoes?de=${de}&ate=${ate}`),
  criarMarcacao: (d) => pedir('/marcacoes', enviar('POST', d)),
  reagendar: (id, d) => pedir(`/marcacoes/${id}`, enviar('PUT', d)),
  mudarEstado: (id, estado) => pedir(`/marcacoes/${id}/estado`, enviar('PATCH', { estado })),

  disponibilidade: ({ data, servicoId, profissionalId, ignorar }) => {
    const p = new URLSearchParams({ data, servico_id: servicoId });
    if (profissionalId) p.set('profissional_id', profissionalId);
    if (ignorar) p.set('ignorar', ignorar);
    return pedir(`/disponibilidade?${p}`);
  },
};
