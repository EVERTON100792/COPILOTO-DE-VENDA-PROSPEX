import { BaseAgent } from './base'
import type { AgentContext } from './types'
import type { Company } from '../types'

export interface ReviewResult {
  ok: boolean
  score: number
  issues: string[]
  suggestions: string[]
}

export class WebsiteReviewerAgent extends BaseAgent {
  readonly name = 'WEBSITE_REVIEWER'
  readonly description = 'Revisa o site gerado verificando conteúdo, CTAs e estrutura'

  protected async runCore(input: Record<string, unknown>): Promise<ReviewResult> {
    const company = input.company as Company | any
    const files = (input.files || {}) as Record<string, string>
    const indexHtml = files['index.html'] || ''
    const issues: string[] = []
    const suggestions: string[] = []

    // 1. Verifica nome da empresa
    if (company.name && !indexHtml.toLowerCase().includes(company.name.toLowerCase().slice(0, 5))) {
      issues.push(`Nome da empresa "${company.name}" não encontrado no HTML`)
    }

    // 2. Verifica WhatsApp / contato
    if (!indexHtml.includes('wa.me') && !indexHtml.includes('whatsapp')) {
      issues.push('Botão de WhatsApp ausente')
    }

    // 3. Verifica meta viewport (responsividade)
    if (!indexHtml.includes('viewport')) {
      issues.push('Meta viewport ausente — o site pode não ser responsivo no mobile')
    }

    // 4. Verifica título SEO
    if (!indexHtml.includes('<title>') || indexHtml.includes('<title></title>')) {
      issues.push('Title SEO não definido')
    }

    // 5. Verifica CTA principal
    if (!indexHtml.includes('btn') && !indexHtml.includes('button')) {
      issues.push('Nenhum botão CTA encontrado')
    }

    // 6. Verifica Google Fonts
    if (!indexHtml.includes('fonts.googleapis.com') && !indexHtml.includes('font-face')) {
      suggestions.push('Considere usar tipografia do Google Fonts para maior impacto visual')
    }

    // 7. Verifica endereço quando disponível
    if (company.city && !indexHtml.includes(company.city)) {
      suggestions.push(`Cidade "${company.city}" não mencionada — adicione para melhorar SEO local`)
    }

    // 8. Verifica CSS separado
    if (!files['style.css']) {
      issues.push('Arquivo style.css não gerado')
    }

    const score = Math.max(0, 100 - issues.length * 15)
    const ok = issues.length === 0

    if (ok) {
      suggestions.push('Site aprovado! Estrutura, CTAs e responsividade verificados.')
    }

    return { ok, score, issues, suggestions }
  }
}
