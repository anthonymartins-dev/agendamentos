CREATE EXTENSION IF NOT EXISTS btree_gist;

-- dia_semana segue a norma ISO: 1 = segunda ... 7 = domingo
CREATE TABLE IF NOT EXISTS horario (
  dia_semana INT PRIMARY KEY CHECK (dia_semana BETWEEN 1 AND 7),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  abre TIME NOT NULL DEFAULT '09:00',
  fecha TIME NOT NULL DEFAULT '19:00',
  CHECK (abre < fecha)
);

CREATE TABLE IF NOT EXISTS servicos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  duracao_min INT NOT NULL CHECK (duracao_min > 0 AND duracao_min <= 480),
  preco NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (preco >= 0),
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS profissionais (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  cor VARCHAR(7) NOT NULL DEFAULT '#24493c',
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  telefone VARCHAR(30),
  email VARCHAR(150),
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marcacoes (
  id SERIAL PRIMARY KEY,
  cliente_id INT NOT NULL REFERENCES clientes(id),
  servico_id INT NOT NULL REFERENCES servicos(id),
  profissional_id INT NOT NULL REFERENCES profissionais(id),
  inicio TIMESTAMP NOT NULL,
  fim TIMESTAMP NOT NULL,
  estado VARCHAR(10) NOT NULL DEFAULT 'marcada'
    CHECK (estado IN ('marcada', 'concluida', 'cancelada', 'faltou')),
  notas TEXT,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (fim > inicio),
  -- A própria base de dados impede dois atendimentos sobrepostos ao mesmo profissional.
  EXCLUDE USING gist (
    profissional_id WITH =,
    tsrange(inicio, fim) WITH &&
  ) WHERE (estado <> 'cancelada')
);

CREATE INDEX IF NOT EXISTS idx_marcacoes_inicio ON marcacoes (inicio);
CREATE INDEX IF NOT EXISTS idx_marcacoes_cliente ON marcacoes (cliente_id);

INSERT INTO horario (dia_semana, ativo, abre, fecha) VALUES
  (1, TRUE, '09:00', '19:00'),
  (2, TRUE, '09:00', '19:00'),
  (3, TRUE, '09:00', '19:00'),
  (4, TRUE, '09:00', '19:00'),
  (5, TRUE, '09:00', '19:00'),
  (6, TRUE, '09:00', '17:00'),
  (7, FALSE, '09:00', '13:00')
ON CONFLICT (dia_semana) DO NOTHING;
