# AI QUALIFICATION ENGINE (FASE 3) — PROSPEX AUTOPILOT

## 1. Visão Geral
A **Fase 3 — AI Qualification Engine** adiciona uma camada profissional de análise de oportunidade comercial, qualificação de leads e explicabilidade sobre os dados de empresas reais descobertas na Fase 2 (OpenStreetMap/Overpass ou CSV).

---

## 2. Arquitetura do Pipeline

```text
DISCOVERY (Fase 2)
  ↓
EMPRESA REAL (OpenStreetMap / Overpass / CSV)
  ↓
NORMALIZAÇÃO & DEDUPLICAÇÃO
  ↓
WEBSITE SCANNER & QUALITY
  ↓
RULE-BASED QUALIFICATION (Algoritmo Determinístico)
  ↓
AI QUALIFICATION ENGINE (OpenRouter / OpenAI — Opcional)
  ↓
FINAL SCORE & RANKING DE OPORTUNIDADE
  ↓
DIAGNÓSTICO & RECOMENDAÇÃO DE ABORDAGEM (Rascunho FASE 4)
```

---

## 3. Princípios Fundamentais

1. **A IA NÃO é a Fonte da Verdade**: A IA apenas interpreta dados reais previamente capturados das fontes públicas. Nenhuma informação factual (telefone, endereço, faturamento, redes sociais) é alucinada ou inventada.
2. **Linguagem Comercial Segura para Ausência de Site**: O sistema utiliza a qualificação `WEBSITE_NOT_FOUND` / `NO_WEBSITE_IDENTIFIED` e a linguagem *"Não identificamos um site oficial registrado nas fontes públicas consultadas"* em vez de afirmativas absolutas falsas.
3. **Modo sem IA (Rule-Based Fallback)**: Se a chave do OpenRouter não for configurada ou o serviço estiver temporariamente indisponível, o sistema executa a qualificação 100% determinística sem travar.
4. **Cache por Input Hash (`qualificationInputHash`)**: Evita chamadas duplicadas à IA para dados idênticos não alterados.
5. **Human-in-the-loop**: Nenhuma mensagem ou contato comercial é enviado automaticamente nesta fase.

---

## 4. Estrutura dos Registros (`LeadQualification`)

Tabela Postgres / Supabase: `lead_qualifications` (Migration `004_ai_qualification.sql`).

- **`ruleBasedScore`**: Pontuação determinística (0-100).
- **`aiScore`**: Pontuação calculada pela IA (0-100) quando ativa.
- **`finalScore`**: Score ponderado (70% Regras + 30% IA com IA ativa; ou 100% Regras).
- **`qualification`**: Classificação (`HIGH` | `MEDIUM` | `LOW` | `UNVERIFIED`).
- **`qualificationMethod`**: (`AI` | `RULE_BASED` | `RULE_BASED_FALLBACK` | `DEMO`).
- **`opportunityTypes`**: Tipos de oportunidade identificados (`NO_WEBSITE_IDENTIFIED`, `LOW_QUALITY_WEBSITE`, `MOBILE_ISSUE`, `WEAK_DIGITAL_PRESENCE`, etc.).
- **`positiveSignals` & `negativeSignals`**: Sinais prós e contras.
- **`evidence`**: Evidências rastreáveis vinculadas às fontes.
- **`recommendedService`**: Serviço recomendado (`WEBSITE_INSTITUTIONAL`, `LANDING_PAGE`, `WEBSITE_REDESIGN`, etc.).
- **`recommendedApproach`**: Orientação consultiva para abordagem.
- **`inputHash`**: Hash MD5/string determinístico para reaproveitamento em cache.

---

## 5. Configuração & Variáveis

- **`VITE_AI_API_KEY` / `VITE_OPENROUTER_API_KEY`**: Chave de API do OpenRouter.
- **`VITE_AI_MODEL`**: Modelo selecionado (padrão: `openrouter/auto` ou `openai/gpt-4o-mini`).
- **`aiMode`**: `OPTIONAL` (padrão), `DISABLED`, ou `REQUIRED`.

 Configurável na interface em `/integrations`.
