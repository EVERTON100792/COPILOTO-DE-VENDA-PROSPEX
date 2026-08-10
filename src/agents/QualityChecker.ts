import { BaseAgent } from './base'
import type { AgentContext, MessageVariant, NormalizedDiscovered, QualityOutput } from './types'

const SPAM_WORDS = [
  'promoção bombástica', 'renda fácil', 'clique agora', 'oferta por tempo limitado',
  'últimas vagas', 'garantido', 'milhões',
]
const AGGRESSIVE_WORDS = ['obrigatório', 'você precisa', 'não pode perder', 'compre agora', 'agora ou nunca']
const UNRESOLVED_MARKERS = ['[nome', '[empresa', '[cidade', 'lorem', 'placeholder', 'xxx', 'obs:']

function countIn(text: string, words: string[]): number {
  const low = text.toLowerCase()
  return words.reduce((acc, w) => (low.includes(w) ? acc + 1 : acc), 0)
}

export interface QualityCheck {
  passed: boolean
  issues: string[]
  regenerated: boolean
  score: number
}

export function checkMessageQuality(body: string, company: NormalizedDiscovered): QualityCheck {
  const issues: string[] = []
  const low = body.toLowerCase()

  if (company.name && !low.includes(company.name.toLowerCase())) issues.push('A mensagem não menciona o nome da empresa')
  if (company.city && !low.includes(company.city.toLowerCase())) issues.push('A mensagem não menciona a localização')

  if (body.length < 80) issues.push('Mensagem curta demais (mín. 80 caracteres)')
  if (body.length > 900) issues.push('Mensagem longa demais (máx. 900 caracteres)')

  if (countIn(body, UNRESOLVED_MARKERS) > 0) issues.push('Contém marcadores não preenchidos')

  if (countIn(body, SPAM_WORDS) > 0) issues.push('Linguagem promocional excessiva')
  if (countIn(body, AGGRESSIVE_WORDS) > 0) issues.push('Tom agressivo detectado')

  if (/[A-ZÀ-Ú]{4,}/.test(body.replace(/\n/g, ' '))) issues.push('Evite trechos em caixa alta')

  const hasCta = /posso|posso preparar|demonstração|sem compromisso|conversar|interesse|proposta/i.test(body)
  if (!hasCta) issues.push('Falta call to action claro')

  const passed = issues.length === 0
  return {
    passed,
    issues,
    regenerated: !passed,
    score: Math.max(0, 100 - issues.length * 15),
  }
}

export class MessageQualityChecker extends BaseAgent {
  readonly name = 'QUALITY_CHECKER'
  readonly description = 'Valida qualidade e personalização das mensagens'

  protected async runCore(input: Record<string, unknown>): Promise<{ checks: { companyIndex: number; check: QualityCheck }[] }> {
    const messages = (input.messages ?? []) as MessageVariant[][]
    const companies = (input.companies ?? []) as NormalizedDiscovered[]

    const checks = messages.map((variants, idx) => {
      const preferred = variants.find((v) => v.version === 'consultive') ?? variants[0]
      const company: NormalizedDiscovered = companies[idx] ?? {
        name: '', category: null, city: null, state: null, address: null, phone: null,
        whatsapp: null, website: null, instagram: null, facebook: null, rating: null,
        reviewCount: null, hours: null, source: null,
        normalizedName: '', normalizedPhone: null, domain: null, complete: false,
      }
      return {
        companyIndex: idx,
        check: preferred
          ? checkMessageQuality(preferred.body, company)
          : { passed: false, issues: ['Sem mensagem para validar'], regenerated: true, score: 0 },
      }
    })
    return { checks }
  }
}

export { countIn as countOccurrencesIn }