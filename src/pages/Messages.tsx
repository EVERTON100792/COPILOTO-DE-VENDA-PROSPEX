import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../services/store'
import { Card, Badge, Button, EmptyState } from '../components/ui'
import { whatsappLink } from '../components/exportHelpers'
import { sendLeadMessage } from '../services/messaging'
import { timeAgo, formatDateTime } from '../lib/utils'
import type { LeadMessage } from '../types'

export default function Messages() {
  const navigate = useNavigate()
  const leads = useApp((s) => s.leads)
  const companies = useApp((s) => s.companies)
  const [busyId, setBusyId] = useState<string | null>(null)

  const withMessages = leads
    .filter((l) => l.messages.some((m) => m.used))
    .map((l) => ({ lead: l, company: companies.find((c) => c.id === l.companyId) }))
    .sort((a, b) => b.lead.updatedAt.localeCompare(a.lead.updatedAt))

  async function handleSend(leadId: string, msg: LeadMessage, channel: 'whatsapp' | 'email') {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return
    setBusyId(msg.id)
    const res = await sendLeadMessage(lead, msg, channel)
    setBusyId(null)
    if (!res.ok) useApp.getState().toast('error', res.error ?? 'Envio bloqueado')
    else if (res.simulated) useApp.getState().toast('success', 'Envio simulado (demo)')
    else useApp.getState().toast('success', 'Enviado com sucesso')
  }

  if (withMessages.length === 0) {
    return (
      <EmptyState
        icon="✉️"
        title="Nenhuma mensagem enviada"
        subtitle="Aprove e envie mensagens pela página do lead para ver o histórico aqui."
      />
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mensagens</h1>
          <p className="page-subtitle">Histórico de envios e respostas</p>
        </div>
      </div>

      <div className="flex col gap-12">
        {withMessages.map(({ lead, company }) => {
          const used = lead.messages.filter((m) => m.used)
          const wa = whatsappLink(company?.whatsapp ?? null)
          return (
            <Card key={lead.id} className="card-hover">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <b className="clickable" onClick={() => navigate(`/leads/${lead.id}`)}>{company?.name ?? '—'}</b>
                  <div className="tiny muted">{company?.city ?? ''} · atualizado {timeAgo(lead.updatedAt)}</div>
                </div>
                <div className="flex items-center gap-8">
                  <Badge variant={lead.status === 'REPLIED' ? 'success' : 'info'}>{statusLabel(lead.status)}</Badge>
                  {wa && <a className="btn btn-secondary btn-sm" href={wa} target="_blank" rel="noreferrer">Abrir WhatsApp</a>}
                </div>
              </div>
              {used.map((m) => (
                <div key={m.id} className="msg-card used mb-8">
                  <div className="flex justify-between mb-4">
                    <span className="tiny muted">{versionLabel(m.version)} · {formatDateTime(m.createdAt)}</span>
                  </div>
                  <div className="small">{m.body}</div>
                  <div className="flex gap-8 mt-8">
                    <Button size="sm" variant="secondary" disabled={busyId === m.id} onClick={() => handleSend(lead.id, m, 'whatsapp')}>
                      {busyId === m.id ? 'Enviando...' : 'Reenviar WhatsApp'}
                    </Button>
                    <Button size="sm" variant="secondary" disabled={busyId === m.id} onClick={() => handleSend(lead.id, m, 'email')}>
                      Reenviar e-mail
                    </Button>
                  </div>
                </div>
              ))}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function versionLabel(v: LeadMessage['version']): string {
  return { short: 'Direta', consultive: 'Consultiva', direct: 'Ousada' }[v] ?? v
}

function statusLabel(s: string): string {
  return {
    NEW: 'Novo', QUALIFIED: 'Qualificado', READY_TO_CONTACT: 'Pronto p/ contato',
    CONTACTED: 'Contatado', REPLIED: 'Respondeu', INTERESTED: 'Interessado',
    NEGOTIATION: 'Negociação', PROPOSAL_SENT: 'Proposta', WON: 'Fechado',
    LOST: 'Perdido', NO_RESPONSE: 'Sem resposta', DO_NOT_CONTACT: 'Não contatar',
  }[s] ?? s
}