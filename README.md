# Agendamentos

Sistema de marcações para negócios com atendimento por hora (cabeleireiros, barbearias,
clínicas, explicações). Agenda visual em vista de dia e de semana, com horários livres
calculados em tempo real. Projeto 3 de uma série de 6 ferramentas para pequenos negócios.

## Funcionalidades

- Agenda por **dia** (uma coluna por profissional) e por **semana** (um profissional, sete dias)
- Marcação em três passos: serviço, dia, horário livre. Também se pode clicar numa hora vazia da agenda
- **Sem conflitos:** a própria base de dados recusa duas marcações sobrepostas ao mesmo profissional
- Horários livres calculados com base na duração do serviço, no horário de funcionamento e nas marcações existentes
- Reagendar, marcar como concluída, faltou ou cancelada (e restaurar)
- Clientes criados na marcação ou à parte, com histórico de visitas e faltas
- Definições: horário semanal, serviços (duração e preço) e equipa (cor na agenda)
- Indicadores do período visível: marcações, concluídas, faltas e receita prevista

### Regras de negócio

- Só se marca dentro do horário de funcionamento e nunca no passado
- A duração do serviço define o fim da marcação
- Cancelar liberta o horário
- Serviços e profissionais são arquivados em vez de apagados, para manter o histórico
- Um cliente com marcações não pode ser apagado

## Stack

| Camada | Tecnologia |
|---|---|
| Interface | React 19, Vite, Tailwind CSS 4 |
| API | Node.js, Express 5 (REST) |
| Base de dados | PostgreSQL (`btree_gist` para a restrição de exclusão) |

A restrição que impede sobreposições está no esquema, não só no código:

```sql
EXCLUDE USING gist (
  profissional_id WITH =,
  tsrange(inicio, fim) WITH &&
) WHERE (estado <> 'cancelada')
```

## Como correr

Requisitos: Node.js 20+ e PostgreSQL 15+ (com as extensões `contrib`).

```bash
# 1. Base de dados
createdb agendamentos
psql -d agendamentos -f server/db/schema.sql
psql -d agendamentos -f server/db/seed.sql   # dados de demonstração (opcional)

# 2. API
cd server
cp .env.example .env     # ajusta o utilizador e a palavra-passe
npm install
npm start                # http://localhost:3003

# 3. Interface (noutro terminal)
cd client
npm install
npm run dev              # http://localhost:5173
```

## API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/marcacoes?de=&ate=` | Marcações num intervalo de datas |
| POST | `/marcacoes` | Cria uma marcação (cliente existente ou novo) |
| PUT | `/marcacoes/:id` | Reagenda (hora e/ou profissional) |
| PATCH | `/marcacoes/:id/estado` | Muda o estado |
| GET | `/disponibilidade?data=&servico_id=` | Horários livres por profissional |
| GET, PUT | `/horario` | Horário de funcionamento |
| GET, POST, PUT, DELETE | `/servicos` | Serviços (DELETE arquiva) |
| GET, POST, PUT, DELETE | `/profissionais` | Equipa (DELETE arquiva) |
| GET, POST, PUT, DELETE | `/clientes` | Clientes |

O endpoint `/disponibilidade` foi pensado para ser reutilizado pelo bot de marcações (projeto 6).

## Estrutura

```
agendamentos/
  client/   interface React
  server/   API Express e esquema SQL
```
