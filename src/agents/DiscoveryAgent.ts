import { BaseAgent } from './base'
import type { AgentContext, DiscoveryOutput } from './types'
import { DEMO_COMPANIES } from '../database/demoData'
import { getMapsProvider } from '../integrations/maps'
import { searchWeb } from '../integrations/search'
import type { Company, Campaign } from '../types'

export class DiscoveryAgent extends BaseAgent {
  readonly name = 'DISCOVERY'
  readonly description = 'Descobre empresas por nicho e localização'

  protected async runCore(input: Record<string, unknown>, ctx: AgentContext): Promise<DiscoveryOutput> {
    const niche = String(input.niche ?? '')
    const city = String(input.city ?? '')
    const state = String(input.state ?? '')
    const quantity = Math.min(Number(input.quantity ?? 100) || 100, 200)

    if (ctx.demoMode) {
      const companies = DEMO_COMPANIES
        .filter((c) => c.category === niche && (!city || c.city === city) && (!state || c.state === state))
        .slice(0, quantity)
        .map((d) => ({
          name: d.name,
          category: d.category,
          city: d.city,
          state: d.state,
          address: d.address ?? null,
          phone: d.phone ?? null,
          whatsapp: d.whatsapp ?? null,
          website: d.website ?? null,
          instagram: d.instagram ?? null,
          facebook: d.facebook ?? null,
          rating: d.rating ?? null,
          reviewCount: d.reviewCount ?? null,
          hours: null,
          source: d.source,
        }))
      return {
        companies,
        source: 'DEMO (dados fictícios identificados)',
      }
    }

    const maps = getMapsProvider()
    let fromMaps: { name: string; address: string | null; phone: string | null; website: string | null; rating: number | null; reviewCount: number | null }[] = []
    try {
      fromMaps = await maps.findBusinesses(niche, city, state, quantity)
    } catch {
      fromMaps = []
    }

    const results: DiscoveryOutput['companies'] = fromMaps.map((m) => ({
      name: m.name,
      category: niche,
      city,
      state,
      address: m.address,
      phone: m.phone,
      whatsapp: m.phone,
      website: m.website,
      instagram: null,
      facebook: null,
      rating: m.rating,
      reviewCount: m.reviewCount,
      hours: null,
      source: 'Google Places',
    }))

    if (results.length < quantity) {
      try {
        const query = `${niche} em ${city} - ${state}`
        const webResults = await searchWeb(query, quantity - results.length)
        for (const r of webResults) {
          if (results.length >= quantity) break
          if (!r.title || results.some((x) => x.name === r.title)) continue
          results.push({
            name: r.title,
            category: niche,
            city,
            state,
            address: null,
            phone: null,
            whatsapp: null,
            website: r.url ?? null,
            instagram: null,
            facebook: null,
            rating: null,
            reviewCount: null,
            hours: null,
            source: 'Busca web',
          })
        }
      } catch {
        /* fonte indisponível — segue com o que temos */
      }
    }

    return { companies: results, source: 'Integração configurada' }
  }
}

export function campaignToDiscoveryInput(campaign: Campaign): Record<string, unknown> {
  return {
    niche: campaign.niche,
    city: campaign.city,
    state: campaign.state,
    country: campaign.country,
    quantity: campaign.quantity,
    keywords: campaign.keywords,
  }
}

export function companyFromDiscovered(d: DiscoveryOutput['companies'][number], workspaceId: string, campaignId: string | null, isDemo: boolean): Company {
  return {
    id: 'cmp_' + Math.random().toString(36).slice(2, 10),
    workspaceId,
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
    hours: d.hours ?? null,
    source: d.source ?? null,
    isDemo,
    createdAt: new Date().toISOString(),
  }
}