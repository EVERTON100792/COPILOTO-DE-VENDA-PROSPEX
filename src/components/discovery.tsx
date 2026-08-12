/**
 * Componentes de UI do Real Discovery (Fase 2).
 * DataStatusBadge, SourceBadge, CompanySourcePanel, DiscoveryProgress, DiscoveryRunCard.
 */

import { useState } from 'react'
import type { Company, DataStatus, DiscoveryRun } from '../types'
import { DATA_STATUS_LABELS } from '../config/defaults'
import { formatDateTime } from '../lib/utils'
import { useApp } from '../services/store'

const STATUS_VARIANT: Record<DataStatus, 'success' | 'info' | 'secondary' | 'warning' | 'muted'> = {
  REAL: 'success',
  DEMO: 'info',
  IMPORTED: 'secondary',
  MANUAL: 'muted',
  UNVERIFIED: 'warning',
}

export function DataStatusBadge({ status }: { status: DataStatus | null | undefined }) {
  const s = status ?? 'DEMO'
  const meta = DATA_STATUS_LABELS[s]
  return (
    <span className={`badge badge-${STATUS_VARIANT[s]}`} title={`Fonte de dados: ${meta.label}`}>
      {meta.icon} {meta.label}
    </span>
  )
}

export function SourceBadge({ company }: { company: Company | undefined }) {
  if (!company?.source) return <span className="tiny muted">Sem fonte informada</span>
  return <span className="tiny">{company.source}</span>
}

export function ConfidenceTag({ confidence }: { confidence: Company['discoveryConfidence'] }) {
  if (!confidence) return null
  const label = confidence === 'HIGH' ? 'Alta' : confidence === 'MEDIUM' ? 'Média' : 'Baixa'
  const color = confidence === 'HIGH' ? 'var(--success)' : confidence === 'MEDIUM' ? 'var(--warning)' : 'var(--muted)'
  return (
    <span className="tiny" style={{ color }}>
      Confiança: {label}
    </span>
  )
}

export function CompanySourcePanel({ company }: { company: Company | undefined }) {
  const s = useApp.getState()
  const raw = company?.rawDataId
    ? s.discoveryResults.find((r) => r.id === company.rawDataId)
    : undefined
  const [showRaw, setShowRaw] = useState(false)

  if (!company) return null
  return (
    <div className="card" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center justify-between">
        <h3 className="mb-8">Fonte dos dados</h3>
        <DataStatusBadge status={company.dataStatus} />
      </div>
      <div>
        <div className="kv">
          <dt>Fonte</dt><dd>{company.source ?? '—'}</dd>
        </div>
        <div className="kv">
          <dt>Obtido em</dt><dd>{company.retrievedAt ? formatDateTime(company.retrievedAt) : '—'}</dd>
        </div>
        <div className="kv">
          <dt>Última atualização</dt><dd>{company.lastVerifiedAt ? formatDateTime(company.lastVerifiedAt) : '—'}</dd>
        </div>
        <div className="kv">
          <dt>Confiança</dt><dd><ConfidenceTag confidence={company.discoveryConfidence} /></dd>
        </div>
        {company.sourceUrl && (
          <div className="kv">
            <dt>Link da fonte</dt><dd><a href={company.sourceUrl} target="_blank" rel="noreferrer" className="link">Abrir fonte ↗</a></dd>
          </div>
        )}
        {company.confidenceReasons && company.confidenceReasons.length > 0 && (
          <div className="kv">
            <dt>Motivos</dt><dd>{company.confidenceReasons.join(' · ')}</dd>
          </div>
        )}
      </div>
      {raw && (
        <details style={{ marginTop: 8 }}>
          <summary className="tiny link-btn" style={{ cursor: 'pointer' }}>Ver dados originais</summary>
          <pre className="tiny mt-8" style={{ maxHeight: 260, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {JSON.stringify(raw.rawPayload, null, 2)}
          </pre>
        </details>
      )}
    </div>
  )
}

export function DiscoveryProgress({ run }: { run: DiscoveryRun | null }) {
  if (!run) return null
  const total = Math.max(1, run.requestedLimit)
  const done = run.newCount + run.duplicateCount
  const pct = Math.min(100, Math.round((done / total) * 100))
  return (
    <div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="progress-labels">
        <div className="progress-label">Encontradas: <b>{run.foundCount}</b></div>
        <div className="progress-label">Novas: <b>{run.newCount}</b></div>
        <div className="progress-label">Duplicadas: <b>{run.duplicateCount}</b></div>
        <div className="progress-label">Erros: <b>{run.errorCount}</b></div>
      </div>
    </div>
  )
}

const RUN_STATUS_LABEL: Record<DiscoveryRun['status'], string> = {
  QUEUED: 'Na fila',
  RUNNING: 'Buscando…',
  COMPLETED: 'Concluída',
  PARTIAL: 'Parcial (com erros)',
  FAILED: 'Falhou',
  CANCELLED: 'Cancelada',
}

export function DiscoveryRunCard({ run }: { run: DiscoveryRun }) {
  const s = useApp.getState()
  const statusColor =
    run.status === 'COMPLETED' ? 'var(--success)'
    : run.status === 'FAILED' || run.status === 'CANCELLED' ? 'var(--danger)'
    : run.status === 'PARTIAL' ? 'var(--warning)'
    : 'var(--info)'

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <b>{run.query}</b> <span className="tiny muted">{run.location}</span>
        </div>
        <span className="badge" style={{ color: statusColor, borderColor: statusColor }}>
          {RUN_STATUS_LABEL[run.status]}
        </span>
      </div>
      <div className="tiny muted mt-8">
        Fonte: {run.provider} · Modo: {run.mode} · Início: {formatDateTime(run.startedAt)}
      </div>
      {run.status === 'RUNNING' && (
        <div className="mt-8">
          <DiscoveryProgress run={run} />
          <button className="btn btn-secondary btn-sm mt-8" onClick={() => { /* cancel */ }}>
            Cancelar
          </button>
        </div>
      )}
      <div className="grid grid-5 mt-8">
        <div className="tiny">Encontradas: <b>{run.foundCount}</b></div>
        <div className="tiny">Novas: <b>{run.newCount}</b></div>
        <div className="tiny">Duplicadas: <b>{run.duplicateCount}</b></div>
        <div className="tiny">Erros: <b>{run.errorCount}</b></div>
        <div className="tiny">Limite: <b>{run.requestedLimit}</b></div>
      </div>
      {run.errorMessage && (
        <div className="alert alert-warning mt-8">
          ⚠️ {run.errorMessage}
        </div>
      )}
    </div>
  )
}