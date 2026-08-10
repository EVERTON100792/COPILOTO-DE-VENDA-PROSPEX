import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../services/store'
import { Card, Badge, Button, EmptyState, Field } from '../components/ui'
import { doExport } from '../components/exportHelpers'
import { parseImportCsv, importCandidates, previewImportCsv } from '../services/importExport'
import { DataStatusBadge } from '../components/discovery'
import type { Company, DataStatus } from '../types'


const STATUS_FILTERS: { value: '' | DataStatus; label: string }[] = [
  { value: '', label: 'Todas as fontes' },
  { value: 'REAL', label: '🟢 Somente reais' },
  { value: 'DEMO', label: '🔵 Somente demo' },
  { value: 'IMPORTED', label: '🟣 Importados' },
  { value: 'MANUAL', label: '⚪ Manuais' },
  { value: 'UNVERIFIED', label: '🟡 Não verificados' },
]

export default function Companies() {
  const navigate = useNavigate()
  const companies = useApp((s) => s.companies)
  const leads = useApp((s) => s.leads)
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('')
  const [category, setCategory] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | DataStatus>('')

  const [importOpen, setImportOpen] = useState(false)
  const [importName, setImportName] = useState('')
  const [importPreview, setImportPreview] = useState<{ total: number; valid: number; duplicates: number; incomplete: number } | null>(null)
  const [importCands, setImportCands] = useState<ReturnType<typeof parseImportCsv>>([])
  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmClear, setConfirmClear] = useState<'all' | 'filtered' | null>(null)

  const list = useMemo(() => {
    const q = search.trim().toLowerCase()
    return companies
      .filter((c) => {
        if (statusFilter && (c.dataStatus ?? (c.isDemo ? 'DEMO' : 'IMPORTED')) !== statusFilter) return false
        if (q && !(c.name?.toLowerCase().includes(q) ?? false)) return false
        if (city && c.city !== city) return false
        if (category && c.category !== category) return false
        return true
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [companies, search, city, category, statusFilter])

  const cities = useMemo(() => [...new Set(companies.map((c) => c.city).filter(Boolean) as string[])], [companies])
  const categories = useMemo(() => [...new Set(companies.map((c) => c.category).filter(Boolean) as string[])], [companies])

  const leadCountOf = (companyId: string) => leads.filter((l) => l.companyId === companyId).length

  function exportCompanies(format: 'csv' | 'json') {
    const rows = list.map((c) => ({
      nome: c.name,
      categoria: c.category ?? '',
      cidade: c.city ?? '',
      estado: c.state ?? '',
      telefone: c.phone ?? '',
      whatsapp: c.whatsapp ?? '',
      email: c.email ?? '',
      website: c.website ?? '',
      instagram: c.instagram ?? '',
      rating: c.rating ?? '',
      avaliacoes: c.reviewCount ?? '',
      origem: c.source ?? '',
      status_dados: c.dataStatus ?? 'DEMO',
    }))
    doExport(rows, format, `empresas-${new Date().toISOString().slice(0, 10)}.${format === 'csv' ? 'csv' : 'json'}`)
  }

  function onFileChosen(file: File) {
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const cands = parseImportCsv(text)
      setImportCands(cands)
      setImportPreview(previewImportCsv(cands))
      setImportName(file.name)
    }
    reader.readAsText(file, 'utf-8')
  }

  function confirmImport() {
    const res = importCandidates(importCands)
    setImportOpen(false)
    setImportPreview(null)
    setImportCands([])
    setImportName('')
    useApp.getState().toast('success', `Importação concluída: ${res.imported} empresas novas, ${res.skipped} ignoradas.`)
  }

  function handleClearAll() {
    useApp.getState().clearAllCompanies()
    setConfirmClear(null)
    useApp.getState().toast('success', 'Todas as empresas e leads foram removidos.')
  }

  function handleClearFiltered() {
    const s = useApp.getState()
    list.forEach((c) => s.removeCompany(c.id))
    setConfirmClear(null)
    s.toast('success', `${list.length} empresa(s) removida(s).`)
  }

  if (companies.length === 0) {
    return (
      <EmptyState
        icon="🏢"
        title="Nenhuma empresa no banco"
        subtitle="Rode uma campanha de prospecção, execute uma busca real ou carregue dados de exemplo."
      />
    )
  }


  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Empresas</h1>
          <p className="page-subtitle">{list.length} de {companies.length} empresa(s)</p>
        </div>
        <div className="page-actions">
          <Button variant="primary" onClick={() => setImportOpen(true)}>Importar CSV</Button>
          <Button variant="secondary" onClick={() => exportCompanies('csv')}>Exportar CSV</Button>
          <Button variant="secondary" onClick={() => exportCompanies('json')}>Exportar JSON</Button>
          <Button variant="danger" onClick={() => setConfirmClear('all')}>🗑️ Limpar Tudo</Button>
        </div>
      </div>

      <Card className="mb-16">
        <div className="grid grid-4">
          <Field label="Busca"><input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nome, telefone..." /></Field>
          <Field label="Cidade">
            <select className="select" value={city} onChange={(e) => setCity(e.target.value)}>
              <option value="">Todas</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Categoria">
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Todas</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Fonte de dados">
            <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as '' | DataStatus)}>
              {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </Field>
        </div>
      </Card>

      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr><th>Nome</th><th>Categoria</th><th>Cidade</th><th>WhatsApp</th><th>Site</th><th>Avaliação</th><th>Fonte</th><th>Leads</th><th>Ação</th></tr>
          </thead>
          <tbody>
            {list.map((c: Company) => {
              const n = leadCountOf(c.id)
              return (
                <tr key={c.id} className="clickable" onClick={() => navigate(`/companies/${c.id}`)}>
                  <td className="bold">{c.name}</td>
                  <td>{c.category ?? '—'}</td>
                  <td>{c.city ?? '—'}</td>
                  <td>{c.whatsapp ? '💬' : '—'}</td>
                  <td>{c.website ? <Badge variant="success">tem site</Badge> : <Badge variant="danger">sem site</Badge>}</td>
                  <td>{c.rating != null ? `⭐ ${c.rating} (${c.reviewCount ?? 0})` : '—'}</td>
                  <td><DataStatusBadge status={c.dataStatus} /></td>
                  <td><Badge variant="info">{n}</Badge></td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => { e.stopPropagation(); navigate(`/companies/${c.id}`) }}
                    >
                      👁️ Ver Detalhes
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>


      {importOpen && (
        <div className="modal-backdrop" onClick={() => setImportOpen(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <h3>Importar empresas (CSV)</h3>
            <p className="tiny muted mt-8">
              Colunas aceitas: name, category, address, city, state, phone, email, website,
              instagram, facebook, rating, review_count. Os dados importados recebem
              status <b>🔵 Importado (IMPORTED)</b>.
            </p>
            {!importPreview ? (
              <div className="mt-16">
                <input ref={fileRef} type="file" accept=".csv,.txt" className="input" onChange={(e) => e.target.files?.[0] && onFileChosen(e.target.files[0])} />
              </div>
            ) : (
              <div className="mt-16">
                <div className="alert alert-info">
                  Arquivo <b>{importName}</b> — {importPreview.total} registros encontrados
                </div>
                <div className="grid grid-3 mt-12">
                  <div className="card"><div className="tiny muted">Válidos</div><b className="text-lg">{importPreview.valid}</b> irão importar</div>
                  <div className="card"><div className="tiny muted">Duplicados</div><b className="text-lg">{importPreview.duplicates}</b> serão ignorados</div>
                  <div className="card"><div className="tiny muted">Incompletos</div><b className="text-lg">{importPreview.incomplete}</b> serão ignorados</div>
                </div>
                <div className="flex gap-10 mt-16">
                  <Button variant="secondary" onClick={() => { setImportPreview(null); setImportCands([]); setImportName('') }}>Novo arquivo</Button>
                  <Button variant="success" disabled={importPreview.valid === 0} onClick={confirmImport}>
                    Confirmar importação ({importPreview.valid})
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmação — Limpar empresas */}
      {confirmClear && (
        <div className="modal-backdrop" onClick={() => setConfirmClear(null)}>
          <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: 'var(--danger)' }}>⚠️ Confirmar exclusão</h3>
            {confirmClear === 'all' ? (
              <>
                <p className="mt-8">Isso vai remover <b>todas as {companies.length} empresas</b> e todos os leads do sistema. Essa ação não pode ser desfeita.</p>
                <p className="tiny muted mt-4">Se quiser remover apenas as empresas do filtro atual ({list.length}), use a opção abaixo.</p>
                <div className="flex col gap-8 mt-20">
                  <Button variant="danger" onClick={handleClearAll}>
                    🗑️ Sim, excluir TUDO ({companies.length} empresas)
                  </Button>
                  {list.length < companies.length && (
                    <Button variant="secondary" onClick={handleClearFiltered}>
                      Excluir apenas as filtradas ({list.length} empresas)
                    </Button>
                  )}
                  <Button variant="ghost" onClick={() => setConfirmClear(null)}>Cancelar</Button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-8">Remover <b>{list.length} empresa(s)</b> do filtro atual?</p>
                <div className="flex gap-10 mt-20">
                  <Button variant="danger" onClick={handleClearFiltered}>Sim, excluir</Button>
                  <Button variant="ghost" onClick={() => setConfirmClear(null)}>Cancelar</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}