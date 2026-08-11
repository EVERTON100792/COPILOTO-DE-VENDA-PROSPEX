import { useApp } from './store'
import { uid, nowIso } from '../lib/utils'
import { searchCompanyData } from '../agents/SearchAIAgent'
import { analyzeOpportunity } from './opportunity'
import type { Company, Lead } from '../types'

export interface MapsImportResult {
  success: boolean
  company?: Company
  lead?: Lead
  error?: string
}

export async function importFromMaps(name: string, city: string, url: string, prefilledData?: Partial<ExtractedImageInfo>): Promise<MapsImportResult> {
  const store = useApp.getState()
  
  if (!name.trim()) {
    return { success: false, error: 'O nome da empresa é obrigatório.' }
  }

  try {
    // 1. Busca dados adicionais na web via Tavily + IA (usando o agente de pesquisa)
    const searchData = await searchCompanyData({
      name,
      city,
      state: '',
      category: prefilledData?.category || 'Local Business' // O agente refina depois
    })

    // 2. Cria a entidade Company
    const companyId = uid('c')
    const company: Company = {
      id: companyId,
      workspaceId: store.workspaceId,
      name: name.trim(),
      category: prefilledData?.category || searchData.summary || 'Comércio/Serviço',
      city: city || null,
      state: null,
      address: prefilledData?.address || searchData.address || null,
      phone: prefilledData?.phone || searchData.phone || null,
      whatsapp: prefilledData?.phone || searchData.phone || null, // Assumimos que pode ser zap
      email: searchData.email || null,
      website: prefilledData?.website || searchData.website || null,
      instagram: searchData.instagram || null,
      facebook: searchData.facebook || null,
      rating: searchData.rating || null,
      reviewCount: searchData.reviewCount || null,
      hours: prefilledData?.hours || searchData.hours || null,
      summary: searchData.summary || null,
      source: 'MANUAL_MAPS',
      sourceUrl: url || null,
      isDemo: false,
      createdAt: nowIso(),
      dataStatus: 'MANUAL',
      sourceType: url ? 'maps_url' : 'maps_print',
      retrievedAt: nowIso(),
    }

    // 3. Cria a entidade Lead atrelada à Company
    const leadId = uid('l')
    const lead: Lead = {
      id: leadId,
      workspaceId: store.workspaceId,
      companyId: company.id,
      campaignId: null,
      status: 'NEW',
      tier: 'MEDIUM',
      score: 50, // Será recalculado pela qualificação
      scoreBreakdown: [],
      websiteStatus: company.website ? 'WEBSITE_UNVERIFIED' : 'NO_WEBSITE',
      websiteScan: null,
      digitalPresenceScore: null,
      hasWhatsapp: !!company.whatsapp,
      hasInstagram: !!company.instagram,
      hasFacebook: !!company.facebook,
      hasPhone: !!company.phone,
      analysis: null,
      analysisHash: null,
      lastAnalyzedAt: null,
      messages: [],
      proposal: null,
      favorite: false,
      tags: ['Maps URL'],
      notesCount: 0,
      nextAction: null,
      nextActionAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }

    // 4. Salva no Zustand
    store.upsertCompany(company)
    store.upsertLead(lead)
    store.addActivity({
      leadId: lead.id,
      type: 'LEAD_CREATED',
      description: 'Lead cadastrado via URL do Google Maps',
      detail: `URL: ${url}`,
      actor: store.currentUser.name,
      metadata: { source: 'MANUAL_MAPS' }
    })

    return { success: true, company, lead }

  } catch (error: any) {
    console.error('Erro no importFromMaps:', error)
    return { success: false, error: error.message || 'Erro desconhecido ao processar URL.' }
  }
}

export interface ExtractedImageInfo {
  name: string
  city: string
  category: string
  address: string
  phone: string
  website: string
  hours: string
}

export async function extractDataFromImage(base64Image: string): Promise<ExtractedImageInfo> {
  const { callAI } = await import('./aiClient')
  const Tesseract = await import('tesseract.js')
  
  // 1. Extração de texto via OCR (Visão local no navegador)
  let extractedText = ''
  try {
    const result = await Tesseract.recognize(base64Image, 'por', {
      logger: m => console.log(m)
    })
    extractedText = result.data.text
  } catch (err) {
    console.error('Erro no OCR via Tesseract:', err)
    throw new Error('Falha ao ler o texto da imagem. Tente uma imagem mais nítida.')
  }

  if (!extractedText || extractedText.trim().length < 5) {
    throw new Error('Não foi possível identificar textos legíveis na imagem.')
  }

  // 2. IA estrutura os dados extraídos pelo OCR
  const systemPrompt = `
Você é um extrator de dados de empresas (Google Maps, sites, etc).
O usuário enviou um texto extraído via OCR de um print/screenshot. 
Sua tarefa é analisar o texto abaixo e extrair os dados da empresa.
Retorne APENAS um JSON estrito, sem markdown, contendo os seguintes campos:
- "name": Nome da empresa (string)
- "city": Cidade da empresa (string)
- "category": Nicho ou categoria principal da empresa (ex: "Oficina Mecânica", "Pizzaria") (string)
- "address": Endereço completo (string)
- "phone": Número de telefone (string)
- "website": URL do site (string)
- "hours": Horário de funcionamento, ex: "Aberto até as 18:00" (string)

Se um campo não estiver presente no texto ou não for dedutível, retorne string vazia "". Não use null.`

  const userMessage = `TEXTO DO PRINT (OCR):\n\n${extractedText}\n\nExtraia as informações do texto acima e devolva o JSON estrito.`

  const result = await callAI({
    systemPrompt,
    userMessage,
    temperature: 0.2
  })

  try {
    const raw = result.replace(/```json/g, '').replace(/```/g, '').trim()
    const data = JSON.parse(raw)
    return {
      name: data.name || '',
      city: data.city || '',
      category: data.category || '',
      address: data.address || '',
      phone: data.phone || '',
      website: data.website || '',
      hours: data.hours || ''
    }
  } catch (err) {
    console.error('Falha ao parsear JSON da imagem', err, result)
    throw new Error('Não foi possível extrair dados estruturados da imagem.')
  }
}
