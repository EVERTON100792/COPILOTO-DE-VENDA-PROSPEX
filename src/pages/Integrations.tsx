import { useState } from 'react'
import { useApp } from '../services/store'
import { Card, Badge, Button, Field } from '../components/ui'
import { integrationsStatus } from '../integrations/registry'
import { getDiscoveryProvider, getSavedKey, saveProviderKey, clearProviderKey } from '../discovery/registry'
import { env } from '../config/env'

export default function Integrations() {
  const settings = useApp((s) => s.settings)
  const s = useApp.getState()
  const [showKeys, setShowKeys] = useState(false)
  const [gKey, setGKey] = useState('')
  const google = getDiscoveryProvider('google-places')
  const googleConfigured = Boolean(google?.isConfigured())
  const hasSaved = Boolean(getSavedKey('google-places'))

  function saveGoogleKey() {
    if (!gKey.trim()) return
    saveProviderKey('google-places', gKey)
    setGKey('')
    s.toast('success', 'Chave do Google Places salva com segurança.')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Integrações</h1>
          <p className="page-subtitle">Status das conexões externas da plataforma</p>
        </div>
        <div className="page-actions">
          <Button variant="secondary" onClick={() => setShowKeys((v) => !v)}>
            {showKeys ? 'Ocultar chaves' : 'Mostrar valores .env'}
          </Button>
        </div>
      </div>

      <div className="grid grid-2">
        {integrationsStatus.map((i) => (
          <Card key={i.key}>
            <div className="flex justify-between mb-8">
              <div>
                <b className="small">{i.name}</b>
                <div className="tiny muted mono">{i.key}</div>
              </div>
              <Badge variant={statusVariant(i.status)}>{statusLabel(i.status)}</Badge>
            </div>
            <div className="small muted mb-8">{i.description}</div>
            <div className="small mb-8">
              Provider: <b className="mono">{i.provider ?? '—'}</b>
            </div>
            <div className="tiny">
              {i.envKeys.length > 0 ? (
                <>
                  <div className="muted mb-4">Variáveis de ambiente necessárias:</div>
                  {i.envKeys.map((k) => (
                    <div key={k} className="mono">
                      {k}={showKeys ? String(envValue(k)) : mask(envValue(k))}
                    </div>
                  ))}
                </>
              ) : (
                <div className="muted">Nenhuma chave necessária — funciona embutido.</div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-16">
        <div className="flex items-center justify-between mb-16">
          <div>
            <b>Fontes de descoberta de empresas (Discovery Providers)</b>
            <div className="small muted mt-4">
              Provedores para busca e importação de empresas reais ou demonstração.
            </div>
          </div>
          <Badge variant="success">OPENSTREETMAP ATIVO (GRÁTIS)</Badge>
        </div>
        <div className="grid grid-2 gap-16">
          <div className="card" style={{ background: 'var(--bg)' }}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <b>OpenStreetMap (Overpass API)</b>
                <div className="tiny muted">Fonte pública primária</div>
              </div>
              <Badge variant="success">🟢 DISPONÍVEL</Badge>
            </div>
            <div className="small muted mb-8">
              Busca empresas reais publicamente mapeadas via Overpass. Sem necessidade de API Key ou cartão de crédito.
            </div>
            <div className="tiny space-y-4">
              <div><b>Tipo:</b> GRÁTIS (Público)</div>
              <div><b>API Key:</b> Não necessária</div>
              <div><b>Endpoint:</b> <span className="mono">{env.overpassEndpoint}</span></div>
              <div><b>Atribuição:</b> © OpenStreetMap contributors</div>
            </div>
          </div>

          <div className="card" style={{ background: 'var(--bg)' }}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <b>Google Places API</b>
                <div className="tiny muted">Provedor opcional</div>
              </div>
              <Badge variant={googleConfigured ? 'success' : 'muted'}>
                {googleConfigured ? '🟢 CONFIGURADO' : '⚪ OPCIONAL'}
              </Badge>
            </div>
            <div className="small muted mb-8">
              Provedor opcional para busca enriquecida via Google Cloud. Requer billing e API Key configurados.
            </div>
            <div className="tiny muted mb-8">
              Chave atual: <span className="mono">{googleConfigured ? mask(googleKey()) + (hasSaved ? ' (salva localmente)' : ' (.env)') : '— não configurada'}</span>
            </div>
            {hasSaved && (
              <Button variant="danger" size="sm" className="mb-8" onClick={() => { clearProviderKey('google-places'); s.toast('info', 'Chave local removida.') }}>
                Remover chave local
              </Button>
            )}
            <Field label="Nova API Key (Google Cloud)">
              <div className="flex gap-10">
                <input type="password" className="input" value={gKey} onChange={(e) => setGKey(e.target.value)} placeholder="AIza..." />
                <Button variant="primary" size="sm" disabled={!gKey.trim()} onClick={saveGoogleKey}>Salvar</Button>
              </div>
            </Field>
          </div>
        </div>
      </Card>

      <Card className="mt-16">
        <div className="flex items-center justify-between mb-16">
          <div>
            <b>🤖 Inteligência Artificial (OpenRouter Engine)</b>
            <div className="small muted mt-4">
              Provedor opcional de IA para qualificação contextual de leads, relatórios comerciais e sugestões de abordagem.
            </div>
          </div>
          <Badge variant={settings.aiApiKey || env.aiApiKey ? 'success' : 'warning'}>
            {settings.aiApiKey || env.aiApiKey ? '🟢 IA CONFIGURADA' : '⚪ RULE-BASED (SEM IA)'}
          </Badge>
        </div>

        <div className="grid grid-2 gap-16">
          <div>
            <Field label="Modo de Inteligência Artificial">
              <select
                className="input"
                value={settings.aiMode ?? 'OPTIONAL'}
                onChange={(e) => {
                  s.saveSettings({ aiMode: e.target.value as 'DISABLED' | 'OPTIONAL' | 'REQUIRED' })
                  s.toast('success', `Modo de IA alterado para ${e.target.value}`)
                }}
              >
                <option value="OPTIONAL">OPCIONAL (Usar IA quando disponível, com fallback Rule-Based)</option>
                <option value="DISABLED">DESABILITADO (Usar 100% qualificação por regras determinísticas)</option>
                <option value="REQUIRED">OBRIGATÓRIO (Exigir IA ou falhar com aviso)</option>
              </select>
            </Field>

            <Field label="Modelo de IA (OpenRouter ID)">
              <input
                type="text"
                className="input mono"
                value={settings.aiModel ?? 'openrouter/auto'}
                onChange={(e) => s.saveSettings({ aiModel: e.target.value })}
                placeholder="openrouter/auto ou openai/gpt-4o-mini"
              />
            </Field>
          </div>

          <div>
            <Field label="API Key do OpenRouter / OpenAI">
              <div className="flex gap-10">
                <input
                  type="password"
                  className="input mono"
                  value={settings.aiApiKey ?? ''}
                  onChange={(e) => s.saveSettings({ aiApiKey: e.target.value })}
                  placeholder="sk-or-v1-..."
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    const keyToTest = settings.aiApiKey || env.aiApiKey
                    if (!keyToTest) {
                      s.toast('warning', 'Nenhuma API Key informada para testar.')
                      return
                    }
                    try {
                      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
                        headers: { Authorization: `Bearer ${keyToTest}` },
                      })
                      if (res.ok) {
                        s.toast('success', 'Conexão com OpenRouter testada e confirmada!')
                      } else {
                        s.toast('error', `Falha no teste de API Key (HTTP ${res.status}).`)
                      }
                    } catch (e) {
                      s.toast('error', `Erro de conexão com OpenRouter: ${String(e)}`)
                    }
                  }}
                >
                  Testar
                </Button>
              </div>
              <div className="tiny muted mt-4">
                Chave atual: <span className="mono">{mask(settings.aiApiKey || env.aiApiKey || '')}</span>
              </div>
            </Field>

            <div className="p-12 border rounded bg-subtle text-sm mt-12">
              ℹ️ <strong>Nota de Funcionamento:</strong> Se nenhuma chave for fornecida, o Prospex continuará funcionando perfeitamente no modo <strong>Rule-Based</strong> sem interromper o sistema nem gastar créditos.
            </div>
          </div>
        </div>
      </Card>

      <Card className="mt-16">
        <div className="flex items-center justify-between wrap gap-16">
          <div>
            <b>Modo demo</b>
            <div className="small muted mt-4">
              {settings.demoMode
                ? 'Sem chaves configuradas, os módulos usam dados DEMO fictícios e envios são simulados. Nada é enviado de verdade.'
                : 'Modo demo desativado. Sem chaves, as integrações ficam bloqueadas com registro de erro.'}
            </div>
          </div>
          <Button
            variant={settings.demoMode ? 'primary' : 'secondary'}
            onClick={() => { s.saveSettings({ demoMode: !settings.demoMode }); s.toast('success', settings.demoMode ? 'Modo demo desativado' : 'Modo demo ativado') }}
          >
            {settings.demoMode ? 'Desativar demo' : 'Ativar demo'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

function googleKey(): string {
  const key = getSavedKey('google-places') ?? (env.mapsApiKey ?? '')
  return key
}

function statusLabel(st: string): string {
  return {
    READY: 'Pronto',
    CONFIGURATION_REQUIRED: 'Configurar',
    DEMO_ONLY: 'Demo ativo',
  }[st] ?? st
}

function statusVariant(st: string): 'success' | 'warning' | 'danger' | 'muted' {
  if (st === 'READY') return 'success'
  if (st === 'CONFIGURATION_REQUIRED') return 'danger'
  return 'warning'
}

function envValue(key: string): string {
  const direct = (env as unknown as Record<string, unknown>)[key]
  if (typeof direct === 'string' && direct.length > 0) return direct
  const vite = (import.meta.env as unknown as Record<string, string>)[key]
  return vite || ''
}

function mask(v: string): string {
  if (!v) return '— não configurado'
  if (v.length <= 8) return '••••'
  return v.slice(0, 4) + '••••••' + v.slice(-4)
}