/**
 * WebsiteService — Real Discovery (Fase 2)
 * website_quality_score (0-100) com fatores explicáveis.
 * Sem evidência suficiente → score null (não declara qualidade sem dados).
 */

import type { ScoreBreakdown } from '../types'

export interface WebsiteQualityInput {
  status: number | null
  https: boolean
  title: string | null
  description: string | null
  mobileFriendly: boolean | null
  loadable: boolean
  outdatedSignals: number
  error: string | null
}

export interface WebsiteQualityOutput {
  score: number | null
  verdict: 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'WEAK' | 'CRITICAL' | 'UNKNOWN'
  factors: ScoreBreakdown[]
}

function verdictOf(score: number | null): WebsiteQualityOutput['verdict'] {
  if (score === null) return 'UNKNOWN'
  if (score >= 90) return 'EXCELLENT'
  if (score >= 75) return 'GOOD'
  if (score >= 60) return 'ACCEPTABLE'
  if (score >= 40) return 'WEAK'
  return 'CRITICAL'
}

export function computeWebsiteQuality(input: WebsiteQualityInput): WebsiteQualityOutput {
  const factors: ScoreBreakdown[] = []
  const add = (points: number, label: string, reason: string): void => {
    if (points === 0) return
    factors.push({ label, points, reason })
  }

  const hasEvidence = input.status !== null || input.loadable || Boolean(input.title)
  if (!hasEvidence) {
    return { score: null, verdict: 'UNKNOWN', factors }
  }

  let score = 0
  if (input.status === 200 || input.loadable) {
    score += 35
    add(35, 'Site acessível', 'Resposta HTTP 200 ou conteúdo carregado')
  } else if (input.status && input.status >= 400 && input.status < 600) {
    add(0, 'Site inacessível', `HTTP ${input.status}`)
  }
  if (input.https) {
    score += 10
    add(10, 'HTTPS ativo', 'Conexão segura detectada')
  }
  if (input.title) {
    score += 15
    add(15, 'Título presente', 'Tag <title> encontrada no HTML')
  }
  if (input.description) {
    score += 10
    add(10, 'Meta description', 'Descrição meta presente')
  }
  if (input.mobileFriendly === true) {
    score += 15
    add(15, 'Mobile-friendly', 'Viewport responsivo detectado')
  }
  if (input.mobileFriendly === false) {
    add(-10, 'Sem mobile', 'Viewport responsivo ausente')
  }
  if (input.outdatedSignals === 0 && input.loadable) {
    score += 10
    add(10, 'Sem sinais de desatualização', 'Nenhum marcador de site antigo encontrado')
  } else if (input.outdatedSignals > 0) {
    score -= 5 * Math.min(input.outdatedSignals, 3)
    add(-5 * Math.min(input.outdatedSignals, 3), 'Sinais de desatualização', `${input.outdatedSignals} marcador(es)`)
  }
  if (input.error && input.loadable) {
    // erro transiente não derruba o score quando o site carrega
    add(0, '', '')
  }

  const final = Math.min(100, Math.max(0, Math.round(score)))
  return { score: final, verdict: verdictOf(final), factors: factors.filter((f) => f.points !== 0) }
}