# AGENTS.md — Guia para agentes de código neste projeto

## Comandos

- Build/typecheck: `npm run build` (executa `tsc -b && vite build`)
- Testes: `npm run test` (vitest) — deve manter 22+ testes passando
- Dev: `npm run dev` · Preview do build: `npm run preview` (porta 4173)

## Regras obrigatórias

1. **Nunca gravar arquivos com acentos via PowerShell/Shell** — corrompe
   UTF-8 no Windows. Usar sempre a ferramenta de escrita de arquivos.
2. **Seletores zustand estáveis**: `useApp((s) => s.leads.filter(...))` é
   proibido (novo array por render → loop "Maximum update depth").
   Selecionar o array cru e filtrar com `useMemo([dep, id])` no corpo.
3. **Demo-first**: `VITE_DEMO_MODE=true` default. Nunca inventar dados de
   empresas reais; dados fictícios precisam de `isDemo: true` + selo DEMO.
4. **Human-in-the-loop**: nenhum envio sem aprovação manual explícita.
5. **Interruptor mestre** (`settings.masterSwitch`) deve ser respeitado por
   toda ação de envio/automação (ver `src/services/messaging.ts`).
6. Novos agentes do pipeline: estender `AgentBase`, implementar `run()` e
   `verify()`, registrar `AgentRun`; devem ser idempotentes.
7. Não adicionar comentários desnecessários no código; manter o padrão
   pt-BR de mensagens/UI e inglês para código/identificadores.
8. Rodar `npm run build` e `npm run test` antes de concluir qualquer tarefa.

## Arquivos-chave

- `src/types/index.ts` — todos os tipos de domínio
- `src/services/store.ts` — estado global + persist (`prospex_`)
- `src/config/defaults.ts` — pesos de score, limites, labels
- `src/database/demoFactory.ts` — geração de dados demo
- `supabase/migrations/` — schema SQL + seed
