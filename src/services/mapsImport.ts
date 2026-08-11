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

export async function importFromMaps(name: string, city: string, url: string): Promise<MapsImportResult> {
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
      category: 'Local Business' // Genérico, a IA afunila depois
    })

    // 2. Cria a entidade Company
    const companyId = uid('c')
    const company: Company = {
      id: companyId,
      workspaceId: store.workspaceId,
      name: name.trim(),
      category: searchData.summary || 'Comércio/Serviço',
      city: city || null,
      state: null,
      address: searchData.address || null,
      phone: searchData.phone || null,
      whatsapp: searchData.phone || null, // Assumimos que pode ser zap
      email: searchData.email || null,
      website: searchData.website || null,
      instagram: searchData.instagram || null,
      facebook: searchData.facebook || null,
      rating: searchData.rating || null,
      reviewCount: searchData.reviewCount || null,
      hours: searchData.hours || null,
      summary: searchData.summary || null,
      source: 'MANUAL_MAPS',
      sourceUrl: url,
      isDemo: false,
      createdAt: nowIso(),
      dataStatus: 'MANUAL',
      sourceType: 'maps_url',
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
