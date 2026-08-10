import { useApp } from './store'
import { uid, nowIso } from '../lib/utils'
import { recordActivity } from './crm'
import type { Followup, Lead } from '../types'

export function planFollowups(lead: Lead): void {
  const s = useApp.getState()
  const intervals = s.settings.followupIntervalDays
  const max = s.settings.followupMax
  const existing = s.followups.filter((f) => f.leadId === lead.id)
  if (existing.length > 0) return

  const approved = lead.messages.find((m) => m.approved)
  const date = new Date()
  for (let i = 1; i <= max; i++) {
    date.setDate(date.getDate() + (intervals[i - 1] ?? intervals[intervals.length - 1] ?? 7))
    const f: Followup = {
      id: uid('fup'),
      leadId: lead.id,
      sequence: i,
      scheduledAt: date.toISOString(),
      status: 'PENDING',
      messageId: approved?.id ?? null,
      body: approved
        ? `Olá! Retorno da minha mensagem sobre o site. ${approved.body.slice(0, 160)}…`
        : `Follow-up ${i} — verificar motivo da falta de resposta`,
      createdAt: nowIso(),
    }
    s.addFollowup(f)
  }
  recordActivity(lead.id, 'FOLLOWUP_SCHEDULED', `${max} follow-ups agendados`)
}

export function getDueFollowups(): Followup[] {
  const s = useApp.getState()
  const now = Date.now()
  return s.followups
    .filter((f) => f.status === 'PENDING' && new Date(f.scheduledAt).getTime() <= now)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
}

export function markFollowupDone(followup: Followup): void {
  const s = useApp.getState()
  s.updateFollowup(followup.id, { status: 'DONE' })
  recordActivity(followup.leadId, 'FOLLOWUP_SCHEDULED', `Follow-up ${followup.sequence} concluído`)
}

export function skipFollowup(followup: Followup): void {
  useApp.getState().updateFollowup(followup.id, { status: 'SKIPPED' })
}

export function autoTriggerFollowups(): number {
  const s = useApp.getState()
  if (s.settings.masterSwitch !== 'ON') return 0
  const due = getDueFollowups()
  let triggered = 0
  for (const f of due.slice(0, s.settings.hourlyContactLimit)) {
    const lead = s.leads.find((l) => l.id === f.leadId)
    if (!lead || lead.status === 'DO_NOT_CONTACT') continue
    s.updateFollowup(f.id, { status: 'DONE' })
    triggered++
  }
  return triggered
}

export function followupStats(): { pending: number; due: number; done: number } {
  const s = useApp.getState()
  const now = Date.now()
  return {
    pending: s.followups.filter((f) => f.status === 'PENDING').length,
    due: s.followups.filter((f) => f.status === 'PENDING' && new Date(f.scheduledAt).getTime() <= now).length,
    done: s.followups.filter((f) => f.status === 'DONE').length,
  }
}