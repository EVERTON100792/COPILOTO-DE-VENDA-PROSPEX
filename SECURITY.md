# Segurança — PROSPEX AUTOPILOT

## Princípios

1. **Demo-first by default**: `DEMO_MODE=true` → nenhuma chamada externa,
   nenhum dado sai do navegador. Tudo é fictício e marcado como demo.
2. **Nunca inventar dados reais**: dados gerados são fictícios (`isDemo`).
   Em produção, `DiscoverAgent`/`demoFactory` não terão seed de empresas
   reais sem fonte legítima (busca com contrato/consentimento).
3. **Human-in-the-loop**: mensagens só saem após aprovação explícita por
   usuário. Não existe automação de envio direto sem revisão.
4. **Defesa em profundidade** para ações destrutivas: confirm dialogs,
   auditoria, e undo onde possível.

## Controles na aplicação

- **Interruptor mestre** (`Settings`): `ON | PAUSED | OFF` — quando
  `OFF`, nenhuma ação de envio/automação executa (verificado em
  `src/services/messaging.ts` e agentes).
- **Limites**: contatos/dia, contatos/hora, cooldown por empresa,
  limite de campanhas por dia (configuráveis em Settings).
- **Opt-out**: lead em `DO_NOT_CONTACT` bloqueia novos envios;
  links de opt-out nas mensagens.
- **Auditoria**: `auditLog` registra ator, ação, entidade, valores antigos/
  novos (login futuro obrigatório para registro).

## Segredos

- Variáveis de ambiente **nunca** vão para o repositório (`.env.local`
  ignorada; `.env.example` contém apenas nomes).
- Não commitar chaves de IA/API (segredo nos provedores de env do host).
- No front, chaves de Supabase são publicáveis por natureza (anon key);
  RLS é a barreira real (políticas por workspace em `001_init.sql`).

## Privacidade de dados

- LGPD: retenção configurável (`dataRetentionDays`, default 365).
- Dados demo identificados na UI (selo DEMO) para não serem confundidos
  com clientes reais.

## Vulnerabilidades conhecidas / roadmap

- Autenticação real (Supabase Auth) e RBAC no front: **em aberto** (demo
  usa usuário fixo). Não expor em produção sem auth.
- Sanitização/least-privilege do ambiente Supabase antes de habilitar
  persistência em produção (aplicar migrations + RLS).
- Testar CORS e CSP no host final (Vite gera CSP baseada em `index.html`).