import { useApp } from './store'
import { getCompany } from './crm'
import type { Lead } from '../types'

export function leadWithCompany(lead: Lead) {
  return { lead, company: getCompany(lead) }
}

export interface MetricsData {
  totalLeads: number
  contacted: number
  replied: number
  interested: number
  proposals: number
  won: number
  noWebsite: number
  avgScore: number | null
  optOut: number
  responseRate: number | null
  interestRate: number | null
  proposalRate: number | null
  conversionRate: number | null
}

const ADVANCED = ['CONTACTED', 'REPLIED', 'INTERESTED', 'NEGOTIATION', 'PROPOSAL_SENT', 'WON', 'NO_RESPONSE']
const REPLIED_STATUSES = ['REPLIED', 'INTERESTED', 'NEGOTIATION', 'PROPOSAL_SENT', 'WON']

export function computeMetrics(leads: Lead[]): MetricsData {
  const totalLeads = leads.length
  const contacted = leads.filter((l) => ADVANCED.includes(l.status)).length
  const replied = leads.filter((l) => REPLIED_STATUSES.includes(l.status)).length
  const interested = leads.filter((l) => ['INTERESTED', 'NEGOTIATION', 'PROPOSAL_SENT', 'WON'].includes(l.status)).length
  const proposals = leads.filter((l) => l.proposal || l.status === 'PROPOSAL_SENT').length
  const won = leads.filter((l) => l.status === 'WON').length
  const noWebsite = leads.filter((l) => l.websiteStatus === 'NO_WEBSITE').length
  const optOut = leads.filter((l) => l.status === 'DO_NOT_CONTACT').length
  const scored = leads.filter((l) => l.score !== null)
  const avgScore = scored.length ? scored.reduce((a, l) => a + (l.score ?? 0), 0) / scored.length : null
  const responseRate = contacted > 0 ? Math.round((replied / contacted) * 100) : null
  const interestRate = replied > 0 ? Math.round((interested / replied) * 100) : null
  const proposalRate = replied > 0 ? Math.round((proposals / replied) * 100) : null
  const conversionRate = replied > 0 ? Math.round((won / replied) * 100) : null

  return {
    totalLeads,
    contacted,
    replied,
    interested,
    proposals,
    won,
    noWebsite,
    avgScore: avgScore === null ? null : Math.round(avgScore * 10) / 10,
    optOut,
    responseRate,
    interestRate,
    proposalRate,
    conversionRate,
  }
}

export function funnel(): { label: string; count: number }[] {
  const leads = useApp.getState().leads
  const steps: [string, string[]][] = [
    ['Novos leads', ['NEW', 'QUALIFIED', 'READY_TO_CONTACT']],
    ['Contatados', ['CONTACTED']],
    ['Responderam', ['REPLIED']],
    ['Interessados', ['INTERESTED', 'NEGOTIATION', 'PROPOSAL_SENT']],
    ['Fechados', ['WON']],
  ]
  return steps.map(([label, statuses]) => ({
    label,
    count: leads.filter((l) => statuses.includes(l.status)).length,
  }))
}

export function leadsByCity(): { city: string; count: number }[] {
  const counter = new Map<string, number>()
  for (const l of useApp.getState().leads) {
    const c = getCompany(l)
    const k = c?.city ?? 'Sem cidade'
    counter.set(k, (counter.get(k) ?? 0) + 1)
  }
  return [...counter.entries()]
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12)
}

export function leadsByCategory(): { category: string; count: number }[] {
  const counter = new Map<string, number>()
  for (const l of useApp.getState().leads) {
    const c = getCompany(l)
    const k = c?.category ?? 'Sem categoria'
    counter.set(k, (counter.get(k) ?? 0) + 1)
  }
  return [...counter.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
}

export function scoreDistribution(): { range: string; count: number }[] {
  const ranges = [
    { label: '90-100 (HOT)', min: 90, max: 100 },
    { label: '75-89 (HIGH)', min: 75, max: 89 },
    { label: '60-74 (MEDIUM)', min: 60, max: 74 },
    { label: '40-59 (LOW)', min: 40, max: 59 },
    { label: '0-39 (VERY LOW)', min: 0, max: 39 },
  ]
  return ranges.map((r) => ({
    range: r.label,
    count: useApp.getState().leads.filter((l) => l.score !== null && l.score >= r.min && l.score <= r.max).length,
  }))
}

export function weeklyTrend(days = 14): { date: string; count: number }[] {
  const leads = useApp.getState().leads
  const out: { date: string; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    out.push({ date: iso.slice(5), count: leads.filter((l) => l.createdAt.slice(0, 10) === iso).length })
  }
  return out
}

export function recommendations(): Lead[] {
  const leads = useApp.getState().leads
  return leads
    .filter((l) => l.status !== 'DO_NOT_CONTACT' && l.status !== 'LOST' && l.status !== 'WON')
    .sort((a, b) => {
      const scoreDiff = (b.score ?? 0) - (a.score ?? 0)
      if (scoreDiff !== 0) return scoreDiff
      const aComplete = (a.hasWhatsapp ? 1 : 0) + (a.hasPhone ? 1 : 0)
      const bComplete = (b.hasWhatsapp ? 1 : 0) + (b.hasPhone ? 1 : 0)
      return bComplete - aComplete
    })
    .slice(0, 10)
}

export interface TopOpportunity {
  lead: Lead
  companyName: string
  reason: string
  score: number
}

export function topOpportunities(): TopOpportunity[] {
  return recommendations().map((l) => {
    const c = getCompany(l)
    const reason =
      l.websiteStatus === 'NO_WEBSITE'
        ? 'Sem site oficial identificado'
        : l.status === 'REPLIED'
          ? 'Já respondeu ao contato'
          : `Score ${l.score ?? '—'}`
    return { lead: l, companyName: c?.name ?? 'Empresa', reason, score: l.score ?? 0 }
  })
}