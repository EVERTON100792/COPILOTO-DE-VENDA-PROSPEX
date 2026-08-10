import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  computeRuleBasedQualification,
  qualificationInputHash,
  QualificationService,
} from '../src/services/qualification'
import { useApp } from '../src/services/store'
import type { Company, Lead, LeadQualification, WebsiteScan } from '../src/types'

describe('AI Qualification Engine (Fase 3)', () => {
  beforeEach(() => {
    useApp.setState({
      companies: [],
      leads: [],
      qualifications: [],
      settings: {
        ...useApp.getState().settings,
        aiMode: 'OPTIONAL',
        aiApiKey: '',
        cacheEnabled: true,
      },
    })
  })

  it('calcula pontuação baseada em regras determinísticas para empresa sem site', () => {
    const company: Company = {
      id: 'comp-1',
      workspaceId: 'ws_main',
      name: 'Restaurante Exemplo',
      category: 'Restaurantes',
      city: 'Rolândia',
      state: 'PR',
      address: 'Rua A, 100',
      phone: '+55 43 3256-1122',
      whatsapp: null,
      email: null,
      website: null,
      instagram: null,
      facebook: null,
      rating: null,
      reviewCount: null,
      hours: null,
      source: 'openstreetmap',
      isDemo: false,
      createdAt: new Date().toISOString(),
      dataStatus: 'REAL',
    }

    const lead: Lead = {
      id: 'lead-1',
      workspaceId: 'ws_main',
      companyId: 'comp-1',
      campaignId: 'camp-1',
      status: 'NEW',
      tier: 'HIGH',
      score: 75,
      scoreBreakdown: [],
      websiteStatus: 'NO_WEBSITE',
      websiteScan: null,
      digitalPresenceScore: 30,
      hasWhatsapp: false,
      hasInstagram: false,
      hasFacebook: false,
      hasPhone: true,
      analysis: null,
      messages: [],
      proposal: null,
      favorite: false,
      tags: [],
      notesCount: 0,
      nextAction: null,
      nextActionAt: null,
      analysisHash: null,
      lastAnalyzedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const res = computeRuleBasedQualification(company, lead, null)

    expect(res.score).toBeGreaterThanOrEqual(75)
    expect(res.opportunityTypes).toContain('NO_WEBSITE_IDENTIFIED')
    expect(res.recommendedService).toBe('WEBSITE_INSTITUTIONAL')
    expect(res.evidence.length).toBeGreaterThan(0)
    expect(res.recommendedApproach).toContain('não identificamos um site oficial')
  })

  it('gera hash determinístico de entrada (inputHash) consistente para cache', () => {
    const company: Company = {
      id: 'comp-hash',
      workspaceId: 'ws_main',
      name: 'Oficina Teste',
      category: 'Oficinas',
      city: 'Rolândia',
      state: 'PR',
      address: null,
      phone: '+55 43 3256-0000',
      whatsapp: null,
      email: null,
      website: null,
      instagram: null,
      facebook: null,
      rating: null,
      reviewCount: null,
      hours: null,
      source: 'openstreetmap',
      isDemo: false,
      createdAt: new Date().toISOString(),
    }

    const lead: Lead = {
      id: 'lead-hash',
      workspaceId: 'ws_main',
      companyId: 'comp-hash',
      campaignId: null,
      status: 'NEW',
      tier: 'MEDIUM',
      score: 60,
      scoreBreakdown: [],
      websiteStatus: 'NO_WEBSITE',
      websiteScan: null,
      digitalPresenceScore: 20,
      hasWhatsapp: false,
      hasInstagram: false,
      hasFacebook: false,
      hasPhone: true,
      analysis: null,
      messages: [],
      proposal: null,
      favorite: false,
      tags: [],
      notesCount: 0,
      nextAction: null,
      nextActionAt: null,
      analysisHash: null,
      lastAnalyzedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const hash1 = qualificationInputHash(company, lead, null)
    const hash2 = qualificationInputHash(company, lead, null)

    expect(hash1).toBe(hash2)
    expect(hash1).toMatch(/^qhash_/)
  })

  it('executa qualificação Rule-Based com sucesso quando IA não está configurada', async () => {
    const company: Company = {
      id: 'c-100',
      workspaceId: 'ws_main',
      name: 'Churrascaria Rolândia',
      category: 'Restaurantes',
      city: 'Rolândia',
      state: 'PR',
      address: 'Avenida Principal',
      phone: '+55 43 3256-9999',
      whatsapp: null,
      email: null,
      website: null,
      instagram: null,
      facebook: null,
      rating: null,
      reviewCount: null,
      hours: null,
      source: 'openstreetmap',
      isDemo: false,
      createdAt: new Date().toISOString(),
      dataStatus: 'REAL',
    }

    const lead: Lead = {
      id: 'l-100',
      workspaceId: 'ws_main',
      companyId: 'c-100',
      campaignId: 'camp-test',
      status: 'NEW',
      tier: 'HIGH',
      score: 80,
      scoreBreakdown: [],
      websiteStatus: 'NO_WEBSITE',
      websiteScan: null,
      digitalPresenceScore: 20,
      hasWhatsapp: false,
      hasInstagram: false,
      hasFacebook: false,
      hasPhone: true,
      analysis: null,
      messages: [],
      proposal: null,
      favorite: false,
      tags: [],
      notesCount: 0,
      nextAction: null,
      nextActionAt: null,
      analysisHash: null,
      lastAnalyzedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    useApp.setState({
      companies: [company],
      leads: [lead],
    })

    const svc = new QualificationService()
    const q = await svc.qualifyLead('l-100')

    expect(q).toBeDefined()
    expect(q.qualificationMethod).toBe('RULE_BASED')
    expect(q.finalScore).toBeGreaterThan(0)
    expect(q.qualification).toBe('HIGH')
    expect(q.opportunityTypes).toContain('NO_WEBSITE_IDENTIFIED')

    const updatedLead = useApp.getState().leads.find((item) => item.id === 'l-100')
    expect(updatedLead?.status).toBe('QUALIFIED')
  })

  it('realiza qualificação em lote de campanha (qualifyCampaign)', async () => {
    const companies: Company[] = [
      {
        id: 'c-batch-1',
        workspaceId: 'ws_main',
        name: 'Padaria A',
        category: 'Padarias',
        city: 'Rolândia',
        state: 'PR',
        address: null,
        phone: '+55 43 3256-1111',
        whatsapp: null,
        email: null,
        website: null,
        instagram: null,
        facebook: null,
        rating: null,
        reviewCount: null,
        hours: null,
        source: 'openstreetmap',
        isDemo: false,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'c-batch-2',
        workspaceId: 'ws_main',
        name: 'Mercado B',
        category: 'Mercados',
        city: 'Rolândia',
        state: 'PR',
        address: null,
        phone: null,
        whatsapp: null,
        email: null,
        website: 'https://mercadob.com.br',
        instagram: null,
        facebook: null,
        rating: null,
        reviewCount: null,
        hours: null,
        source: 'openstreetmap',
        isDemo: false,
        createdAt: new Date().toISOString(),
      },
    ]

    const leads: Lead[] = [
      {
        id: 'l-batch-1',
        workspaceId: 'ws_main',
        companyId: 'c-batch-1',
        campaignId: 'camp-batch',
        status: 'NEW',
        tier: null,
        score: null,
        scoreBreakdown: [],
        websiteStatus: 'NO_WEBSITE',
        websiteScan: null,
        digitalPresenceScore: 0,
        hasWhatsapp: false,
        hasInstagram: false,
        hasFacebook: false,
        hasPhone: true,
        analysis: null,
        messages: [],
        proposal: null,
        favorite: false,
        tags: [],
        notesCount: 0,
        nextAction: null,
        nextActionAt: null,
        analysisHash: null,
        lastAnalyzedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'l-batch-2',
        workspaceId: 'ws_main',
        companyId: 'c-batch-2',
        campaignId: 'camp-batch',
        status: 'NEW',
        tier: null,
        score: null,
        scoreBreakdown: [],
        websiteStatus: 'WEBSITE_FOUND',
        websiteScan: null,
        digitalPresenceScore: 50,
        hasWhatsapp: false,
        hasInstagram: false,
        hasFacebook: false,
        hasPhone: false,
        analysis: null,
        messages: [],
        proposal: null,
        favorite: false,
        tags: [],
        notesCount: 0,
        nextAction: null,
        nextActionAt: null,
        analysisHash: null,
        lastAnalyzedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    useApp.setState({ companies, leads })

    const svc = new QualificationService()
    const progressLogs: number[] = []

    const results = await svc.qualifyCampaign('camp-batch', {
      onProgress: (p) => progressLogs.push(p.processed),
    })

    expect(results.length).toBe(2)
    expect(progressLogs.length).toBeGreaterThan(0)
    expect(useApp.getState().qualifications.length).toBe(2)
  })
})
