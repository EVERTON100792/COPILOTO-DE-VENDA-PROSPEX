import { useApp } from './store'
import { nowIso } from '../lib/utils'
import { logger } from '../lib/logger'
import type { Lead, ResponseAnalysis, ResponseCategory } from '../types'

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

export class ResponseClassificationService {
  async recordLeadReply(leadId: string, replyText: string): Promise<ResponseAnalysis> {
    const s = useApp.getState()
    const lead = s.leads.find((l) => l.id === leadId)
    if (!lead) throw new Error(`Lead ${leadId} não encontrado.`)

    const analysis = analyzeLeadReplyText(replyText)
    const company = s.companies.find((c) => c.id === lead.companyId)

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
