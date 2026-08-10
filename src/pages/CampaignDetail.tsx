import { useState, useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useApp } from '../services/store'
import { Card, Badge, Button, EmptyState } from '../components/ui'
import { formatDate } from '../lib/utils'
import { tierLabel } from '../config/defaults'
import type { Lead } from '../types'
import { QualificationService, type QualifyCampaignProgress } from '../services/qualification'

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const s = useApp.getState()
  const campaign = useApp((s) => s.campaigns.find((c) => c.id === id))
  const allLeads = useApp((s) => s.leads)
  const companies = useApp((s) => s.companies)
  const leads = useMemo(() => allLeads.filter((l) => l.campaignId === id), [allLeads, id])

  const [isQualifying, setIsQualifying] = useState(false)
  const [qualProgress, setQualProgress] = useState<QualifyCampaignProgress | null>(null)

  if (!campaign) {
    return (
      <EmptyState
        icon="🔍"
        title="Campanha não encontrada"
        subtitle="Ela pode ter sido removida."
        action={<Link to="/campaigns" className="btn btn-secondary">Ver campanhas</Link>}
      />
    )
  }

  const top = [...leads].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 10)
  const nameOf = (lead: Lead): string => companies.find((c) => c.id === lead.companyId)?.name ?? 'Empresa'
  const cityOf = (lead: Lead): string => companies.find((c) => c.id === lead.companyId)?.city ?? '—'

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{campaign.name}</h1>
          <p className="page-subtitle">
            {campaign.niche} · {campaign.city}/{campaign.state} · meta {campaign.quantity} empresas
          </p>
        </div>
        <div className="page-actions">
          <Link to="/campaigns" className="btn btn-secondary">← Campanhas</Link>
        </div>
      </div>

      <div className="grid grid-4 mb-16">
        <Card className="card-hover"><div className="metric"><div className="metric-value">{campaign.stats.discovered}</div><div className="metric-label">Empresas encontradas</div></div></Card>
        <Card className="card-hover"><div className="metric"><div className="metric-value">{campaign.stats.duplicatesRemoved}</div><div className="metric-label">Duplicadas removidas</div></div></Card>
        <Card className="card-hover"><div className="metric"><div className="metric-value">{campaign.stats.noWebsite}</div><div className="metric-label">Sem site</div></div></Card>
        <Card className="card-hover"><div className="metric"><div className="metric-value">{leads.length}</div><div className="metric-label">Leads no CRM</div></div></Card>
      </div>

      <Card title="Qualificação de Oportunidades (Fase 3)" className="mb-16">
        <div className="flex items-center justify-between wrap gap-16 mb-12">
          <div>
            <b>Qualificação Comercial de Leads em Massa</b>
            <div className="small muted">
              Avalie a presença digital, scanner de site, pontuação determinística e IA de todos os {leads.length} leads desta campanha.
            </div>
          </div>
          <Button
            variant="primary"
            disabled={isQualifying || leads.length === 0}
            onClick={async () => {
              setIsQualifying(true)
              const svc = new QualificationService()
              try {
                await svc.qualifyCampaign(campaign.id, {
                  forceReanalysis: true,
                  onProgress: (p) => setQualProgress(p),
                })
                s.toast('success', `Qualificação concluída! ${leads.length} leads analisados.`)
              } catch (e) {
                s.toast('error', `Erro ao qualificar campanha: ${String(e)}`)
              } finally {
                setIsQualifying(false)
                setQualProgress(null)
              }
            }}
          >
            {isQualifying ? 'Analisando...' : '⚡ Qualificar Todos os Leads'}
          </Button>
        </div>

        {qualProgress && (
          <div className="mt-12 p-12 bg-subtle border rounded">
            <div className="flex justify-between small bold mb-4">
              <span>Processando: {qualProgress.currentLeadName ?? 'Carregando...'}</span>
              <span>{qualProgress.processed} / {qualProgress.total} ({qualProgress.percent}%)</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${qualProgress.percent}%` }} />
            </div>
            <div className="flex gap-12 tiny muted mt-8 wrap">
              <span>🟢 Alta: {qualProgress.highCount}</span>
              <span>🟡 Média: {qualProgress.mediumCount}</span>
              <span>🔵 Baixa: {qualProgress.lowCount}</span>
              <span>⚪ Não Verif.: {qualProgress.unverifiedCount}</span>
              <span>🤖 Via IA: {qualProgress.aiCount}</span>
              <span>📐 Via Regras: {qualProgress.ruleCount}</span>
            </div>
          </div>
        )}
      </Card>

      <Card title="Progresso da Campanha" className="mb-16">
        <div className="progress-track">
          <div className={`progress-fill${campaign.status === 'PAUSED' ? ' paused' : ''}`} style={{ width: `${campaign.progress ?? 0}%` }} />
        </div>
        <div className="progress-labels">
          <div className="progress-label">Status: <b>{statusLabel(campaign.status)}</b></div>
          <div className="progress-label">Analisadas: <b>{campaign.stats.analyzed}</b></div>
          <div className="progress-label">Qualificadas: <b>{campaign.stats.qualified}</b></div>
          {campaign.finishedAt && <div className="progress-label">Concluída em <b>{formatDate(campaign.finishedAt)}</b></div>}
        </div>
      </Card>

      <Card title="Top 10 oportunidades da campanha">
        {top.length === 0 ? (
          <div className="muted small">
            Nenhum lead salvo nesta campanha.{' '}
            <Link to="/leads" className="link-btn">Ir para leads</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>#</th><th>Empresa</th><th>Cidade</th><th>Score</th><th>Classificação</th><th>Motivo</th></tr>
              </thead>
              <tbody>
                {top.map((l, i) => (
                  <tr key={l.id} className="clickable" onClick={() => navigate(`/leads/${l.id}`)}>
                    <td>#{i + 1}</td>
                    <td className="bold">{nameOf(l)}</td>
                    <td>{cityOf(l)}</td>
                    <td><Badge variant={scoreVariant(l.score)}>{l.score ?? '—'}</Badge></td>
                    <td><Badge variant="violet">{tierLabel(l.tier)}</Badge></td>
                    <td className="small muted">{reason(l)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function reason(l: Lead): string {
  if (l.websiteStatus === 'NO_WEBSITE') return 'Sem site oficial'
  if (l.status === 'REPLIED') return 'Já respondeu'
  return `Fácil de abordar`
}

function scoreVariant(score: number | null): 'danger' | 'warning' | 'info' | 'muted' {
  if (score === null) return 'muted'
  if (score >= 90) return 'danger'
  if (score >= 75) return 'warning'
  if (score >= 60) return 'info'
  return 'muted'
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