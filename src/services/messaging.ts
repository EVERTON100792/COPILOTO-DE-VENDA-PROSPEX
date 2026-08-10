import { useApp } from './store'
import { uid, nowIso } from '../lib/utils'
import { recordActivity } from './crm'
import type { Lead, LeadMessage } from '../types'
import { sendWhatsApp } from '../integrations/whatsapp'
import { sendEmail } from '../integrations/email'

export function approveMessage(lead: Lead, messageId: string): void {
  const s = useApp.getState()
  const messages = lead.messages.map((m) =>
    m.id === messageId ? { ...m, approved: true, editedAt: m.editedAt ?? null } : { ...m, approved: false }
  )
  s.upsertLead({ ...lead, messages, updatedAt: nowIso() })
  recordActivity(lead.id, 'MESSAGE_GENERATED', 'Mensagem aprovada e disponibilizada para envio')
}

export function editMessage(lead: Lead, messageId: string, body: string): void {
  const s = useApp.getState()
  const messages = lead.messages.map((m) =>
    m.id === messageId ? { ...m, body, editedAt: nowIso() } : m
  )
  s.upsertLead({ ...lead, messages, updatedAt: nowIso() })
  recordActivity(lead.id, 'MESSAGE_EDITED', 'Mensagem editada manualmente')
}

export function regenerateMessagesBase(lead: Lead): Lead {
  return lead
}

export function unuseMessage(lead: Lead, messageId: string): void {
  const s = useApp.getState()
  const messages = lead.messages.map((m) =>
    m.id === messageId ? { ...m, used: false } : m
  )
  s.upsertLead({ ...lead, messages, updatedAt: nowIso() })
}

export async function sendLeadMessage(
  lead: Lead,
  message: LeadMessage,
  channel: 'whatsapp' | 'email',
): Promise<{ ok: boolean; simulated: boolean; error?: string }> {
  const s = useApp.getState()
  const { settings } = s
  const company = s.companies.find((c) => c.id === lead.companyId)

  if (!message.approved) {
    return { ok: false, simulated: false, error: 'Mensagem não aprovada. Revise antes de enviar (human-in-the-loop).' }
  }
  if (lead.status === 'DO_NOT_CONTACT') {
    return { ok: false, simulated: false, error: 'Contato bloqueado (opt-out).' }
  }
  if (settings.masterSwitch !== 'ON') {
    return { ok: false, simulated: false, error: 'Interruptor mestre de automação desligado.' }
  }
  if (channelsExceeded()) {
    return { ok: false, simulated: false, error: 'Limite de contatos diário/horário atingido. Tente mais tarde.' }
  }
  if (company?.isDemo) {
    return { ok: true, simulated: true }
  }

  const target = channel === 'whatsapp' ? company?.whatsapp : company?.email
  if (!target) return { ok: false, simulated: false, error: `Sem ${channel === 'whatsapp' ? 'WhatsApp' : 'e-mail'} disponível para este lead.` }

  let ok = false
  let error: string | undefined
  if (channel === 'whatsapp') {
    const res = await sendWhatsApp(target, message.body)
    ok = res.ok
    error = res.error
  } else {
    const res = await sendEmail({ to: target, subject: `Oportunidade para ${company?.name ?? 'sua empresa'}`, body: message.body })
    ok = res.ok
    error = res.error
  }

  if (!ok) {
    recordActivity(lead.id, 'CONTACT_MADE', `Envio via ${channel} bloqueado: ${error ?? 'não configurado'}`, null, { simulated: true })
    return { ok: false, simulated: true, error }
  }

  const messages = lead.messages.map((m) => (m.id === message.id ? { ...m, used: true } : m))
  s.upsertLead({ ...lead, messages, status: 'CONTACTED', updatedAt: nowIso() })
  recordActivity(lead.id, 'CONTACT_MADE', `Mensagem enviada via ${channel}`)
  return { ok: true, simulated: false }
}

function channelsExceeded(): boolean {
  const s = useApp.getState()
  const now = Date.now()
  const contactedToday = s.activities.filter(
    (a) => a.type === 'CONTACT_MADE' && now - new Date(a.createdAt).getTime() < 24 * 3600_000
  ).length
  const contactedHour = s.activities.filter(
    (a) => a.type === 'CONTACT_MADE' && now - new Date(a.createdAt).getTime() < 3600_000
  ).length
  return contactedToday >= s.settings.dailyContactLimit || contactedHour >= s.settings.hourlyContactLimit
}

export function markUsed(lead: Lead, messageId: string): void {
  const s = useApp.getState()
  const messages = lead.messages.map((m) => (m.id === messageId ? { ...m, used: true } : m))
  s.upsertLead({ ...lead, messages, updatedAt: nowIso() })
}

export function isMassMessageFlagged(body: string): boolean {
  const markers = ['olá, tudo bem? trabalhop', 'trabalho com criação de sites', 'seu site está ruim?', 'vendo sites']
  return markers.some((m) => body.toLowerCase().includes(m))
}