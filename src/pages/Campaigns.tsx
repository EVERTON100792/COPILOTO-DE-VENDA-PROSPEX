import { Link } from 'react-router-dom'
import { useApp } from '../services/store'
import { Card, EmptyState, Badge } from '../components/ui'
import { formatDate } from '../lib/utils'

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'info' | 'muted' | 'danger'> = {
  RUNNING: 'success',
  PAUSED: 'warning',
  FINISHED: 'info',
  DRAFT: 'muted',
  STOPPED: 'danger',
  FAILED: 'danger',
}

export default function Campaigns() {
  const campaigns = useApp((s) => s.campaigns)
  const leads = useApp((s) => s.leads)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Campanhas</h1>
          <p className="page-subtitle">Gerencie suas prospeções</p>
        </div>
        <div className="page-actions">
          <Link to="/campaigns/new" className="btn btn-primary">+ Nova campanha</Link>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="Nenhuma campanha ainda"
          subtitle="Comece criando sua primeira campanha de prospecção."
          action={<Link to="/campaigns/new" className="btn btn-primary">Criar campanha</Link>}
        />
      ) : (
        <div className="grid grid-3">
          {campaigns.map((c) => {
            const leadCount = leads.filter((l) => l.campaignId === c.id).length
            return (
              <Link key={c.id} to={`/campaigns/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <Card className="card-hover">
                  <div className="flex items-center justify-between mb-8">
                    <Badge variant={STATUS_BADGE[c.status] ?? 'muted'}>{statusLabel(c.status)}</Badge>
                    <span className="tiny muted-2">{formatDate(c.createdAt)}</span>
                  </div>
                  <h3 style={{ fontSize: 15, marginBottom: 6 }}>{c.name}</h3>
                  <div className="small muted mb-12">{c.niche} · {c.city}/{c.state}</div>
                  <div className="progress-track mb-8">
                    <div className={`progress-fill${c.status === 'PAUSED' ? ' paused' : ''}`} style={{ width: `${c.progress ?? 0}%` }} />
                  </div>
                  <div className="flex items-center justify-between small">
                    <span className="muted">{c.progress ?? 0}%</span>
                    <span className="muted">{leadCount} leads</span>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function statusLabel(s: string): string {
  return {
    RUNNING: 'Em andamento',
    PAUSED: 'Pausada',
    FINISHED: 'Concluída',
    DRAFT: 'Rascunho',
    STOPPED: 'Parada',
    FAILED: 'Com erros',
  }[s] ?? s
}