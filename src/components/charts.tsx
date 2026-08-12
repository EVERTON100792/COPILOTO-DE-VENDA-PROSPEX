import { AreaChart, Area, BarChart as RBarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts'

export function Funnel({ steps }: { steps: { label: string; count: number }[] }) {
  if (steps.every(s => s.count === 0)) return <div className="muted small text-center p-8">Dados insuficientes</div>
  
  // Para um funnel chart no Recharts, o AreaChart deitado ou em pé com preenchimento fica muito moderno.
  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={steps} layout="vertical" margin={{ top: 10, right: 30, left: 30, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="1" y2="0">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.2}/>
            </linearGradient>
          </defs>
          <XAxis type="number" hide />
          <YAxis dataKey="label" type="category" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} width={120} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{ backgroundColor: 'rgba(10,10,12,0.8)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff' }}
          />
          <Area type="monotone" dataKey="count" stroke="var(--primary)" fillOpacity={1} fill="url(#colorCount)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function BarChart({ data, color = 'var(--primary)' }: { data: { label: string; value: number }[]; color?: string }) {
  if (data.every(s => s.value === 0)) return <div className="muted small text-center p-8">Dados insuficientes</div>
  return (
    <div style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart data={data} margin={{ top: 20, right: 20, left: -20, bottom: 20 }}>
          <defs>
            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={1} />
              <stop offset="100%" stopColor={color} stopOpacity={0.6} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 11 }} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{ backgroundColor: 'rgba(10,10,12,0.8)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff', boxShadow: '0 0 20px rgba(0,0,0,0.5)' }}
          />
          <Bar dataKey="value" fill="url(#barGrad)" radius={[6, 6, 0, 0]} barSize={30} />
        </RBarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((a, s) => a + s.value, 0)
  if (total === 0) return <div className="muted small text-center p-8">Sem leads para exibir</div>
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 280 }}>
      <div style={{ width: '50%', height: '100%', position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              cx="50%" cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
              stroke="none"
            >
              {segments.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: `drop-shadow(0px 0px 8px ${entry.color}88)` }} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(10,10,12,0.8)', border: '1px solid var(--border)', borderRadius: 8, color: '#fff' }}
              itemStyle={{ color: '#fff' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>{total}</div>
          <div className="tiny muted">Leads</div>
        </div>
      </div>
      
      <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 10 }}>
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-8 small">
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
            <span className="muted flex-1">{s.label}</span>
            <b style={{ color: 'var(--text)' }}>{s.value}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Sparkline({ values, color = 'var(--primary)' }: { values: number[]; color?: string }) {
  if (values.length < 2) return <span className="muted tiny">N/A</span>
  const data = values.map((v, i) => ({ index: i, value: v }))
  return (
    <div style={{ width: 80, height: 30 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={true} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}