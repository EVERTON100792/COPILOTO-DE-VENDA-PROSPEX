import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useApp } from '../services/store'
import { Card, Badge, EmptyState, Button, Field } from '../components/ui'
import { WEBSITE_STATUS_LABELS } from '../config/defaults'
import { doExport } from '../components/exportHelpers'
import { parseImportCsv, importCandidates, type ImportCandidate } from '../services/importExport'
import { MapsImportModal } from '../components/MapsImportModal'

export default function Leads() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const filterParam = params.get('filter')
  const allLeads = useApp((s) => s.leads)
  const companies = useApp((s) => s.companies)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [city, setCity] = useState('')
  const [category, setCategory] = useState('')
  const [minScore, setMinScore] = useState('')
  const [website, setWebsite] = useState('')
  const [opportunityFilter, setOpportunityFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [pipelineTab, setPipelineTab] = useState<'ALL'|'NEW'|'NEGOTIATION'|'WON'|'LOST'>('ALL')
  const [favoritesOnly, setFavoritesOnly] = useState(filterParam === 'favorites')
  const [importOpen, setImportOpen] = useState(false)
  const [mapsImportOpen, setMapsImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [candidates, setCandidates] = useState<ImportCandidate[] | null>(null)

  const qualifications = useApp((s) => s.qualifications)
  const qualByLeadId = useMemo(() => new Map(qualifications.map((q) => [q.leadId, q])), [qualifications])

  useEffect(() => {
    if (filterParam === 'favorites') setFavoritesOnly(true)
    if (filterParam === 'no-website') setWebsite('NO_WEBSITE')
    if (filterParam === 'qualified') setMinScore('60')
  }, [filterParam])

  const companiesById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies])

  const leads = useMemo(() => {
    let list = allLeads
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((l) => {
        const c = companiesById.get(l.companyId)
        return (
          c?.name?.toLowerCase().includes(q) ||
          c?.city?.toLowerCase().includes(q) ||
          c?.phone?.toLowerCase().includes(q) ||
          c?.instagram?.toLowerCase().includes(q) ||
          l.status?.toLowerCase().includes(q)
        )
      })
    }

    if (pipelineTab === 'NEW') {
      list = list.filter(l => ['NEW', 'QUALIFIED', 'READY_TO_CONTACT'].includes(l.status))
    } else if (pipelineTab === 'NEGOTIATION') {
      list = list.filter(l => ['CONTACTED', 'REPLIED', 'INTERESTED', 'NEGOTIATION', 'PROPOSAL_SENT'].includes(l.status))
    } else if (pipelineTab === 'WON') {
      list = list.filter(l => l.status === 'WON')
    } else if (pipelineTab === 'LOST') {
      list = list.filter(l => ['LOST', 'NO_RESPONSE', 'DO_NOT_CONTACT'].includes(l.status))
    }

    if (status) list = list.filter((l) => l.status === status)
    if (city) list = list.filter((l) => companiesById.get(l.companyId)?.city === city)
    if (category) list = list.filter((l) => companiesById.get(l.companyId)?.category === category)
    if (website) list = list.filter((l) => l.websiteStatus === website)
    if (minScore) list = list.filter((l) => (l.score ?? 0) >= Number(minScore))
    if (opportunityFilter) {
      list = list.filter((l) => qualByLeadId.get(l.id)?.qualification === opportunityFilter)
    }
    if (methodFilter) {
      list = list.filter((l) => qualByLeadId.get(l.id)?.qualificationMethod === methodFilter)
    }
    if (favoritesOnly) list = list.filter((l) => l.favorite)
    return [...list].sort((a, b) => {
      const qA = qualByLeadId.get(a.id)?.finalScore ?? a.score ?? 0
      const qB = qualByLeadId.get(b.id)?.finalScore ?? b.score ?? 0
      return qB - qA
    })
  }, [allLeads, companiesById, qualByLeadId, search, status, city, category, website, minScore, opportunityFilter, methodFilter, favoritesOnly, pipelineTab])

  const cities = useMemo(() => [...new Set(allLeads.map((l) => companiesById.get(l.companyId)?.city).filter(Boolean) as string[])], [allLeads, companiesById])
  const categories = useMemo(() => [...new Set(allLeads.map((l) => companiesById.get(l.companyId)?.category).filter(Boolean) as string[])], [allLeads, companiesById])

  function handleImport() {
    const parsed = parseImportCsv(importText)
    setCandidates(parsed)
  }

  function confirmImport() {
    if (!candidates) return
    const { imported, skipped } = importCandidates(candidates)
    useApp.getState().toast('success', `Importação: ${imported} empresas adicionadas, ${skipped} ignoradas`)
    setImportOpen(false)
    setCandidates(null)
    setImportText('')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Leads</h1>
          <p className="page-subtitle">{leads.length} resultados · filtrados e escalonáveis</p>
        </div>
        <div className="page-actions">
          <Button variant="secondary" onClick={() => setMapsImportOpen(true)}>Nova Empresa (Maps)</Button>
          <Button variant="secondary" onClick={() => setImportOpen(true)}>Importar CSV</Button>
          <Button variant="secondary" onClick={() => doExport(leads, 'csv')}>Exportar CSV</Button>
          <Button variant="secondary" onClick={() => doExport(leads, 'json')}>Exportar JSON</Button>
          <Link to="/campaigns/new" className="btn btn-primary">+ Nova campanha</Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
        <Button variant={pipelineTab === 'ALL' ? 'primary' : 'secondary'} onClick={() => setPipelineTab('ALL')}>
          📋 Todos
        </Button>
        <Button variant={pipelineTab === 'NEW' ? 'primary' : 'secondary'} onClick={() => setPipelineTab('NEW')}>
          🌟 Novos / Frios
        </Button>
        <Button variant={pipelineTab === 'NEGOTIATION' ? 'primary' : 'secondary'} onClick={() => setPipelineTab('NEGOTIATION')}>
          💬 Em Negociação
        </Button>
        <Button variant={pipelineTab === 'WON' ? 'primary' : 'secondary'} onClick={() => setPipelineTab('WON')}>
          🏆 Ganhos (Clientes)
        </Button>
        <Button variant={pipelineTab === 'LOST' ? 'primary' : 'secondary'} onClick={() => setPipelineTab('LOST')}>
          🗑️ Arquivo Morto
        </Button>
      </div>

      <Card className="mb-16">
        <div className="grid grid-4 gap-12 mb-8">
          <Field label="Busca"><input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, cidade..." /></Field>
          <Field label="Oportunidade (Fase 3)">
            <select className="select" value={opportunityFilter} onChange={(e) => setOpportunityFilter(e.target.value)}>
              <option value="">Todas</option>
              <option value="HIGH">🟢 Alta Oportunidade</option>
              <option value="MEDIUM">🟡 Média Oportunidade</option>
              <option value="LOW">🔵 Baixa Oportunidade</option>
              <option value="UNVERIFIED">⚪ Não Verificado</option>
            </select>
          </Field>
          <Field label="Método de Qualificação">
            <select className="select" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
              <option value="">Todos os Métodos</option>
              <option value="AI">🤖 Inteligência Artificial</option>
              <option value="RULE_BASED">📐 Regras Determinísticas</option>
              <option value="RULE_BASED_FALLBACK">🔄 Fallback de IA</option>
              <option value="DEMO">🔵 Modo Demo</option>
            </select>
          </Field>
          <Field label="Status">
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Todos</option>
              <option value="NEW">Novo</option>
              <option value="QUALIFIED">Qualificado</option>
              <option value="READY_TO_CONTACT">Pronto para contato</option>
              <option value="CONTACTED">Contatado</option>
              <option value="REPLIED">Respondeu</option>
              <option value="INTERESTED">Interessado</option>
              <option value="NEGOTIATION">Negociação</option>
              <option value="PROPOSAL_SENT">Proposta</option>
              <option value="WON">Fechado</option>
              <option value="LOST">Perdido</option>
              <option value="DO_NOT_CONTACT">Não contatar</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-4 gap-12">
          <Field label="Cidade">
            <select className="select" value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">Todas</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Segmento">
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Todos</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Website">
            <select className="select" value={website} onChange={(e) => setWebsite(e.target.value)}>
              <option value="">Todos</option>
              <option value="NO_WEBSITE">Sem site</option>
              <option value="WEBSITE_FOUND">Com site</option>
              <option value="WEBSITE_BROKEN">Site fora do ar</option>
              <option value="WEBSITE_OUTDATED">Site desatualizado</option>
            </select>
          </Field>
          <Field label="Score mínimo">
            <input type="number" className="input" min={0} max={100} value={minScore} onChange={(e) => setMinScore(e.target.value)} placeholder="0" />
          </Field>
        </div>
        <div className="flex items-center gap-16 mt-8 wrap">
          <label className="checkbox-row">
            <input type="checkbox" checked={favoritesOnly} onChange={(e) => setFavoritesOnly(e.target.checked)} />
            Somente favoritos
          </label>
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setStatus(''); setCity(''); setCategory(''); setWebsite(''); setMinScore(''); setOpportunityFilter(''); setMethodFilter(''); setFavoritesOnly(false) }}>Limpar filtros</Button>
        </div>
      </Card>

      {leads.length === 0 ? (
        <EmptyState
          icon="👥"
          title="Nenhum lead encontrado"
          subtitle="Ajuste os filtros ou crie uma campanha de prospecção."
        />
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Empresa</th><th>Segmento</th><th>Cidade</th><th>Website</th><th>Score</th><th>Status</th><th>Fav</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => {
                const c = companiesById.get(l.companyId)
                return (
                  <tr key={l.id} className="clickable" onClick={() => navigate(`/leads/${l.id}`)}>
                    <td className="bold">{c?.name ?? '—'}</td>
                    <td>{c?.category ?? '—'}</td>
                    <td>{c?.city ?? '—'}</td>
                    <td><Badge variant={websiteBadge(l.websiteStatus)}>{WEBSITE_STATUS_LABELS[l.websiteStatus] ?? l.websiteStatus}</Badge></td>
                    <td><Badge variant={scoreVariant(l.score)}>{l.score ?? '—'}</Badge></td>
                    <td><Badge variant="info">{statusLabel(l.status)}</Badge></td>
                    <td>{l.favorite ? '❤️' : ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {importOpen && (
        <div className="modal-backdrop" onClick={() => setImportOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Importar leads">
            <div className="modal-head">
              <h3 className="modal-title">Importar leads (CSV)</h3>
              <button className="modal-close" onClick={() => setImportOpen(false)}>×</button>
            </div>
            <div className="modal-body space-y-4">
              <Field label="Cole os dados" hint="Colunas esperadas: nome;categoria;cidade;estado;telefone;whatsapp;website;instagram;email (separador ; ou ,)">
                <textarea className="textarea" style={{ minHeight: 180 }} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={'nome;categoria;cidade;estado;telefone\nFarmacia Demo;Farmácias;Londrina;PR;(43) 9999-0000'} />
              </Field>
              {candidates && (
                <div className="mt-4">
                  <b className="small">Prévia de detecção</b>
                  <div className="table-wrap" style={{ maxHeight: 260, overflowY: 'auto' }}>
                    <table className="data">
                      <thead><tr><th>Nome</th><th>Problemas</th><th>Duplicado?</th></tr></thead>
                      <tbody>
                        {candidates.slice(0, 20).map((c, i) => (
                          <tr key={i}>
                            <td>{c.name || <span className="muted">sem nome</span>}</td>
                            <td className="small">{c.issues.join('; ') || 'ok'}</td>
                            <td>{c.duplicateOf ? `sim: ${c.duplicateOf}` : 'não'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="small muted mt-2">{candidates.length} registros detectados</div>
                </div>
              )}
            </div>
            <div className="modal-foot">
              <Button variant="secondary" onClick={() => setImportOpen(false)}>Cancelar</Button>
              {candidates ? (
                <Button variant="primary" onClick={confirmImport}>Confirmar</Button>
              ) : (
                <Button variant="primary" onClick={handleImport}>Analisar arquivo</Button>
              )}
            </div>
          </div>
        </div>
      )}

      <MapsImportModal open={mapsImportOpen} onClose={() => setMapsImportOpen(false)} />
    </div>
  )
}

function statusLabel(s: string): string {
  return {
    NEW: 'Novo', QUALIFIED: 'Qualificado', READY_TO_CONTACT: 'Pronto p/ contato',
    CONTACTED: 'Contatado', REPLIED: 'Respondeu', INTERESTED: 'Interessado',
    NEGOTIATION: 'Negociação', PROPOSAL_SENT: 'Proposta', WON: 'Fechado',
    LOST: 'Perdido', NO_RESPONSE: 'Sem resposta', DO_NOT_CONTACT: 'Não contatar',
  }[s] ?? s
}

function scoreVariant(score: number | null): 'danger' | 'warning' | 'info' | 'muted' {
  if (score === null) return 'muted'
  if (score >= 90) return 'danger'
  if (score >= 75) return 'warning'
  if (score >= 60) return 'info'
  return 'muted'
}

function websiteBadge(s: string): 'success' | 'danger' | 'warning' | 'muted' {
  if (s === 'NO_WEBSITE' || s === 'WEBSITE_BROKEN') return 'danger'
  if (s === 'WEBSITE_OUTDATED' || s === 'WEBSITE_POOR_MOBILE') return 'warning'
  if (s === 'WEBSITE_FOUND') return 'success'
  return 'muted'
}