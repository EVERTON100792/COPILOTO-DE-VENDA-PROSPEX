import { Link } from 'react-router-dom'
import { useApp } from '../services/store'
import { computeMetrics, funnel, leadsByCategory, scoreDistribution, topOpportunities } from '../services/insights'
import { Card, ScoreBadge } from '../components/ui'
import { Funnel, DonutChart, BarChart } from '../components/charts'
import { timeAgo } from '../lib/utils'

export default function Dashboard() {
  const leads = useApp((s) => s.leads)
  const campaigns = useApp((s) => s.campaigns)
  const activities = useApp((s) => s.activities)
  const followups = useApp((s) => s.followups)
  const notifications = useApp((s) => s.notifications)
  const settings = useApp((s) => s.settings)

  const m = computeMetrics(leads)
  const funnelSteps = funnel()
  const byCategory = leadsByCategory()
  const dist = scoreDistribution()
  const opportunities = topOpportunities()
  const activeCampaigns = campaigns.filter((c) => c.status === 'RUNNING' || c.status === 'PAUSED')
  const lastActivities = activities.slice(0, 8)
  const unreadNotifs = notifications.filter((n) => !n.read).length
  const dueFollowups = followups.filter((f) => f.status === 'PENDING' && new Date(f.scheduledAt).getTime() <= Date.now()).length

  const donut = [
    { label: 'HOT', value: dist.find((d) => d.range.includes('HOT'))?.count ?? 0, color: 'var(--danger)' },
    { label: 'HIGH', value: dist.find((d) => d.range.includes('HIGH'))?.count ?? 0, color: 'var(--warning)' },
    { label: 'MEDIUM', value: dist.find((d) => d.range.includes('MEDIUM'))?.count ?? 0, color: 'var(--info)' },
    { label: 'LOW / VERY LOW', value: dist.filter((d) => d.range.includes('LOW')).reduce((a, d) => a + d.count, 0), color: 'var(--muted)' },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{greeting()}! 👋</h1>
          <p className="page-subtitle">Resumo da sua operação de prospecção</p>
        </div>
        <div className="page-actions">
          <Link to="/campaigns/new" className="btn btn-primary">+ Nova campanha</Link>
          <Link to="/crm" className="btn btn-secondary">Abrir CRM</Link>
        </div>
      </div>

      {settings.masterSwitch !== 'ON' && (
        <div className="alert alert-warning">
          <span>⚠️</span>
          O interruptor mestre de automação está <b>{switchLabel(settings.masterSwitch)}</b>. Nenhum envio automatizado será executado.{' '}
          <Link to="/automations" className="link-btn">Configurar</Link>
        </div>
      )}

      <div className="grid grid-5 mb-16">
        <Metric label="Leads" value={m.totalLeads} />
        <Metric label="Qualificados (score ≥ 60)" value={leads.filter((l) => l.score !== null && l.score >= 60).length} />
        <Metric label="Sem site" value={m.noWebsite} />
        <Metric label="Contatados" value={m.contacted} />
        <Metric label="Fechados" value={m.won} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="Funil de conversão">
            <Funnel steps={funnelSteps} />
          </Card>
          <Card title="Leads por categoria">
            {byCategory.length ? (
              <BarChart data={byCategory.map((c) => ({ label: short(c.category, 16), value: c.count }))} />
            ) : (
              <div className="muted small">Sem dados ainda. Crie uma campanha.</div>
            )}
          </Card>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="Distribuição de score">
            {leads.length ? <DonutChart segments={donut} /> : <div className="muted small">Sem leads para exibir.</div>}
          </Card>
          <Card title="Top oportunidades" actions={<Link to="/leads" className="link-btn">Ver leads</Link>}>
            {opportunities.length === 0 && <div className="muted small">Nenhum lead ainda.</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {opportunities.slice(0, 5).map((o) => (
                <Link key={o.lead.id} to={`/leads/${o.lead.id}`} className="search-row">
                  <div className="flex items-center justify-between">
                    <b>{o.companyName}</b>
                    <ScoreBadge score={o.score} size={30} />
                  </div>
                  <div className="tiny muted">{o.reason}</div>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid grid-3 mt-16">
        <Card title="Campanhas ativas" actions={<Link to="/campaigns" className="link-btn">Ver todas</Link>}>
          {activeCampaigns.length === 0 && <div className="muted small">Nenhuma campanha em andamento. <Link to="/campaigns/new">Crie uma</Link>.</div>}
          {activeCampaigns.slice(0, 4).map((c) => (
            <Link key={c.id} to={`/campaigns/${c.id}`} style={{ display: 'block', marginBottom: 10 }}>
              <div className="flex items-center justify-between">
                <b className="small">{c.name}</b>
                <span className={`badge badge-${c.status === 'RUNNING' ? 'success' : 'warning'}`}>{c.status === 'RUNNING' ? 'Rodando' : 'Pausada'}</span>
              </div>
              <div className="tiny muted">{c.niche} · {c.city}/{c.state}</div>
              <div className="progress-track mt-8">
                <div className="progress-fill" style={{ width: `${c.progress}%` }} />
              </div>
            </Link>
          ))}
        </Card>
        <Card title="Atividade recente">
          {lastActivities.length === 0 && <div className="muted small">Nenhuma atividade ainda.</div>}
          <div className="timeline">
            {lastActivities.map((a) => (
              <div className="timeline-item" key={a.id}>
                <div className="timeline-dot" />
                <div className="timeline-body">
                  <div className="timeline-title">{a.description}</div>
                  <div className="timeline-time">{timeAgo(a.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Indicadores">
          <Kv k="Taxa de resposta" v={m.responseRate === null ? 'Dados insuficientes' : `${m.responseRate}%`} />
          <Kv k="Taxa de interesse" v={m.interestRate === null ? 'Dados insuficientes' : `${m.interestRate}%`} />
          <Kv k="Taxa de proposta" v={m.proposalRate === null ? 'Dados insuficientes' : `${m.proposalRate}%`} />
          <Kv k="Conversão" v={m.conversionRate === null ? 'Dados insuficientes' : `${m.conversionRate}%`} />
          <Kv k="Score médio" v={m.avgScore === null ? '—' : String(m.avgScore)} />
          <Kv k="Opt-outs registrados" v={String(m.optOut)} />
          <Kv k="Follow-ups vencidos" v={dueFollowups > 0 ? `${dueFollowups} ⚠️` : '0'} />
          <Kv k="Notificações não lidas" v={String(unreadNotifs)} />
        </Card>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card className="card-hover">
      <div className="metric">
        <div className="metric-value">{value.toLocaleString('pt-BR')}</div>
        <div className="metric-label">{label}</div>
      </div>
    </Card>
  )
}

function Kv({ k, v }: { k: string; v: string }) {
  return (
    <div className="kv">
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  )
}

function short(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

function switchLabel(v: 'ON' | 'OFF' | 'PAUSED'): string {
  return v === 'ON' ? 'Ligado' : v === 'OFF' ? 'Desligado' : 'Pausado'
}