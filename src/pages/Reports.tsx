import { useNavigate } from 'react-router-dom'
import { useApp } from '../services/store'
import { Card, EmptyState, ScoreBadge } from '../components/ui'
import { BarChart, DonutChart, Funnel, Sparkline } from '../components/charts'
import {
  computeMetrics, funnel, leadsByCity, leadsByCategory,
  scoreDistribution, weeklyTrend, recommendations, topOpportunities,
} from '../services/insights'

export default function Reports() {
  const navigate = useNavigate()
  const leads = useApp((s) => s.leads)
  const companies = useApp((s) => s.companies)

  if (leads.length === 0) {
    return (
      <EmptyState
        icon="📊"
        title="Dados insuficientes"
        subtitle="Rode uma campanha para gerar relatórios."
      />
    )
  }

  const m = computeMetrics(leads)
  const f = funnel()
  const cities = leadsByCity()
  const categories = leadsByCategory()
  const score = scoreDistribution()
  const trend = weeklyTrend(14)
  const recs = recommendations()
  const opps = topOpportunities()

  const companyName = (leadId: string) => companies.find((c) => c.id === leadId)?.name ?? '—'
  const noData = (v: number | null) => (m.contacted === 0 ? '—' : v == null ? '—' : `${v}%`)

  const scoreSegments = [
    { label: '90+ (HOT)', value: score.find((s) => s.range.startsWith('90'))?.count ?? 0, color: '#ef4444' },
    { label: '75-89', value: score.find((s) => s.range.startsWith('75'))?.count ?? 0, color: '#f59e0b' },
    { label: '60-74', value: score.find((s) => s.range.startsWith('60'))?.count ?? 0, color: '#3b82f6' },
    { label: '40-59', value: score.find((s) => s.range.startsWith('40'))?.count ?? 0, color: '#94a3b8' },
    { label: '<40', value: score.find((s) => s.range.startsWith('0'))?.count ?? 0, color: '#64748b' },
  ]

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="page-subtitle">Métricas e insights da base de leads</p>
        </div>
      </div>

      <div className="grid grid-4 mb-16">
        <Card className="card-hover"><div className="metric"><div className="metric-value">{m.totalLeads}</div><div className="metric-label">Leads total</div></div></Card>
        <Card className="card-hover"><div className="metric"><div className="metric-value">{m.contacted}</div><div className="metric-label">Contatados</div></div></Card>
        <Card className="card-hover"><div className="metric"><div className="metric-value">{noData(m.responseRate)}</div><div className="metric-label">Taxa de resposta</div></div></Card>
        <Card className="card-hover"><div className="metric"><div className="metric-value">{noData(m.interestRate)}</div><div className="metric-label">Taxa de interesse</div></div></Card>
        <Card className="card-hover"><div className="metric"><div className="metric-value">{noData(m.conversionRate)}</div><div className="metric-label">Conversão</div></div></Card>
      </div>

      <div className="grid grid-5 mb-16">
        <Card className="card-hover"><div className="metric"><div className="metric-value">{m.replied}</div><div className="metric-label">Responderam</div></div></Card>
        <Card className="card-hover"><div className="metric"><div className="metric-value">{m.interested}</div><div className="metric-label">Interessados</div></div></Card>
        <Card className="card-hover"><div className="metric"><div className="metric-value">{m.proposals}</div><div className="metric-label">Propostas</div></div></Card>
        <Card className="card-hover"><div className="metric"><div className="metric-value">{m.won}</div><div className="metric-label">Fechados</div></div></Card>
        <Card className="card-hover"><div className="metric"><div className="metric-value">{m.avgScore ?? '—'}</div><div className="metric-label">Score médio</div></div></Card>
      </div>

      <div className="grid grid-3 mb-16">
        <Card title="Funil de conversão"><Funnel steps={f} /></Card>
        <Card title="Distribuição de score"><DonutChart segments={scoreSegments} /></Card>
        <Card title="Sem site na base">
          <div className="metric ta-center"><div className="metric-value">{m.noWebsite}</div><div className="metric-label">empresas sem site ({Math.round((m.noWebsite / leads.length) * 100)}%)</div></div>
          <div className="progress-track mt-8"><div className="progress-fill" style={{ width: `${(m.noWebsite / Math.max(leads.length, 1)) * 100}%`, background: '#ef4444' }} /></div>
        </Card>
      </div>

      <div className="grid grid-2 mb-16">
        <Card title="Leads por cidade"><BarChart data={cities.map((c) => ({ label: c.city, value: c.count }))} /></Card>
        <Card title="Leads por segmento"><BarChart data={categories.map((c) => ({ label: c.category, value: c.count }))} color="var(--secondary)" /></Card>
      </div>

      <div className="grid grid-2 mb-16">
        <Card title="Novos leads por dia (14 dias)">
          <Sparkline values={trend.map((t) => t.count)} />
          <div className="tiny muted mt-8 ta-center">{trend[0]?.date} → {trend[trend.length - 1]?.date}</div>
        </Card>
        <Card title="Top oportunidades">
          {opps.map((o) => (
            <div key={o.lead.id} className="flex justify-between py-4 clickable" onClick={() => navigate(`/leads/${o.lead.id}`)}>
              <div>
                <b className="small">{o.companyName}</b>
                <div className="tiny muted">{o.reason}</div>
              </div>
              <b>{o.score}</b>
            </div>
          ))}
        </Card>
      </div>

      <Card title="Recomendações de abordagem">
        {recs.map((l) => {
          const c = companies.find((x) => x.id === l.companyId)
          return (
            <div key={l.id} className="flex justify-between py-4 clickable" onClick={() => navigate(`/leads/${l.id}`)}>
              <div>
                <b className="small">{c?.name ?? '—'}</b>
                <div className="tiny muted">{c?.city ?? ''} · {l.websiteStatus === 'NO_WEBSITE' ? 'sem site' : 'com site'} · {l.hasWhatsapp ? 'whatsapp ✓' : 'sem whatsapp'}</div>
              </div>
              <ScoreBadge score={l.score} size={30} />
            </div>
          )
        })}
      </Card>
    </div>
  )
}