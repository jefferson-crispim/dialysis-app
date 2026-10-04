# Nefro — controle de hemodiálise e diálise peritoneal

Next.js (App Router) + Supabase (Auth, Postgres com RLS, Storage) + Tailwind. Deploy na Vercel.
Todas as tabelas ficam no schema `nefro`, para dividir o projeto Supabase com o site pessoal sem colisões.

## Primeira configuração (uma vez)

1. **Banco:** no Supabase (projeto compartilhado), abra *SQL Editor* e execute, nesta ordem,
   `supabase/migrations/0001_schema.sql`, `0002_rls.sql`, `0003_views.sql`, `0004_nursing_process.sql` e `0005_guided_assessment.sql`.
2. **Expor o schema:** *Settings → API → Exposed schemas* → adicione `nefro`.
3. **Login social:** *Authentication → Providers* → habilite **Google** e **LinkedIn (OIDC)**.
   Em *URL Configuration* adicione `http://localhost:3000/auth/callback` e `https://SEU-APP.vercel.app/auth/callback`.
4. **Variáveis:** copie `.env.example` para `.env.local` e preencha (mesmos valores do `website_pessoal/.env`):
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (só servidor), `NEXT_PUBLIC_SITE_URL`.

## Rodar

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest
```

Teste com a planilha real: `MOVIMENTO_DP_XLSX="C:\...\Movimento DP.xlsx" npm test`.
Carga inicial por script: `npx tsx scripts/import-local.ts "<arquivo>" <ORG_ID> <USER_ID>`.

## Deploy na Vercel

Crie um repositório, importe na Vercel (framework Next.js) e cadastre as quatro variáveis acima
(`NEXT_PUBLIC_SITE_URL` = URL de produção). Funções aceitam upload de até 4 MB.

## Estrutura

- `src/lib/clinical` — Kt/V (Daugirdas II), TFG (CKD-EPI 2021, MDRD), BCM, alertas. Testes em `clinical.test.ts`.
- `src/lib/import` — leitura da planilha (`sheetMap`, `parse`), gravação idempotente (`commit`), planilhas modelo (`templates`).
- `src/lib/today.ts` — regras da fila "Hoje".
- `src/app/(app)` — Hoje, Pacientes, Lançar, Painéis, Importar, Ajustes.
- `supabase/migrations` — DDL, RLS e views.

## Atenção

- Metas e regras clínicas (KDOQI/KDIGO, Portaria SAS/MS 389/2014, COFEN 736/2024) são apoio à decisão e precisam de validação
  por enfermeira(o) e nefrologista antes do uso assistencial.
- A planilha real contém dados de saúde (LGPD): não versionar, não compartilhar.
