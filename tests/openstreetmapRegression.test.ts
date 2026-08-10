import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  buildOverpassQuery,
  OpenStreetMapProvider,
  resolveOsmCategory,
  type BoundingBox,
} from '../src/discovery/providers/openStreetMap'

describe('OpenStreetMap Regression Tests', () => {
  beforeEach(() => {
    try {
      localStorage.clear()
    } catch {
      /* ignore */
    }
  })

  it('does not produce malformed Overpass request (garante ponto e vírgula após fechar bloco)', () => {
    const category = resolveOsmCategory('Oficinas mecânicas')
    expect(category).not.toBeNull()
    if (!category) return

    const bbox: BoundingBox = {
      south: -23.394883,
      west: -51.541,
      north: -23.167,
      east: -51.29,
    }

    const query = buildOverpassQuery(category.tags, bbox, { timeoutSec: 25, pageSize: 51 })

    // Garante que a sintaxe termina com ); antes do out center (causa do HTTP 400 anterior)
    expect(query).toMatch(/\);\s*out center 51;$/)
    expect(query).not.toMatch(/\)\s*out center/)
  })

  it('trata respostas HTTP 400 capturando mensagem de erro sem fazer retry indevido', async () => {
    const mockFetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes('nominatim')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            {
              lat: '-23.31199',
              lon: '-51.36741',
              boundingbox: ['-23.39', '-23.16', '-51.54', '-51.29'],
              display_name: 'Rolândia, PR, Brasil',
            },
          ],
        } as Response
      }
      if (url.includes('overpass')) {
        return {
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          text: async () =>
            '<html><body><strong style="color:#FF0000">Error</strong>: line 6: parse error: ";" expected - ")" found.</body></html>',
        } as Response
      }
      return { ok: false, status: 404 } as Response
    })

    const provider = new OpenStreetMapProvider({ fetchImpl: mockFetch as unknown as typeof fetch })

    await expect(
      provider.search({
        segment: 'Oficinas mecânicas',
        city: 'Rolândia',
        state: 'PR',
        country: 'BR',
        limit: 5,
      })
    ).rejects.toThrow('A fonte rejeitou a consulta (HTTP 400 Bad Request)')

    // Verifica que para HTTP 400 não houve retries em loop (somente 1 tentativa no endpoint)
    const overpassCalls = mockFetch.mock.calls.filter((call) => String(call[0]).includes('overpass'))
    expect(overpassCalls.length).toBe(1)
  })
})
