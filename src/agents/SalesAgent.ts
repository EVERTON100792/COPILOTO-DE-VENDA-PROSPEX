import { BaseAgent } from './base'
import {
  analyzeClientResponse,
  analyzeClientResponseAI,
  buildInstruction,
  generateOpeningMessage,
  generateOpeningMessageAI,
} from '../services/salesAI'
import { useApp } from '../services/store'
import type { AgentContext } from './types'
import type { Company } from '../types'

export interface SalesAgentInput {
  company: Company | any
  clientResponse: string
  apiKey?: string
}

export interface SalesAgentOutput {
  category: string
  emoji: string
  summary: string
  whatToDo: string
  suggestedReply: string
  showSiteButton: boolean
  showProposalButton: boolean
  isWon: boolean
  isLost: boolean
}

export class SalesAgent extends BaseAgent {
  readonly name = 'SALES_AGENT'
  readonly description = 'Analisa conversa de vendas e sugere próximos passos'

  protected async runCore(input: Record<string, unknown>): Promise<SalesAgentOutput> {
    const company = input.company as Company | any
    const clientResponse = input.clientResponse as string
    void input.apiKey

    const demoMode = (input.demoMode as boolean | undefined) ?? useApp.getState().settings.demoMode

    // Modo demo → motor de regras determinístico.
    // Produção → IA sempre tentada (proxy injeta a chave); analyzeClientResponseAI
    // já tem fallback interno para o motor de regras.
    const result = demoMode
      ? buildInstruction(analyzeClientResponse(clientResponse), company)
      : await analyzeClientResponseAI(clientResponse, company, '')

    return {
      category: result.analysis.category,
      emoji: result.analysis.emoji,
      summary: result.analysis.summary,
      whatToDo: result.whatToDo,
      suggestedReply: result.suggestedReply,
      showSiteButton: result.showSiteButton,
      showProposalButton: result.showProposalButton,
      isWon: result.isWon,
      isLost: result.isLost,
    }
  }
}

export async function getOpeningMessage(company: Company | any, apiKey?: string): Promise<string> {
  // IA sempre tentada; proxy no servidor injeta a chave. Fallback interno p/ template.
  void apiKey
  return generateOpeningMessageAI(company)
}
