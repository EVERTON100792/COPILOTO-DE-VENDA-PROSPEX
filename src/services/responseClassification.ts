import { useApp } from './store'
import { nowIso } from '../lib/utils'
import { logger } from '../lib/logger'
import { callAI } from './aiClient'
import { SALES_BRAIN_PROMPT } from './salesBrainPrompt'
import type { Lead, ResponseAnalysis, ResponseCategory, Company } from '../types'

const OPT_OUT_PATTERNS = [
  /não\s+quero/i,
  /pare\s+de/i,
  /não\s+envie/i,
  /remover/i,
  /tirar\s+do\s+cadastro/i,
  /descadastrar/i,
  /opt-out/i,
  /spam/i,
  /bloquead/i,
]

const INTEREST_PATTERNS = [
  /interesse/i,
  /gostaria/i,
  /quanto\s+custa/i,
  /qual\s+o\s+valor/i,
  /pode\s+mandar/i,
  /como\s+funciona/i,
  /me\s+manda/i,
  /vamos\s+conversar/i,
  /sim/i,
]

const PRICE_PATTERNS = [/preço/i, /valor/i, /custa/i, /orçamento/i, /tabela/i]

/** Categorias que encerram a conversa — não chamar IA de novo */
const FINAL_CATEGORIES: readonly ResponseCategory[] = ['OPT_OUT', 'NOT_INTERESTED']

// Cache: mesma mensagem/lead → mesma análise, sem custo de IA
const replyCache = new Map<string, ResponseAnalysis>()

// Formata o histórico das mensagens de outreach do lead como contexto
function formatHistory(messages: Array<{ body?: string; content?: string; sentAt?: string | null }> | undefined): string {
  if (!messages || messages.length === 0) return ''
  return messages
    .slice(-40)
    .filter((m) => (m.body || m.content || '').trim())
    .map((m) => `Vendedor (nós): ${m.body || m.content || ''}`)
    .join('\n')
}

// ── Motor de palavras-chave (fallback automático se a IA falhar) ──────────
export function analyzeLeadReplyText(text: string): ResponseAnalysis {
  const clean = text.trim()
  const lower = clean.toLowerCase()

  // 1. Opt-out check (Priority over simple not interested)
  for (const pattern of OPT_OUT_PATTERNS) {
    if (pattern.test(lower)) {
      return {
        category: 'OPT_OUT',
        intentScore: 0,
        confidence: 0.95,
        summary: 'O cliente solicitou a remoção ou interrupção do contato.',
        suggestedNextAction: 'Marcar lead como DO_NOT_CONTACT e encerrar abordagens.',
        suggestedReply: 'Entendido. Já removemos seu contato de nossa lista. Pedimos desculpas pelo incômodo.',
        createdAt: nowIso(),
      }
    }
  }

  // 2. Not interested check
  if (/não\s+tenho\s+interesse/i.test(lower) || /não\s+preciso/i.test(lower) || /obrigado,\s*mas\s*não/i.test(lower)) {
    return {
      category: 'NOT_INTERESTED',
      intentScore: 10,
      confidence: 0.9,
      summary: 'O cliente informou que não tem interesse no momento.',
      suggestedNextAction: 'Marcar lead como NOT_INTERESTED e encerrar sequência de follow-up.',
      suggestedReply: 'Agradeço o retorno! Se no futuro precisarem de algo, continuamos à disposição.',
      createdAt: nowIso(),
    }
  }

  // 3. Price inquiry check
  for (const p of PRICE_PATTERNS) {
    if (p.test(lower)) {
      return {
        category: 'PRICE',
        intentScore: 85,
        confidence: 0.9,
        summary: 'O cliente perguntou o valor ou solicitou orçamento.',
        suggestedNextAction: 'Apresentar orçamento/proposta de solução (SEND_PROPOSAL).',
        suggestedReply: 'Ótimo! Nossos projetos de website institucional para negócios locais ficam a partir de uma solução personalizada. Posso te enviar uma demonstração com os detalhes?',
        createdAt: nowIso(),
      }
    }
  }

  // 4. Interest check
  for (const p of INTEREST_PATTERNS) {
    if (p.test(lower)) {
      return {
        category: 'INTERESTED',
        intentScore: 90,
        confidence: 0.9,
        summary: 'O cliente demonstrou interesse em conhecer a solução.',
        suggestedNextAction: 'Agendar conversa ou enviar demonstração personalizada.',
        suggestedReply: 'Excelente! Vou preparar um modelo de visualização para a sua empresa. Qual o melhor horário para conversarmos rapidamente?',
        createdAt: nowIso(),
      }
    }
  }

  // 5. Question check
  if (/\?/i.test(lower)) {
    return {
      category: 'QUESTION',
      intentScore: 70,
      confidence: 0.8,
      summary: 'O cliente fez uma pergunta sobre o serviço ou empresa.',
      suggestedNextAction: 'Responder à dúvida consultivamente e sugerir demonstração.',
      suggestedReply: 'Boa pergunta! Nossa solução inclui design responsivo, otimização para mobile e integração direta com WhatsApp. Quer dar uma olhada em uma demonstração?',
      createdAt: nowIso(),
    }
  }

  // Default / Unknown
  return {
    category: 'UNKNOWN',
    intentScore: 50,
    confidence: 0.6,
    summary: 'Resposta genérica recebida.',
    suggestedNextAction: 'Analisar manualmente a resposta do cliente no CRM.',
    suggestedReply: 'Obrigado pela resposta! Fico à disposição caso queira entender mais sobre como podemos ajudar sua empresa.',
    createdAt: nowIso(),
  }
}

const AI_CATEGORY_MAP: Record<string, ResponseCategory> = {
  INTERESTED: 'INTERESTED',
  PRICE: 'PRICE',
  QUESTION: 'QUESTION',
  LATER: 'LATER',
  NOT_INTERESTED: 'NOT_INTERESTED',
  OPT_OUT: 'OPT_OUT',
  PEDIU_PARAR: 'OPT_OUT',
  WON: 'INTERESTED',
  UNKNOWN: 'UNKNOWN',
}

// ── Classificação por IA com contexto da conversa completa ─────────────────
async function analyzeLeadReplyTextAI(
  lead: Lead,
  company: Company | undefined,
  replyText: string,
  history?: Array<{ body?: string; content?: string; sentAt?: string | null }>
): Promise<ResponseAnalysis> {
  const historyText = formatHistory(history)
  const fallback = analyzeLeadReplyText(replyText)

  const systemPrompt = `${SALES_BRAIN_PROMPT}

O sistema solicita a CLASSIFICAÇÃO DA INTENÇÃO da resposta de um lead recebida via WhatsApp.
Empresa prospectada: ${company?.name || 'Cliente'}, tipo de negócio: ${company?.category || 'Negócio Local'} (${company?.city || ''}).
${historyText ? `\nHISTÓRICO COMPLETO DA CONVERSA ATÉ AQUI:\n${historyText}` : ''}

A última mensagem (do cliente) é a que será classificada.

Retorne EXATAMENTE um JSON válido:
{
  "category": "INTERESTED" | "PRICE" | "QUESTION" | "LATER" | "NOT_INTERESTED" | "OPT_OUT" | "UNKNOWN",
  "confidence": 0.0 a 1.0,
  "summary": "Resumo em 1 frase curta da intenção do cliente",
  "suggestedNextAction": "Próxima ação tática para o vendedor",
  "suggestedReply": "Resposta pronta para enviar no WhatsApp, coerente com o histórico"
}
- "OPT_OUT" apenas quando o cliente pedir claramente para parar de receber contato (remover, parar, spam, descadastrar).
- Use o histórico completo para não se contradizer com o que já foi dito.`

  try {
    const raw = await callAI({
      systemPrompt,
      userMessage: `Última resposta do cliente: "${replyText}"`,
      temperature: 0.2,
    })
    const cleaned = raw.replace(/```json\s*|```/g, '').trim()
    const json = JSON.parse(cleaned)

    const aiCategory = AI_CATEGORY_MAP[json.category] || fallback.category
    const confidenceRaw = Number(json.confidence)
    const confidence = Number.isFinite(confidenceRaw) && confidenceRaw > 0 && confidenceRaw <= 1
      ? Math.round(confidenceRaw * 100) / 100
      : fallback.confidence

    const intentScoreMap: Record<string, number> = {
      INTERESTED: 90, PRICE: 85, QUESTION: 70, LATER: 40, NOT_INTERESTED: 10, OPT_OUT: 0, UNKNOWN: 50,
    }

    return {
      category: aiCategory,
      intentScore: intentScoreMap[aiCategory] ?? 50,
      confidence,
      summary: json.summary || fallback.summary,
      suggestedNextAction: json.suggestedNextAction || fallback.suggestedNextAction,
      suggestedReply: json.suggestedReply || fallback.suggestedReply,
      createdAt: nowIso(),
    }
  } catch (err) {
    logger.warn('OUTREACH', 'Falha na classificação por IA, usando motor de palavras-chave', err instanceof Error ? err.message : String(err))
    return { ...fallback, createdAt: nowIso() }
  }
}

export class ResponseClassificationService {
  async recordLeadReply(leadId: string, replyText: string): Promise<ResponseAnalysis> {
    const s = useApp.getState()
    const lead = s.leads.find((l) => l.id === leadId)
    if (!lead) throw new Error(`Lead ${leadId} não encontrado.`)

    // Conversa encerrada → reutiliza análise anterior (sem custo de IA)
    if (FINAL_CATEGORIES.includes(lead.status as ResponseCategory)) {
      const cached = replyCache.get(`final:${leadId}`)
      if (cached) return cached
    }

    const company = s.companies.find((c) => c.id === lead.companyId)

    // Histórico completo das mensagens de outreach do lead
    const history = s.outreachMessages
      .filter((m) => m.leadId === lead.id)
      .map((m) => ({ body: m.body, sentAt: m.sentAt }))

    const cacheKey = `reply:${leadId}:${replyText.trim().slice(0, 120)}`
    const cached = replyCache.get(cacheKey)
    const analysis = cached ?? (s.settings.demoMode
      ? analyzeLeadReplyText(replyText)
      : await analyzeLeadReplyTextAI(lead, company, replyText, history))

    replyCache.set(cacheKey, analysis)
    replyCache.set(`final:${leadId}`, {
      ...analysis,
      suggestedNextAction: analysis.category === 'OPT_OUT'
        ? 'Lead em DO_NOT_CONTACT — abordagens encerradas.'
        : 'Conversa encerrada — lead em status final. Guarde este lead para reaquecimento futuro.',
    })
    // Mantém apenas as últimas 200 entradas no cache
    if (replyCache.size > 200) {
      const keys = [...replyCache.keys()]
      for (const k of keys.slice(0, replyCache.size - 200)) replyCache.delete(k)
    }

    // Event sourcing
    s.pushOutreachActivity({
      id: `act_${Date.now()}`,
      workspaceId: s.workspaceId,
      leadId: lead.id,
      campaignId: lead.campaignId,
      type: analysis.category === 'OPT_OUT' ? 'OPT_OUT' : 'RESPONSE_RECEIVED',
      channel: 'MANUAL',
      direction: 'INBOUND',
      summary: `Resposta recebida (${analysis.category}): "${replyText.slice(0, 60)}..."`,
      detail: analysis.summary,
      actor: company?.name ?? 'Cliente',
      createdAt: nowIso(),
    })

    // If OPT_OUT -> automatic safety blocking
    if (analysis.category === 'OPT_OUT') {
      s.upsertCompany({
        ...(company ?? {
          id: lead.companyId,
          workspaceId: s.workspaceId,
          name: 'Empresa',
          category: null,
          city: null,
          state: null,
          address: null,
          phone: null,
          whatsapp: null,
          email: null,
          website: null,
          instagram: null,
          facebook: null,
          rating: null,
          reviewCount: null,
          hours: null,
          source: null,
          isDemo: false,
          createdAt: nowIso(),
        }),
        doNotContact: true,
      })

      s.upsertLead({
        ...lead,
        status: 'DO_NOT_CONTACT',
        updatedAt: nowIso(),
      })

      logger.info('OUTREACH', `Lead ${lead.id} solicitou OPT_OUT. Marcado como DO_NOT_CONTACT.`)
    } else if (analysis.category === 'INTERESTED' || analysis.category === 'PRICE') {
      s.upsertLead({
        ...lead,
        status: 'INTERESTED',
        nextAction: analysis.suggestedNextAction,
        updatedAt: nowIso(),
      })
    } else if (analysis.category === 'NOT_INTERESTED') {
      s.upsertLead({
        ...lead,
        status: 'LOST',
        updatedAt: nowIso(),
      })
    } else {
      s.upsertLead({
        ...lead,
        status: 'REPLIED',
        nextAction: analysis.suggestedNextAction,
        updatedAt: nowIso(),
      })
    }

    return analysis
  }
}