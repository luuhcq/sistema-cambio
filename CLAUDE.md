# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

**Backend** (`backend/`): Django 6 + Django Ninja + PostgreSQL + simplejwt  
**Frontend** (`frontend/`): React 19 + Vite + TailwindCSS v4 + TanStack Query + react-hook-form + zod

API docs: `http://localhost:8000/api/docs`

## Critical design rules

- **Financial fields on `Operacao` are never stored** — `iof_nominal`, `tarifa_nominal`, `vet`, `spread`, `comissao_bruta`, `comissao_liquida` are all `@property` computed at read time. Never add DB columns for them.
- **`LogExclusaoBoleta` is immutable** — raises on update or delete by design. Do not work around this.
- **HMAC integrity** — every `Operacao` has `hash_integridade` (HMAC-SHA256 of `montante|taxa_cliente|spot|caminho|moeda`). Generated in `hmac_utils.gerar_hmac()`, requires `HMAC_SECRET_KEY` env var. Always regenerate when saving critical fields.
- **Roles via Django Groups** — `Gestor`, `Operador`, `Auditor`. Use helpers in `operacoes/permissions.py`, not raw group checks. Superusers are treated as Gestor.
- **CPF/CNPJ** — stored as digits only (formatting stripped on save). `Cliente.tipo` (`PF`/`PJ`) is auto-derived from document length.

## Commands

```bash
# Backend (from backend/)
python manage.py runserver
python manage.py migrate
python manage.py test operacoes
python manage.py test operacoes.tests.TestClassName.test_method_name

# Frontend (from frontend/)
npm run dev      # http://localhost:5173
npm run lint
npm run build
```

## Environment variables

**backend `.env`**
```
SECRET_KEY=
DEBUG=True
HMAC_SECRET_KEY=
DATABASE_URL=                        # local fallback: cambio_dev / cambio_user / cambio123 @ localhost:5432
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:5173
```

**frontend `.env`**
```
VITE_API_URL=http://localhost:8000/api
```

## Architecture

### Backend

All business logic lives in the single `operacoes` app. `core/` is Django project config only.

```
operacoes/
  models.py       # All domain models
  api.py          # NinjaAPI root — mounts all routers under /api/
  auth.py         # JWTAuth (HttpBearer via simplejwt)
  permissions.py  # Role helpers: pode_criar_boleta, pode_editar_boleta, pode_aprovar, etc.
  hmac_utils.py   # gerar_hmac / verificar_hmac
  schemas.py      # Ninja In/Out schemas (Pydantic)
  routers/        # auth, cadastros, operacoes, ptax, configuracoes, dashboard, relatorios, solicitacoes, usuarios
```

### Domain models (key relationships)

- **`Operacao`** (boleta) → FK to `Cliente`, `Moeda`, `Parceiro`; has `status` (`RASCUNHO → PENDENTE → CONFIRMADA | CANCELADA`) and edit-request workflow via `SolicitacaoEdicao`.
- **`TarifaConfig`** / **`IOFConfig`** / **`ComissaoConfig`** — config tables resolved at compute time by `Operacao` properties. `TarifaConfig` falls back through `tipo_pessoa`/`caminho` combinations; `IOFConfig` falls back to `"Demais modalidades"`.
- **`SolicitacaoEdicao`** — Operador requests field edits on a confirmed boleta; Gestor approves/rejects.
- **`UserProfile`** — OneToOne to User, carries `deve_trocar_senha`.

### Frontend

Auth tokens in `localStorage` (`access_token`, `refresh_token`). `src/api/axios.js` injects bearer token on every request and auto-refreshes on 401. `AuthContext` holds the logged-in user and role.

Pages map 1:1 to routes: `/`, `/boletas`, `/clientes`, `/configuracoes`, `/solicitacoes`, `/usuarios`. All data fetching via TanStack Query; forms via react-hook-form + zod.

### Deployment

Heroku-compatible. `Procfile` runs `collectstatic → migrate → criar_superuser → gunicorn`. WhiteNoise serves static files. `DATABASE_URL` requires SSL in production.
