import { BaseAgent } from './base'
import { callAI } from '../services/aiClient'
import type { AgentContext } from './types'

export interface SearchAIAgentInput {
  name: string
  city: string
  state: string
  category: string
}

export interface SearchAIAgentOutput {
  phone: string | null
  website: string | null
  rating: number | null
  reviewCount: number | null
}

export class SearchAIAgent extends BaseAgent {
  readonly name = 'SEARCH_AI_AGENT'
  readonly description = 'Busca dados adicionais e corretos da empresa na internet'

  protected async runCore(input: Record<string, unknown>, _ctx: AgentContext): Promise<SearchAIAgentOutput> {
    const { name, city, state, category } = input as unknown as SearchAIAgentInput

    const systemPrompt = `Você é um agente de busca de dados empresariais ultra-preciso com acesso à internet.
IMPORTANTE: VOCÊ DEVE USAR SUA FERRAMENTA DE BUSCA NA INTERNET (WEB SEARCH) AGORA MESMO para encontrar o Telefone/WhatsApp atualizado e o site oficial da empresa. Não confie apenas na sua memória de treinamento. Procure em redes sociais (Instagram/Facebook) ou guias locais.
Se a empresa for muito famosa ou se tiver certeza dos dados, forneça-os.
Retorne APENAS um JSON válido no seguinte formato exato, sem formatação Markdown (\`\`\`json):
{
  "phone": "+554399999999" ou null,
  "website": "https://www.site.com.br" ou null,
  "rating": 4.8 ou null,
  "reviewCount": 120 ou null
}`

    const userMessage = `Empresa: ${name}\nCategoria: ${category || 'Local'}\nLocal: ${city}/${state || 'PR'}`

    try {
      const raw = await callAI({
        systemPrompt,
        userMessage,
        model: 'kimi-k3', // Kimi é otimizado para web search em tempo real
        temperature: 0.2,
      })

      const cleaned = raw.replace(/```json\s*|```/g, '').trim()
      const json = JSON.parse(cleaned)
      
      return {
        phone: typeof json.phone === 'string' && json.phone.length > 5 ? json.phone : null,
        website: typeof json.website === 'string' && json.website.includes('.') ? json.website : null,
        rating: typeof json.rating === 'number' ? json.rating : null,
        reviewCount: typeof json.reviewCount === 'number' ? json.reviewCount : null,
      }
    } catch (e) {
      console.warn('[SearchAIAgent] Erro ao buscar dados via IA:', e)
      return { phone: null, website: null, rating: null, reviewCount: null }
    }
  }
}
