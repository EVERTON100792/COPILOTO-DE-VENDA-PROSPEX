import React, { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'


export function Button({
  children, onClick, variant = 'primary', size, disabled, className = '', type = 'button', title, style,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline'
  size?: 'sm' | 'lg'
  disabled?: boolean
  className?: string
  type?: 'button' | 'submit'
  title?: string
  style?: React.CSSProperties
}) {
  return (
    <button
      type={type}
      title={title}
      style={style}
      className={`btn btn-${variant}${size ? ` btn-${size}` : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

export function Card({ children, className = '', title, actions, style }: { children: ReactNode; className?: string; title?: ReactNode; actions?: ReactNode; style?: React.CSSProperties }) {
  return (
    <div className={`card ${className}`} style={style}>
      {(title || actions) && (
        <div className="flex items-center justify-between mb-12">
          <div className="card-title">{title}</div>
          {actions && <div className="flex gap-8">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

export function Badge({ children, variant = 'muted', className = '' }: { children: ReactNode; variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'violet' | 'pink'; className?: string }) {
  return <span className={`badge badge-${variant} ${className}`}>{children}</span>
}

export function ScoreBadge({ score, size = 44 }: { score: number | null; size?: number }) {
  if (score === null || score === undefined) return <Badge variant="muted">Sem score</Badge>
  const color = score >= 90 ? 'var(--danger)' : score >= 75 ? 'var(--warning)' : score >= 60 ? 'var(--info)' : 'var(--muted)'
  const r = size / 2
  const circ = 2 * Math.PI * (r - 3)
  const offset = circ - (score / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`Score ${score} de 100`} role="img">
      <circle cx={r} cy={r} r={r - 3} fill="none" stroke="var(--border)" strokeWidth={4} />
      <circle
        cx={r} cy={r} r={r - 3} fill="none"
        stroke={color} strokeWidth={4} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${r} ${r})`}
      />
      <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle" fontSize={size / 4.4} fontWeight={800} fill="var(--text)">
        {score}
      </text>
    </svg>
  )
}

export function EmptyState({ icon = '📭', title, subtitle, action }: { icon?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="big-icon">{icon}</div>
      <div className="empty-state-title">{title}</div>
      {subtitle && <div className="empty-state-sub">{subtitle}</div>}
      {action && <div className="mt-8">{action}</div>}
    </div>
  )
}

export function LoadingState({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <div className="spinner" />
      <span>{label}</span>
    </div>
  )
}

export function ErrorState({ message = 'Não foi possível carregar estes dados. Tente novamente.', onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="error-state" role="alert">
      <span>⚠️</span>
      <div>
        <div className="bold">Ocorreu um erro</div>
        <div className="small mt-4">{message}</div>
        {onRetry && <Button variant="secondary" size="sm" className="mt-8" onClick={onRetry}>Tentar novamente</Button>}
      </div>
    </div>
  )
}

export function Modal({
  open, onClose, title, children, footer, wide, style
}: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean; style?: React.CSSProperties }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`modal ${wide ? 'modal-lg' : ''}`} role="dialog" aria-modal="true" aria-label={String(title)} style={style}>
        <div className="modal-head">
          <h3 className="modal-title">{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div>{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}

export function Tabs({ tabs, active, onChange }: { tabs: { id: string; label: ReactNode }[]; active: string; onChange: (id: string) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={active === t.id} className={`tab ${active === t.id ? 'active' : ''}`} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Progress({ percent, tone = 'auto' }: { percent: number; tone?: 'auto' | 'done' | 'paused' }) {
  const cls = tone === 'done' ? 'progress-fill done' : tone === 'paused' ? 'progress-fill paused' : 'progress-fill'
  return (
    <div className="progress-track" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100}>
      <div className={cls} style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
    </div>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <div className="tiny muted mt-8">{hint}</div>}
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="switch" title={label} aria-label={label}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="slider" />
    </label>
  )
}