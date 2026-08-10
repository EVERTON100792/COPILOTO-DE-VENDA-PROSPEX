import { BaseAgent } from './base'
import type { AgentContext, MessageVariant, NormalizedDiscovered, OpportunityOutput } from './types'

export interface CopywriterInput {
  company: NormalizedDiscovered
  opportunity?: OpportunityOutput | null
  niche: string
  focus: string | null
  offer?: { product: string; price: number; deliverable: string; benefit: string; cta: string }
}

/**
 * Gera até 3 variações de abordagem usando SOMENTE informações verificadas.
 * Dados ausentes nunca são inventados — ficam de fora do texto.
 */
export function buildMessageVariants(input: CopywriterInput): MessageVariant[] {
  const c = input.company
  const name = c.name || 'sua empresa'
  const niche = input.niche || 'seu segmento'
  const city = c.city || 'sua região'
  const offer = input.offer

  const facts: string[] = []
  if (c.rating !== null) facts.push(`sua avaliação pública é ${c.rating}`)
  if (c.reviewCount !== null) facts.push(`${c.reviewCount} avaliações registradas`)
  if (c.instagram) facts.push('presença ativa no Instagram')

  const hasSite = Boolean(c.website)
  const gapLine = hasSite
    ? 'Na minha pesquisa encontrei o site atual de vocês.'
    : 'Não encontrei um site oficial durante a pesquisa.'
  const angle = hasSite
    ? 'Uma presença digital ainda mais profissional poderia ampliar o alcance.'
    : 'Sem site oficial, informações e reputação acabam dependendo de diretórios de terceiros.'

  const offerLine = offer
    ? `Trabalho com ${offer.product} (R$ ${offer.price}) e posso preparar uma demonstração para vocês.`
    : 'Trabalho com criação de sites profissionais e posso preparar uma demonstração.'

  const consultive =
    `Olá, ${name}!\n\n` +
    `Estava pesquisando empresas de ${niche} em ${city} e encontrei a ${name}.\n` +
    `Observei que ${facts.length ? facts.slice(0, 2).join(' e ') : 'a empresa tem boa presença local'}. ${gapLine}\n\n` +
    `${angle}\n\n` +
    `${offerLine} ${offer?.cta ?? 'Posso preparar uma demonstração sem compromisso.'}\n\n` +
    `Se fizer sentido, será um prazer apresentar.`

  const direct =
    `Olá, ${name}!\n\n` +
    `Pesquisei ${niche} em ${city} e a ${name} chamou atenção${c.rating !== null ? ` — ${c.rating} de reputação pública` : ''}.\n` +
    `${gapLine}\n\n` +
    `${angle}\n\n` +
    `Crio sites profissionais e posso enviar uma proposta ainda esta semana. ${offer?.cta ?? 'Faz sentido conversarmos?'}`

  const short =
    `Olá, ${name}! 👋\n\n` +
    `${facts[0] ? `Vi que vocês têm ${facts[0]}. ` : ''}` +
    `${gapLine} Por isso, acredito que uma página profissional ajudaria a converter essa reputação em clientes.\n` +
    `Posso mostrar um modelo sem compromisso ${offer ? `(${offer.product})` : ''}. ${offer?.cta ?? 'Me avisa se tiver interesse?'}`

  return [
    { version: 'consultive', body: consultive.trim() },
    { version: 'direct', body: direct.trim() },
    { version: 'short', body: short.trim() },
  ]
}

export class CopywriterAgent extends BaseAgent {
  readonly name = 'COPYWRITER'
  readonly description = 'Gera abordagem comercial personalizada'

  protected async runCore(input: Record<string, unknown>, ctx: AgentContext): Promise<{ messages: MessageVariant[][] }> {
    const companies = (input.companies ?? []) as NormalizedDiscovered[]
    const opportunities = (input.opportunities ?? []) as OpportunityOutput[]
    const niche = String(input.niche ?? '')
    const offer = input.offer as CopywriterInput['offer'] | undefined

    const messages = companies.map((c, idx) =>
      buildMessageVariants({
        company: c,
        opportunity: opportunities[idx] ?? null,
        niche,
        focus: ctx.nicheDna?.focus ?? null,
        offer,
      })
    )
    return { messages }
  }
}