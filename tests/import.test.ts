import { describe, it, expect } from 'vitest'
import { parseImportCsv } from '../src/services/importExport'
import { useApp } from '../src/services/store'

function resetCompanies() {
  useApp.getState().setCompanies([])
}

describe('parseImportCsv', () => {
  it('detecta campos e problemas por linha', () => {
    resetCompanies()
    const csv = [
      'nome;categoria;cidade;estado;telefone',
      'Odonto Demo;Odontologia;Londrina;PR;(43) 3321-1180',
      'Loja Demo;;Curitiba;PR;',
      ';',
    ].join('\n')
    const out = parseImportCsv(csv)
    expect(out).toHaveLength(3)
    expect(out[0].name).toBe('Odonto Demo')
    expect(out[0].issues).toHaveLength(0)
    expect(out[0].duplicateOf).toBeNull()
    expect(out[1].issues).toContain('Sem contato')
    expect(out[2].issues).toContain('Sem nome')
  })

  it('marca duplicado quando empresa já existe na base', () => {
    resetCompanies()
    useApp.getState().upsertCompany({
      id: 'c1', workspaceId: 'ws', name: 'Dup Demo', category: 'X', city: 'Londrina', state: 'PR',
      phone: null, whatsapp: null, email: null, website: null, instagram: null, facebook: null,
      rating: null, reviewCount: null, hours: null, address: null, source: 'test', isDemo: false,
      createdAt: new Date().toISOString(),
    })
    const out = parseImportCsv('nome\nDUP DEMO')
    expect(out[0].duplicateOf).toBe('Dup Demo')
  })

  it('não marca duplicado quando nome e telefone diferem', () => {
    resetCompanies()
    useApp.getState().upsertCompany({
      id: 'c2', workspaceId: 'ws', name: 'Outra Loja', category: 'X', city: 'Londrina', state: 'PR',
      phone: '(43) 1111-2222', whatsapp: null, email: null, website: null, instagram: null, facebook: null,
      rating: null, reviewCount: null, hours: null, address: null, source: 'test', isDemo: false,
      createdAt: new Date().toISOString(),
    })
    const out = parseImportCsv('nome;telefone\nLoja Nova;(43) 3333-4444')
    expect(out[0].duplicateOf).toBeNull()
  })
})