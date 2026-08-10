import { BaseAgent } from './base'
import type { AgentContext, NormalizedDiscovered } from './types'

export interface BusinessAnalysis {
  companyIndex: number
  reputation: {
    rating: number | null
    reviewCount: number | null
    quality: 'Excelente' | 'Boa' | 'Regular' | 'Desconhecida'
  }
  activitySignals: number
  potential: 'Alto' | 'Médio' | 'Baixo' | 'Desconhecido'
  reasons: string[]
  summary: string
}

export class BusinessAnalyst extends BaseAgent {
  readonly name = 'BUSINESS_ANALYST'
  readonly description = 'Analisa potencial comercial da empresa'

  protected async runCore(input: Record<string, unknown>): Promise<{ analyses: BusinessAnalysis[] }> {
    const companies = (input.companies ?? []) as NormalizedDiscovered[]
    const niche = String(input.niche ?? '')

    const analyses: BusinessAnalysis[] = companies.map((c, idx) => {
      const rating = c.rating ?? null
      const reviewCount = c.reviewCount ?? null
      const quality: BusinessAnalysis['reputation']['quality'] =
        rating === null ? 'Desconhecida' : rating >= 4.5 ? 'Excelente' : rating >= 4.0 ? 'Boa' : 'Regular'

      const reasons: string[] = []
      if (quality === 'Excelente') reasons.push(`Nota ${rating} em avaliações públicas`)
      if (reviewCount !== null && reviewCount >= 50) reasons.push(`${reviewCount} avaliações registradas`)
      if (!c.website) reasons.push('Não possui site identificado')
      if (c.instagram) reasons.push('Presença ativa no Instagram')
      if (c.whatsapp) reasons.push('WhatsApp disponível para contato')

      let activity = 0
      if (c.hours) activity++
      if (c.reviewCount !== null) activity++
      if (c.instagram || c.facebook) activity++

      const potential: BusinessAnalysis['potential'] =
        rating === null || reviewCount === null
          ? 'Desconhecido'
          : rating >= 4.3 && reviewCount >= 40
            ? 'Alto'
            : rating >= 4.0 && reviewCount >= 20
              ? 'Médio'
              : 'Baixo'

      const summary =
        potential === 'Alto'
          ? `Empresa com reputação sólida em ${niche || 'seu segmento'} e sinais claros de demanda.`
          : potential === 'Médio'
            ? 'Empresa relevante, com potencial moderado de negociação.'
            : 'Credibilidade pública ainda limitada. Contato pode não ser prioritário.'

      return {
        companyIndex: idx,
        reputation: { rating, reviewCount, quality },
        activitySignals: activity,
        potential,
        reasons: reasons.length ? reasons : ['Dados públicos insuficientes para análise'],
        summary,
      }
    })

    return { analyses }
  }
}