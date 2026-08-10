import { useApp } from '../services/store'
import { Card, Badge, EmptyState } from '../components/ui'
import { formatDate, formatDateTime, timeAgo } from '../lib/utils'
import { env, DEMO_MODE } from '../config/env'

const AGENTS = [
  { id: 'DiscoveryAgent', name: 'Descoberta', description: 'Encontra empresas do nicho na região-alvo (Maps/Places ou base demo).' },
  { id: 'NormalizerAgent', name: 'Normalização', description: 'Limpa e padroniza nomes, telefones, endereços e URLs.' },
  { id: 'DuplicateDetector', name: 'Detecção de duplicados', description: 'Compara nome, telefone e website para eliminar duplicados.' },
  { id: 'WebsiteAgent', name: 'Scanner de website', description: 'Verifica site, HTTPS, responsividade e sinais de desatualização.' },
  { id: 'DigitalPresenceAgent', name: 'Presença digital', description: 'Levanta Instagram, Facebook, avaliações e atividade do negócio.' },
  { id: 'BusinessAnalyst', name: 'Analista de negócio', description: 'Monta perfil: categoria, porte, maturidade digital, problemas.' },
  { id: 'ScoringAgent', name: 'Score de oportunidade', description: 'Calcula o ranking 0–100 com pesos configuráveis (Tier).' },
  { id: 'OpportunityAgent', name: 'Análise de oportunidade', description: 'Gera argumento comercial e positivo/problema/oportunidade.' },
  { id: 'CopywriterAgent', name: 'Copywriter', description: 'Cria 3 versões de mensagem (direta, consultiva, ousada) com fatos verificados.' },
  { id: 'QualityChecker', name: 'Qualidade', description: 'Valida fato/tom das mensagens e bloqueia conteúdo massivo.' },
  { id: 'AgentOrchestrator', name: 'Orquestrador', description: 'Coordena o pipeline completo e materializa os leads no CRM.' },
]

export default function Agents() {
  const runs = useApp((s) => s.agentRuns)
  const usage = useApp((s) => s.aiUsage)

  const lastRunOf = (agentId: string) => {
    const list = runs.filter((r) => r.agent === agentId)
    return list.length ? list[list.length - 1] : null
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Agentes</h1>
          <p className="page-subtitle">Pipeline de IA · {DEMO_MODE ? 'modo DEMO (templates determinísticos)' : 'produção'}</p>
        </div>
      </div>

      <div className="grid grid-3 mb-16">
        <Card className="card-hover"><div className="metric"><div className="metric-value">{runs.length}</div><div className="metric-label">Execuções total</div></div></Card>
        <Card className="card-hover"><div className="metric"><div className="metric-value">{Math.round(usage.estimatedCostUsd * 100) / 100}</div><div className="metric-label">Custo estimado (USD)</div></div></Card>
        <Card className="card-hover"><div className="metric"><div className="metric-value">{usage.tokensUsed.toLocaleString()}</div><div className="metric-label">Tokens usados</div></div></Card>
      </div>

      <div className="grid grid-2">
        {AGENTS.map((a) => {
          const last = lastRunOf(a.id)
          return (
            <Card key={a.id}>
              <div className="flex justify-between mb-8">
                <div>
                  <b className="small">{a.name}</b>
                  <div className="tiny muted mono">{a.id}</div>
                </div>
                {last && <Badge variant={runVariant(last.status)}>{runLabel(last.status)}</Badge>}
              </div>
              <div className="small muted">{a.description}</div>
              {last && (
                <div className="tiny muted mt-8">
                  {runLabel(last.status)} em {Math.round(last.durationMs)}ms · {last.retries} retries · {timeAgo(last.startedAt)}
                  {last.error && <div className="c-danger mt-4">Erro: {last.error}</div>}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {runs.length > 0 && (
        <Card title="Últimas execuções" className="mt-16">
          <div className="table-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
            <table className="data">
              <thead>
                <tr><th>Agente</th><th>Status</th><th>Duração</th><th>Retries</th><th>Início</th><th>Erro</th></tr>
              </thead>
              <tbody>
                {[...runs].reverse().slice(0, 100).map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{r.agent}</td>
                    <td><Badge variant={runVariant(r.status)}>{runLabel(r.status)}</Badge></td>
                    <td>{Math.round(r.durationMs)}ms</td>
                    <td>{r.retries}</td>
                    <td>{formatDateTime(r.startedAt)}</td>
                    <td className="small c-danger">{r.error ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {runs.length === 0 && (
        <EmptyState
          icon="🤖"
          title="Nenhuma execução ainda"
          subtitle="Rode uma campanha para ver os agentes trabalhando."
        />
      )}
    </div>
  )
}

function runLabel(s: string): string {
  return { QUEUED: 'Na fila', RUNNING: 'Rodando', SUCCESS: 'Sucesso', FAILED: 'Falhou', RETRYING: 'Tentando de novo', CANCELLED: 'Cancelado' }[s] ?? s
}

function runVariant(s: string): 'success' | 'warning' | 'danger' | 'info' | 'muted' {
  if (s === 'SUCCESS') return 'success'
  if (s === 'FAILED') return 'danger'
  if (s === 'RUNNING' || s === 'RETRYING') return 'warning'
  if (s === 'QUEUED') return 'info'
  return 'muted'
}