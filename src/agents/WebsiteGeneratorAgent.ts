import { BaseAgent } from './base'
import { generateSiteFiles } from '../services/siteGenerator'
import { enrichCompanyData } from '../services/enrichmentService'
import { callAI } from '../services/aiClient'
import { useApp } from '../services/store'
import type { AgentContext } from './types'
import type { Company } from '../types'
import type { SitePlan } from './WebsitePlannerAgent'

export class WebsiteGeneratorAgent extends BaseAgent {
  readonly name = 'WEBSITE_GENERATOR'
  readonly description = 'Gera o site HTML/CSS personalizado para a empresa usando IA DeepSeek'

  protected async runCore(input: Record<string, unknown>): Promise<{ files: Record<string, string> }> {
    const company = input.company as Company | any
    const plan = input.plan as SitePlan
    const customPrompt = (input.customPrompt as string | undefined) || ''
    const settings = useApp.getState().settings
    const apiKey = settings.aiApiKey || (import.meta.env.VITE_AI_API_KEY as string | undefined) || ''

    const enriched = await enrichCompanyData(company)

    // Base fallback files
    const fallbackFiles = generateSiteFiles({
      name: company.name,
      tagline: plan.tagline || plan.cta,
      primaryColor: plan.primaryColor,
      about: company.description || company.about || null,
      services: plan.services.map((s) => ({ title: s.title, description: s.description, price: s.price })),
      phone: company.phone || undefined,
      whatsapp: company.whatsapp || company.phone || undefined,
      email: company.email || undefined,
      address: company.address || undefined,
      city: company.city || undefined,
      state: company.state || undefined,
      enriched,
      customPrompt,
    })

    // If API Key is present, invoke DeepSeek / LLM to generate custom site code
    if (apiKey) {
      try {
        const systemPrompt = `Você é um Engenheiro Frontend Sênior e Designer Web especialista na criação de sites profissionais de altíssima conversão (padrão agência internacional).
Sua missão é gerar o código HTML5 completo (com CSS3 moderno na tag <style> e ícones) para o arquivo index.html do site da empresa.

DIRETRIZES OBRIGATÓRIAS:
1. Respeite com 100% de fidelidade o PROMPT DO USUÁRIO e os dados da empresa.
2. Crie um layout moderno, elegante e 100% responsivo para celulares.
3. Seções obrigatórias:
   - Header sticky com navegação e logo
   - Hero Section impactante com chamada de ação e botão direto de WhatsApp (https://wa.me/${(company.whatsapp || company.phone || '5543999999999').replace(/\D/g, '')})
   - Seção de Serviços / Cardápio / Diferenciais
   - Seção Sobre a Empresa
   - Galeria de Fotos em alta definição (Unsplash)
   - Prova Social com avaliações 5 estrelas do Google
   - Mapa interativo do Google Maps em iframe
   - Rodapé com contatos e botão flutuante de WhatsApp.
4. Retorne APENAS o código HTML5 completo (começando em <!DOCTYPE html> e terminando em </html>), sem markdown ou explicações adicionais.`

        const userMessage = `Empresa: ${company.name}
Categoria: ${company.category || 'Negócio Local'}
Cidade: ${company.city || 'Rolândia/PR'}
Endereço: ${company.address || 'não informado'}
Telefone/WhatsApp: ${company.whatsapp || company.phone || 'não informado'}
Cor Principal: ${plan.primaryColor}
Frase de Efeito: ${plan.tagline}
CTA Principal: ${plan.cta}
Serviços: ${JSON.stringify(plan.services)}

${customPrompt ? `PROMPT LIVRE DO USUÁRIO (OPENCODE CHAT PROMPT):\n"${customPrompt}"` : 'Crie um site moderno e elegante com estilo visual marcante e atrativo.'}`

        const rawHtml = await callAI({
          systemPrompt,
          userMessage,
          maxTokens: 3500,
          temperature: 0.7,
        })

        const cleanedHtml = rawHtml.replace(/^```html\s*|^```\s*|```$/g, '').trim()

        if (cleanedHtml.includes('<!DOCTYPE html>') || cleanedHtml.includes('<html')) {
          return {
            files: {
              ...fallbackFiles,
              'index.html': cleanedHtml,
            },
          }
        }
      } catch (err) {
        console.warn('[WebsiteGeneratorAgent] Chamada de IA para HTML falhou, usando gerador enriquecido:', err)
      }
    }

    return { files: fallbackFiles }
  }
}
