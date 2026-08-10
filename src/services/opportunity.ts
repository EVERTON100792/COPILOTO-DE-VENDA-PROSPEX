/**
 * OpportunityAnalyzer — Real Discovery (Fase 2)
 * Avaliação rule-based de oportunidade a partir de dados VERIFICADOS.
 * A IA é opcional nesta fase; sem IA, este analista produz o diagnóstico.
 */

import type { OpportunityQuality } from '../types'

export interface OpportunityInput {
  companyName: string
  websiteStatus: string | null
  websiteQualityScore: number | null
  instagram: string | null
  facebook: string | null
  rating: number | null
  reviewCount: number | null
  score: number | null
}

export function analyzeOpportunity(input: OpportunityInput): OpportunityQuality {
  const reasons: string[] = []
  let points = 0

  const noSite = input.websiteStatus === 'NO_WEBSITE'
  if (noSite) {
    points += 3
    reasons.push('Empresa sem site oficial (evidência da fonte)')
  } else if (input.websiteQualityScore !== null && input.websiteQualityScore < 60) {
    points += 2
    reasons.push(`Website fraco (qualidade ${input.websiteQualityScore}/100)`)
  }

  if (input.rating !== null && input.rating >= 4.5) {
    points += 2
    reasons.push(`Boa reputação (nota ${input.rating})`)
  }
  if (input.reviewCount !== null && input.reviewCount >= 50) {
    points += 1
    reasons.push(`${input.reviewCount} avaliações registradas`)
  }
  if (input.instagram) {
    points += 1
    reasons.push('Presença no Instagram')
  }
  if (input.facebook) {
    points += 1
    reasons.push('Presença no Facebook')
  }
  const s = input.score ?? 0
  if (s >= 70) {
    points += 1
    reasons.push(`Score de oportunidade ${s}/100`)
  } else if (s < 40 && input.score !== null) {
    points -= 1
    reasons.push(`Score de oportunidade baixo (${s}/100)`)
  }

  const level = points >= 4 ? 'HIGH' : points >= 2 ? 'MEDIUM' : 'LOW'
  const recommendation =
    level === 'HIGH'
      ? 'Abordar prioritariamente: combine diagnóstico e proposta específica nos canais disponíveis.'
      : level === 'MEDIUM'
        ? 'Abordar no segundo lote; prepare um diagnóstico objetivo antes do contato.'
        : 'Aguardar ou reavaliar: poucos sinais de oportunidade nos dados disponíveis.'

  return { level, reasons, recommendation }
}