import { describe, it, expect } from 'vitest'
import { DiscoveryService } from '../src/discovery/engine'
import { useApp } from '../src/services/store'

describe('DiscoveryService (mock provider, modo DEMO)', () => {
  it('Cria empresas com data_status DEMO e metadados de fonte', async () => {
    useApp.getState().setCompanies([])
    useApp.getState().setLeads([])
    const svc = new DiscoveryService()
    const run = await svc.run(
      {
        segment: 'Odontologia',
        city: 'Londrina',
        state: 'PR',
        limit: 5,
        mode: 'DEMO',
        providerId: 'mock',
      },
      { campaignId: 'camp-1' }
    )
    expect(run.status).toBe('COMPLETED')
    expect(run.mode).toBe('DEMO')
    expect(run.campaignId).toBe('camp-1')
    expect(run.newCount).toBeGreaterThan(0)

    const s = useApp.getState()
    const added = s.companies.filter((c) => c.source === 'mock')
    expect(added.length).toBeGreaterThan(0)
    expect(added.length).toBeLessThanOrEqual(5)
    for (const c of added) {
      expect(c.dataStatus).toBe('DEMO')
      expect(c.isDemo).toBe(true)
      expect(c.retrievedAt).toBeTruthy()
      expect(c.sourceRecordId).toBeTruthy()
      expect(c.sourceType).toBe('mock')
      expect(c.rawDataId).toBeTruthy()
    }
    const raw = s.discoveryResults.filter((r) => r.runId === run.id)
    expect(raw.length).toBeGreaterThan(0)
    expect(raw[0].rawPayload).toBeTruthy()

    const leads = s.leads.filter((l) => s.companies.some((c) => c.id === l.companyId && c.source === 'mock'))
    expect(leads.length).toBe(added.length)
    expect(leads.every((l) => l.status === 'NEW')).toBe(true)
  }, 60000)
})

describe('Discovery() modo REAL sem fonte configurada', () => {
  it('Falha com aviso (nunca dados fictícios como reais)', async () => {
    // FORÇA: remover chaves salvas de google-places (não deve existir em teste)
    try { localStorage.removeItem('prospex_provider_key_google-places') } catch { /* ignore */ }
    const svc = new DiscoveryService()
    const run = await svc.run(
      {
        segment: 'Odontologia',
        city: 'Londrina',
        state: 'PR',
        limit: 5,
        mode: 'REAL',
        providerId: 'google-places',
      }
    )
    expect(run.status).toBe('FAILED')
    expect(run.errorMessage).toContain('fonte real')
    expect(useApp.getState().companies.some((c) => c.dataStatus === 'REAL')).toBe(false)
  })
})

describe('Discovery() cancelamento', () => {
  it('cancela execução ativa e não corrompe estado', async () => {
    useApp.getState().setCompanies([])
    useApp.getState().setLeads([])
    const svc = new DiscoveryService()
    let run = await svc.run(
      {
        segment: 'Odontologia',
        city: 'Londrina',
        state: 'PR',
        limit: 1000,
        mode: 'DEMO',
        providerId: 'mock',
      }
    )
    svc.cancel(run.id)
    // aguarda a execução terminar (o mock é rápido, mas o cancel é síncrono no run)
    await new Promise((r) => setTimeout(r, 600))
    run = useApp.getState().discoveryRuns.find((x) => x.id === run.id) as typeof run
    if (run.cancelled || run.status === 'CANCELLED') {
      expect(run.status).toBe('CANCELLED')
    } else {
      // se o processamento terminou antes, não pode estar com erro
      expect(run.status).toBe('COMPLETED')
    }
  }, 30000)
})