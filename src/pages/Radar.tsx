import React, { useState, useMemo } from 'react'
import { useApp } from '../services/store'
import { detectOpportunitiesForLead, OpportunityItem } from '../services/radarEngine'
import { downloadProposalPdf } from '../services/proposalGenerator'
import { downloadSiteZip } from '../services/siteGenerator'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Badge, EmptyState, Tabs } from '../components/ui'

export const Radar: React.FC = () => {
  const navigate = useNavigate()
  const leads = useApp((s) => s.leads)
  const companies = useApp((s) => s.companies)
  const [filterType, setFilterType] = useState<string>('ALL')

  const companyMap = useMemo(() => {
    const map = new Map()
    for (const c of companies) {
      map.set(c.id, c)
    }
    return map
  }, [companies])

  const opportunities = useMemo(() => {
    const list: Array<{
      leadId: string
      companyName: string
      city: string
      category: string
      item: OpportunityItem
      company: any
    }> = []
    for (const lead of leads) {
      const comp = companyMap.get(lead.companyId)
      const opps = detectOpportunitiesForLead(lead, comp)
      for (const item of opps) {
        list.push({
          leadId: lead.id,
          companyName: comp?.name || 'Empresa Local',
          city: comp?.city || 'Local',
          category: comp?.category || 'Negócio',
          item,
          company: comp
        })
      }
    }
    return list
  }, [leads, companyMap])

  const filtered = useMemo(() => {
    if (filterType === 'ALL') return opportunities
    return opportunities.filter((o) => o.item.type === filterType)
  }, [opportunities, filterType])

  const semSiteCount = useMemo(() => opportunities.filter((o) => o.item.type === 'sem_site').length, [opportunities])
  const semWaCount = useMemo(() => opportunities.filter((o) => o.item.type === 'sem_whatsapp').length, [opportunities])
  const highPriorityCount = useMemo(() => opportunities.filter((o) => o.item.priority === 'alta').length, [opportunities])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">🎯 Radar de Oportunidades</h1>
          <p className="page-subtitle">
            Detecção automática de falhas digitais em empresas para prospecção cirúrgica.
          </p>
        </div>
        <div className="page-actions">
          <Button variant="primary" onClick={() => navigate('/discovery')}>
            🔍 Buscar mais empresas
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-4">
        <Card>
          <div className="card-title">Oportunidades Totais</div>
          <div className="text-2xl bold mt-4">{opportunities.length}</div>
        </Card>
        <Card>
          <div className="card-title">Sem Site Próprio</div>
          <div className="text-2xl bold text-warning mt-4">{semSiteCount}</div>
        </Card>
        <Card>
          <div className="card-title">Sem WhatsApp Direto</div>
          <div className="text-2xl bold text-danger mt-4">{semWaCount}</div>
        </Card>
        <Card>
          <div className="card-title">Prioridade Alta</div>
          <div className="text-2xl bold text-success mt-4">{highPriorityCount}</div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs
        active={filterType}
        onChange={setFilterType}
        tabs={[
          { id: 'ALL', label: `Todas (${opportunities.length})` },
          { id: 'sem_site', label: `🚫 Sem Site (${semSiteCount})` },
          { id: 'sem_whatsapp', label: `💬 Sem WhatsApp (${semWaCount})` },
          { id: 'sem_https', label: '🔒 Sem HTTPS' },
        ]}
      />

      {/* Opportunity Cards List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="🎯"
          title="Nenhuma oportunidade neste filtro"
          subtitle="Execute uma nova busca na 'Busca de Empresas' para alimentar o radar."
          action={
            <Button variant="primary" onClick={() => navigate('/discovery')}>
              Ir para Busca de Empresas
            </Button>
          }
        />
      ) : (
        <div className="grid grid-3">
          {filtered.map((opp, idx) => (
            <Card key={`${opp.leadId}-${idx}`} className="card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <div className="bold text-base">{opp.companyName}</div>
                    <div className="tiny muted mt-4">
                      {opp.category} · {opp.city}
                    </div>
                  </div>
                  <Badge variant={opp.item.priority === 'alta' ? 'danger' : 'warning'}>
                    {opp.item.priority.toUpperCase()}
                  </Badge>
                </div>

                <div className="p-12 border-soft rounded mb-12" style={{ background: 'var(--surface-2)' }}>
                  <div className="tiny bold text-primary uppercase">Diagnóstico</div>
                  <div className="small mt-4">{opp.item.reason}</div>
                </div>

                <div className="mb-12">
                  <div className="tiny muted uppercase">Serviço Recomendado</div>
                  <div className="small bold mt-4" style={{ color: 'var(--success)' }}>
                    {opp.item.serviceSuggestion}
                  </div>
                </div>
              </div>

              <div className="flex col gap-8 mt-12 pt-12" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="grid grid-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => opp.company && downloadProposalPdf(opp.company)}
                  >
                    📄 Proposta PDF
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => opp.company && downloadSiteZip(opp.company)}
                  >
                    🌐 Site ZIP
                  </Button>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/crm')}
                >
                  🚀 Ir para CRM
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
