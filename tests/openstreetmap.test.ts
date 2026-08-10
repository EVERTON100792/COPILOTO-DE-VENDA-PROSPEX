import { describe, it, expect } from 'vitest'
import {
  parseOsmBusiness,
  resolveOsmCategory,
  OSM_ATTRIBUTION,
  OSM_LICENSE,
  OSM_CATEGORIES,
  type OsmElement,
} from '../src/discovery/providers/openStreetMap'

describe('OpenStreetMap Category Mapper', () => {
  it('mapeia termos em português para categorias OSM válidas', () => {
    expect(resolveOsmCategory('Dentista')?.id).toBe('odontologia')
    expect(resolveOsmCategory('Clínica Odontológica')?.id).toBe('odontologia')
    expect(resolveOsmCategory('Restaurante')?.id).toBe('restaurantes')
    expect(resolveOsmCategory('Pizzaria')?.id).toBe('restaurantes')
    expect(resolveOsmCategory('Academia')?.id).toBe('academias')
    expect(resolveOsmCategory('Salão de Beleza')?.id).toBe('saloes')
    expect(resolveOsmCategory('Oficina Mecânica')?.id).toBe('oficinas')
    expect(resolveOsmCategory('Hotel')?.id).toBe('hoteis')
    expect(resolveOsmCategory('Pousada')?.id).toBe('hoteis')
  })

  it('retorna null para categorias não suportadas', () => {
    expect(resolveOsmCategory('CategoriaInexistente123')).toBeNull()
  })

  it('garante que todas as categorias possuem tags e rotulos validos', () => {
    for (const cat of OSM_CATEGORIES) {
      expect(cat.id).toBeTruthy()
      expect(cat.label).toBeTruthy()
      expect(cat.keywords.length).toBeGreaterThan(0)
      expect(cat.tags.length).toBeGreaterThan(0)
      for (const t of cat.tags) {
        expect(t.key).toBeTruthy()
        expect(t.value).toBeTruthy()
      }
    }
  })
})

describe('OpenStreetMap Element Parser (parseOsmBusiness)', () => {
  it('converte elemento do tipo node para ProviderBusiness', () => {
    const node: OsmElement = {
      type: 'node',
      id: 123456,
      lat: -23.31028,
      lon: -51.16278,
      tags: {
        name: 'Clínica Odontológica Exemplo',
        amenity: 'dentist',
        'addr:street': 'Rua Sergipe',
        'addr:housenumber': '300',
        'addr:city': 'Londrina',
        'addr:state': 'PR',
        'contact:phone': '+55 43 3333-4444',
        'contact:website': 'https://odontolexemplo.com.br',
      },
    }

    const business = parseOsmBusiness(node)
    expect(business).not.toBeNull()
    if (!business) return

    expect(business.provider).toBe('openstreetmap')
    expect(business.providerRecordId).toBe('osm:node:123456')
    expect(business.name).toBe('Clínica Odontológica Exemplo')
    expect(business.phone).toBe('+55 43 3333-4444')
    expect(business.website).toBe('https://odontolexemplo.com.br')
    expect(business.city).toBe('Londrina')
    expect(business.state).toBe('PR')
    expect(business.address).toBe('Rua Sergipe, 300')
    expect(business.lat).toBe(-23.31028)
    expect(business.lon).toBe(-51.16278)
    expect(business.sourceUrl).toBe('https://www.openstreetmap.org/node/123456')
  })

  it('converte elemento do tipo way com center para ProviderBusiness', () => {
    const way: OsmElement = {
      type: 'way',
      id: 987654,
      center: { lat: -23.5505, lon: -46.6333 },
      tags: {
        name: 'Restaurante Sabor Real',
        amenity: 'restaurant',
        phone: '(11) 99999-8888',
        website: 'https://saborreal.com.br',
        'contact:instagram': 'https://instagram.com/saborreal',
        opening_hours: 'Mo-Sa 11:30-22:00',
      },
    }

    const business = parseOsmBusiness(way, { fallbackCity: 'São Paulo', fallbackState: 'SP' })
    expect(business).not.toBeNull()
    if (!business) return

    expect(business.providerRecordId).toBe('osm:way:987654')
    expect(business.name).toBe('Restaurante Sabor Real')
    expect(business.phone).toBe('(11) 99999-8888')
    expect(business.website).toBe('https://saborreal.com.br')
    expect(business.instagram).toBe('https://instagram.com/saborreal')
    expect(business.hours).toBe('Mo-Sa 11:30-22:00')
    expect(business.city).toBe('São Paulo')
    expect(business.state).toBe('SP')
    expect(business.lat).toBe(-23.5505)
    expect(business.lon).toBe(-46.6333)
  })

  it('retorna null se o elemento não possuir nome', () => {
    const unnamed: OsmElement = {
      type: 'node',
      id: 555,
      lat: -23.0,
      lon: -51.0,
      tags: {
        amenity: 'restaurant',
      },
    }
    expect(parseOsmBusiness(unnamed)).toBeNull()
  })

  it('retorna atribuição e licença corretas', () => {
    expect(OSM_ATTRIBUTION).toBe('© OpenStreetMap contributors')
    expect(OSM_LICENSE).toContain('OpenStreetMap')
  })
})
