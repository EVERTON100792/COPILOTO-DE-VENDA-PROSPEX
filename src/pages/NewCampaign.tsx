import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useApp } from '../services/store'
import { Button, Card, Field } from '../components/ui'
import { NICHES, CITIES_BY_STATE, STATES_BR } from '../config/defaults'
import { defaultNicheOffer, getNicheDna, NICHE_ICONS } from '../config/niches'
import { uid, nowIso } from '../lib/utils'
import { AgentOrchestrator } from '../agents/Orchestrator'
import { DiscoveryService } from '../discovery/engine'
import { createDiscoveryProviders, getAvailableRealProviders, getRecommendedRealProvider, getSavedKey, tierLabel } from '../discovery/registry'
import { OSM_ATTRIBUTION } from '../discovery/providers/openStreetMap'
import type { AgentContext, PipelineProgress } from '../agents/types'
import type { Campaign, Offer, DiscoveryMode } from '../types'

const STEPS = ['Segmento', 'Localização', 'Quantidade', 'Critérios', 'Fonte', 'Modo', 'Oferta', 'Mensagem', 'Revisão']

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="checkbox-row">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

export default function NewCampaign() {
  const navigate = useNavigate()
  const s = useApp()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [niche, setNiche] = useState(NICHES[0])
  const [customNiche, setCustomNiche] = useState('')
  const [city, setCity] = useState('Londrina')
  const [state, setState] = useState('PR')
  const [quantity, setQuantity] = useState(100)
  const [keywords, setKeywords] = useState('')
  const [criteria, setCriteria] = useState({ onlyNoWebsite: false, onlyWithWhatsapp: false, onlyWithInstagram: false, minScore: 0, minReviews: 0, minRating: 0 })
  const [offer, setOffer] = useState<Offer>(defaultNicheOffer(NICHES[0]))
  const [messagePrompt, setMessagePrompt] = useState('')
  const [source, setSource] = useState(() => getRecommendedRealProvider()?.id ?? 'openstreetmap')
  const [mode, setMode] = useState<DiscoveryMode>('REAL')
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<PipelineProgress | null>(null)
  const [runInfo, setRunInfo] = useState<{ step: string; detail: string; found: number; added: number; duplicates: number; errors: number } | null>(null)
  const [realBlocked, setRealBlocked] = useState(false)

  const providers = createDiscoveryProviders()
  const selectedProvider = providers.find((p) => p.id === source) ?? providers[0]
  const realConfigured = selectedProvider.tier !== 'demo' && (!selectedProvider.needsConfig || selectedProvider.isConfigured())

  const nicheName = customNiche.trim() || niche
  const selectedDna = getNicheDna(nicheName)
  const cities = CITIES_BY_STATE[state] ?? []

  const valid =
    step === 0 ? Boolean(nicheName)
    : step === 1 ? Boolean(city && state)
    : step === 2 ? quantity >= 1
    : step === 3 ? true
    : step === 4 ? Boolean(source)
    : step === 5 ? true
    : step === 6 ? Boolean(offer.product && offer.price >= 0)
    : step === 7 ? true
    : Boolean(name)

  const criteriaSummary = (): string => {
    const parts: string[] = []
    if (criteria.onlyNoWebsite) parts.push('sem site')
    if (criteria.onlyWithWhatsapp) parts.push('com WhatsApp')
    if (criteria.onlyWithInstagram) parts.push('com Instagram')
    if (criteria.minScore > 0) parts.push(`score ≥ ${criteria.minScore}`)
    if (criteria.minReviews > 0) parts.push(`≥ ${criteria.minReviews} avaliações`)
    if (criteria.minRating > 0) parts.push(`nota ≥ ${criteria.minRating}`)
    return parts.length ? parts.join(', ') : 'Sem restrições'
  }

  const buildCampaign = (): Campaign => {
    const finalName = name.trim() || `${nicheName} ${city}`
    return {
      id: uid('cmpn'),
      workspaceId: s.workspaceId,
      name: finalName,
      niche: nicheName,
      city,
      state,
      country: 'BR',
      quantity,
      keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      criteria,
      offer,
      messagePrompt,
      status: 'RUNNING',
      progress: 2,
      stats: { discovered: 0, analyzed: 0, noWebsite: 0, qualified: 0, duplicatesRemoved: 0, contacted: 0, replied: 0 },
      startedAt: nowIso(),
      finishedAt: null,
      createdAt: nowIso(),
    }
  }

  function chooseMode(m: DiscoveryMode) {
    setMode(m)
    if (m === 'REAL') {
      const recommended = getRecommendedRealProvider()
      const current = providers.find((p) => p.id === source)
      if (recommended && (!current || current.tier === 'demo' || (current.needsConfig && !current.isConfigured()))) {
        setSource(recommended.id)
        s.toast('info', `Fonte recomendada para modo REAL: ${recommended.name} (${tierLabel(recommended.tier)}).`)
      }
    }
  }

  const handleStart = () => {
    if (mode === 'REAL' && selectedProvider.tier === 'demo') {
      setRealBlocked(true)
      return
    }
    if (mode === 'REAL' && selectedProvider.needsConfig && !selectedProvider.isConfigured()) {
      setRealBlocked(true)
      return
    }
    void startCampaign()
  }

  async function startCampaign(): Promise<void> {
    setRunning(true)
    const campaign = buildCampaign()
    s.upsertCampaign(campaign)
    const settings = s.settings

    if (mode === 'DEMO') {
      const ctx: AgentContext = {
        workspaceId: s.workspaceId,
        demoMode: settings.demoMode,
        nicheDna: selectedDna,
        campaign,
        settings,
      }
      const orchestrator = new AgentOrchestrator(ctx)
      const result = await orchestrator.runPipeline({
        campaign,
        onProgress: setProgress,
      })
      const finished: Campaign = {
        ...campaign,
        status: result.errors.length > 0 ? 'FAILED' : 'FINISHED',
        progress: 100,
        finishedAt: nowIso(),
        stats: { ...campaign.stats, ...result.stats },
      }
      s.upsertCampaign(finished)
      s.toast(result.errors.length > 0 ? 'warning' : 'success', result.errors.length > 0 ? 'Campanha finalizada com pendências.' : `Campanha concluída: ${result.leads.length} leads no CRM`)
      s.addNotification({
        type: 'CAMPAIGN_FINISHED',
        title: 'Campanha finalizada',
        message: `${campaign.name} — ${result.leads.length} leads encontrados, ${result.stats.qualified} qualificados.`,
        leadId: null,
      })
      navigate(`/campaigns/${campaign.id}`)
      return
    }

    // REAL / HYBRID: busca real (identificada)
    const activeProvider = (selectedProvider.tier !== 'demo' && (!selectedProvider.needsConfig || selectedProvider.isConfigured()))
      ? selectedProvider
      : getRecommendedRealProvider()
    const useReal = mode === 'REAL' || (mode === 'HYBRID' && Boolean(activeProvider))
    const providerId = useReal && activeProvider ? activeProvider.id : (selectedProvider?.id ?? 'mock')

    const engine = new DiscoveryService()
    const run = await engine.run(
      {
        segment: nicheName,
        city,
        state,
        country: 'BR',
        limit: quantity,
        mode: useReal ? 'REAL' : 'DEMO',
        providerId,
      },
      {
        campaignId: campaign.id,
        onTick: (tick, r) => {
          setRunInfo({ step: tick.step, detail: tick.detail, found: r.foundCount, added: r.newCount, duplicates: r.duplicateCount, errors: r.errorCount })
          s.upsertCampaign({ ...campaign, progress: Math.round(Math.min(99, ((r.newCount + r.duplicateCount) / Math.max(1, quantity)) * 100)) })
        },
      }
    )

    const finished: Campaign = {
      ...campaign,
      status: run.status === 'COMPLETED' ? 'FINISHED' : run.status === 'PARTIAL' ? 'FINISHED' : 'FAILED',
      progress: 100,
      finishedAt: nowIso(),
      stats: { ...campaign.stats, discovered: run.foundCount, analyzed: run.newCount, qualified: 0, duplicatesRemoved: run.duplicateCount },
    }
    s.upsertCampaign(finished)
    if (run.status === 'FAILED') {
      s.toast('warning', run.errorMessage ?? 'Execução falhou.')
      setRunning(false)
      navigate(`/campaigns/${campaign.id}`)
      return
    }
    s.toast(run.status === 'PARTIAL' ? 'warning' : 'success', `${run.newCount} empresas novas (${run.mode}). Veja as execuções em Busca de empresas.`)
    s.addNotification({
      type: 'CAMPAIGN_FINISHED',
      title: 'Busca real concluída',
      message: `${campaign.name} — ${run.newCount} empresas novas, ${run.duplicateCount} duplicadas, ${run.errorCount} erros.`,
      leadId: null,
    })
    navigate(`/campaigns/${campaign.id}`)
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Nova campanha</h1>
          <p className="page-subtitle">Configure e inicie uma prospecção (demo ou real)</p>
        </div>
        <div className="page-actions">
          <Link to="/campaigns" className="btn btn-secondary">← Voltar</Link>
        </div>
      </div>

      <Card>
        <div className="wizard-steps" aria-label="Etapas do assistente">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={`wizard-step ${i < step ? 'done' : i === step ? 'current' : ''}`}
              title={label}
              style={{ cursor: 'pointer' }}
              onClick={() => !running && i < step && setStep(i)}
            />
          ))}
        </div>

        {running ? (
          <div role="status" aria-live="polite">
            {mode === 'DEMO' ? (
              <>
                <h3>Executando pipeline de agentes...</h3>
                <div className="progress-track mt-12">
                  <div className="progress-fill" style={{ width: `${progress?.percent ?? 5}%` }} />
                </div>
                <div className="progress-labels">
                  <div className="progress-label"><b>{progress?.step ?? 'INICIANDO'}</b> — {progress?.detail ?? 'Preparando agentes...'}</div>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px 20px', position: 'relative', overflow: 'hidden', borderRadius: 16, background: 'linear-gradient(180deg, rgba(99, 102, 241, 0.03) 0%, rgba(99, 102, 241, 0.08) 100%)', border: '1px solid rgba(99, 102, 241, 0.15)', marginBottom: 24, boxShadow: 'inset 0 0 40px rgba(99, 102, 241, 0.05)' }}>
                <style>{`
                  @keyframes pingSlow {
                    0% { transform: scale(0.8); opacity: 0.8; }
                    100% { transform: scale(2.5); opacity: 0; }
                  }
                  @keyframes pulseGlow {
                    0%, 100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 15px rgba(99, 102, 241, 0.6)); }
                    50% { opacity: 0.8; transform: scale(0.95); filter: drop-shadow(0 0 5px rgba(99, 102, 241, 0.2)); }
                  }
                  .radar-container {
                    position: relative;
                    width: 80px;
                    height: 80px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 30px;
                  }
                  .radar-ring {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                    border: 2px solid var(--primary);
                    animation: pingSlow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
                  }
                  .radar-ring:nth-child(2) { animation-delay: 0.6s; }
                  .radar-ring:nth-child(3) { animation-delay: 1.2s; }
                  .radar-core {
                    position: relative;
                    z-index: 2;
                    font-size: 32px;
                    background: var(--surface);
                    width: 64px;
                    height: 64px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 0 20px rgba(99, 102, 241, 0.4);
                    animation: pulseGlow 2s ease-in-out infinite;
                  }
                `}</style>

                <div className="radar-container">
                  <div className="radar-ring"></div>
                  <div className="radar-ring"></div>
                  <div className="radar-ring"></div>
                  <div className="radar-core">🤖</div>
                </div>

                <h3 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px' }}>
                  Rastreando mercado local...
                </h3>
                
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: 20, fontSize: 13, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--primary)', fontSize: 10 }}>●</span>
                    <span style={{ color: 'var(--muted)' }}>Fonte:</span> 
                    <span style={{ fontWeight: 600 }}>{selectedProvider.name}</span>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: 20, fontSize: 13, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--primary)', fontSize: 10 }}>●</span>
                    <span style={{ color: 'var(--muted)' }}>Segmento:</span> 
                    <span style={{ fontWeight: 600 }}>{nicheName}</span>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: 20, fontSize: 13, border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--primary)', fontSize: 10 }}>●</span>
                    <span style={{ color: 'var(--muted)' }}>Local:</span> 
                    <span style={{ fontWeight: 600 }}>{city} - {state}</span>
                  </div>
                </div>

                <div style={{ width: '100%', maxWidth: 500, marginTop: 40 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--muted)' }}>
                    <span>Etapa: {runInfo?.step ?? 'INICIANDO'}</span>
                    <span style={{ color: 'var(--primary)', textShadow: '0 0 10px rgba(99,102,241,0.5)' }}>{Math.round(Math.min(100, ((runInfo?.found ?? 0) / Math.max(1, quantity)) * 100))}%</span>
                  </div>
                  <div style={{ height: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ width: `${Math.min(100, ((runInfo?.found ?? 0) / Math.max(1, quantity)) * 100)}%`, background: 'linear-gradient(90deg, var(--primary) 0%, #a855f7 100%)', height: '100%', borderRadius: 10, transition: 'width 0.4s ease', boxShadow: '0 0 10px rgba(99,102,241,0.5)' }} />
                  </div>
                  <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--text)', opacity: 0.8 }}>
                    {runInfo?.detail ?? 'Preparando satélites e agentes de busca...'}
                  </div>
                </div>

                {runInfo && (
                  <div style={{ display: 'flex', gap: 32, marginTop: 40, background: 'rgba(0,0,0,0.2)', padding: '16px 40px', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '1px' }}>Encontradas</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>{runInfo.found}</div>
                    </div>
                    <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }}></div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '1px' }}>Novas</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--success)' }}>{runInfo.added}</div>
                    </div>
                    <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }}></div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '1px' }}>Duplicadas</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--warning)' }}>{runInfo.duplicates}</div>
                    </div>
                    <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }}></div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '1px' }}>Erros</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--danger)' }}>{runInfo.errors}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {step === 0 && (
              <div>
                <div className="niche-grid">
                  {NICHES.map((n) => (
                    <button
                      key={n}
                      className={`niche-card ${niche === n && !customNiche ? 'selected' : ''}`}
                      onClick={() => { setNiche(n); setCustomNiche(''); setOffer(defaultNicheOffer(n)) }}
                    >
                      <span className="icon" aria-hidden="true">{NICHE_ICONS[n] ?? '🏷️'}</span>
                      <b>{n}</b>
                      <span>{getNicheDna(n)?.focus ?? 'Segmento local'}</span>
                    </button>
                  ))}
                </div>
                <Field label="Ou crie um nicho personalizado" hint="Pode digitar vários, ex: Pet shops, Clínicas veterinárias">
                  <input className="input" value={customNiche} onChange={(e) => setCustomNiche(e.target.value)} placeholder="Digite um ou mais segmentos..." />
                </Field>
                {selectedDna && !customNiche && (
                  <div className="alert alert-info mt-8">
                    💡 {selectedDna.description}. Foco recomendado: <b>{selectedDna.focus}</b>.
                  </div>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="grid grid-2">
                <Field label="Estado (UF)">
                  <select
                    className="select"
                    value={state}
                    onChange={(e) => {
                      const uf = e.target.value
                      setState(uf)
                      setCity(CITIES_BY_STATE[uf]?.[0] ?? '')
                    }}
                  >
                    {STATES_BR.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </Field>
                <Field label="Cidade">
                  <input className="input" list="cities-list" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Digite uma cidade" />
                  <datalist id="cities-list">
                    {cities.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </Field>
                <Field label="Palavras-chave (opcional, separadas por vírgula)">
                  <input className="input" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder={`Ex.: ${(selectedDna?.services ?? []).slice(0, 3).join(', ')}`} />
                </Field>
              </div>
            )}

            {step === 2 && (
              <Field label="Quantidade de empresas a descobrir">
                <div className="flex items-center gap-16">
                  <input type="range" min={1} max={5000} step={10} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} style={{ flex: 1 }} aria-label="Quantidade" />
                  <input type="number" min={1} className="input" style={{ width: '120px' }} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} aria-label="Quantidade Numérica" />
                  <span className="tiny">empresas</span>
                </div>
                <div className="tiny muted mt-8">
                  Dica: Se você colocar múltiplos nichos/palavras-chave na etapa anterior, a ferramenta tentará buscar essa quantidade total.
                  O limite real pode ser menor conforme a fonte (cota/rate limit do provedor).
                </div>
              </Field>
            )}

            {step === 3 && (
              <div className="grid grid-2">
                <div>
                  <Checkbox label="Somente empresas sem site" checked={criteria.onlyNoWebsite} onChange={(v) => setCriteria({ ...criteria, onlyNoWebsite: v })} />
                  <Checkbox label="Somente com WhatsApp" checked={criteria.onlyWithWhatsapp} onChange={(v) => setCriteria({ ...criteria, onlyWithWhatsapp: v })} />
                  <Checkbox label="Somente com Instagram" checked={criteria.onlyWithInstagram} onChange={(v) => setCriteria({ ...criteria, onlyWithInstagram: v })} />
                </div>
                <div>
                  <Field label="Score mínimo">
                    <input type="number" className="input" min={0} max={100} value={criteria.minScore} onChange={(e) => setCriteria({ ...criteria, minScore: Number(e.target.value) })} />
                  </Field>
                  <Field label="Número mínimo de avaliações">
                    <input type="number" className="input" min={0} value={criteria.minReviews} onChange={(e) => setCriteria({ ...criteria, minReviews: Number(e.target.value) })} />
                  </Field>
                  <Field label="Nota mínima (0 a 5)">
                    <input type="number" className="input" min={0} max={5} step={0.1} value={criteria.minRating} onChange={(e) => setCriteria({ ...criteria, minRating: Number(e.target.value) })} />
                  </Field>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <Field label="Fonte de dados de descoberta">
                  <div className="grid grid-3 gap-12 mt-8">
                    {providers.map((p) => {
                      const isRecommended = p.id === 'openstreetmap'
                      const isSelected = source === p.id
                      return (
                        <button
                          key={p.id}
                          type="button"
                          className={`niche-card ${isSelected ? 'selected' : ''}`}
                          style={{ textAlign: 'left', position: 'relative' }}
                          onClick={() => setSource(p.id)}
                        >
                          {isRecommended && (
                            <span className="badge badge-success tiny mb-4" style={{ display: 'inline-block' }}>
                              ⭐ RECOMENDADA
                            </span>
                          )}
                          <div>
                            <b>
                              {p.tier === 'free' ? '🟢 ' : p.tier === 'optional' ? '⚪ ' : '🔵 '}
                              {p.name}
                            </b>
                          </div>
                          <span className="tiny muted mt-4" style={{ display: 'block' }}>{p.description}</span>
                          <div className="tiny mt-8 bold">
                            {p.tier === 'free'
                              ? 'Sem API key · Sem cartão'
                              : p.tier === 'optional'
                              ? p.isConfigured() ? '🟢 API Key configurada' : '⚪ Requer Google Cloud'
                              : 'Somente modo DEMO'}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </Field>
                {selectedProvider.id === 'openstreetmap' && (
                  <div className="alert alert-info mt-12 tiny">
                    <b>OpenStreetMap:</b> Provedor gratuito e sem necessidade de cartão de crédito. Dados sob a licença ODbL ({OSM_ATTRIBUTION}).
                  </div>
                )}
                {selectedProvider.needsConfig && !selectedProvider.isConfigured() && (
                  <div className="alert alert-warning mt-12">
                    ⚠️ <b>{selectedProvider.name}</b> requer configuração de API key no Google Cloud.
                    <div className="flex gap-10 mt-8">
                      <Link to="/integrations" className="btn btn-primary btn-sm">Configurar integração</Link>
                      <Button variant="secondary" size="sm" onClick={() => setSource('openstreetmap')}>Usar OpenStreetMap (Grátis)</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 5 && (
              <div>
                <div className="grid grid-3">
                  {([
                    { value: 'REAL', icon: '🟢', title: 'Real (Gratuito / OpenStreetMap)', desc: 'Busca empresas reais de fontes públicas ativas. Não exige cartão nem Google Maps.' },
                    { value: 'DEMO', icon: '🔵', title: 'Demo (Testes)', desc: 'Usa somente dados fictícios de demonstração identificados (selo DEMO).' },
                    { value: 'HYBRID', icon: '🟡', title: 'Híbrido', desc: 'Prioriza empresas reais e complementa com demo se necessário — cada registro é identificado.' },
                  ] as { value: DiscoveryMode; icon: string; title: string; desc: string }[]).map((m) => (
                    <button
                      key={m.value}
                      className={`niche-card ${mode === m.value ? 'selected' : ''}`}
                      style={{ textAlign: 'left' }}
                      onClick={() => chooseMode(m.value)}
                    >
                      <b>{m.icon} {m.title}</b>
                      <span>{m.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="grid grid-2">
                <Field label="Produto / oferta">
                  <input className="input" value={offer.product} onChange={(e) => setOffer({ ...offer, product: e.target.value })} />
                </Field>
                <Field label="Preço (R$)">
                  <input type="number" className="input" min={0} value={offer.price} onChange={(e) => setOffer({ ...offer, price: Number(e.target.value) })} />
                </Field>
                <Field label="Entregável">
                  <input className="input" value={offer.deliverable} onChange={(e) => setOffer({ ...offer, deliverable: e.target.value })} />
                </Field>
                <Field label="Benefício principal">
                  <input className="input" value={offer.benefit} onChange={(e) => setOffer({ ...offer, benefit: e.target.value })} />
                </Field>
                <Field label="Chamada para ação (CTA)" hint="Usada nas mensagens geradas">
                  <input className="input" value={offer.cta} onChange={(e) => setOffer({ ...offer, cta: e.target.value })} />
                </Field>
              </div>
            )}

            {step === 7 && (
              <Field label="Instruções extras para a mensagem (opcional)" hint="A IA usa somente fatos verificados. Nada é inventado.">
                <textarea className="textarea" value={messagePrompt} onChange={(e) => setMessagePrompt(e.target.value)} placeholder="Ex.: destacar agendamento on-line como diferencial..." />
              </Field>
            )}

            {step === 8 && (
              <div>
                <Field label="Nome da campanha">
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Dentistas Londrina" />
                </Field>
                <div className="card mt-16" style={{ background: 'var(--bg)' }}>
                  <h3>Revisão da campanha</h3>
                  <div>
                    <div className="kv"><dt>Segmento</dt><dd>{nicheName}</dd></div>
                    <div className="kv"><dt>Localização</dt><dd>{city} - {state}</dd></div>
                    <div className="kv"><dt>Quantidade</dt><dd>{quantity}</dd></div>
                    <div className="kv"><dt>Fonte</dt><dd>{selectedProvider.name}</dd></div>
                    <div className="kv"><dt>Modo</dt><dd>{mode === 'DEMO' ? '🔵 Demo' : mode === 'REAL' ? '🟢 Real' : '🟡 Híbrido'}</dd></div>
                    <div className="kv"><dt>Oferta</dt><dd>{offer.product} — R$ {offer.price}</dd></div>
                    <div className="kv"><dt>Critérios</dt><dd>{criteriaSummary()}</dd></div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-24">
              <div>
                {step > 0 && <Button variant="secondary" onClick={() => setStep(step - 1)}>← Voltar</Button>}
              </div>
              <div className="flex gap-10">
                {step < STEPS.length - 1 && (
                  <Button variant="primary" disabled={!valid} onClick={() => setStep(step + 1)}>Continuar →</Button>
                )}
                {step === STEPS.length - 1 && (
                  <Button variant="success" disabled={!valid} onClick={handleStart}>
                    {mode === 'DEMO' ? '▶ Iniciar prospecção (demo)' : mode === 'REAL' ? '🔎 Executar busca real' : '▶ Iniciar (híbrido)'}
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </Card>

      {realBlocked && (
        <div className="modal-backdrop" onClick={() => setRealBlocked(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Fonte real não configurada">
            <div className="modal-head">
              <h3 className="modal-title">⚠️ Nenhuma fonte real está configurada</h3>
              <button className="modal-close" onClick={() => setRealBlocked(false)} aria-label="Fechar">×</button>
            </div>
            <p className="muted">Para buscar empresas reais, configure uma integração (ex.: Google Places). Nenhum dado fictício será usado como real.</p>
            <div className="modal-foot">
              <Button variant="secondary" onClick={() => setMode('DEMO')}>Voltar para DEMO</Button>
              <Button variant="primary" onClick={() => navigate('/integrations')}>Configurar integração</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}