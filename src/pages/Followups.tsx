import { useNavigate } from 'react-router-dom'
import { useApp } from '../services/store'
import { Card, Badge, Button, EmptyState } from '../components/ui'
import { followupStats, getDueFollowups, markFollowupDone, skipFollowup } from '../services/followups'
import { formatDateTime } from '../lib/utils'

export default function Followups() {
  const navigate = useNavigate()
  const followups = useApp((s) => s.followups)
  const leads = useApp((s) => s.leads)
  const companies = useApp((s) => s.companies)
  const stats = followupStats()

  const sorted = [...followups]
    .filter((f) => f.status === 'PENDING')
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))

  const leadOf = (id: string) => leads.find((l) => l.id === id)
  const companyOf = (leadId: string) => {
    const l = leadOf(leadId)
    return l ? companies.find((c) => c.id === l.companyId) : undefined
  }

  const due = getDueFollowups()

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Follow-ups</h1>
          <p className="page-subtitle">Sequências de acompanhamento agendadas</p>
        </div>
      </div>

      <div className="grid grid-3 mb-16">
        <Card className="card-hover"><div className="metric"><div className="metric-value">{stats.pending}</div><div className="metric-label">Pendentes</div></div></Card>
        <Card className="card-hover"><div className="metric"><div className="metric-value">{stats.due}</div><div className="metric-label">Vencidos hoje</div></div></Card>
        <Card className="card-hover"><div className="metric"><div className="metric-value">{stats.done}</div><div className="metric-label">Concluídos</div></div></Card>
      </div>

      {due.length > 0 && (
        <Card title="Vencidos para hoje" className="mb-16">
          <div className="flex col gap-8">
            {due.map((f) => {
              const c = companyOf(f.leadId)
              return (
                <div key={f.id} className="msg-card warning-strip">
                  <div className="flex justify-between">
                    <div>
                      <b className="small clickable" onClick={() => navigate(`/leads/${f.leadId}`)}>{c?.name ?? 'Lead'}</b>
                      <div className="tiny muted">Follow-up #{f.sequence} · previsto para {formatDateTime(f.scheduledAt)}</div>
                    </div>
                    <div className="flex gap-8">
                      <Button size="sm" onClick={() => markFollowupDone(f)}>✓ Concluir</Button>
                      <Button size="sm" variant="secondary" onClick={() => skipFollowup(f)}>Ignorar</Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <Card title="Próximos follow-ups">
        {sorted.length === 0 ? (
          <EmptyState
            icon="🗓️"
            title="Nada pendente"
            subtitle="Marque um lead como Contatado para gerar a sequência de follow-ups."
          />
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>Empresa</th><th>Sequência</th><th>Previsto</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {sorted.map((f) => {
                  const c = companyOf(f.leadId)
                  return (
                    <tr key={f.id} className="clickable" onClick={() => navigate(`/leads/${f.leadId}`)}>
                      <td className="bold">{c?.name ?? '—'}</td>
                      <td>#{f.sequence}</td>
                      <td>{formatDateTime(f.scheduledAt)}</td>
                      <td><Badge variant={f.status === 'PENDING' ? 'warning' : 'muted'}>{f.status === 'PENDING' ? 'Pendente' : f.status}</Badge></td>
                      <td>
                        <div className="flex gap-8" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="secondary" onClick={() => skipFollowup(f)}>Pular</Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}