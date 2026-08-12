import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../services/store'
import { Card, Button, Badge, EmptyState } from '../components/ui'
import { formatDateTime } from '../lib/utils'
import { DiscoveryService } from '../discovery/engine'
import { providerLabel } from '../discovery/registry'
import { LeadMap } from '../components/LeadMap'
import { SalesConversationModal } from '../components/SalesConversationModal'
import { MapsImportModal } from '../components/MapsImportModal'
import type { DiscoveryRun, Company } from '../types'


const RUN_COLOR: Record<DiscoveryRun['status'], string> = {
  QUEUED: 'var(--info)',
  RUNNING: 'var(--info)',
  COMPLETED: 'var(--success)',
  PARTIAL: 'var(--warning)',
  FAILED: 'var(--danger)',
  CANCELLED: 'var(--muted)',
}

const RUN_LABEL: Record<DiscoveryRun['status'], string> = {
  QUEUED: 'Na fila',
  RUNNING: 'Buscando…',
  COMPLETED: 'Concluída',
  PARTIAL: 'Parcial',
  FAILED: 'Falhou',
  CANCELLED: 'Cancelada',
}

function categoryIcon(category: string | null): string {
  const cat = (category || '').toLowerCase()
  if (cat.includes('restaurante') || cat.includes('comida') || cat.includes('bar') || cat.includes('pizzaria') || cat.includes('churrascaria')) return '🍽️'
  if (cat.includes('odonto') || cat.includes('dentista') || cat.includes('saúde') || cat.includes('clínica') || cat.includes('médic')) return '🏥'
  if (cat.includes('salão') || cat.includes('beleza') || cat.includes('estética') || cat.includes('barbe')) return '💅'
  if (cat.includes('auto') || cat.includes('mecanic') || cat.includes('carro') || cat.includes('pneu')) return '🔧'
  if (cat.includes('advoga') || cat.includes('juríd')) return '⚖️'
  if (cat.includes('academia') || cat.includes('personal') || cat.includes('fitness')) return '💪'
  if (cat.includes('pet') || cat.includes('veterinár')) return '🐾'
  if (cat.includes('supermercado') || cat.includes('mercearia') || cat.includes('padaria')) return '🛒'
  return '🏢'
}

function websiteStatus(company: Company) {
  if (!company.website) return { label: 'Sem site', variant: 'danger' as const }
  return { label: 'Tem site', variant: 'muted' as const }
}

export default function Discovery() {
  const runs = useApp((s) => s.discoveryRuns)
  const companies = useApp((s) => s.companies)
  const leads = useApp((s) => s.leads)
  const toast = useApp((s) => s.toast)

  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [salesModalOpen, setSalesModalOpen] = useState(false)
  const [mapsImportOpen, setMapsImportOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [showMap, setShowMap] = useState(true)
  const [confirmClear, setConfirmClear] = useState(false)
  const [activeTab, setActiveTab] = useState<'NEW' | 'CONTACTED'>('NEW')
  const prospectingSessions = useApp((s) => s.prospectingSessions)

  const sorted = useMemo(() => [...runs].reverse(), [runs])
  const removeCompany = useApp((s) => s.removeCompany)

  const active = sorted.find((r) => r.status === 'RUNNING' || r.status === 'QUEUED')

  const contactedCompanyIds = useMemo(() => {
    return new Set(
      prospectingSessions
        .map((s) => s.companyId)
        .filter((id) => companies.some((c) => c.id === id))
    )
  }, [prospectingSessions, companies])

  const filteredCompanies = useMemo(() => {
    let list = companies
    if (activeTab === 'NEW') {
      list = list.filter(c => !contactedCompanyIds.has(c.id))
    } else {
      list = list.filter(c => contactedCompanyIds.has(c.id))
    }

    if (!search.trim()) return list
    const q = search.toLowerCase()
    return list.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q)
    )
  }, [companies, search, activeTab, contactedCompanyIds])

  function handleProspectar(company: Company) {
    setSelectedCompany(company)
    setSalesModalOpen(true)
  }

  const leadsByCompany = useMemo(() => {
    const map = new Map<string, number>()
    for (const l of leads) map.set(l.companyId, (map.get(l.companyId) || 0) + 1)
    return map
  }, [leads])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>

      {/* Sales Conversation Modal */}
      <SalesConversationModal
        open={salesModalOpen}
        company={selectedCompany}
        onClose={() => { setSalesModalOpen(false); setSelectedCompany(null) }}
      />

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">🔍 Busca & Mapa de Empresas</h1>
          <p className="page-subtitle">
            {companies.length} empresas encontradas · Clique em <strong>⚡ Prospectar</strong> para iniciar a conversa guiada por IA
          </p>
        </div>
        <div className="page-actions">
          <Button variant="primary" onClick={() => setMapsImportOpen(true)} className="shadow-lg shadow-primary/30 ring-2 ring-primary/50 animate-pulse-soft">✨ Cadastrar Empresa</Button>
          <Link to="/campaigns/new" className="btn btn-primary">Nova Busca</Link>
          <Button variant="danger" onClick={() => setConfirmClear(true)}>🗑️ Limpar Dados</Button>
        </div>
      </div>

      {/* Empty state */}
      {companies.length === 0 && (
        <EmptyState
          icon="🔎"
          title="Nenhuma empresa encontrada ainda"
          subtitle="Crie uma busca no modo real (OpenStreetMap) ou carregue dados de demonstração."
          action={
            <div style={{ display: 'flex', gap: 10 }}>
              <Link to="/campaigns/new" className="btn btn-secondary">Criar busca agora</Link>
            </div>
          }
        />
      )}


      {/* Companies Grid */}
      {companies.length > 0 && (
        <>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <Button 
              variant={activeTab === 'NEW' ? 'primary' : 'secondary'} 
              onClick={() => setActiveTab('NEW')}
            >
              🏢 Resultados da Busca ({companies.filter(c => !contactedCompanyIds.has(c.id)).length})
            </Button>
            <Button 
              variant={activeTab === 'CONTACTED' ? 'primary' : 'secondary'} 
              onClick={() => setActiveTab('CONTACTED')}
            >
              💬 Conversas Ativas ({contactedCompanyIds.size})
            </Button>
          </div>

          {/* Search & Map Toggle */}
          <Card>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                className="input"
                style={{ flex: 1, minWidth: 200 }}
                placeholder="Buscar por nome, categoria ou cidade..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button
                variant={showMap ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setShowMap(!showMap)}
              >
                {showMap ? '🗺️ Ocultar Mapa' : '🗺️ Ver Mapa'}
              </Button>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                {filteredCompanies.length} de {companies.length} empresas
              </span>
            </div>
          </Card>

          {/* Map */}
          {showMap && (
            <Card>
              <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                  Mapa de oportunidades — {companies.length} pins encontrados
                </span>
              </div>
              <LeadMap companies={companies} />
            </Card>
          )}

          {/* Company Cards Grouped by Niche */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {Object.entries(
              filteredCompanies.reduce((acc, company) => {
                const cat = company.category || 'Outros'
                if (!acc[cat]) acc[cat] = []
                acc[cat].push(company)
                return acc
              }, {} as Record<string, typeof filteredCompanies>)
            ).map(([category, list]) => (
              <div key={category}>
                <h2 style={{ fontSize: 18, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 22 }}>{categoryIcon(category)}</span>
                  {category}
                  <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 400, marginLeft: 8 }}>
                    ({list.length} empresas)
                  </span>
                </h2>
                
                <div className="grid grid-dense">
                  {list.map((company) => {
                    const ws = websiteStatus(company)
                    const icon = categoryIcon(company.category)
                    const hasLead = leadsByCompany.has(company.id)
                    return (
                      <Card key={company.id} className="card-hover card-compact">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <div style={{
                              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                              background: 'var(--surface-2)', display: 'grid', placeItems: 'center',
                              fontSize: 18, border: '1px solid var(--border)'
                            }}>
                              {icon}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13.5, lineHeight: 1.2, wordBreak: 'break-word', paddingRight: 8 }}>{company.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                                {company.category || 'Negócio Local'}
                              </div>
                            </div>
                          </div>
                          <button 
                            className="link-btn"
                            style={{ padding: 4, color: 'var(--muted)', fontSize: 14 }}
                            onClick={() => removeCompany(company.id)}
                            title="Excluir permanentemente"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Badges */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <Badge variant={ws.variant}>{ws.label}</Badge>
                          {company.isDemo && <Badge variant="muted">DEMO</Badge>}
                        </div>

                        {/* Minimal Info */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11.5, color: 'var(--muted)', flex: 1 }}>
                          {company.city && <span style={{ display: 'flex', gap: 6 }}><span style={{ color: 'var(--primary)', filter: 'grayscale(0.5)' }}>📍</span> {company.city}</span>}
                          {company.phone && (
                            <a 
                              href={`https://wa.me/55${company.phone.replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              style={{ display: 'flex', gap: 6, color: 'var(--text)', textDecoration: 'none' }}
                            >
                              <span style={{ color: 'var(--success)' }}>💬</span> 
                              <span>{company.phone}</span>
                            </a>
                          )}
                        </div>

                        {/* CTA - visible on hover or low opacity by default */}
                        <div className="card-actions">
                          <div style={{ display: 'flex', gap: 8 }}>
                            <Button
                              variant="primary"
                              size="sm"
                              style={{ flex: 1 }}
                              onClick={() => handleProspectar(company)}
                            >
                              {contactedCompanyIds.has(company.id) ? '💬 Continuar' : '⚡ Prospectar IA'}
                            </Button>
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(company.name + ' ' + (company.city || ''))}`}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '6px 10px' }}
                              title="Ver no Maps"
                            >
                              🗺️
                            </a>
                          </div>
                          {hasLead && (
                            <div style={{ fontSize: 11, color: 'var(--success)', textAlign: 'center', fontWeight: 600 }}>
                              ✓ Lead já cadastrado
                            </div>
                          )}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Active run indicator */}
      {active && (
        <Card style={{ borderColor: 'var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                🔄 Busca em andamento: {active.query} em {active.location}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                Encontradas: <b>{active.foundCount}</b> · Novas: <b>{active.newCount}</b> ·
                Fonte: {providerLabel(active.provider)} · {RUN_LABEL[active.status]}
              </div>
            </div>
            <Button variant="danger" size="sm" onClick={() => {
              new DiscoveryService().cancel(active.id)
              toast('info', 'Cancelamento solicitado.')
            }}>Cancelar</Button>
          </div>
        </Card>
      )}

      {/* History table */}
      {sorted.length > 0 && (
        <Card title={`Histórico de buscas (${sorted.length})`}>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Data</th><th>Termo</th><th>Localização</th>
                  <th>Encontradas</th><th>Novas</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sorted.slice(0, 10).map((r) => (
                  <tr key={r.id}>
                    <td className="tiny">{formatDateTime(r.startedAt)}</td>
                    <td>{r.query}</td>
                    <td>{r.location}</td>
                    <td>{r.foundCount}</td>
                    <td className="bold">{r.newCount}</td>
                    <td><span style={{ color: RUN_COLOR[r.status], fontSize: 12 }}>{RUN_LABEL[r.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <MapsImportModal open={mapsImportOpen} onClose={() => setMapsImportOpen(false)} />

      {/* Modal de confirmação — Limpar Buscas/Empresas */}
      {confirmClear && (
        <div className="modal-backdrop" onClick={() => setConfirmClear(false)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: 'var(--danger)' }}>⚠️ Excluir Dados do Sistema</h3>
            <p className="mt-8">Escolha o que você deseja limpar do sistema. <b>Estas ações não podem ser desfeitas.</b></p>
            
            <div className="flex col gap-8 mt-20">
              <Button variant="danger" onClick={() => {
                useApp.getState().clearAllCompanies()
                setConfirmClear(false)
                toast('success', 'Começando do zero! Empresas, leads e buscas foram removidos.')
              }}>
                🗑️ Excluir TUDO (Começar do zero)
              </Button>
              <Button variant="secondary" onClick={() => {
                useApp.getState().clearDiscoveryData()
                setConfirmClear(false)
                toast('success', 'Histórico de buscas limpo, mas as empresas foram mantidas.')
              }}>
                Limpar apenas histórico de buscas
              </Button>
              <Button variant="ghost" onClick={() => setConfirmClear(false)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}