import { describe, it, expect } from 'vitest'
import {
  normalizeName, normalizePhone, extractDomain, normalizeUrl,
  normalizeInstagram, normalizeFacebook, isValidEmail, detectIncomplete,
} from '../src/agents/normalize'
import { DuplicateDetector } from '../src/agents/DuplicateDetector'
import type { NormalizedDiscovered } from '../src/agents/types'

function norm(over: Partial<NormalizedDiscovered>): NormalizedDiscovered {
  return {
    name: '', normalizedName: '', normalizedPhone: null, domain: null, complete: false,
    category: null, city: null, state: null, address: null, phone: null, whatsapp: null,
    website: null, instagram: null, facebook: null, rating: null, reviewCount: null,
    hours: null, source: null, ...over,
  }
}

describe('normalizeName', () => {
  it('remove acentos, maiúsculas e símbolos', () => {
    expect(normalizeName('  ODONTOVIDA  - CLÍNICA  ')).toBe('odontovida clinica')
    expect(normalizeName('Dental Center - Odonto')).toBe('dental center odonto')
  })
})

describe('normalizePhone', () => {
  it('normaliza formatos brasileiros', () => {
    expect(normalizePhone('(43) 3321-1180')).toBe('4333211180')
    expect(normalizePhone('+55 43 9 9901-2233')).toBe('43999012233')
    expect(normalizePhone('5511999998888')).toBe('11999998888')
  })

  it('rejeita números curtos', () => {
    expect(normalizePhone('123')).toBeNull()
  })
})

describe('extractDomain', () => {
  it('extrai domínio de URLs', () => {
    expect(extractDomain('https://www.OdontoVida.com.br/pagina?x=1')).toBe('odontovida.com.br')
    expect(extractDomain('odontovida.com.br')).toBe('odontovida.com.br')
    expect(extractDomain('semdominio')).toBeNull()
  })
})

describe('url/instagram/facebook/email', () => {
  it('normaliza url sem protocolo', () => {
    expect(normalizeUrl('cliente.com.br')).toBe('https://cliente.com.br')
  })
  it('normaliza instagram', () => {
    expect(normalizeInstagram('https://instagram.com/cliente_oficial/')).toBe('@cliente_oficial')
  })
  it('normaliza facebook', () => {
    expect(normalizeFacebook('https://www.facebook.com/pagina')).toBe('pagina')
  })
  it('valida e-mail', () => {
    expect(isValidEmail('x@y.com')).toBe(true)
    expect(isValidEmail('sem-arroba')).toBe(false)
  })
})

describe('detectIncomplete', () => {
  it('identifica registros sem contato ou cidade', () => {
    expect(detectIncomplete({ name: 'X', city: 'Londrina', phone: '43' })).toBe(false)
    expect(detectIncomplete({ name: 'X', city: 'Londrina' })).toBe(true)
    expect(detectIncomplete({ name: 'X', phone: '43' })).toBe(true)
  })
})

describe('DuplicateDetector', () => {
  const ctx = { workspaceId: 'ws', demoMode: true, nicheDna: null, campaign: null } as never

  it('remove duplicados por nome normalizado', async () => {
    const agent = new DuplicateDetector()
    const res = await agent.execute(
      {
        companies: [
          norm({ normalizedName: 'farmacia sao paulo', name: 'Farmacia Sao Paulo' }),
          norm({ normalizedName: 'farmacia sao paulo', name: 'Farmácia São Paulo 2' }),
          norm({ normalizedName: 'clinica beta', name: 'Clínica Beta' }),
        ],
      },
      ctx,
    )
    const out = res.output as { companies: NormalizedDiscovered[]; removed: number }
    expect(out.companies.length).toBe(2)
    expect(out.removed).toBe(1)
  })

  it('remove duplicados por telefone', async () => {
    const agent = new DuplicateDetector()
    const res = await agent.execute(
      {
        companies: [
          norm({ name: 'A', normalizedPhone: '4333211180' }),
          norm({ name: 'B', normalizedPhone: '4333211180' }),
        ],
      },
      ctx,
    )
    const out = res.output as { companies: NormalizedDiscovered[]; removed: number }
    expect(out.removed).toBe(1)
  })

  it('mantém empresas diferentes', async () => {
    const agent = new DuplicateDetector()
    const res = await agent.execute(
      {
        companies: [
          norm({ name: 'Clinica A', normalizedName: 'clinica a' }),
          norm({ name: 'Clinica B', normalizedName: 'clinica b' }),
        ],
      },
      ctx,
    )
    const out = res.output as { companies: NormalizedDiscovered[]; removed: number }
    expect(out.removed).toBe(0)
  })
})