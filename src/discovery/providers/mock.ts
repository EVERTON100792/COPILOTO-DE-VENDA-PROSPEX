/**
 * MockDiscoveryProvider — provider fictício para DEMO e testes.
 * NUNCA é utilizado em modo REAL: todo resultado é marcado como demo
 * (data_status=DEMO) e exibido com selo no sistema.
 */

import { DEMO_COMPANIES } from '../../database/demoData'
import type { DemoSpec } from '../../database/demoData'
import type {
  DiscoveryProvider,
  DiscoverySearchParams,
  DiscoverySearchResponse,
  ProviderBusiness,
} from './types'

function specToProvider(spec: DemoSpec, index: number): ProviderBusiness {
  return {
    provider: 'mock',
    providerRecordId: `mock-${index}`,
    name: spec.name,
    category: spec.category ?? null,
    address: null,
    city: spec.city ?? null,
    state: spec.state ?? null,
    country: 'BR',
    phone: spec.phone ?? null,
    website: spec.website ?? null,
    instagram: spec.instagram ?? null,
    facebook: spec.facebook ?? null,
    rating: spec.rating ?? null,
    reviewCount: spec.reviewCount ?? null,
    hours: null,
    sourceUrl: null,
    raw: { demo: true, marker: 'MockProvider (dados fictícios)', sequence: index },
  }
}

export class MockDiscoveryProvider implements DiscoveryProvider {
  readonly id = 'mock'
  readonly name = 'Dataset demo (MockProvider)'
  readonly description = 'Empresas fictícias claramente identificadas — somente modo DEMO/testes.'
  readonly tier = 'demo'
  readonly needsConfig = false
  readonly rateLimit = { maxRequests: 100, delayMs: 60 }

  isConfigured(): boolean {
    return true
  }

  async search(params: DiscoverySearchParams): Promise<DiscoverySearchResponse> {
    const segment = params.segment.toLowerCase()
    const city = params.city.toLowerCase()
    const matches = DEMO_COMPANIES.filter((s) => {
      const seg = (s.category ?? '').toLowerCase()
      const okSeg = seg.includes(segment) || segment.includes(seg)
      const okCity = !city || (s.city ?? '').toLowerCase() === city
      return okSeg && okCity
    })

    const page = Number(params.pageToken ?? '0')
    const start = page * params.limit
    const slice = matches.slice(start, start + params.limit)
    return {
      businesses: slice.map((s, i) => specToProvider(s, start + i)),
      nextPageToken: start + params.limit < matches.length ? String(page + 1) : null,
      hasMore: start + params.limit < matches.length,
      totalEstimate: matches.length,
    }
  }
}