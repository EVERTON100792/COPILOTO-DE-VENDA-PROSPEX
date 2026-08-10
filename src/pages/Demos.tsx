import React, { useState, useMemo } from 'react'
import { useApp } from '../services/store'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Badge, EmptyState, Tabs } from '../components/ui'
import { downloadProposalPdf } from '../services/proposalGenerator'

export const Demos: React.FC = () => {
  const navigate = useNavigate()
  const demos = useApp((s) => s.demos)
  const companies = useApp((s) => s.companies)
  const leads = useApp((s) => s.leads)
  const [filter, setFilter] = useState<string>('ALL')

  const companyMap = useMemo(() => {
    const map = new Map()
    for (const c of companies) {
      map.set(c.id, c)
    }
    return map
  }, [companies])

  const filteredDemos = useMemo(() => {
    if (filter === 'ALL') return demos
    if (filter === 'PUBLISHED') return demos.filter((d) => d.status === 'PUBLISHED')
    if (filter === 'READY') return demos.filter((d) => d.status === 'READY')
    return demos
  }, [demos, filter])

  const handleOpenWhatsApp = (demo: any, company: any) => {
    if (!company) return
    const phone = company.whatsapp || company.phone
    if (!phone) {
      navigator.clipboard.writeText(demo.whatsappMessage)
      useApp.getState().toast('success', 'Mensagem para WhatsApp copiada!')
      return
    }
    const digits = phone.replace(/\D/g, '')
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(demo.whatsappMessage)}`
    window.open(url, '_blank')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">⚡ Central de Demonstrações</h1>
          <p className="page-subtitle">
            Demonstrações comerciais personalizadas geradas para prospecção em 1-clique.
          </p>
        </div>
        <div className="page-actions">
          <Button variant="primary" onClick={() => navigate('/crm')}>
            🗂️ Ver Leads no CRM
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-3">
        <Card>
          <div className="card-title">Demonstrações Criadas</div>
          <div className="text-2xl bold mt-4">{demos.length}</div>
        </Card>
        <Card>
          <div className="card-title">Prontas para Envio</div>
          <div className="text-2xl bold text-warning mt-4">
            {demos.filter((d) => d.status === 'READY').length}
          </div>
        </Card>
        <Card>
          <div className="card-title">Publicadas</div>
          <div className="text-2xl bold text-success mt-4">
            {demos.filter((d) => d.status === 'PUBLISHED').length}
          </div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <Tabs
        active={filter}
        onChange={setFilter}
        tabs={[
          { id: 'ALL', label: `Todas (${demos.length})` },
          { id: 'READY', label: '⚡ Prontas' },
          { id: 'PUBLISHED', label: '🌐 Publicadas' }
        ]}
      />

      {/* List / Grid */}
      {filteredDemos.length === 0 ? (
        <EmptyState
          icon="⚡"
          title="Nenhuma demonstração gerada ainda"
          subtitle="Acesse a 'Busca & Mapa' ou 'Radar de Oportunidades' para gerar a primeira demonstração personalizada."
          action={
            <Button variant="primary" onClick={() => navigate('/radar')}>
              Ir para Radar de Oportunidades
            </Button>
          }
        />
      ) : (
        <div className="grid grid-3">
          {filteredDemos.map((demo) => {
            const company = companyMap.get(demo.companyId)

            return (
              <Card key={demo.id} className="card-hover" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div className="flex justify-between items-center mb-8">
                    <b className="text-base">{company?.name || 'Empresa'}</b>
                    <Badge variant={demo.status === 'PUBLISHED' ? 'success' : 'warning'}>
                      {demo.status}
                    </Badge>
                  </div>

                  <div className="tiny muted mb-12">
                    {company?.category || 'Negócio Local'} · {company?.city || 'Cidade'}
                  </div>

                  <div className="p-12 border-soft rounded mb-12" style={{ background: 'var(--surface-2)' }}>
                    <div className="tiny bold text-primary uppercase">Título Comercial</div>
                    <div className="small bold mt-4">{demo.content.headline}</div>
                  </div>
                </div>

                <div className="flex col gap-8 mt-12 pt-12" style={{ borderTop: '1px solid var(--border)' }}>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate(`/demo/${demo.id}`)}
                  >
                    👁️ Preview Interativo
                  </Button>
                  <div className="grid grid-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenWhatsApp(demo, company)}
                    >
                      💬 WhatsApp
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => company && downloadProposalPdf(company)}
                    >
                      📄 Proposta PDF
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
