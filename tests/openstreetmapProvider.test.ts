import { describe, it, expect, vi, beforeEach } from 'vitest'
import { OpenStreetMapProvider } from '../src/discovery/providers/openStreetMap'
import { DiscoveryService } from '../src/discovery/engine'
import { useApp } from '../src/services/store'

describe('OpenStreetMapProvider (com Mock HTTP)', () => {
  beforeEach(() => {
    useApp.setState({ companies: [], leads: [], discoveryRuns: [], discoveryResults: [] })
    try {
      localStorage.clear()
    } catch {
      /* ignore */
    }
  })

  it('executa busca REAL usando OpenStreetMapProvider com mock HTTP de Nominatim e Overpass', async () => {
    const mockFetch = vi.fn(async (url: string) => {
      if (url.includes('nominatim')) {
        const payload = [
          {
            lat: '-23.31028',
            lon: '-51.16278',
            boundingbox: ['-23.35', '-23.25', '-51.20', '-51.10'],
            display_name: 'Rolândia, PR, Brasil',
          },
        ]
        return {
          ok: true,
          status: 200,
          json: async () => payload,
          text: async () => JSON.stringify(payload),
        } as Response
      }
      if (url.includes('overpass')) {
        const payload = {
          elements: [
            {
              type: 'node',
              id: 1001,
              lat: -23.31,
              lon: -51.16,
              tags: {
                name: 'Restaurante Exemplo Rolândia',
                amenity: 'restaurant',
                'contact:phone': '+55 43 3256-1122',
                'contact:website': 'https://restauranteexemplorolandia.com.br',
                'addr:street': 'Avenida Interventor Manoel Ribas',
                'addr:housenumber': '500',
                'addr:city': 'Rolândia',
                'addr:state': 'PR',
              },
            },
            {
              type: 'way',
              id: 2002,
              center: { lat: -23.312, lon: -51.165 },
              tags: {
                name: 'Pizzaria Bella Italia',
                amenity: 'restaurant',
                phone: '+55 43 3256-9988',
                'addr:city': 'Rolândia',
                'addr:state': 'PR',
              },
            },
          ],
        }
        return {
          ok: true,
          status: 200,
          json: async () => payload,
          text: async () => JSON.stringify(payload),
        } as Response
      }
      return { ok: false, status: 404, text: async () => '' } as Response
    })

    const provider = new OpenStreetMapProvider({ fetchImpl: mockFetch as unknown as typeof fetch })

    expect(provider.id).toBe('openstreetmap')
    expect(provider.tier).toBe('free')
    expect(provider.needsConfig).toBe(false)
    expect(provider.isConfigured()).toBe(true)

    const res = await provider.search({
      segment: 'Restaurantes',
      city: 'Rolândia',
      state: 'PR',
      country: 'BR',
      limit: 5,
    })

    expect(res.businesses.length).toBe(2)
    expect(res.businesses[0].name).toBe('Restaurante Exemplo Rolândia')
    expect(res.businesses[0].provider).toBe('openstreetmap')
    expect(res.businesses[0].providerRecordId).toBe('osm:node:1001')
    expect(res.businesses[0].phone).toBe('+55 43 3256-1122')
    expect(res.businesses[0].website).toBe('https://restauranteexemplorolandia.com.br')
    expect(res.businesses[1].name).toBe('Pizzaria Bella Italia')
    expect(res.businesses[1].providerRecordId).toBe('osm:way:2002')
  })

  it('DiscoveryService executa busca REAL com OpenStreetMap SEM exigir chave nem cartão do Google', async () => {
    // Garante que NENHUMA chave de Google está configurada
    try {
      localStorage.removeItem('prospex_provider_key_google-places')
    } catch {
      /* ignore */
    }

    const mockFetch = vi.fn(async (url: string) => {
      if (url.includes('nominatim')) {
        const payload = [
          {
            lat: '-23.31028',
            lon: '-51.16278',
            boundingbox: ['-23.35', '-23.25', '-51.20', '-51.10'],
            display_name: 'Rolândia, PR, Brasil',
          },
        ]
        return {
          ok: true,
          status: 200,
          json: async () => payload,
          text: async () => JSON.stringify(payload),
        } as Response
      }
      if (url.includes('overpass')) {
        const payload = {
          elements: [
            {
              type: 'node',
              id: 7777,
              lat: -23.31,
              lon: -51.16,
              tags: {
                name: 'Clínica Odontológica Rolândia',
                amenity: 'dentist',
                'contact:phone': '+55 43 3256-7777',
                'addr:city': 'Rolândia',
                'addr:state': 'PR',
              },
            },
          ],
        }
        return {
          ok: true,
          status: 200,
          json: async () => payload,
          text: async () => JSON.stringify(payload),
        } as Response
      }
      return { ok: false, status: 404, text: async () => '' } as Response
    })

    const originalFetch = globalThis.fetch
    globalThis.fetch = mockFetch as unknown as typeof fetch

    try {
      const svc = new DiscoveryService()
      const run = await svc.run(
        {
          segment: 'Odontologia',
          city: 'Rolândia',
          state: 'PR',
          country: 'BR',
          limit: 5,
          mode: 'REAL',
          providerId: 'openstreetmap',
        },
        { campaignId: 'camp-osm-real' }
      )

      expect(run.status).toBe('COMPLETED')
      expect(run.mode).toBe('REAL')
      expect(run.provider).toBe('openstreetmap')
      expect(run.newCount).toBe(1)

      const s = useApp.getState()
      const company = s.companies.find((c) => c.sourceType === 'openstreetmap')
      expect(company).toBeDefined()
      if (company) {
        expect(company.dataStatus).toBe('REAL')
        expect(company.isDemo).toBe(false)
        expect(company.sourceRecordId).toBe('osm:node:7777')
        expect(company.name).toBe('Clínica Odontológica Rolândia')
        expect(company.sourceUrl).toBe('https://www.openstreetmap.org/node/7777')
      }
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
