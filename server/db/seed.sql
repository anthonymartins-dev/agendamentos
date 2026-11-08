-- Dados de demonstração (um atelier de cabeleireiro). Só corre se a base estiver vazia.
DO $$
DECLARE
  base DATE := date_trunc('week', CURRENT_DATE + 1)::DATE;  -- segunda-feira da semana em curso (ao domingo, a seguinte)
BEGIN
  IF EXISTS (SELECT 1 FROM marcacoes) OR EXISTS (SELECT 1 FROM servicos) THEN
    RETURN;
  END IF;

  INSERT INTO profissionais (id, nome, cor) VALUES
    (1, 'Rita Costa', '#24493c'),
    (2, 'Miguel Sousa', '#9a6a2f'),
    (3, 'Joana Pires', '#5b4f8a');

  INSERT INTO servicos (id, nome, duracao_min, preco) VALUES
    (1, 'Corte de cabelo', 30, 15),
    (2, 'Corte e barba', 45, 22),
    (3, 'Barba', 20, 10),
    (4, 'Coloração', 90, 45),
    (5, 'Tratamento capilar', 60, 30),
    (6, 'Penteado', 45, 25);

  INSERT INTO clientes (id, nome, telefone, email) VALUES
    (1, 'Ana Ribeiro', '912 345 678', 'ana.ribeiro@email.com'),
    (2, 'Bruno Martins', '923 456 789', 'bruno@email.com'),
    (3, 'Carla Nunes', '934 567 890', NULL),
    (4, 'Diogo Fernandes', '965 432 109', 'diogo.f@email.com'),
    (5, 'Eva Marques', '916 789 012', 'eva.marques@email.com'),
    (6, 'Filipe Gomes', '927 890 123', NULL),
    (7, 'Graça Lopes', '938 901 234', 'graca@email.com'),
    (8, 'Hugo Pereira', '919 012 345', 'hugo.p@email.com');

  PERFORM setval('profissionais_id_seq', 3);
  PERFORM setval('servicos_id_seq', 6);
  PERFORM setval('clientes_id_seq', 8);

  INSERT INTO marcacoes (cliente_id, servico_id, profissional_id, inicio, fim, estado)
  SELECT v.c, v.s, v.p,
         (base + v.d)::TIMESTAMP + v.t::TIME,
         (base + v.d)::TIMESTAMP + v.t::TIME + (sv.duracao_min || ' minutes')::INTERVAL,
         CASE WHEN (base + v.d)::TIMESTAMP + v.t::TIME < NOW() THEN 'concluida' ELSE 'marcada' END
  FROM (VALUES
    (1, 1, 1, 0, '09:30'), (2, 2, 1, 0, '10:30'), (3, 4, 3, 0, '10:00'), (4, 3, 2, 0, '15:00'),
    (5, 1, 2, 1, '09:00'), (6, 5, 3, 1, '14:00'), (7, 2, 1, 1, '16:00'), (1, 1, 2, 1, '17:00'),
    (8, 6, 3, 2, '11:00'), (2, 1, 1, 2, '11:00'), (3, 2, 2, 2, '14:30'), (4, 4, 3, 2, '15:00'),
    (5, 2, 1, 3, '10:00'), (6, 1, 2, 3, '10:30'), (7, 5, 3, 3, '16:00'),
    (8, 1, 1, 4, '09:30'), (1, 4, 3, 4, '10:00'), (2, 2, 2, 4, '12:00'), (3, 1, 1, 4, '15:30'), (4, 3, 2, 4, '17:30'),
    (5, 1, 1, 5, '10:00'), (6, 2, 2, 5, '11:00'), (7, 6, 3, 5, '14:00')
  ) AS v(c, s, p, d, t)
  JOIN servicos sv ON sv.id = v.s;

  UPDATE marcacoes SET estado = 'cancelada'
   WHERE cliente_id = 2 AND profissional_id = 1 AND inicio = (base + 2)::TIMESTAMP + TIME '11:00';
  UPDATE marcacoes SET estado = 'faltou'
   WHERE cliente_id = 4 AND profissional_id = 2 AND inicio = base::TIMESTAMP + TIME '15:00'
     AND inicio < NOW();
END $$;
