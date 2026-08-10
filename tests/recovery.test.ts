import { describe, it, expect } from 'vitest'
import { normalizePhone, normalizeUrl, normalizeState, normalizeCity, normalizeName, hostnameOf } from '../src/services/normalization'
import { findExistingBusiness, wordSimilarity } from '../src/services/deduplication'
import { validateBusiness } from '../src/services/validation'
import { computeWebsiteQuality } from '../src/services/websiteQuality'
import { analyzeOpportunity } from '../src/services/opportunity'
import { MockDiscoveryProvider } from '../src/discovery/providers/mock'
import type { Company } from '../src/types'

function company(over: Partial<Company> = {}): Company {
  return {
    id: 'c', workspaceId: 'ws', name: 'X', category: null, city: null, state: null,
    address: null, phone: null, whatsapp: null, email: null, website: null,
    instagram: null, facebook: null, rating: null, reviewCount: null, hours: null,
    source: 'test', isDemo: false, createdAt: new Date().toISOString(), ...over,
  }
}

describe('NormalizationService', () => {
  it('normaliza telefone brasileiro com/ sem formatação', () => {
    expect(normalizePhone('(43) 3321-1180')).toBe('+554333211180')
    expect(normalizePhone('43 99123-4567')).toBe('+5543991234567')
    expect(normalizePhone('+55 43 3321-1180')).toBe('+554333211180')
  })
  it('não reconhece telefone ambíguo (sem DDD)', () => {
    expect(normalizePhone('3321-1180')).toBeNull()
  })
  it('normaliza URL preservando domínio', () => {
    expect(normalizeUrl('www.exemplo.com.br')).toBe('https://www.exemplo.com.br')
    expect(normalizeUrl('http://exemplo.com/pagina/')).toBe('https://exemplo.com/pagina')
    expect(normalizeUrl('não é url')).toBeNull()
    expect(normalizeUrl('javascript:alert(1)')).toBeNull()
  })
  it('normaliza estado nome→UF', () => {
    expect(normalizeState('pr')).toBe('PR')
    expect(normalizeState('Paraná')).toBe('PR')
    expect(normalizeState('São Paulo')).toBe('SP')
    expect(normalizeState('zzz')).toBeNull()
  })
  it('limpa nome e remove sufixo de cidade', () => {
    expect(normalizeName('  Clínica   Dental  ').cleaned).toBe('clínica dental')
    expect(normalizeCity('Londrina-PR', 'PR')).toBe('Londrina')
    expect(normalizeCity('sao paulo')).toBe('Sao Paulo')
  })
  it('extrai hostname sem www', () => {
    expect(hostnameOf('https://www.minhasite.com.br/x')).toBe('minhasite.com.br')
  })
})

describe('DeduplicationService', () => {
  const base = company({
    id: 'a', name: 'Restaurante do João', phone: '(43) 9999-9999', city: 'Londrina',
    website: 'https://joao.example.com', sourceRecordId: 'place-123',
  })

  it('mesmo ID de fonte → HIGH', () => {
    const r = findExistingBusiness({ providerRecordId: 'place-123', name: 'Restaurante do João' }, [base])
    expect(r.confidence).toBe('HIGH')
    expect(r.reason).toContain('Identificador')
  })
  it('mesmo telefone → HIGH', () => {
    const r = findExistingBusiness({ name: 'Outro nome', phone: '(43) 9999-9999' }, [base])
    expect(r.confidence).toBe('HIGH')
    expect(r.reason).toContain('Telefone')
  })
  it('mesmo domínio → HIGH', () => {
    const r = findExistingBusiness({ name: 'Outro', website: 'http://www.joao.example.com' }, [base])
    expect(r.confidence).toBe('HIGH')
  })
  it('nome semelhante + mesma cidade → MEDIUM', () => {
    const r = findExistingBusiness({ name: 'Restaurante Joao Silva', city: 'Londrina' }, [base])
    expect(r.confidence).toBe('MEDIUM')
  })
  it('nomes distintos → LOW (não une)', () => {
    const r = findExistingBusiness({ name: 'Padaria Central', city: 'Curitiba' }, [base])
    expect(r.confidence).toBe('LOW')
    expect(r.duplicateOf).toBeNull()
  })
  it('similaridade por palavras ignora razão social', () => {
    expect(wordSimilarity('Restaurante do João', 'Restaurante João Ltda')).toBeGreaterThan(0.5)
  })
})

describe('ValidationService', () => {
  it('valida dados mínimos → REAL + confiança', () => {
    const v = validateBusiness({ name: 'Clínica X', city: 'Londrina', state: 'PR', phone: '(43) 1111-2222', providerRecordId: 'p-1', sourceType: 'google-places' })
    expect(v.valid).toBe(true)
    expect(v.status).toBe('REAL')
    expect(v.confidence).toBe('HIGH')
  })
  it('sem dados mínimos → UNVERIFIED', () => {
    const v = validateBusiness({ name: 'X' })
    expect(v.valid).toBe(false)
    expect(v.status).toBe('UNVERIFIED')
    expect(v.errors.length).toBeGreaterThan(0)
  })
  it('nome ruim falha', () => {
    expect(validateBusiness({ name: '' }).valid).toBe(false)
  })
})

describe('WebsiteService (website_quality_score)', () => {
  it('site acessível com móvel → score alto', () => {
    const q = computeWebsiteQuality({
      status: 200, https: true, title: 'T', description: 'D', mobileFriendly: true,
      loadable: true, outdatedSignals: 0, error: null,
    })
    expect(q.score).toBeGreaterThanOrEqual(80)
    expect(q.verdict).toBe('EXCELLENT')
  })
  it('sem evidência → null (não inventa qualidade)', () => {
    const q = computeWebsiteQuality({ status: null, https: false, title: null, description: null, mobileFriendly: null, loadable: false, outdatedSignals: 0, error: 'timeout' })
    expect(q.score).toBeNull()
    expect(q.verdict).toBe('UNKNOWN')
  })
  it('404 → crítico mas com fatores', () => {
    const q = computeWebsiteQuality({ status: 404, https: false, title: null, description: null, mobileFriendly: null, loadable: false, outdatedSignals: 0, error: null })
    expect(q.score).toBeLessThan(40)
    expect(q.verdict).toBe('CRITICAL')
  })
})

describe('OpportunityAnalyzer', () => {
  it('sem site + boa reputação → HIGH', () => {
    const o = analyzeOpportunity({
      companyName: 'Loja', websiteStatus: 'NO_WEBSITE', websiteQualityScore: null,
      instagram: 'https://instagram.com/x', facebook: null,
      rating: 4.8, reviewCount: 120, score: 75,
    })
    expect(o.level).toBe('HIGH')
    expect(o.reasons.length).toBeGreaterThan(0)
  })
  it('dados pobres → LOW', () => {
    const o = analyzeOpportunity({
      companyName: 'Loja', websiteStatus: 'WEBSITE_FOUND', websiteQualityScore: 95,
      instagram: null, facebook: null, rating: null, reviewCount: null, score: 20,
    })
    expect(o.level).toBe('LOW')
  })
})

describe('MockDiscoveryProvider', () => {
  it('página primeiro resultado e para quando acaba', async () => {
    const p = new MockDiscoveryProvider()
    const r1 = await p.search({ segment: 'Odontologia', city: 'Londrina', state: 'PR', limit: 2 })
    expect(r1.businesses.length).toBeGreaterThan(0)
    expect(r1.businesses[0].provider).toBe('mock')
    expect(r1.businesses[0].raw.demo).toBe(true)
    expect(r1.nextPageToken).not.toBeNull()
    const r2 = await p.search({ segment: 'Odontologia', city: 'Londrina', state: 'PR', limit: 2, pageToken: r1.nextPageToken })
    expect(r2.businesses.length).toBeGreaterThan(0)
  })
  it('respeita limite da página', async () => {
    const p = new MockDiscoveryProvider()
    const r = await p.search({ segment: 'Odontologia', city: 'londrina', state: 'PR', limit: 1 })
    expect(r.businesses.length).toBeLessThanOrEqual(1)
  })
})