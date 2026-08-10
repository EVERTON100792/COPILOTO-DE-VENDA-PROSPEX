import { describe, it, expect } from 'vitest'
import {
  sanitizeBBox,
  buildOverpassQuery,
  type BoundingBox,
} from '../src/discovery/providers/openStreetMap'

describe('Overpass Query Builder (buildOverpassQuery)', () => {
  it('sanitiza e limita a bounding box dentro das coordenadas geográficas válidas', () => {
    const invalidBox: BoundingBox = {
      south: -100, // deve clamp para -90
      west: -200,  // deve clamp para -180
      north: 100,  // deve clamp para 90
      east: 200,   // deve clamp para 180
    }
    const clean = sanitizeBBox(invalidBox)
    expect(clean.south).toBe(-90)
    expect(clean.west).toBe(-180)
    expect(clean.north).toBe(90)
    expect(clean.east).toBe(180)
  })

  it('ajusta bounding box invertida (south >= north ou west >= east)', () => {
    const inverted: BoundingBox = {
      south: -23.3,
      west: -51.1,
      north: -23.5, // menor que south!
      east: -51.2,  // menor que west!
    }
    const clean = sanitizeBBox(inverted)
    expect(clean.south).toBeLessThan(clean.north)
    expect(clean.west).toBeLessThan(clean.east)
  })

  it('gera Overpass QL válida com sintaxe nwr e ponto e vírgula correto', () => {
    const tags = [{ key: 'amenity', value: 'dentist' }]
    const bbox: BoundingBox = {
      south: -23.32,
      west: -51.18,
      north: -23.28,
      east: -51.14,
    }

    const query = buildOverpassQuery(tags, bbox, { timeoutSec: 25, pageSize: 50 })

    expect(query).toContain('[out:json][timeout:25];')
    expect(query).toContain('nwr["amenity"~"^(dentist)$"]')
    expect(query).toContain(');\nout center 50;')
  })

  it('sanitiza e previne injeção de caracteres maliciosos em chaves/valores de tags', () => {
    const maliciousTags = [
      { key: 'amenity; drop table', value: 'dentist" || true' },
      { key: 'amenity', value: 'dentist' },
    ]
    const bbox: BoundingBox = { south: -23.3, west: -51.1, north: -23.2, east: -51.0 }

    const query = buildOverpassQuery(maliciousTags, bbox)
    // A chave inválida "amenity; drop table" deve ser ignorada pelo regex VALID_KEY
    expect(query).not.toContain('drop table')
    expect(query).toContain('nwr["amenity"~"^(dentist')
  })
})
