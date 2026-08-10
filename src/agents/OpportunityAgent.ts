import { BaseAgent } from './base'
import type { AgentContext, OpportunityOutput, NormalizedDiscovered } from './types'

export interface OpportunityInput {
  company: NormalizedDiscovered
  score: number
  websiteStatus: string
  niche: string
  nicheFocus: string | null
  offer?: { product: string; deliverable: string; benefit: string }
}

export function buildOpportunity(input: OpportunityInput): OpportunityOutput {
  const c = input.company
  const positives: string[] = []
  const problems: string[] = []
  const opportunities: string[] = []

  if (c.rating !== null && c.rating >= 4.5) positives.push(`Reputação pública de ${c.rating} (avaliações de clientes)`)
  if (c.reviewCount !== null && c.reviewCount >= 50) positives.push(`${c.reviewCount} avaliações registradas`)
  if (c.instagram) positives.push('Instagram identificado e ativo')
  if (c.facebook) positives.push('Presença ativa no Facebook')
  if (c.whatsapp) positives.push('WhatsApp disponível para atendimento')

  if (!c.website) problems.push('Localização na web dependente de diretórios de terceiros')
  if (!c.instagram && !c.facebook && !c.website) problems.push('Presença digital limitada a diretórios')
  if (c.reviewCount !== null && c.reviewCount < 20) problems.push('Poucas avaliações públicas registradas')

  if (!c.website) opportunities.push('Criar um site oficial que concentre reputação, serviços e contato')
  if (c.instagram) opportunities.push('Aproveitar o engajamento do Instagram direcionando para uma página profissional')
  if (c.whatsapp) opportunities.push('Ativar WhatsApp com cardápio/serviços e agendamento')

  if (problems.length === 0) problems.push('Nenhum problema estrutural evidente')

  const recommendation =
    input.score >= 75
      ? 'Priorizar contato: empresa com forte potencial e lacuna clara de presença digital.'
      : input.score >= 50
        ? 'Contato recomendado no próximo ciclo de prospecção.'
        : 'Monitorar lead; baixa prioridade no momento.'

  const why =
    c.rating !== null && !c.website
      ? `Boa reputação (${c.rating}) sem canal próprio para converter — a oportunidade está em ocupar esse espaço.`
      : c.website
        ? 'Presença digital incompleta que pode ser complementada com um canal profissional.'
        : 'Potencial de crescimento via presença digital profissional.'

  return {
    positives,
    problems,
    opportunities,
    recommendation,
    commercialArgument: `Empresa ${c.name} atua em ${input.niche || 'seu segmento'} em ${c.city || 'sua região'}. ${positives[0] ? 'Destaques: ' + positives.slice(0, 2).join('. ') + '.' : 'Informações públicas limitadas detectadas.'} ${problems[0]}`,
    whyRecommended: why,
  }
}

export class OpportunityAgent extends BaseAgent {
  readonly name = 'OPPORTUNITY'
  readonly description = 'Explica por que a empresa é uma oportunidade'

  protected async runCore(input: Record<string, unknown>, ctx: AgentContext): Promise<{ opportunities: OpportunityOutput[] }> {
    const companies = (input.companies ?? []) as NormalizedDiscovered[]
    const scores = (input.scores ?? []) as number[]
    const websiteStatuses = (input.websiteStatuses ?? []) as string[]
    const niche = String(input.niche ?? '')
    const nicheDna = ctx.nicheDna

    const opportunities = companies.map((c, idx) =>
      buildOpportunity({
        company: c,
        score: scores[idx] ?? 0,
        websiteStatus: websiteStatuses[idx] ?? 'WEBSITE_UNKNOWN',
        niche,
        nicheFocus: nicheDna?.focus ?? null,
      })
    )
    return { opportunities }
  }
}