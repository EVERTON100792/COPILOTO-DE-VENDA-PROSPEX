import { describe, it, expect } from 'vitest'
import { computeScore } from '../src/agents/ScoringAgent'
import { tierFromScore, DEFAULT_SCORE_WEIGHTS, TIER_RULES } from '../src/config/defaults'
import type { NormalizedDiscovered } from '../src/agents/types'

function company(over: Partial<NormalizedDiscovered> = {}): NormalizedDiscovered {
  return {
    name: 'Empresa X',
    normalizedName: 'empresa x',
    normalizedPhone: null,
    domain: null,
    complete: false,
    category: 'Odontologia',
    city: 'Londrina',
    state: 'PR',
    address: null,
    phone: null,
    whatsapp: null,
    website: null,
    instagram: null,
    facebook: null,
    rating: null,
    reviewCount: null,
    hours: null,
    source: 'test',
    ...over,
  }
}

describe('ScoringAgent.computeScore', () => {
  it('premia empresas sem site (grande oportunidade)', () => {
    const { score } = computeScore({ company: company(), websiteStatus: 'NO_WEBSITE', weights: DEFAULT_SCORE_WEIGHTS })
    expect(score).toBeGreaterThan(0)
    const breakdown = computeScore({ company: company(), websiteStatus: 'NO_WEBSITE', weights: DEFAULT_SCORE_WEIGHTS }).breakdown
    expect(breakdown.some((b) => b.label === 'Sem site')).toBe(true)
  })

  it('penaliza dados incompletos quando peso é negativo', () => {
    const { score } = computeScore({ company: company({ complete: false }), websiteStatus: 'WEBSITE_FOUND', weights: DEFAULT_SCORE_WEIGHTS })
    expect(score).toBeLessThanOrEqual(0)
  })

  it('combina avaliações, rating e contatos', () => {
    const full = computeScore({
      company: company({
        rating: 4.8,
        reviewCount: 120,
        instagram: '@cliente',
        whatsapp: '(43) 9999-0000',
        phone: '(43) 3333-0000',
        website: 'https://cliente.com.br',
        domain: 'cliente.com.br',
        hours: 'Seg-Sex 08h-18h',
        complete: true,
      }),
      websiteStatus: 'WEBSITE_FOUND',
      weights: DEFAULT_SCORE_WEIGHTS,
    })
    const bare = computeScore({
      company: company({ rating: 3.8, reviewCount: 2 }),
      websiteStatus: 'WEBSITE_UNKNOWN',
      weights: DEFAULT_SCORE_WEIGHTS,
    })
    expect(full.score).toBeGreaterThan(bare.score)
  })

  it('respeita pesos customizados (noWebsite zerado)', () => {
    const full = company({
      rating: 4.8, reviewCount: 120, instagram: '@x', whatsapp: '(43) 9999-0000',
      phone: '(43) 3333-0000', hours: 'Seg-Sex 08h-18h', complete: true,
    })
    const custom = { ...DEFAULT_SCORE_WEIGHTS, noWebsite: 0 }
    const withDefault = computeScore({ company: full, websiteStatus: 'NO_WEBSITE', weights: DEFAULT_SCORE_WEIGHTS })
    const withZero = computeScore({ company: full, websiteStatus: 'NO_WEBSITE', weights: custom })
    expect(withZero.score).toBe(withDefault.score - DEFAULT_SCORE_WEIGHTS.noWebsite)
    expect(withZero.breakdown.some((b) => b.label === 'Sem site')).toBe(false)
  })

  it('sempre retorna score entre 0 e 100', () => {
    for (const ws of ['NO_WEBSITE', 'WEBSITE_FOUND', 'WEBSITE_BROKEN', 'WEBSITE_UNKNOWN']) {
      const { score } = computeScore({ company: company(), websiteStatus: ws, weights: DEFAULT_SCORE_WEIGHTS })
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(100)
    }
  })
})

describe('tiers', () => {
  it('mapeia score para tier correto', () => {
    expect(tierFromScore(95)).toBe('HOT')
    expect(tierFromScore(80)).toBe('HIGH')
    expect(tierFromScore(65)).toBe('MEDIUM')
    expect(tierFromScore(50)).toBe('LOW')
    expect(tierFromScore(20)).toBe('VERY_LOW')
  })

  it('regras de tier estão ordenadas e dentro dos limites', () => {
    for (const r of TIER_RULES) {
      expect(r.min).toBeLessThanOrEqual(r.max)
      expect(r.min).toBeGreaterThanOrEqual(0)
      expect(r.max).toBeLessThanOrEqual(100)
    }
  })
})