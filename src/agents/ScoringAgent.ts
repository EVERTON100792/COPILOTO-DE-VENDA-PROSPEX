import { BaseAgent } from './base'
import type { AgentContext, ScoreOutput } from './types'
import type { NormalizedDiscovered } from './types'
import type { ScoreWeights } from '../types'
import { DEFAULT_SCORE_WEIGHTS, tierFromScore } from '../config/defaults'

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export interface ScoreInput {
  company: NormalizedDiscovered
  websiteStatus: string
  weights: ScoreWeights
}

export function computeScore(input: ScoreInput): ScoreOutput {
  const w = input.weights ?? DEFAULT_SCORE_WEIGHTS
  const c = input.company
  const breakdown: ScoreOutput['breakdown'] = []
  let score = 0

  const add = (label: string, points: number, reason: string): void => {
    if (points === 0) return
    score += points
    breakdown.push({ label, points, reason })
  }

  const noSite = input.websiteStatus === 'NO_WEBSITE'
  const poorSite = ['WEBSITE_BROKEN', 'WEBSITE_OUTDATED', 'WEBSITE_POOR_MOBILE'].includes(input.websiteStatus)
  const greatSite = input.websiteStatus === 'WEBSITE_FOUND'

  if (noSite) add('Sem site', w.noWebsite, 'Empresa identificada sem site oficial')
  else if (poorSite) add('Site problemático', w.poorWebsite, 'Site com problemas técnicos ou desatualizado')
  else if (greatSite && w.greatWebsite > 0) add('Site em dia', w.greatWebsite, 'Site presente e acessível')

  if (c.reviewCount !== null && c.reviewCount >= 50) add('Muitas avaliações', w.manyReviews, `${c.reviewCount} avaliações`)
  if (c.rating !== null && c.rating >= 4.5) add('Boa reputação', w.goodRating, `Nota ${c.rating}`)
  if (c.instagram) add('Instagram ativo', w.instagramActive, 'Presença verificada no Instagram')
  if (c.facebook) add('Facebook ativo', w.facebookActive, 'Presença verificada no Facebook')
  if (c.whatsapp) add('WhatsApp', w.hasWhatsapp, 'WhatsApp disponível')
  if (c.phone) add('Telefone', w.hasPhone, 'Telefone disponível')
  if (c.hours) add('Empresa ativa', w.activeBusiness, 'Horário de funcionamento informado')

  if (w.incompleteData < 0 && !c.complete) add('Dados incompletos', w.incompleteData, 'Registro com dados faltantes')

  const final = clamp(Math.round(score), 0, 100)
  return {
    score: final,
    tier: tierFromScore(final),
    breakdown,
    explanation: breakdown.map((b) => `${b.points > 0 ? '+' : ''}${b.points} ${b.label}`),
  }
}

export class ScoringAgent extends BaseAgent {
  readonly name = 'SCORING'
  readonly description = 'Calcula score 0-100 com breakdown explicável'

  protected async runCore(input: Record<string, unknown>, ctx: AgentContext): Promise<{ scores: ScoreOutput[] }> {
    const companies = (input.companies ?? []) as NormalizedDiscovered[]
    const websiteStatuses = (input.websiteStatuses ?? []) as string[]
    const weights = (input.weights as ScoreWeights | undefined) ?? ctx.settings.scoreWeights

    const scores = companies.map((c, idx) =>
      computeScore({
        company: c,
        websiteStatus: websiteStatuses[idx] ?? 'WEBSITE_UNKNOWN',
        weights,
      })
    )
    return { scores }
  }
}