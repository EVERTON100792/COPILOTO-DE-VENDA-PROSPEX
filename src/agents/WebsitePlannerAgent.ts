import { BaseAgent } from './base'
import { callAI } from '../services/aiClient'
import type { AgentContext } from './types'
import type { Company } from '../types'


export interface SitePlan {
  businessType: string
  industry: string
  niche: string
  targetAudience: string
  services: Array<{ title: string; description: string; price?: string }>
  primaryColor: string
  secondaryColor: string
  pages: string[]
  sections: string[]
  cta: string
  tagline: string
  keywords: string[]
  websiteNeeds: string[]
}

function detectNiche(company: Company | any): string {
  const cat = (company?.category || '').toLowerCase()
  if (cat.includes('restaurante') || cat.includes('comida') || cat.includes('bar') || cat.includes('pizzaria') || cat.includes('churrascaria') || cat.includes('padaria') || cat.includes('lanchonete')) return 'gastronomia'
  if (cat.includes('odonto') || cat.includes('dentista') || cat.includes('médic') || cat.includes('saúde') || cat.includes('clínica') || cat.includes('terapia') || cat.includes('psicolog')) return 'saude'
  if (cat.includes('salão') || cat.includes('estética') || cat.includes('barbe') || cat.includes('beleza') || cat.includes('nail') || cat.includes('sobrancelha')) return 'estetica'
  if (cat.includes('advoga') || cat.includes('juríd') || cat.includes('direito') || cat.includes('contábil') || cat.includes('contador')) return 'profissional'
  if (cat.includes('auto') || cat.includes('mecanic') || cat.includes('carro') || cat.includes('pneu') || cat.includes('funilaria')) return 'automotivo'
  if (cat.includes('academia') || cat.includes('personal') || cat.includes('crossfit') || cat.includes('pilates') || cat.includes('yoga')) return 'fitness'
  if (cat.includes('pet') || cat.includes('veterinár') || cat.includes('banho e tosa')) return 'pet'
  return 'servicos'
}

const NICHE_PLANS: Record<string, Partial<SitePlan>> = {
  gastronomia: {
    businessType: 'Alimentação & Gastronomia',
    primaryColor: '#ea580c',
    sections: ['Hero com cardápio', 'Pratos em destaque', 'Horários', 'Localização', 'WhatsApp / Reservas'],
    cta: 'Reservar Mesa / Pedir Agora',
    tagline: 'Sabor e qualidade em cada prato',
    keywords: ['restaurante', 'cardápio', 'reserva', 'delivery', 'gastronomia'],
    websiteNeeds: ['Cardápio digital', 'WhatsApp para pedidos', 'Google Maps integrado', 'Galeria de fotos dos pratos'],
  },
  saude: {
    businessType: 'Saúde & Bem-estar',
    primaryColor: '#0284c7',
    sections: ['Hero profissional', 'Especialidades', 'Equipe', 'Agendamento', 'Localização'],
    cta: 'Agendar Consulta',
    tagline: 'Cuidado e atenção que você merece',
    keywords: ['clínica', 'consulta', 'especialista', 'agendamento', 'saúde'],
    websiteNeeds: ['Formulário de agendamento', 'Apresentação da equipe', 'WhatsApp para contato', 'Endereço e mapa'],
  },
  estetica: {
    businessType: 'Beleza & Estética',
    primaryColor: '#ec4899',
    sections: ['Hero glamour', 'Catálogo de serviços', 'Galeria', 'Agendamento', 'Depoimentos'],
    cta: 'Agendar Horário',
    tagline: 'Beleza e cuidado que transforma',
    keywords: ['estética', 'beleza', 'serviços', 'agendamento', 'salão'],
    websiteNeeds: ['Galeria de resultados', 'Lista de serviços e preços', 'Agendamento online', 'Instagram integrado'],
  },
  automotivo: {
    businessType: 'Serviços Automotivos',
    primaryColor: '#dc2626',
    sections: ['Hero impactante', 'Serviços especializados', 'Orçamento rápido', 'Localização'],
    cta: 'Solicitar Orçamento Rápido',
    tagline: 'Expertise e confiança para seu veículo',
    keywords: ['oficina', 'mecânica', 'serviços automotivos', 'orçamento', 'reparo'],
    websiteNeeds: ['Lista de serviços', 'Formulário de orçamento', 'WhatsApp', 'Endereço e horários'],
  },
  profissional: {
    businessType: 'Serviços Profissionais',
    primaryColor: '#1e293b',
    sections: ['Hero institucional', 'Áreas de atuação', 'Equipe', 'Contato'],
    cta: 'Falar com Especialista',
    tagline: 'Credibilidade e excelência profissional',
    keywords: ['consultoria', 'especialista', 'profissional', 'assessoria'],
    websiteNeeds: ['Apresentação profissional', 'Áreas de expertise', 'Formulário de contato', 'Depoimentos'],
  },
  fitness: {
    businessType: 'Academia & Fitness',
    primaryColor: '#7c3aed',
    sections: ['Hero motivacional', 'Modalidades', 'Planos e preços', 'Professores', 'Agende sua aula'],
    cta: 'Começar Agora',
    tagline: 'Transformação começa aqui',
    keywords: ['academia', 'fitness', 'treino', 'personal', 'saúde'],
    websiteNeeds: ['Grade de horários', 'Planos de assinatura', 'WhatsApp para matrícula'],
  },
  pet: {
    businessType: 'Pet Shop & Veterinária',
    primaryColor: '#059669',
    sections: ['Hero fofo', 'Serviços', 'Agendamento banho & tosa', 'Veterinário', 'Localização'],
    cta: 'Agendar para seu Pet',
    tagline: 'Amor e cuidado para seu melhor amigo',
    keywords: ['pet shop', 'veterinária', 'banho e tosa', 'animais'],
    websiteNeeds: ['Agendamento de serviços', 'Lista de serviços', 'WhatsApp', 'Galeria de pets'],
  },
  servicos: {
    businessType: 'Serviços Gerais',
    primaryColor: '#6366f1',
    sections: ['Hero profissional', 'Serviços', 'Diferenciais', 'Contato'],
    cta: 'Solicitar Orçamento',
    tagline: 'Qualidade e confiança em cada serviço',
    keywords: ['serviços', 'qualidade', 'profissional', 'atendimento'],
    websiteNeeds: ['Lista de serviços', 'WhatsApp para orçamento', 'Endereço e horários'],
  },
}

function buildDeterministicPlan(company: Company | any): SitePlan {
  const niche = detectNiche(company)
  const template = NICHE_PLANS[niche] || NICHE_PLANS['servicos']
  const city = company?.city || 'sua cidade'

  return {
    businessType: template.businessType || 'Negócio Local',
    industry: niche,
    niche,
    targetAudience: `Clientes em ${city} e região`,
    services: [
      { title: 'Atendimento Personalizado', description: `Soluções sob medida para clientes em ${city}.` },
      { title: 'Qualidade Garantida', description: 'Equipe capacitada e processos de excelência.' },
      { title: 'Contato via WhatsApp', description: 'Tire suas dúvidas e agende pelo celular.' },
    ],
    primaryColor: template.primaryColor || '#6366f1',
    secondaryColor: '#1e293b',
    pages: ['index', 'sobre', 'servicos', 'contato'],
    sections: template.sections || [],
    cta: template.cta || 'Falar Conosco',
    tagline: `${template.tagline || 'Qualidade e excelência'} em ${city}.`,
    keywords: template.keywords || [],
    websiteNeeds: template.websiteNeeds || [],
  }
}

export class WebsitePlannerAgent extends BaseAgent {
  readonly name = 'WEBSITE_PLANNER'
  readonly description = 'Planeja a estrutura do site com base nos dados da empresa'

  protected async runCore(input: Record<string, unknown>): Promise<{ plan: SitePlan }> {
    const company = input.company as Company | any
    const apiKey = (input.apiKey as string | undefined) || ''
    const customPrompt = (input.customPrompt as string | undefined) || ''

    if (!apiKey) {
      const basePlan = buildDeterministicPlan(company)
      if (customPrompt) {
        if (customPrompt.toLowerCase().includes('escuro') || customPrompt.toLowerCase().includes('dark')) {
          basePlan.primaryColor = '#ea580c'
          basePlan.secondaryColor = '#0f172a'
        }
        if (customPrompt.toLowerCase().includes('verde') || customPrompt.toLowerCase().includes('eco')) {
          basePlan.primaryColor = '#10b981'
        }
        if (customPrompt.toLowerCase().includes('azul') || customPrompt.toLowerCase().includes('moderno')) {
          basePlan.primaryColor = '#0284c7'
        }
      }
      return { plan: basePlan }
    }

    const systemPrompt = `Você é um Arquiteto e Desenvolvedor Web Sênior especialista em criação de sites de alta conversão para empresas brasileiras.
Sua tarefa é planejar a estrutura, paleta de cores, seções, diferenciais e chamadas de ação para o site.

ATENÇÃO AO PROMPT DO USUÁRIO: Se o usuário especificou estilo, cores, tema escuro, elementos especiais (Google Maps, fotos, avaliações, botões WhatsApp, tabela de preços), incorpore tudo com máxima fidelidade no plano JSON.

Retorne APENAS o JSON válido com os campos:
- businessType (string)
- industry (string)
- niche (string: gastronomia|saude|estetica|automotivo|profissional|fitness|pet|servicos)
- targetAudience (string)
- services (array de {title, description, price})
- primaryColor (hex da cor principal)
- secondaryColor (hex da cor secundária)
- pages (array de strings: index, sobre, servicos, contato)
- sections (array de strings com os títulos das seções)
- cta (string do texto do botão principal de conversão)
- tagline (frase impactante de efeito)
- keywords (array de palavras-chave SEO)
- websiteNeeds (array de necessidades do site)`

    const prompt = `Empresa: ${company.name}
Categoria: ${company.category || 'Serviços'}
Cidade: ${company.city || 'Rolândia/PR'}
Telefone: ${company.phone || 'não informado'}
WhatsApp: ${company.whatsapp || company.phone || 'não informado'}
Site atual: ${company.website || 'não possui'}
Instagram: ${company.instagram || 'não possui'}
Avaliações: ${company.rating ? `${company.rating} (${company.reviewCount} avaliações)` : 'sem dados'}
Horários: ${company.hours || 'não informado'}
${customPrompt ? `\nPROMPT LIVRE E DIRETRIZES DO USUÁRIO (OPENCODE CHAT PROMPT):\n"${customPrompt}"` : ''}`

    try {
      const raw = await callAI({ systemPrompt, userMessage: prompt })
      const cleaned = raw.trim().replace(/```json\s*|```/g, '')
      const json = JSON.parse(cleaned)
      return { plan: { ...buildDeterministicPlan(company), ...json } }
    } catch {
      return { plan: buildDeterministicPlan(company) }
    }
  }
}
