export function BarChart({ data, height = 150, color }: { data: { label: string; value: number; [k: string]: string | number }[]; height?: number; color?: string }) {
  const max = Math.max(1, ...data.map((d) => Number(d.value)))
  return (
    <div className="chart-bars" style={{ height }} aria-label="Gráfico de barras">
      {data.map((d, i) => (
        <div className="chart-bar-wrap" key={i} title={`${d.label}: ${d.value}`}>
          <div
            className="chart-bar"
            style={{ height: `${Math.max(4, (Number(d.value) / max) * 100)}%`, background: color ?? undefined }}
          />
          <div className="chart-bar-label">{String(d.label)}</div>
        </div>
      ))}
    </div>
  )
}

export function Funnel({ steps }: { steps: { label: string; count: number }[] }) {
  const max = Math.max(1, ...steps.map((s) => s.count))
  return (
    <div>
      {steps.map((s, i) => (
        <div className="funnel-step" key={i}>
          <div className="funnel-bar" style={{ maxWidth: `${Math.max(10, (s.count / max) * 100)}%`, minWidth: 60 }}>
            {s.label}
          </div>
          <div className="funnel-count">{s.count}</div>
        </div>
      ))}
      {steps.every((s) => s.count === 0) && <div className="muted small">Dados insuficientes</div>}
    </div>
  )
}

export function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = Math.max(1, segments.reduce((a, s) => a + s.value, 0))
  let acc = 0
  const R = 42
  const C = 2 * Math.PI * R
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <svg width={120} height={120} viewBox="0 0 120 120" role="img" aria-label="Gráfico de rosca">
        <g transform="rotate(-90 60 60)">
          {segments.map((s, i) => {
            const frac = s.value / total
            const dash = frac * C
            const el = (
              <circle
                key={i}
                cx={60} cy={60} r={R} fill="none"
                stroke={s.color} strokeWidth={14}
                strokeDasharray={`${dash} ${C - dash}`}
                strokeDashoffset={-acc * C / 1}
              />
            )
            acc += frac
            return el
          })}
        </g>
        <circle cx={60} cy={60} r={26} fill="var(--surface)" />
        <text x="60" y="65" textAnchor="middle" fill="var(--text)" fontSize={18} fontWeight={800}>{total}</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-8 small">
            <span className="dot" style={{ background: s.color }} />
            <span className="muted">{s.label}</span>
            <b>{s.value}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Sparkline({ values, color = 'var(--primary)' }: { values: number[]; color?: string }) {
  const w = 120
  const h = 32
  if (values.length < 2) return <span className="muted tiny">Dados insuficientes</span>
  const max = Math.max(1, ...values)
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w
    const y = h - (v / max) * (h - 4) - 2
    return `${x},${y}`
  })
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </svg>
  )
}