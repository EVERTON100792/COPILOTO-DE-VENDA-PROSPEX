import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../services/store'
import { Card, Badge } from '../components/ui'
import { PIPELINE_ORDER, STATUS_COLORS, LEAD_STATUS_LABELS } from '../config/defaults'
import { changeLeadStatus } from '../services/crm'
import type { Lead, LeadStatus } from '../types'

const COLUMN_COLORS: Record<LeadStatus, string> = STATUS_COLORS

export default function Kanban() {
  const navigate = useNavigate()
  const leads = useApp((s) => s.leads)
  const companies = useApp((s) => s.companies)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overCol, setOverCol] = useState<LeadStatus | null>(null)

  const byStatus = new Map<LeadStatus, typeof leads>()
  for (const st of PIPELINE_ORDER) byStatus.set(st, [])
  for (const l of leads) {
    const arr = byStatus.get(l.status)
    if (arr) arr.push(l)
  }

  const companyOf = (id: string) => companies.find((c) => c.id === id)

  function drop(status: LeadStatus) {
    if (dragId) {
      changeLeadStatus(dragId, status)
      setDragId(null)
      setOverCol(null)
      useApp.getState().toast('success', `Movido para ${LEAD_STATUS_LABELS[status]}`)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Funil / Pipeline</h1>
          <p className="page-subtitle">Arraste os cards entre as fases para atualizar o status</p>
        </div>
      </div>

      <div className="kanban-board">
        {PIPELINE_ORDER.map((st) => {
          const list = byStatus.get(st) ?? []
          return (
            <div
              key={st}
              className={`kanban-col${overCol === st ? ' over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setOverCol(st) }}
              onDragLeave={() => setOverCol((c) => (c === st ? null : c))}
              onDrop={() => drop(st)}
            >
              <div className="kanban-col-head" style={{ borderColor: STATUS_COLORS[st] }}>
                <span className="dot" style={{ background: STATUS_COLORS[st] }} />
                <b className="small">{LEAD_STATUS_LABELS[st]}</b>
                <span className="tiny muted">{list.length}</span>
              </div>
              <div className="kanban-col-body">
                {list.map((l) => {
                  const c = companyOf(l.companyId)
                  return (
                    <div
                      key={l.id}
                      className={`kanban-card${dragId === l.id ? ' dragging' : ''}`}
                      draggable
                      onDragStart={() => setDragId(l.id)}
                      onDragEnd={() => { setDragId(null); setOverCol(null) }}
                      onClick={() => navigate(`/leads/${l.id}`)}
                    >
                      <div className="flex justify-between mb-4">
                        <span className="small bold">{c?.name ?? '—'}</span>
                        {l.score != null && <Badge variant={scoreVariant(l.score)}>{l.score}</Badge>}
                      </div>
                      <div className="tiny muted">{c?.city ?? ''}{c?.city && c?.state ? `/${c.state}` : ''}</div>
                      <div className="tiny muted">
                        {l.hasWhatsapp ? '💬' : ''} {l.hasInstagram ? '📸' : ''} {l.websiteStatus === 'NO_WEBSITE' ? '🚫site' : ''}
                      </div>
                    </div>
                  )
                })}
                {list.length === 0 && <div className="kanban-empty">—</div>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function scoreVariant(score: number): 'success' | 'warning' | 'danger' | 'info' | 'muted' {
  if (score >= 90) return 'danger'
  if (score >= 75) return 'warning'
  if (score >= 60) return 'info'
  return 'muted'
}