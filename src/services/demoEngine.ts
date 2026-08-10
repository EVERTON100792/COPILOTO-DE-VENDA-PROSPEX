import type { Demo, DemoStatus, Lead, Company } from '../types'
import { useApp } from './store'
import { uid, nowIso } from '../lib/utils'
import { generateSiteFiles } from './siteGenerator'

export interface LeadIntelligence {
  niche: string
  subniche: string
  businessName: string
  city: string
  phone: string | null
  whatsapp: string | null
  address: string | null
  website: string | null
  recommendedCTA: string
  ctaMessage: string
  differentiators: string[]
  primaryColor: string
}

export function analyzeLeadIntelligence(lead: Lead, company: Company | undefined): LeadIntelligence {
  const name = company?.name || 'Empresa'
  const category = (company?.category || 'Serviços').toLowerCase()
  const city = company?.city || 'Sua Cidade'

  let niche = 'servicos'
  let subniche = 'Serviços Gerais'
  let recommendedCTA = 'Solicitar Orçamento'
  let primaryColor = '#6366f1' // Indigo
  let ctaMessage = `Ol%C3%A1!%20Vim%20pela%20demonstra%C3%A7%C3%A3o%20do%20site%20da%20${encodeURIComponent(name)}.`

  if (category.includes('restaurante') || category.includes('churrascaria') || category.includes('pizzaria') || category.includes('comida') || category.includes('bar')) {
    niche = 'gastronomia'
    subniche = 'Gastronomia & Alimentos'
    recommendedCTA = 'Reservar Mesa / Pedir Agora'
    primaryColor = '#ea580c' // Orange
    ctaMessage = `Ol%C3%A1!%20Gostaria%20de%20fazer%20uma%20reserva%20ou%20pedido%20na%20${encodeURIComponent(name)}.`
  } else if (category.includes('odonto') || category.includes('dentista') || category.includes('médic') || category.includes('saúde') || category.includes('clínica')) {
    niche = 'saude'
    subniche = 'Odontologia & Saúde'
    recommendedCTA = 'Agendar Avaliação'
    primaryColor = '#0284c7' // Cyan/Blue
    ctaMessage = `Ol%C3%A1!%20Gostaria%20de%20agendar%20uma%20avalia%C3%A7%C3%A3o%20na%20${encodeURIComponent(name)}.`
  } else if (category.includes('advoga') || category.includes('juríd') || category.includes('direito')) {
    niche = 'advocacia'
    subniche = 'Advocacia & Direito'
    recommendedCTA = 'Falar com Especialista'
    primaryColor = '#1e293b' // Slate/Navy
    ctaMessage = `Ol%C3%A1!%20Gostaria%20de%20uma%20consulta%20jur%C3%ADdica%20com%20a%20${encodeURIComponent(name)}.`
  } else if (category.includes('salão') || category.includes('estética') || category.includes('barbe') || category.includes('beleza')) {
    niche = 'estetica'
    subniche = 'Beleza & Estética'
    recommendedCTA = 'Agendar Horário'
    primaryColor = '#ec4899' // Pink
    ctaMessage = `Ol%C3%A1!%20Gostaria%20de%20agendar%20um%20hor%C3%A1rio%20na%20${encodeURIComponent(name)}.`
  } else if (category.includes('auto') || category.includes('mecanic') || category.includes('carro')) {
    niche = 'automotivo'
    subniche = 'Serviços Automotivos'
    recommendedCTA = 'Solicitar Orçamento Rápido'
    primaryColor = '#dc2626' // Red
    ctaMessage = `Ol%C3%A1!%20Preciso%20de%20um%20or%C3%A7amento%20automotivo%20para%20a%20${encodeURIComponent(name)}.`
  }

  return {
    niche,
    subniche,
    businessName: name,
    city,
    phone: company?.phone || null,
    whatsapp: company?.whatsapp || company?.phone || null,
    address: company?.address || null,
    website: company?.website || null,
    recommendedCTA,
    ctaMessage,
    differentiators: [
      'Atendimento Rápido e Atencioso',
      'Profissionais Qualificados',
      'Localização Acessível em ' + city,
      'Orçamentos Sem Compromisso'
    ],
    primaryColor
  }
}

export function buildWhatsAppMessageForDemo(companyName: string, demoUrl: string): string {
  return `Olá! Preparei uma demonstração exclusiva e personalizada de como pode ficar a nova presença digital da ${companyName}.\n\nFiz pensando especificamente no perfil do seu negócio. Dá uma olhada aqui:\n${demoUrl}\n\nSe gostar da ideia, posso te explicar os detalhes!`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function generateDemoForCompany(company: any, enriched?: any): Promise<Demo> {
  const intelligence = analyzeLeadIntelligence({ companyId: company.id } as any, company)
  const slug = `${slugify(intelligence.businessName)}-demo`
  const demoId = `demo_${uid('d')}`
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
  const demoUrl = `${baseUrl}/demo/${demoId}`

  // Extract enriched data if present to improve content
  let aboutText = `${intelligence.businessName} é um estabelecimento dedicado a entregar os melhores serviços de ${intelligence.subniche} em ${intelligence.city}. Nosso compromisso é com a transparência e satisfação de cada cliente.`
  if (enriched?.about) aboutText = enriched.about

  const demoContent = {
    headline: `${intelligence.businessName} — Referência em ${intelligence.subniche} em ${intelligence.city}`,
    subheadline: enriched?.tagline || `Qualidade, eficiência e atendimento de excelência para você e sua família em ${intelligence.city}.`,
    about: aboutText,
    services: enriched?.services || [
      {
        title: 'Atendimento Personalizado',
        description: `Soluções sob medida para clientes em ${intelligence.city} com total atenção aos detalhes.`
      },
      {
        title: 'Garantia de Qualidade',
        description: 'Processos estruturados e equipe capacitada para garantir os melhores resultados.'
      },
      {
        title: 'Contato Direto via WhatsApp',
        description: 'Tire suas dúvidas e solicite agendamentos em poucos segundos diretamente pelo celular.'
      }
    ],
    ctaText: intelligence.recommendedCTA,
    ctaMessage: intelligence.ctaMessage
  }

  const demoBrand = {
    primaryColor: intelligence.primaryColor,
    secondaryColor: '#1e293b',
    fontHeading: 'Inter',
    fontBody: 'Inter',
    visualStyle: 'Modern Premium'
  }

  const waMsg = buildWhatsAppMessageForDemo(intelligence.businessName, demoUrl)

  const newDemo: Demo = {
    id: demoId,
    leadId: `lead_${company.id}`, // Placeholder or real
    companyId: company.id || 'c_unknown',
    slug,
    niche: intelligence.niche,
    status: 'READY',
    version: 1,
    brand: demoBrand,
    content: demoContent,
    deploymentUrl: null,
    publishedAt: null,
    whatsappMessage: waMsg,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  return newDemo
}

export function generateDemoForLead(leadId: string): Demo {
  const store = useApp.getState()
  const lead = store.leads.find((l) => l.id === leadId)
  if (!lead) throw new Error('Lead não encontrado')
  const company = store.companies.find((c) => c.id === lead.companyId)

  const intelligence = analyzeLeadIntelligence(lead, company)
  const slug = `${slugify(intelligence.businessName)}-demo`
  const demoId = `demo_${uid('d')}`
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173'
  const demoUrl = `${baseUrl}/demo/${demoId}`

  const demoContent = {
    headline: `${intelligence.businessName} — Referência em ${intelligence.subniche} em ${intelligence.city}`,
    subheadline: `Qualidade, eficiência e atendimento de excelência para você e sua família em ${intelligence.city}.`,
    about: `${intelligence.businessName} é um estabelecimento dedicado a entregar os melhores serviços de ${intelligence.subniche} em ${intelligence.city}. Nosso compromisso é com a transparência e satisfação de cada cliente.`,
    services: [
      {
        title: 'Atendimento Personalizado',
        description: `Soluções sob medida para clientes em ${intelligence.city} com total atenção aos detalhes.`
      },
      {
        title: 'Garantia de Qualidade',
        description: 'Processos estruturados e equipe capacitada para garantir os melhores resultados.'
      },
      {
        title: 'Contato Direto via WhatsApp',
        description: 'Tire suas dúvidas e solicite agendamentos em poucos segundos diretamente pelo celular.'
      }
    ],
    ctaText: intelligence.recommendedCTA,
    ctaMessage: intelligence.ctaMessage
  }

  const demoBrand = {
    primaryColor: intelligence.primaryColor,
    secondaryColor: '#1e293b',
    fontHeading: 'Inter',
    fontBody: 'Inter',
    visualStyle: 'Modern Premium'
  }

  const waMsg = buildWhatsAppMessageForDemo(intelligence.businessName, demoUrl)

  const newDemo: Demo = {
    id: demoId,
    leadId: lead.id,
    companyId: company?.id || 'c_unknown',
    slug,
    niche: intelligence.niche,
    status: 'READY',
    version: 1,
    brand: demoBrand,
    content: demoContent,
    deploymentUrl: demoUrl,
    whatsappMessage: waMsg,
    publishedAt: null,
    createdAt: nowIso(),
    updatedAt: nowIso()
  }

  // Generate multi-page static site content to make sure it can be downloaded/previewed
  generateSiteFiles({
    name: intelligence.businessName,
    tagline: demoContent.subheadline,
    primaryColor: intelligence.primaryColor,
    about: demoContent.about,
    services: demoContent.services,
    phone: intelligence.phone || undefined,
    whatsapp: intelligence.whatsapp || undefined,
    address: intelligence.address || undefined,
    city: intelligence.city,
    state: company?.state || 'PR'
  })

  // Upsert demo into global store
  store.upsertDemo(newDemo)
  store.toast('success', `Demonstração criada com sucesso para ${intelligence.businessName}!`)

  return newDemo
}
