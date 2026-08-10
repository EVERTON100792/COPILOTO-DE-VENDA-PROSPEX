import type { Company, Campaign, Lead } from '../types'
import { uid, nowIso } from '../lib/utils'
import { DEMO_COMPANIES } from './demoData'

export function buildDemoCompanies(): Company[] {
  return DEMO_COMPANIES.map((d) => ({
    id: uid('cmp'),
    workspaceId: 'ws_main',
    name: d.name,
    category: d.category,
    city: d.city,
    state: d.state,
    country: 'BR',
    address: d.address ?? null,
    phone: d.phone ?? null,
    whatsapp: d.whatsapp ?? null,
    email: null,
    website: d.website ?? null,
    instagram: d.instagram ?? null,
    facebook: d.facebook ?? null,
    rating: d.rating ?? null,
    reviewCount: d.reviewCount ?? null,
    hours: 'Seg-Sex 08h-18h',
    source: d.source,
    isDemo: true,
    createdAt: nowIso(),
  }))
}

export function makeDemoCampaign(): Campaign {
  return {
    id: uid('cmpn'),
    workspaceId: 'ws_main',
    name: 'Dentistas Londrina (Demo)',
    niche: 'Odontologia',
    city: 'Londrina',
    state: 'PR',
    country: 'BR',
    quantity: 100,
    keywords: ['dentista', 'clínica odontológica', 'consultório dentário'],
    criteria: { onlyNoWebsite: false, onlyWithWhatsapp: false, onlyWithInstagram: false, minScore: 0, minReviews: 0, minRating: 0 },
    offer: { product: 'Site profissional', price: 497, deliverable: 'Site institucional com agendamento via WhatsApp', benefit: 'Mais consultas agendadas', cta: 'Posso preparar uma demonstração sem compromisso' },
    messagePrompt: '',
    status: 'FINISHED',
    progress: 100,
    stats: { discovered: 16, analyzed: 16, noWebsite: 13, qualified: 12, duplicatesRemoved: 2, contacted: 8, replied: 4 },
    startedAt: nowIso(),
    finishedAt: nowIso(),
    createdAt: nowIso(),
  }
}

export function makeDemoLeads(campaign: Campaign): Lead[] {
  const companies = buildDemoCompanies().filter((c) => c.category === 'Odontologia' && c.city === 'Londrina')
  const statuses: Lead['status'][] = ['NEW', 'REPLIED', 'CONTACTED', 'NEW', 'CONTACTED', 'NEW', 'WON', 'NEW']
  const scores = [94, 88, 81, 76, 71, 64, 58, 49]
  return companies.map((c, i) => {
    const hasSite = Boolean(c.website)
    return {
      id: uid('lead'),
      workspaceId: 'ws_main',
      companyId: c.id,
      campaignId: campaign.id,
      status: statuses[i % statuses.length],
      tier: 'MEDIUM',
      score: scores[i % scores.length],
      scoreBreakdown: [],
      websiteStatus: hasSite ? 'WEBSITE_FOUND' : 'NO_WEBSITE',
      websiteScan: null,
      digitalPresenceScore: 70,
      hasWhatsapp: Boolean(c.whatsapp),
      hasInstagram: Boolean(c.instagram),
      hasFacebook: Boolean(c.facebook),
      hasPhone: Boolean(c.phone),
      analysis: null,
      analysisHash: null,
      lastAnalyzedAt: null,
      messages: [],
      proposal: null,
      favorite: i === 1,
      tags: i % 2 === 0 ? ['alto-potencial'] : [],
      notesCount: 0,
      nextAction: null,
      nextActionAt: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
  })
}