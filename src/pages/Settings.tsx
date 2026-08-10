import { useState } from 'react'
import { useApp } from '../services/store'
import { Card, Button, Field, Switch, Badge } from '../components/ui'
import { DEFAULT_SCORE_WEIGHTS } from '../config/defaults'
import { env, APP_VERSION } from '../config/env'
import { formatDateTime } from '../lib/utils'
import { callAI, fetchOpenCodeModels } from '../services/aiClient'
import type { ScoreWeights } from '../types'

const WEIGHT_LABELS: Record<keyof ScoreWeights, string> = {
  noWebsite: 'Sem site',
  poorWebsite: 'Site ruim',
  greatWebsite: 'Site bom',
  manyReviews: 'Muitas avaliações',
  goodRating: 'Nota alta',
  instagramActive: 'Instagram ativo',
  facebookActive: 'Facebook ativo',
  hasWhatsapp: 'Tem WhatsApp',
  hasPhone: 'Tem telefone',
  activeBusiness: 'Negócio ativo',
  incompleteData: 'Dados incompletos',
}

export default function Settings() {
  const settings = useApp((s) => s.settings)
  const audits = useApp((s) => s.audits)
  const s = useApp.getState()

  const [weights, setWeights] = useState<ScoreWeights>({ ...settings.scoreWeights })
  const [followups, setFollowups] = useState(settings.followupIntervalDays.join(', '))
  const [followMax, setFollowMax] = useState(String(settings.followupMax))
  const [cacheH, setCacheH] = useState(String(settings.cacheHours))
  const [retention, setRetention] = useState(String(settings.dataRetentionDays))

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testResult, setTestResult] = useState<string>('')
  const [apiKeyInput, setApiKeyInput] = useState(settings.aiApiKey || '')
  const [baseUrlInput, setBaseUrlInput] = useState(settings.aiBaseUrl || 'https://opencode.ai/zen/v1')
  const [modelInput, setModelInput] = useState(settings.aiModel || 'deepseek-v4-flash')
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [fetchingModels, setFetchingModels] = useState(false)

  async function handleFetchModels() {
    if (!apiKeyInput.trim()) { s.toast('error', 'Insira a chave de API primeiro.'); return }
    setFetchingModels(true)
    const list = await fetchOpenCodeModels(apiKeyInput.trim(), baseUrlInput.trim())
    setFetchingModels(false)
    if (list.length > 0) {
      setAvailableModels(list)
      s.toast('success', `${list.length} modelos encontrados!`)
    } else {
      s.toast('error', 'Não foi possível buscar modelos. Verifique a chave.')
    }
  }

  function saveWeights() {
    s.saveScoreWeights(weights)
    s.toast('success', 'Pesos de score salvos')
  }

  function saveFollowups() {
    const days = followups.split(',').map((v) => parseInt(v.trim(), 10)).filter((n) => Number.isFinite(n) && n > 0)
    if (days.length === 0) {
      s.toast('error', 'Informe ao menos um intervalo válido')
      return
    }
    s.saveSettings({ followupIntervalDays: days, followupMax: Number(followMax) || 3 })
    s.toast('success', 'Configuração de follow-ups salva')
  }

  function saveAdvanced() {
    s.saveSettings({
      cacheHours: Number(cacheH) || 24,
      dataRetentionDays: Number(retention) || 90,
    })
    s.toast('success', 'Configurações avançadas salvas')
  }

  async function handleTestAi() {
    if (!apiKeyInput.trim()) {
      s.toast('error', 'Insira uma Chave de API antes de testar.')
      return
    }
    setTestStatus('testing')
    setTestResult('')
    try {
      s.saveSettings({
        aiApiKey: apiKeyInput.trim(),
        aiBaseUrl: baseUrlInput.trim(),
        aiModel: modelInput.trim(),
      })
      const res = await callAI({
        systemPrompt: 'Você é um assistente de teste de conexão.',
        userMessage: 'Responda apenas: Conexão bem-sucedida!',
      })
      setTestStatus('success')
      setTestResult(res)
      s.toast('success', 'Conexão com a IA estabelecida com sucesso!')
    } catch (err: any) {
      setTestStatus('error')
      setTestResult(err?.message || 'Erro desconhecido ao conectar com a API.')
      s.toast('error', 'Falha na conexão com a IA.')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-subtitle">Score, limites, follow-ups, modo demo e integração de IA</p>
        </div>
      </div>

      <div className="grid grid-2">
        <Card title="Pesos do score de oportunidade">
          <div className="flex col gap-8">
            {(Object.keys(WEIGHT_LABELS) as (keyof ScoreWeights)[]).map((k) => (
              <div key={k} className="flex items-center justify-between gap-16">
                <span className="small">{WEIGHT_LABELS[k]}</span>
                <input
                  type="number"
                  className="input"
                  style={{ width: 90 }}
                  min={-20}
                  max={40}
                  value={weights[k]}
                  onChange={(e) => { const v = Number(e.target.value); setWeights({ ...weights, [k]: Number.isFinite(v) ? v : 0 }) }}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-8 mt-16">
            <Button variant="primary" onClick={saveWeights}>Salvar pesos</Button>
            <Button variant="secondary" onClick={() => setWeights({ ...DEFAULT_SCORE_WEIGHTS })}>Restaurar padrão</Button>
          </div>
        </Card>

        <div className="flex col gap-16">
          <Card title="Follow-ups automáticos">
            <div className="flex col gap-12">
              <Field label="Intervalos em dias (separados por vírgula)" hint="Ex.: 2, 5, 10">
                <input className="input" value={followups} onChange={(e) => setFollowups(e.target.value)} />
              </Field>
              <Field label="Máximo de follow-ups por lead">
                <input type="number" className="input" min={1} max={10} value={followMax} onChange={(e) => setFollowMax(e.target.value)} />
              </Field>
              <Button variant="secondary" onClick={saveFollowups}>Salvar follow-ups</Button>
            </div>
          </Card>

          <Card title="Modo demo e privacidade">
            <div className="flex col gap-12">
              <div className="flex items-center justify-between">
                <div>
                  <b className="small">Modo demo</b>
                  <div className="tiny muted">Usa dados fictícios e simula envios — nada sai do navegador.</div>
                </div>
                <Switch checked={settings.demoMode} onChange={(v) => { s.saveSettings({ demoMode: v }); s.toast('success', v ? 'Modo demo ativado' : 'Modo demo desativado') }} />
              </div>
              <div className="flex justify-between">
                <span className="small">Interruptor mestre</span>
                <Badge variant={settings.masterSwitch === 'ON' ? 'success' : settings.masterSwitch === 'PAUSED' ? 'warning' : 'danger'}>{settings.masterSwitch}</Badge>
              </div>
              <div className="small muted">Idioma: {settings.language} · Empresa: {settings.companyName}</div>
            </div>
          </Card>

          {/* 
          <Card title="🤖 IA de Vendas — OpenCode Go / DeepSeek">
            <div className="flex col gap-12">
              <div style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.08)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)', fontSize: 13 }}>
                Suporte a <b>OpenCode Go</b> (DeepSeek V4 Flash/Pro), <b>OpenRouter</b> e qualquer API compatível com OpenAI.<br />
                Sua chave <b>sk-Ij7Pnh4...</b> é do OpenCode Go — use o endpoint abaixo.
              </div>

              <Field label="Chave de API (sk-...)">
                <input
                  type="password"
                  className="input"
                  placeholder="sk-..."
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  onBlur={() => s.saveSettings({ aiApiKey: apiKeyInput.trim() })}
                />
              </Field>

              <Field label="URL Base da API" hint="Escolha abaixo ou escreva manualmente">
                <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                  <button className="btn btn-ghost btn-xs" onClick={() => {
                    const url = 'https://opencode.ai/zen/v1'
                    setBaseUrlInput(url)
                    s.saveSettings({ aiBaseUrl: url })
                  }}>💡 OpenCode Zen</button>
                  <button className="btn btn-ghost btn-xs" onClick={() => {
                    const url = 'https://opencode.ai/zen/go/v1'
                    setBaseUrlInput(url)
                    s.saveSettings({ aiBaseUrl: url })
                  }}>🚀 OpenCode Go</button>
                  <button className="btn btn-ghost btn-xs" onClick={() => {
                    const url = 'https://openrouter.ai/api/v1'
                    setBaseUrlInput(url)
                    s.saveSettings({ aiBaseUrl: url })
                  }}>🔵 OpenRouter</button>
                  <button className="btn btn-ghost btn-xs" onClick={() => {
                    const url = 'https://api.openai.com/v1'
                    setBaseUrlInput(url)
                    s.saveSettings({ aiBaseUrl: url })
                  }}>🤖 OpenAI</button>
                  <button className="btn btn-ghost btn-xs" style={{ color: 'var(--primary)' }} onClick={() => {
                    const url = 'https://generativelanguage.googleapis.com/v1beta/openai'
                    setBaseUrlInput(url)
                    s.saveSettings({ aiBaseUrl: url })
                  }}>✨ Google Gemini (Grátis)</button>
                </div>
                <input
                  className="input"
                  placeholder="https://opencode.ai/zen/v1"
                  value={baseUrlInput}
                  onChange={(e) => setBaseUrlInput(e.target.value)}
                  onBlur={() => s.saveSettings({ aiBaseUrl: baseUrlInput.trim() })}
                />
              </Field>

              <Field label="Modelo">
                <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    className="btn btn-ghost btn-xs"
                    style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
                    onClick={handleFetchModels}
                    disabled={fetchingModels}
                  >
                    {fetchingModels ? '⏳ Buscando...' : '🔍 Buscar modelos da minha conta'}
                  </button>
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Modelos OpenCode:</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                  {(availableModels.length > 0 ? availableModels.slice(0, 10) : [
                    'grok-4.5',
                    'qwen3.8-max',
                    'deepseek-v4-pro',
                    'deepseek-v4-flash',
                    'kimi-k3',
                    'gpt-5.6-luna',
                    'glm-5.2',
                    'mimo-v2.5',
                    'minimax-m3',
                    'hy3'
                  ]).map(m => (<button key={m} className="btn btn-ghost btn-xs" onClick={() => {
                      setModelInput(m)
                      s.saveSettings({ aiModel: m })
                    }}>{m}</button>
                  ))}
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Modelos OpenRouter:</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                  {[
                    'google/gemini-2.0-flash-exp:free',
                    'meta-llama/llama-3-8b-instruct:free',
                    'anthropic/claude-3-haiku',
                    'openai/gpt-4o-mini',
                    'deepseek/deepseek-chat'
                  ].map(m => (<button key={m} className="btn btn-ghost btn-xs" onClick={() => {
                      setModelInput(m)
                      s.saveSettings({ aiModel: m })
                    }}>{m}</button>
                  ))}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6 }}>Modelos Google Gemini (Grátis):</div>
                <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                  {[
                    'gemini-1.5-flash',
                    'gemini-2.0-flash-exp'
                  ].map(m => (<button key={m} className="btn btn-ghost btn-xs" onClick={() => {
                      setModelInput(m)
                      s.saveSettings({ aiModel: m })
                    }}>{m}</button>
                  ))}
                </div>
                <input
                  className="input"
                  placeholder="deepseek-v4-flash"
                  value={modelInput}
                  onChange={(e) => setModelInput(e.target.value)}
                  onBlur={() => s.saveSettings({ aiModel: modelInput.trim() })}
                />
              </Field>

              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="primary"
                  onClick={handleTestAi}
                  disabled={testStatus === 'testing'}
                >
                  {testStatus === 'testing' ? '⏳ Testando...' : '🧪 Testar Conexão com IA'}
                </Button>
                <Badge variant={settings.aiApiKey ? 'success' : 'muted'}>
                  {settings.aiApiKey ? '✓ IA Ativa' : 'Modo Fallback Humano'}
                </Badge>
              </div>

              {testStatus === 'success' && (
                <div style={{ padding: 12, borderRadius: 8, background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', fontSize: 13 }}>
                  <b>✅ Conexão OK!</b><br />
                  <span className="tiny">{testResult}</span>
                </div>
              )}

              {testStatus === 'error' && (
                <div style={{ padding: 12, borderRadius: 8, background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: 13 }}>
                  <b>❌ Falha na Conexão:</b><br />
                  <span className="tiny">{testResult}</span>
                </div>
              )}

              <div className="tiny muted">Se a API falhar, o sistema usa automaticamente o Motor Humano de Vendas (sem IA).</div>
            </div>
          </Card>
          */}
        </div>
      </div>


      <Card title="Avançado" className="mt-16">
        <div className="grid grid-3 gap-16">
          <Field label="Cache de dados (horas)"><input type="number" className="input" value={cacheH} onChange={(e) => setCacheH(e.target.value)} /></Field>
          <Field label="Retenção de dados (dias)"><input type="number" className="input" value={retention} onChange={(e) => setRetention(e.target.value)} /></Field>
        </div>
        <div className="flex gap-8 mt-12">
          <Button variant="secondary" onClick={saveAdvanced}>Salvar avançado</Button>
          <Button variant="danger" onClick={() => { if (confirm('Resetar todos os dados locais? Esta ação não pode ser desfeita.')) { s.resetAll(); location.reload() } }}>Resetar tudo</Button>
        </div>
      </Card>

      <Card title="Auditoria (últimas ações)" className="mt-16">
        {audits.length === 0 ? (
          <div className="muted small">Sem registros ainda.</div>
        ) : (
          <div className="table-wrap" style={{ maxHeight: 320, overflowY: 'auto' }}>
            <table className="data">
              <thead>
                <tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Entidade</th><th>De</th><th>→</th></tr>
              </thead>
              <tbody>
                {[...audits].reverse().slice(0, 50).map((a) => (
                  <tr key={a.id}>
                    <td className="tiny muted">{formatDateTime(a.createdAt)}</td>
                    <td>{a.actor}</td>
                    <td className="mono small">{a.action}</td>
                    <td className="small">{a.entity}</td>
                    <td className="tiny muted">{a.oldValue ?? '—'}</td>
                    <td className="tiny muted">{a.newValue ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="tiny muted mt-16">
        PROSPEX AUTOPILOT v{APP_VERSION} · ambiente: {env.demoMode ? 'demo' : 'produção'}
      </div>
    </div>
  )
}