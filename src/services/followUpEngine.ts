import { useApp } from './store'
import { nowIso, uid } from '../lib/utils'
import { logger } from '../lib/logger'
import type { Lead, Followup, MessageType } from '../types'

export class FollowUpEngineService {
  /**
   * Agenda o próximo follow-up de forma segura e dentro do intervalo.
   */
  scheduleNextFollowUp(leadId: string, currentMessageType: MessageType): Followup | null {
    const s = useApp.getState()
    const lead = s.leads.find((l) => l.id === leadId)
    if (!lead) return null

    const company = s.companies.find((c) => c.id === lead.companyId)
    if (company?.doNotContact || lead.status === 'DO_NOT_CONTACT' || lead.status === 'REPLIED' || lead.status === 'INTERESTED' || lead.status === 'WON' || lead.status === 'LOST') {
      logger.info('FOLLOW_UP', `Follow-up ignorado para lead ${leadId}: status=${lead.status}, doNotContact=${company?.doNotContact}`)
      return null
    }

    let delayDays = 3
    let nextMessageType: MessageType = 'FOLLOW_UP_1'

    if (currentMessageType === 'INITIAL') {
      delayDays = 3
      nextMessageType = 'FOLLOW_UP_1'
    } else if (currentMessageType === 'FOLLOW_UP_1') {
      delayDays = 4
      nextMessageType = 'FOLLOW_UP_2'
    } else if (currentMessageType === 'FOLLOW_UP_2') {
      delayDays = 7
      nextMessageType = 'FOLLOW_UP_3'
    } else {
      // Sequência concluída (máximo 3 follow-ups)
      return null
    }

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + delayDays)
    const dueIso = dueDate.toISOString()

    const followup: Followup = {
      id: uid('flw'),
      leadId: lead.id,
      sequence: currentMessageType === 'INITIAL' ? 1 : currentMessageType === 'FOLLOW_UP_1' ? 2 : 3,
      scheduledAt: dueIso,
      status: 'PENDING',
      messageId: null,
      body: `Follow-up automático (${nextMessageType}) agendado para ${delayDays} dias`,
      createdAt: nowIso(),
    }

    s.addFollowup(followup)

    // Atualiza lead com data da próxima ação
    s.upsertLead({
      ...lead,
      nextAction: `Follow-up ${nextMessageType}`,
      nextActionAt: dueIso,
      updatedAt: nowIso(),
    })

    s.pushOutreachActivity({
      id: uid('act'),
      workspaceId: s.workspaceId,
      leadId: lead.id,
      campaignId: lead.campaignId,
      type: 'FOLLOW_UP_SCHEDULED',
      channel: 'MANUAL',
      direction: 'INTERNAL',
      summary: `Follow-up (${nextMessageType}) agendado para ${dueDate.toLocaleDateString('pt-BR')}`,
      actor: 'Sistema',
      createdAt: nowIso(),
    })

    return followup
  }

  /**
   * Cancela todos os follow-ups pendentes do lead.
   */
  cancelFollowUps(leadId: string, reason: string): void {
    const s = useApp.getState()
    const pending = s.followups.filter((f) => f.leadId === leadId && f.status === 'PENDING')

    for (const f of pending) {
      s.updateFollowup(f.id, { status: 'SKIPPED', body: `Cancelado: ${reason}` })
    }

    const lead = s.leads.find((l) => l.id === leadId)
    if (lead) {
      s.upsertLead({
        ...lead,
        nextActionAt: null,
        updatedAt: nowIso(),
      })
    }

    if (pending.length > 0) {
      s.pushOutreachActivity({
        id: uid('act'),
        workspaceId: s.workspaceId,
        leadId,
        campaignId: lead?.campaignId ?? null,
        type: 'FOLLOW_UP_CANCELLED',
        channel: 'MANUAL',
        direction: 'INTERNAL',
        summary: `Follow-ups cancelados (${reason})`,
        actor: 'Sistema',
        createdAt: nowIso(),
      })
    }
  }
}
