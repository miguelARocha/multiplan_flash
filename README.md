# Multiplan Flash

MVP de ofertas relampago para shopping, com lojistas publicando promocoes e compradores acompanhando ofertas em tempo real.

O projeto atende ao desafio fullstack com backend NestJS, frontend React, banco PostgreSQL, WebSocket, testes Jest e ambiente Docker Compose.

## Funcionalidades

- Registro e login com JWT.
- Perfis de usuario: `LOJISTA` e `COMPRADOR`.
- Dashboard do lojista para criar, editar, encerrar, reativar e excluir ofertas.
- Feed do comprador com ofertas ativas, filtros, historico de interesses e acao de demonstrar/desistir interesse.
- Estoque decrementado/restaurado em transacao ao registrar ou remover interesse.
- Notificacoes em tempo real via Socket.IO:
  - compradores recebem novas ofertas e atualizacoes;
  - lojistas recebem novos interesses.
- API documentada com Swagger e arquivo OpenAPI em `infra/openapi.yaml`.

## Stack

- Backend: Node.js 22, NestJS, TypeScript, Prisma, Jest, Socket.IO.
- Frontend: React, TypeScript, Vite, React Router, Socket.IO Client.
- Banco: PostgreSQL 16.
- Containerizacao: Docker Compose.

## Estrutura

```text
backend/   API NestJS, Prisma, testes e Dockerfile do backend
frontend/  SPA React + Vite e Dockerfile/Nginx do frontend
infra/     Especificacao OpenAPI para clientes HTTP
```

## Como rodar com Docker

Pre-requisitos:

- Docker e Docker Compose.
- Node.js 22 recomendado para comandos locais de Prisma/testes.

Suba banco, backend e frontend:

```bash
docker compose up --build
```

Esse comando tambem aplica as migrations do Prisma antes de iniciar o backend. Quando as tabelas ja existem, o backend apenas confirma que o banco esta atualizado e sobe normalmente.

Servicos:

- Frontend: http://localhost:5173
- API: http://localhost:3000/api/v1
- Swagger: http://localhost:3000/api/docs
- PostgreSQL: `localhost:5433`

Usuarios seed:

| Perfil | Email | Senha |
|---|---|---|
| Lojista | `lojista@multiplan.local` | `Lojista@123` |
| Comprador | `comprador@multiplan.local` | `Comprador@123` |

## Como rodar localmente

Suba apenas o banco:

```bash
docker compose up -d banco
```

Backend:

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Variaveis principais:

- Backend: `backend/.env`
- Frontend:
  - `VITE_API_BASE_URL`, padrao `http://localhost:3000/api/v1`
  - `VITE_SOCKET_URL`, padrao `http://localhost:3000/offers`

## Testes e qualidade

Backend:

```bash
cd backend
npm run test:unit
npm run test:e2e
npm run build
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

Observacao: nos testes locais deste projeto, o runtime com Node 22 foi o caminho validado. Uma execucao com Node 25 apresentou falhas relacionadas ao Prisma.

## API

A API usa prefixo versionado:

```text
/api/v1
```

Principais grupos:

- `POST /auth/register`: cria usuario.
- `POST /auth/login`: autentica e retorna JWT.
- `GET /auth/me`: retorna usuario autenticado.
- `GET /offers`: lista ofertas publicas, com filtro por status.
- `POST /offers`: lojista cria oferta.
- `GET /offers/mine`: lojista lista suas ofertas.
- `PATCH /offers/:id`: lojista edita sua oferta.
- `PATCH /offers/:id/close`: lojista encerra sua oferta.
- `POST /offers/:offerId/interests`: comprador registra interesse.
- `DELETE /offers/:offerId/interests`: comprador remove interesse.
- `GET /interests/mine`: comprador lista historico de interesses.

Rotas autenticadas usam header:

```text
Authorization: Bearer <token>
```

Para detalhes de payloads e respostas, use o Swagger em `http://localhost:3000/api/docs` ou importe `infra/openapi.yaml` no cliente HTTP.

## Decisoes tecnicas e trade-offs

- Valores monetarios sao salvos em centavos (`priceInCents`) para evitar erro de ponto flutuante.
- Regras de negocio ficam nos services; controllers permanecem focados em entrada e saida HTTP.
- Registro/remocao de interesse usa transacao para manter estoque consistente.
- Oferta expirada ou sem estoque nao aceita novo interesse.
- WebSocket usa namespace `/offers` e autenticacao por JWT no handshake.
- O frontend persiste a sessao em `localStorage` para simplificar o MVP.

## Observacoes de entrega

- O compose publica backend em `3000`, frontend em `5173` e banco em `5433`.
- O seed cria os usuarios padrao quando o backend inicia.
- Caso o banco seja recriado do zero, o backend aplica as migrations automaticamente ao subir pelo Docker Compose.
- Foi utilizado o servico de IA Google Stitch para producao de conceito de design do frontend.
