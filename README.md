# CRM-Flow

Microserviço CRM (contatos, empresas, negócios, funil, atividades) do ecossistema OnlyFlow.

## Stack

- Node.js + Express + TypeScript
- PostgreSQL + Prisma
- JWT (mesmo secret do Backend OnlyFlow)
- Multi-tenant via `x-onlyflow-tenant-id` (conta efetiva) ou `userId` do token

## Desenvolvimento local

```bash
cp .env.example .env
# JWT_SECRET = mesmo do Backend OnlyFlow
# DATABASE_URL = obrigatório (Prisma não usa POSTGRES_URI)
npm install
npm run setup:db
npm run dev
```

### Postgres já usado pelo OnlyFlow (`sandbox`) — erro P3005

O `migrate deploy` exige base **vazia**. No `sandbox` isso falha com **P3005**. Use:

```bash
npm run setup:db
# Só na primeira vez, se `migrate deploy` deu P3005:
npm run setup:db:baseline
```

`setup:db` = `prisma db push` (schema `crm_flow`). Pode correr várias vezes.

`setup:db:baseline` = marca a migration como aplicada (uma vez). Se aparecer **P3008**, já está feito — ignore.

**Docker** (base nova/vazia): `docker compose up -d crm-flow-db`, `DATABASE_URL=postgresql://crmflow:crmflow@localhost:5434/crmflow`, depois `npm run prisma:migrate`.

**Sem Docker**: mesmo Postgres do MindClerky (`...@host:5433/sandbox`). Tabelas no schema **`crm_flow`** (não conflita com `contacts` do Chat em `public`).

API: `http://localhost:4340/api/crm-flow`

## Integração OnlyFlow

O Frontend chama `https://<backend>/api/crm-flow/*` (proxy com JWT + header de tenant).

Variáveis no **Backend**:

```env
CRM_FLOW_SERVICE_URL=http://localhost:4340
```

## Endpoints (Fase 1)

- `GET /dashboard`
- CRUD `/contacts`, `/companies`, `/deals`, `/products`
- `PATCH /deals/:id/move-stage`
- Vínculos `/deals/:dealId/contacts`, `/deals/:dealId/products`
- `/activities` + `PATCH /activities/:id/complete`
- `/timeline/contact|company|deal/:id`
