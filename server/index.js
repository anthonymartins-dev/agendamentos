require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool, types } = require('pg');

// DATE e TIMESTAMP chegam como texto ("2026-11-09", "2026-11-09T10:30:00"), sem fusos horários.
types.setTypeParser(1082, (v) => v);
types.setTypeParser(1114, (v) => v.replace(' ', 'T'));
types.setTypeParser(1700, parseFloat);

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const ESTADOS = ['marcada', 'concluida', 'cancelada', 'faltou'];
const PASSO_MIN = 15;

const rota = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (erro) {
    if (erro.code === '23P01') {
      return res.status(409).json({ erro: 'Esse horário já está ocupado para este profissional' });
    }
    console.error(erro);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
};

/* ---------- utilitários de tempo ---------- */

const texto = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
const eData = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
const eInicio = (v) =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v) && !isNaN(Date.parse(v.slice(0, 10)));

const minutos = (hhmm) => {
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number);
  return h * 60 + m;
};
const emHHMM = (min) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

function agoraLocal() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

async function horarioDoDia(data) {
  const { rows } = await pool.query(
    `SELECT h.ativo, h.abre::text AS abre, h.fecha::text AS fecha
     FROM horario h WHERE h.dia_semana = EXTRACT(ISODOW FROM $1::date)::int`,
    [data]
  );
  return rows[0];
}

// Devolve uma mensagem de erro, ou null se o intervalo for válido.
async function validarJanela(inicio, duracao) {
  if (!eInicio(inicio)) return 'Data e hora inválidas';

  const horario = await horarioDoDia(inicio.slice(0, 10));
  if (!horario || !horario.ativo) return 'O estabelecimento está fechado nesse dia';

  const comeco = minutos(inicio.slice(11, 16));
  if (comeco < minutos(horario.abre) || comeco + duracao > minutos(horario.fecha)) {
    return `Fora do horário de funcionamento (${horario.abre.slice(0, 5)} às ${horario.fecha.slice(0, 5)})`;
  }
  if (inicio.slice(0, 16) < agoraLocal()) return 'Não é possível marcar no passado';
  return null;
}

/* ---------- consultas partilhadas ---------- */

const SELECT_MARCACAO = `
  SELECT m.id, m.inicio, m.fim, m.estado, m.notas,
         m.cliente_id, c.nome AS cliente_nome, c.telefone AS cliente_telefone,
         m.servico_id, s.nome AS servico_nome, s.duracao_min, s.preco,
         m.profissional_id, p.nome AS profissional_nome, p.cor
  FROM marcacoes m
  JOIN clientes c ON c.id = m.cliente_id
  JOIN servicos s ON s.id = m.servico_id
  JOIN profissionais p ON p.id = m.profissional_id`;

async function carregarMarcacao(id) {
  const { rows } = await pool.query(`${SELECT_MARCACAO} WHERE m.id = $1`, [id]);
  return rows[0];
}

/* ---------- horário de funcionamento ---------- */

app.get('/horario', rota(async (req, res) => {
  const { rows } = await pool.query(
    `SELECT dia_semana, ativo, to_char(abre, 'HH24:MI') AS abre, to_char(fecha, 'HH24:MI') AS fecha
     FROM horario ORDER BY dia_semana`
  );
  res.json(rows);
}));

app.put('/horario', rota(async (req, res) => {
  const dias = req.body;
  const valido =
    Array.isArray(dias) &&
    dias.length === 7 &&
    dias.every(
      (d) =>
        Number.isInteger(d.dia_semana) &&
        /^\d{2}:\d{2}$/.test(d.abre) &&
        /^\d{2}:\d{2}$/.test(d.fecha) &&
        minutos(d.abre) < minutos(d.fecha)
    );
  if (!valido) return res.status(400).json({ erro: 'Horário inválido: a abertura tem de ser antes do fecho' });

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    for (const d of dias) {
      await cliente.query(
        'UPDATE horario SET ativo = $1, abre = $2, fecha = $3 WHERE dia_semana = $4',
        [Boolean(d.ativo), d.abre, d.fecha, d.dia_semana]
      );
    }
    await cliente.query('COMMIT');
  } catch (e) {
    await cliente.query('ROLLBACK');
    throw e;
  } finally {
    cliente.release();
  }
  res.json(dias);
}));

/* ---------- serviços ---------- */

function lerServico(corpo) {
  const dados = {
    nome: texto(corpo.nome),
    duracao_min: Number(corpo.duracao_min),
    preco: Number(corpo.preco ?? 0),
  };
  let erro = null;
  if (!dados.nome) erro = 'O nome é obrigatório';
  else if (!Number.isInteger(dados.duracao_min) || dados.duracao_min < 5 || dados.duracao_min > 480) {
    erro = 'A duração tem de ser entre 5 e 480 minutos';
  } else if (!(dados.preco >= 0)) erro = 'O preço não pode ser negativo';
  return { dados, erro };
}

app.get('/servicos', rota(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM servicos ORDER BY ativo DESC, nome');
  res.json(rows);
}));

app.post('/servicos', rota(async (req, res) => {
  const { dados, erro } = lerServico(req.body);
  if (erro) return res.status(400).json({ erro });
  const { rows } = await pool.query(
    'INSERT INTO servicos (nome, duracao_min, preco) VALUES ($1, $2, $3) RETURNING *',
    [dados.nome, dados.duracao_min, dados.preco]
  );
  res.status(201).json(rows[0]);
}));

app.put('/servicos/:id', rota(async (req, res) => {
  const { dados, erro } = lerServico(req.body);
  if (erro) return res.status(400).json({ erro });
  const { rows } = await pool.query(
    `UPDATE servicos SET nome = $1, duracao_min = $2, preco = $3, ativo = COALESCE($4, ativo)
     WHERE id = $5 RETURNING *`,
    [dados.nome, dados.duracao_min, dados.preco, typeof req.body.ativo === 'boolean' ? req.body.ativo : null, req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ erro: 'Serviço não encontrado' });
  res.json(rows[0]);
}));

// Arquivar em vez de apagar: as marcações antigas continuam a apontar para o serviço.
app.delete('/servicos/:id', rota(async (req, res) => {
  const { rowCount } = await pool.query('UPDATE servicos SET ativo = FALSE WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ erro: 'Serviço não encontrado' });
  res.status(204).send();
}));

/* ---------- profissionais ---------- */

function lerProfissional(corpo) {
  const nome = texto(corpo.nome);
  const cor = /^#[0-9a-fA-F]{6}$/.test(corpo.cor || '') ? corpo.cor : '#24493c';
  return { dados: { nome, cor }, erro: nome ? null : 'O nome é obrigatório' };
}

app.get('/profissionais', rota(async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM profissionais ORDER BY ativo DESC, nome');
  res.json(rows);
}));

app.post('/profissionais', rota(async (req, res) => {
  const { dados, erro } = lerProfissional(req.body);
  if (erro) return res.status(400).json({ erro });
  const { rows } = await pool.query(
    'INSERT INTO profissionais (nome, cor) VALUES ($1, $2) RETURNING *',
    [dados.nome, dados.cor]
  );
  res.status(201).json(rows[0]);
}));

app.put('/profissionais/:id', rota(async (req, res) => {
  const { dados, erro } = lerProfissional(req.body);
  if (erro) return res.status(400).json({ erro });
  const { rows } = await pool.query(
    `UPDATE profissionais SET nome = $1, cor = $2, ativo = COALESCE($3, ativo)
     WHERE id = $4 RETURNING *`,
    [dados.nome, dados.cor, typeof req.body.ativo === 'boolean' ? req.body.ativo : null, req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ erro: 'Profissional não encontrado' });
  res.json(rows[0]);
}));

app.delete('/profissionais/:id', rota(async (req, res) => {
  const { rowCount } = await pool.query('UPDATE profissionais SET ativo = FALSE WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ erro: 'Profissional não encontrado' });
  res.status(204).send();
}));

/* ---------- clientes ---------- */

function lerCliente(corpo) {
  const dados = { nome: texto(corpo.nome), telefone: texto(corpo.telefone), email: texto(corpo.email) };
  let erro = null;
  if (!dados.nome) erro = 'O nome é obrigatório';
  else if (dados.email && !/^\S+@\S+\.\S+$/.test(dados.email)) erro = 'Email inválido';
  return { dados, erro };
}

app.get('/clientes', rota(async (req, res) => {
  const { rows } = await pool.query(`
    SELECT c.*,
      COUNT(m.id) FILTER (WHERE m.estado = 'concluida')::int AS visitas,
      COUNT(m.id) FILTER (WHERE m.estado = 'faltou')::int AS faltas,
      MIN(m.inicio) FILTER (WHERE m.estado = 'marcada' AND m.inicio >= NOW()) AS proxima
    FROM clientes c LEFT JOIN marcacoes m ON m.cliente_id = c.id
    GROUP BY c.id ORDER BY c.nome`);
  res.json(rows);
}));

app.post('/clientes', rota(async (req, res) => {
  const { dados, erro } = lerCliente(req.body);
  if (erro) return res.status(400).json({ erro });
  const { rows } = await pool.query(
    'INSERT INTO clientes (nome, telefone, email) VALUES ($1, $2, $3) RETURNING *',
    [dados.nome, dados.telefone, dados.email]
  );
  res.status(201).json(rows[0]);
}));

app.put('/clientes/:id', rota(async (req, res) => {
  const { dados, erro } = lerCliente(req.body);
  if (erro) return res.status(400).json({ erro });
  const { rows } = await pool.query(
    'UPDATE clientes SET nome = $1, telefone = $2, email = $3 WHERE id = $4 RETURNING *',
    [dados.nome, dados.telefone, dados.email, req.params.id]
  );
  if (rows.length === 0) return res.status(404).json({ erro: 'Cliente não encontrado' });
  res.json(rows[0]);
}));

app.delete('/clientes/:id', rota(async (req, res) => {
  const { rows } = await pool.query('SELECT 1 FROM marcacoes WHERE cliente_id = $1 LIMIT 1', [req.params.id]);
  if (rows.length > 0) {
    return res.status(409).json({ erro: 'Este cliente tem marcações e não pode ser apagado' });
  }
  const { rowCount } = await pool.query('DELETE FROM clientes WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ erro: 'Cliente não encontrado' });
  res.status(204).send();
}));

/* ---------- disponibilidade ---------- */

app.get('/disponibilidade', rota(async (req, res) => {
  const { data, servico_id, profissional_id, ignorar } = req.query;
  if (!eData(data)) return res.status(400).json({ erro: 'Data inválida' });

  const servico = (await pool.query('SELECT * FROM servicos WHERE id = $1 AND ativo', [servico_id])).rows[0];
  if (!servico) return res.status(404).json({ erro: 'Serviço não encontrado' });

  const horario = await horarioDoDia(data);
  if (!horario || !horario.ativo) return res.json({ aberto: false, profissionais: [] });

  const profissionais = (
    await pool.query(
      `SELECT id, nome, cor FROM profissionais
       WHERE ativo AND ($1::int IS NULL OR id = $1::int) ORDER BY nome`,
      [profissional_id || null]
    )
  ).rows;

  const ocupadas = (
    await pool.query(
      `SELECT profissional_id,
              EXTRACT(HOUR FROM inicio)::int * 60 + EXTRACT(MINUTE FROM inicio)::int AS ini,
              EXTRACT(HOUR FROM fim)::int * 60 + EXTRACT(MINUTE FROM fim)::int AS fim
       FROM marcacoes
       WHERE estado <> 'cancelada' AND inicio >= $1::date AND inicio < $1::date + 1
         AND ($2::int IS NULL OR id <> $2::int)`,
      [data, ignorar || null]
    )
  ).rows;

  const agora = agoraLocal();
  const abre = minutos(horario.abre);
  const fecha = minutos(horario.fecha);

  const resultado = profissionais.map((p) => {
    const dele = ocupadas.filter((o) => o.profissional_id === p.id);
    const slots = [];
    for (let t = abre; t + servico.duracao_min <= fecha; t += PASSO_MIN) {
      if (`${data}T${emHHMM(t)}` < agora) continue;
      const livre = dele.every((o) => t + servico.duracao_min <= o.ini || t >= o.fim);
      if (livre) slots.push(emHHMM(t));
    }
    return { ...p, slots };
  });

  res.json({ aberto: true, duracao_min: servico.duracao_min, profissionais: resultado });
}));

/* ---------- marcações ---------- */

app.get('/marcacoes', rota(async (req, res) => {
  const { de, ate } = req.query;
  if (!eData(de) || !eData(ate)) return res.status(400).json({ erro: 'Intervalo de datas inválido' });
  const { rows } = await pool.query(
    `${SELECT_MARCACAO} WHERE m.inicio >= $1::date AND m.inicio < $2::date + 1 ORDER BY m.inicio`,
    [de, ate]
  );
  res.json(rows);
}));

app.get('/marcacoes/:id', rota(async (req, res) => {
  const marcacao = await carregarMarcacao(req.params.id);
  if (!marcacao) return res.status(404).json({ erro: 'Marcação não encontrada' });
  res.json(marcacao);
}));

async function resolverCliente(corpo) {
  if (corpo.cliente_id) {
    const { rows } = await pool.query('SELECT id FROM clientes WHERE id = $1', [corpo.cliente_id]);
    return rows[0] ? { id: rows[0].id } : { erro: 'Cliente não encontrado' };
  }
  const { dados, erro } = lerCliente(corpo.cliente || {});
  if (erro) return { erro };

  if (dados.telefone) {
    const existente = await pool.query('SELECT id FROM clientes WHERE telefone = $1 LIMIT 1', [dados.telefone]);
    if (existente.rows[0]) return { id: existente.rows[0].id };
  }
  const { rows } = await pool.query(
    'INSERT INTO clientes (nome, telefone, email) VALUES ($1, $2, $3) RETURNING id',
    [dados.nome, dados.telefone, dados.email]
  );
  return { id: rows[0].id };
}

app.post('/marcacoes', rota(async (req, res) => {
  const { servico_id, profissional_id, inicio, notas } = req.body;

  const servico = (await pool.query('SELECT * FROM servicos WHERE id = $1 AND ativo', [servico_id])).rows[0];
  if (!servico) return res.status(400).json({ erro: 'Serviço inválido' });
  const profissional = (
    await pool.query('SELECT id FROM profissionais WHERE id = $1 AND ativo', [profissional_id])
  ).rows[0];
  if (!profissional) return res.status(400).json({ erro: 'Profissional inválido' });

  const problema = await validarJanela(inicio, servico.duracao_min);
  if (problema) return res.status(400).json({ erro: problema });

  const cliente = await resolverCliente(req.body);
  if (cliente.erro) return res.status(400).json({ erro: cliente.erro });

  const { rows } = await pool.query(
    `INSERT INTO marcacoes (cliente_id, servico_id, profissional_id, inicio, fim, notas)
     VALUES ($1, $2, $3, $4::timestamp, $4::timestamp + ($5 || ' minutes')::interval, $6)
     RETURNING id`,
    [cliente.id, servico.id, profissional.id, inicio.slice(0, 16), servico.duracao_min, texto(notas)]
  );
  res.status(201).json(await carregarMarcacao(rows[0].id));
}));

// Reagendar: muda o início e/ou o profissional.
app.put('/marcacoes/:id', rota(async (req, res) => {
  const atual = await carregarMarcacao(req.params.id);
  if (!atual) return res.status(404).json({ erro: 'Marcação não encontrada' });
  if (atual.estado !== 'marcada') {
    return res.status(409).json({ erro: 'Só é possível reagendar marcações em estado "marcada"' });
  }

  const inicio = req.body.inicio ?? atual.inicio;
  const profissionalId = req.body.profissional_id ?? atual.profissional_id;
  const notas = req.body.notas !== undefined ? texto(req.body.notas) : atual.notas;

  const profissional = (
    await pool.query('SELECT id FROM profissionais WHERE id = $1 AND ativo', [profissionalId])
  ).rows[0];
  if (!profissional) return res.status(400).json({ erro: 'Profissional inválido' });

  const mudouHora = inicio.slice(0, 16) !== atual.inicio.slice(0, 16);
  if (mudouHora) {
    const problema = await validarJanela(inicio, atual.duracao_min);
    if (problema) return res.status(400).json({ erro: problema });
  }

  await pool.query(
    `UPDATE marcacoes
     SET profissional_id = $1, inicio = $2::timestamp,
         fim = $2::timestamp + ($3 || ' minutes')::interval, notas = $4
     WHERE id = $5`,
    [profissional.id, inicio.slice(0, 16), atual.duracao_min, notas, req.params.id]
  );
  res.json(await carregarMarcacao(req.params.id));
}));

app.patch('/marcacoes/:id/estado', rota(async (req, res) => {
  const { estado } = req.body;
  if (!ESTADOS.includes(estado)) return res.status(400).json({ erro: 'Estado inválido' });

  const { rowCount } = await pool.query('UPDATE marcacoes SET estado = $1 WHERE id = $2', [
    estado,
    req.params.id,
  ]);
  if (rowCount === 0) return res.status(404).json({ erro: 'Marcação não encontrada' });
  res.json(await carregarMarcacao(req.params.id));
}));

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`Servidor a correr em http://localhost:${PORT}`));
