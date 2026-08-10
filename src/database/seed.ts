import { useApp } from '../services/store'
import { buildDemoCompanies, makeDemoCampaign, makeDemoLeads } from './demoFactory'
import { logger } from '../lib/logger'
import { nowIso } from '../lib/utils'
import type { AgentRun } from '../types'

export function seedDemoData(): void {
  const s = useApp.getState()
  const companies = buildDemoCompanies()
  const campaign = makeDemoCampaign()
  const leads = makeDemoLeads(campaign)

  const demoRuns: AgentRun[] = [
    {
      id: 'run_demo_1', runId: 'demo-1', agent: 'DISCOVERY', status: 'SUCCESS',
      input: { niche: 'Odontologia', city: 'Londrina' }, output: { found: 16 },
      error: null, durationMs: 1042, retries: 0, startedAt: nowIso(), finishedAt: nowIso(),
    },
    {
      id: 'run_demo_2', runId: 'demo-2', agent: 'WEBSITE', status: 'SUCCESS',
      input: { checks: 16 }, output: { noWebsite: 13 },
      error: null, durationMs: 823, retries: 0, startedAt: nowIso(), finishedAt: nowIso(),
    },
    {
      id: 'run_demo_3', runId: 'demo-3', agent: 'SCORING', status: 'SUCCESS',
      input: { leads: 16 }, output: { scored: 16 },
      error: null, durationMs: 411, retries: 0, startedAt: nowIso(), finishedAt: nowIso(),
    },
  ]

  s.setCompanies(companies)
  s.upsertCampaign(campaign)
  s.setLeads(leads)
  demoRuns.forEach((r) => s.pushAgentRun(r))
  s.addNotification({
    type: 'CAMPAIGN_FINISHED',
    title: 'Campanha demo finalizada',
    message: 'A campanha demo encontrou 16 empresas em Londrina. Use "Nova campanha" para criar a sua.',
    leadId: null,
  })
  s.toast('success', 'Dados de demonstração carregados (marcados como DEMO)')
  logger.info('SEED', 'Dados demo carregados', `${companies.length} empresas, ${leads.length} leads`)
}