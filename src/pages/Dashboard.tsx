import { Link } from 'react-router-dom'
import { useApp } from '../services/store'
import { computeMetrics, funnel, leadsByCategory, scoreDistribution, topOpportunities } from '../services/insights'
import { ScoreBadge } from '../components/ui'
import { Funnel, DonutChart, BarChart, Sparkline } from '../components/charts'
import { timeAgo } from '../lib/utils'
import { Users, Target, Globe, PhoneCall, Trophy, AlertTriangle, ArrowRight, Activity, MessageSquare, TrendingUp } from 'lucide-react'

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
    { label: 'HOT', value: dist.find((d) => d.range.includes('HOT'))?.count ?? 0, color: '#f43f5e' }, // danger (rose)
    { label: 'HIGH', value: dist.find((d) => d.range.includes('HIGH'))?.count ?? 0, color: '#f59e0b' }, // warning (amber)
    { label: 'MEDIUM', value: dist.find((d) => d.range.includes('MEDIUM'))?.count ?? 0, color: '#3b82f6' }, // info (blue)
    { label: 'LOW', value: dist.filter((d) => d.range.includes('LOW')).reduce((a, d) => a + d.count, 0), color: '#64748b' }, // muted (slate)
  ]

  // Synthetic sparkline data (for visuals)
  const fakeSparkline1 = [10, 25, 20, 45, 30, 60, 50, 80]
  const fakeSparkline2 = [5, 15, 10, 25, 20, 35, 45, 40]
  const fakeSparkline3 = [2, 5, 4, 8, 7, 12, 10, 15]

  return (
    <div style={{ paddingBottom: 60 }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div>
          <h1 className="page-title" style={{ fontSize: 36, fontWeight: 800 }}>{greeting()}! 👋</h1>
          <p className="page-subtitle" style={{ fontSize: 16 }}>Sua operação de prospecção em tempo real</p>
        </div>
        <div className="page-actions">
          <Link to="/campaigns/new" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={18} /> Nova campanha
          </Link>
          <Link to="/crm" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={18} /> Abrir CRM
          </Link>
        </div>
      </div>

      {settings.masterSwitch !== 'ON' && (
        <div className="alert alert-warning" style={{ marginBottom: 32 }}>
          <AlertTriangle size={20} />
          O interruptor mestre de automação está <b>{switchLabel(settings.masterSwitch)}</b>. Nenhum envio automatizado será executado.{' '}
          <Link to="/automations" className="link-btn">Configurar</Link>
        </div>
      )}

      {/* Bento Grid Layout */}
      <div className="bento-grid">
        
        {/* Top Metrics Row */}
        <div className="bento-col-3">
          <MetricCard title="Total de Leads" value={m.totalLeads} icon={<Users size={20} />} sparkline={fakeSparkline1} color="#8b5cf6" />
        </div>
        <div className="bento-col-3">
          <MetricCard title="Qualificados (>60)" value={leads.filter((l) => l.score !== null && l.score >= 60).length} icon={<Target size={20} />} sparkline={fakeSparkline2} color="#10b981" />
        </div>
        <div className="bento-col-3">
          <MetricCard title="Contatados" value={m.contacted} icon={<MessageSquare size={20} />} sparkline={fakeSparkline3} color="#3b82f6" />
        </div>
        <div className="bento-col-3">
          <MetricCard title="Negócios Fechados" value={m.won} icon={<Trophy size={20} />} sparkline={[1, 1, 2, 2, 3, 4, 4, 5]} color="#f59e0b" />
        </div>

        {/* Charts Row */}
        <div className="bento-col-8">
          <div className="bento-card">
            <div className="bento-card-title">Funil de Conversão <TrendingUp size={18} className="muted" /></div>
            <Funnel steps={funnelSteps} />
          </div>
        </div>

        <div className="bento-col-4">
          <div className="bento-card">
            <div className="bento-card-title">Distribuição de Score <Activity size={18} className="muted" /></div>
            <DonutChart segments={donut} />
          </div>
        </div>

        {/* Lower Row */}
        <div className="bento-col-4">
          <div className="bento-card" style={{ height: '100%' }}>
            <div className="bento-card-title">Leads por Categoria <Globe size={18} className="muted" /></div>
            {byCategory.length ? (
              <BarChart data={byCategory.map((c) => ({ label: short(c.category, 16), value: c.count }))} />
            ) : (
              <div className="muted small text-center p-8">Sem dados ainda</div>
            )}
          </div>
        </div>

        <div className="bento-col-4">
          <div className="bento-card" style={{ height: '100%' }}>
            <div className="bento-card-title">
              Top Oportunidades 
              <Link to="/leads" className="link-btn" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                Ver todas <ArrowRight size={14} />
              </Link>
            </div>
            {opportunities.length === 0 && <div className="muted small text-center p-8">Nenhum lead ainda.</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
              {opportunities.slice(0, 5).map((o) => (
                <Link key={o.lead.id} to={`/leads/${o.lead.id}`} className="search-row" style={{ padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.02)' }}>
                  <div className="flex items-center justify-between">
                    <b style={{ fontSize: 14 }}>{o.companyName}</b>
                    <ScoreBadge score={o.score} size={30} />
                  </div>
                  <div className="tiny muted" style={{ marginTop: 4 }}>{o.reason}</div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="bento-col-4">
          <div className="bento-card" style={{ height: '100%' }}>
            <div className="bento-card-title">Atividade Recente <Activity size={18} className="muted" /></div>
            {lastActivities.length === 0 && <div className="muted small text-center p-8">Nenhuma atividade.</div>}
            <div className="timeline" style={{ marginTop: 16 }}>
              {lastActivities.map((a) => (
                <div className="timeline-item" key={a.id}>
                  <div className="timeline-dot" style={{ boxShadow: '0 0 10px var(--primary)' }} />
                  <div className="timeline-body">
                    <div className="timeline-title" style={{ fontSize: 13 }}>{a.description}</div>
                    <div className="timeline-time">{timeAgo(a.createdAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function MetricCard({ title, value, icon, sparkline, color }: { title: string; value: number; icon: React.ReactNode; sparkline: number[]; color: string }) {
  return (
    <div className="glow-metric-card">
      <div className="metric-header">
        {title}
        <div className="metric-icon" style={{ color, boxShadow: `0 0 20px ${color}40`, border: `1px solid ${color}40` }}>
          {icon}
        </div>
      </div>
      <div className="metric-main">
        <div className="metric-big-value">{value.toLocaleString('pt-BR')}</div>
        <Sparkline values={sparkline} color={color} />
      </div>
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