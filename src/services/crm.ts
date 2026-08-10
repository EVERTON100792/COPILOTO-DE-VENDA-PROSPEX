import { useApp } from './store'
import { uid, nowIso } from '../lib/utils'
import type { Lead, LeadStatus, Task, Proposal, ActivityType } from '../types'

export function getCompany(lead: Lead) {
  return useApp.getState().companies.find((c) => c.id === lead.companyId) ?? null
}

export function recordActivity(
  leadId: string,
  type: ActivityType,
  description: string,
  detail: string | null = null,
  metadata: Record<string, unknown> = {},
): void {
  useApp.getState().addActivity({
    leadId,
    type,
    description,
    detail,
    actor: useApp.getState().currentUser.name,
    metadata,
  })
}

export function changeLeadStatus(leadId: string, status: LeadStatus): void {
  const s = useApp.getState()
  const lead = s.leads.find((l) => l.id === leadId)
  if (!lead) return
  const oldStatus = lead.status
  if (oldStatus === status) return

  if (status === 'DO_NOT_CONTACT') {
    recordOptOut(leadId)
    return
  }

  s.moveLead(leadId, status)
  s.addAudit({
    actor: s.currentUser.name,
    action: 'STATUS_CHANGED',
    entity: 'lead',
    entityId: leadId,
    oldValue: oldStatus,
    newValue: status,
  })
  recordActivity(
    leadId,
    'STATUS_CHANGED',
    `Status alterado de ${label(oldStatus)} para ${label(status)}`,
  )
}

function recordOptOut(leadId: string): void {
  const s = useApp.getState()
  s.moveLead(leadId, 'DO_NOT_CONTACT')
  recordActivity(leadId, 'OPT_OUT', 'Contato bloqueado a pedido do lead (opt-out)')
  s.addNotification({
    type: 'SYSTEM',
    title: 'Contato bloqueado',
    message: 'Este contato solicitou não receber mensagens. Novas abordagens estão impedidas.',
    leadId,
  })
}

function label(status: LeadStatus): string {
  return LEAD_TO_LABEL[status]
}

const LEAD_TO_LABEL: Record<LeadStatus, string> = {
  NEW: 'Novo',
  QUALIFIED: 'Qualificado',
  READY_TO_CONTACT: 'Pronto para contato',
  CONTACTED: 'Contatado',
  REPLIED: 'Respondeu',
  INTERESTED: 'Interessado',
  NEGOTIATION: 'Negociação',
  PROPOSAL_SENT: 'Proposta enviada',
  WON: 'Fechado (Won)',
  LOST: 'Perdido',
  NO_RESPONSE: 'Sem resposta',
  DO_NOT_CONTACT: 'Não contatar',
}

export function recordContact(leadId: string, channel: 'whatsapp' | 'email' | 'phone'): void {
  const s = useApp.getState()
  s.moveLead(leadId, 'CONTACTED')
  recordActivity(leadId, 'CONTACT_MADE', `Contato realizado via ${channel}`)
}

export function receiveReply(leadId: string, content: string): void {
  const s = useApp.getState()
  s.moveLead(leadId, 'REPLIED')
  recordActivity(leadId, 'REPLY_RECEIVED', content.slice(0, 200))
  s.addNotification({
    type: 'REPLY_RECEIVED',
    title: 'Resposta recebida',
    message: 'Um lead respondeu. Confira o novo status.',
    leadId,
  })
}

export function addUserNote(leadId: string, body: string): void {
  const s = useApp.getState()
  s.addNote(leadId, body, s.currentUser.name)
  recordActivity(leadId, 'NOTE_ADDED', 'Nota interna adicionada')
}

export function toggleFavorite(lead: Lead): void {
  const s = useApp.getState()
  const next = !lead.favorite
  s.upsertLead({ ...lead, favorite: next, updatedAt: nowIso() })
  recordActivity(lead.id, next ? 'FAVORITE_TOGGLED' : 'FAVORITE_TOGGLED', next ? 'Adicionado aos favoritos' : 'Removido dos favoritos')
}

export function addTag(lead: Lead, tag: string): void {
  const s = useApp.getState()
  if (lead.tags?.includes(tag)) return
  const tags = [...(lead.tags ?? []), tag]
  s.upsertLead({ ...lead, tags, updatedAt: nowIso() })
  recordActivity(lead.id, 'TAG_ADDED', `Tag "${tag}" adicionada`)
}

export function removeTag(lead: Lead, tag: string): void {
  const s = useApp.getState()
  if (!lead.tags?.includes(tag)) return
  const tags = lead.tags.filter((t) => t !== tag)
  s.upsertLead({ ...lead, tags, updatedAt: nowIso() })
  recordActivity(lead.id, 'TAG_REMOVED', `Tag "${tag}" removida`)
}

export function createTask(leadId: string | null, title: string, opts: Partial<Task> = {}): void {
  const s = useApp.getState()
  const task: Task = {
    id: uid('task'),
    leadId,
    title,
    description: opts.description ?? null,
    assignee: opts.assignee ?? s.currentUser.name,
    dueAt: opts.dueAt ?? null,
    priority: opts.priority ?? 'MEDIUM',
    status: 'TODO',
    createdAt: nowIso(),
  }
  s.addTask(task)
  if (leadId) recordActivity(leadId, 'TASK_CREATED', `Tarefa criada: ${title}`)
}

export function setNextAction(lead: Lead, action: string, dueDays = 3): void {
  const s = useApp.getState()
  s.upsertLead({
    ...lead,
    nextAction: action,
    nextActionAt: addDaysIso(dueDays),
    updatedAt: nowIso(),
  })
}

function addDaysIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}