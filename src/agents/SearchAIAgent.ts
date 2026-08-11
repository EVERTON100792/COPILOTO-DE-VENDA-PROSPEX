import { callAI } from '../services/aiClient'

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

export async function searchCompanyData(input: SearchAIAgentInput): Promise<SearchAIAgentOutput> {
  const { name, city, state, category } = input

  const systemPrompt = `Você é um agente de busca de dados empresariais ultra-preciso.
Seu objetivo é extrair ou estimar os dados de contato (telefone, whatsapp e site) da empresa solicitada.
Se a empresa for muito famosa ou se tiver certeza dos dados, forneça-os.
Retorne APENAS um JSON válido no seguinte formato (sem formatação Markdown):
{
  "phone": "+5543999990000" ou null,
  "website": "https://www.site.com.br" ou null,
  "rating": 4.8 ou null,
  "reviewCount": 120 ou null
}`

  const userMessage = `Empresa: ${name}\nCategoria: ${category || 'Local'}\nLocal: ${city}/${state || 'PR'}`

  try {
    const raw = await callAI({
      systemPrompt,
      userMessage,
      model: 'deepseek-v4-pro',
      temperature: 0.1,
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
    console.warn('[searchCompanyData] Erro ao buscar dados via IA:', e)
    return { phone: null, website: null, rating: null, reviewCount: null }
  }
}
