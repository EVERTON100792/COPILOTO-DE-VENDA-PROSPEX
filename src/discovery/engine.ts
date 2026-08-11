/**
 * DiscoveryService (Real Discovery Engine) — Fase 2.
 *
 * Orquestra: provider → raw → normalização → validação → deduplicação →
 * persistência (bruto + empresa + lead) → run.
 *
 * Garantias:
 *  - modo REAL sem fonte configurada → FAILED (nunca dados fictícios);
 *  - paginação respeitada (pageToken do provider);
 *  - rateLimit (maxRequests/delayMs) respeitados — sem bypass;
 *  - cancelamento entre iterações sem corromper dados salvos;
 *  - toda empresa persistida com source/source_type/source_url/retrieved_at/data_status;
 *  - website só quando a fONTE fornece o endereço — nunca inventa domínio.
 */

import { useApp } from '../services/store'
import { uid, nowIso } from '../lib/utils'
import { logger } from '../lib/logger'
import { normalizeName, normalizePhone, normalizeUrl, normalizeCity, normalizeState, hostnameOf } from '../services/normalization'
import { validateBusiness } from '../services/validation'
import { findExistingBusiness } from '../services/deduplication'
import { computeWebsiteQuality } from '../services/websiteQuality'
import { analyzeOpportunity } from '../services/opportunity'
import { computeScore } from '../agents/ScoringAgent'
import { searchCompanyData } from '../agents/SearchAIAgent'
import { classifyScan, scanWebsite } from '../integrations/website'
import { getDiscoveryProvider } from './registry'
import type { DiscoveryProvider, ProviderBusiness } from './providers/types'
import type { DiscoveryQuery, DiscoveryRun, Company, Lead, WebsiteScan } from '../types'
import type { NormalizedDiscovered } from '../agents/types'

export interface DiscoveryTick {
  step: string
  detail: string
  percent: number
  stats: {
    found: number
    processed: number
    added: number
    duplicates: number
    errors: number
  }
}

export interface DiscoveryRunOptions {
  campaignId?: string | null
  onTick?: (tick: DiscoveryTick, run: DiscoveryRun) => void
}

const PAGE_SIZE = 20
const SCAN_TIMEOUT_MS = 9000

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export class DiscoveryService {
  async run(query: DiscoveryQuery, opts: DiscoveryRunOptions = {}): Promise<DiscoveryRun> {
    const s = useApp.getState()
    const runId = uid('drun')
    const run: DiscoveryRun = {
      id: runId,
      workspaceId: s.workspaceId,
      campaignId: opts.campaignId ?? null,
      mode: query.mode,
      provider: query.providerId,
      query: query.segment,
      location: `${query.city} - ${query.state}`,
      requestedLimit: query.limit,
      foundCount: 0,
      processedCount: 0,
      newCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      status: 'QUEUED',
      startedAt: nowIso(),
      completedAt: null,
      errorMessage: null,
      cancelled: false,
      steps: [{ name: 'QUEUED', at: nowIso() }],
      quota: null,
      costEstimateUsd: null,
    }
    s.addDiscoveryRun(run)

    const provider = getDiscoveryProvider(query.providerId)
    if (!provider) {
      return this.fail(runId, 'Provedor de descoberta não encontrado.')
    }
    if (query.mode === 'REAL' && provider.tier === 'demo') {
      return this.fail(runId, `A fonte "${provider.name}" é somente DEMO. Selecione uma fonte real (OpenStreetMap, Google Places) para o modo REAL.`)
    }
    if (query.mode === 'REAL' && provider.needsConfig && !provider.isConfigured()) {
      return this.fail(runId, 'Nenhuma fonte real está configurada. Configure uma integração para buscar empresas reais.')
    }

    return this.execute(run, provider, query, opts)
  }

  cancel(runId: string): void {
    useApp.getState().patchDiscoveryRun(runId, { status: 'CANCELLED', cancelled: true })
    logger.info('DISCOVERY', `Execução ${runId} cancelada pelo usuário`)
  }

  private fail(runId: string, message: string): DiscoveryRun {
    const s = useApp.getState()
    const run = s.discoveryRuns.find((r) => r.id === runId)
    const patch: Partial<DiscoveryRun> = {
      status: 'FAILED',
      errorMessage: message,
      completedAt: nowIso(),
      steps: [...(run?.steps ?? []), { name: 'FAILED', at: nowIso() }],
    }
    s.patchDiscoveryRun(runId, patch)
    logger.error('DISCOVERY', message)
    return { ...(run ?? ({} as DiscoveryRun)), ...patch }
  }

  private async execute(
    initial: DiscoveryRun,
    provider: DiscoveryProvider,
    query: DiscoveryQuery,
    opts: DiscoveryRunOptions
  ): Promise<DiscoveryRun> {
    const s = useApp.getState()
    const rate = provider.rateLimit ?? { maxRequests: 100, delayMs: 150 }
    let run = initial

    const apply = (patch: Partial<DiscoveryRun>): void => {
      run = { ...run, ...patch }
      useApp.getState().patchDiscoveryRun(run.id, patch)
      if (opts.onTick) {
        opts.onTick(
          {
            step: patch.steps?.length ? patch.steps[patch.steps.length - 1].name : 'RUNNING',
            detail: '',
            percent: 10,
            stats: {
              found: run.foundCount,
              processed: run.processedCount,
              added: run.newCount,
              duplicates: run.duplicateCount,
              errors: run.errorCount,
            },
          },
          run
        )
      }
    }

    const cancelled = (): boolean => {
      const live = useApp.getState().discoveryRuns.find((r) => r.id === run.id)
      return Boolean(live?.cancelled) || live?.status === 'CANCELLED'
    }

    apply({ status: 'RUNNING', steps: [...run.steps, { name: 'RUNNING', at: nowIso() }] })
    logger.info('DISCOVERY', `Execução ${run.id}: ${query.segment} em ${query.city}/${query.state} (${query.mode})`)

    let pageToken: string | null = null
    let requests = 0
    let engineRetries = 0
    let haveMore = true
    const scanBudget = { remaining: 30 }

    try {
      while (haveMore && requests < rate.maxRequests && run.newCount + run.duplicateCount < query.limit) {
        if (cancelled()) {
          apply({ status: 'CANCELLED', cancelled: true, completedAt: nowIso(), errorMessage: 'Execução cancelada pelo usuário.' })
          return useApp.getState().discoveryRuns.find((r) => r.id === run.id) as DiscoveryRun
        }

        apply({ steps: [...run.steps, { name: 'FETCHING', at: nowIso() }] })
        let resp
        try {
          resp = await provider.search({
            segment: query.segment,
            city: query.city,
            state: query.state,
            country: query.country ?? 'BR',
            limit: PAGE_SIZE,
            pageToken,
          })
        } catch (e) {
          const err = e as { message: string; retryable?: boolean; statusCode?: number }
          run.errorCount += 1
          apply({
            errorCount: run.errorCount,
            errorMessage: err?.message ?? 'Não foi possível consultar a fonte neste momento.',
          })
          logger.error('DISCOVERY', `Provider ${provider.id}: ${err?.message ?? 'erro'}`, `status=${String(err?.statusCode ?? '')}`)
          if (err?.retryable === true && requests === 0 && engineRetries < 2) {
            engineRetries++
            apply({ steps: [...run.steps, { name: 'RETRYING', at: nowIso() }] })
            await delay(1500)
            continue
          }
          break
        }
        requests++
        pageToken = resp.nextPageToken
        haveMore = resp.hasMore

        for (const b of resp.businesses) {
          if (run.newCount + run.duplicateCount >= query.limit) break
          if (cancelled()) break
          await this.processBusiness(b, run, query, scanBudget)
          run = useApp.getState().discoveryRuns.find((r) => r.id === run.id) ?? run
        }

        if (haveMore && rate.delayMs > 0) await delay(rate.delayMs)
      }

      const finalRun = useApp.getState().discoveryRuns.find((r) => r.id === run.id) as DiscoveryRun
      if (finalRun.cancelled || finalRun.status === 'CANCELLED') return finalRun
      if (finalRun.newCount === 0 && finalRun.duplicateCount === 0 && finalRun.errorCount > 0) {
        apply({ status: 'FAILED', errorMessage: 'Não foi possível consultar a fonte neste momento. Nenhuma empresa foi salva.', completedAt: nowIso() })
        return useApp.getState().discoveryRuns.find((r) => r.id === run.id) as DiscoveryRun
      }
      const status = finalRun.errorCount > 0 ? 'PARTIAL' : 'COMPLETED'
      apply({ status, completedAt: nowIso() })
      return useApp.getState().discoveryRuns.find((r) => r.id === run.id) as DiscoveryRun
    } catch (e) {
      logger.error('DISCOVERY', 'Falha inesperada', String(e))
      apply({ status: 'FAILED', errorMessage: 'Erro inesperado na descoberta.', completedAt: nowIso() })
      return useApp.getState().discoveryRuns.find((r) => r.id === run.id) as DiscoveryRun
    }
  }

  private async processBusiness(
    business: ProviderBusiness,
    run: DiscoveryRun,
    query: DiscoveryQuery,
    scanBudget: { remaining: number }
  ): Promise<void> {
    const s = useApp.getState()
    const now = nowIso()

    const bump = (patch: Partial<DiscoveryRun>): void => {
      const live = useApp.getState().discoveryRuns.find((r) => r.id === run.id) ?? run
      useApp.getState().patchDiscoveryRun(run.id, {
        duplicateCount: live.duplicateCount,
        newCount: live.newCount,
        errorCount: live.errorCount,
        foundCount: Math.max(live.foundCount, live.newCount + live.duplicateCount + live.errorCount),
        ...patch,
      })
    }

    const name = normalizeName(business.name)
    const phone = normalizePhone(business.phone)
    const website = normalizeUrl(business.website)
    const city = normalizeCity(business.city, business.state)
    const state = normalizeState(business.state) ?? business.state?.toUpperCase() ?? null

    const validation = validateBusiness({
      name: name.name,
      city,
      state,
      address: business.address,
      phone,
      website,
      providerRecordId: business.providerRecordId,
      sourceType: business.provider,
    })

    const existing = findExistingBusiness(
      { providerRecordId: business.providerRecordId, name: name.name, phone, website, city, address: business.address },
      s.companies
    )

    const rawId = uid('raw')
    s.upsertDiscoveryResult({
      id: rawId,
      workspaceId: s.workspaceId,
      runId: run.id,
      provider: business.provider,
      providerRecordId: business.providerRecordId,
      rawPayload: business.raw,
      retrievedAt: nowIso(),
      status: existing.companyId ? 'DUPLICATE' : validation.valid ? 'NEW' : 'ERROR',
      companyId: existing.companyId,
      processed: true,
    })

    // resultado criado/atualizado no run
    if (existing.companyId) {
      bump({ duplicateCount: (useApp.getState().discoveryRuns.find((r) => r.id === run.id) ?? run).duplicateCount + 1 })
      return
    }
    if (!validation.valid) {
      const liveErr = useApp.getState().discoveryRuns.find((r) => r.id === run.id) ?? run
      bump({ errorCount: liveErr.errorCount + 1 })
      return
    }

    const companyId = uid('cmp')
    const company: Company = {
      id: companyId,
      workspaceId: s.workspaceId,
      name: name.name,
      category: business.category,
      city,
      state,
      country: business.country ?? 'BR',
      address: business.address,
      phone,
      whatsapp: null,
      email: null,
      website,
      instagram: business.instagram,
      facebook: business.facebook,
      rating: business.rating,
      reviewCount: business.reviewCount,
      hours: business.hours,
      source: business.provider,
      isDemo: query.mode !== 'REAL',
      createdAt: now,
      dataStatus: query.mode === 'REAL' ? 'REAL' : 'DEMO',
      sourceType: business.provider,
      sourceRecordId: business.providerRecordId,
      sourceUrl: business.sourceUrl,
      retrievedAt: now,
      lastVerifiedAt: now,
      verificationStatus: 'UNVERIFIED',
      rawDataId: rawId,
      discoveryConfidence: validation.confidence,
      confidenceReasons: validation.reasons,
      phoneNormalized: phone,
      phoneCountry: 'BR',
      phoneType: 'mobile',
      whatsappStatus: 'UNKNOWN',
      websiteCheckedAt: null,
      doNotContact: false,
      fieldSources: {},
    }
    s.upsertCompany(company)

    // Website: só quando a fonte informa URL; nunca inventamos domínio.
    let websiteStatus = 'WEBSITE_UNKNOWN'
    let websiteQuality: number | null = null
    let websiteFactors: import('../types').ScoreBreakdown[] | null = null
    let websiteScan: WebsiteScan | null = null
    if (website && scanBudget.remaining > 0) {
      scanBudget.remaining -= 1
      const race = await Promise.race([
        scanWebsite(website),
        delay(SCAN_TIMEOUT_MS).then(() => null),
      ])
      if (race) {
        websiteStatus = classifyScan(race)
        const q = computeWebsiteQuality({
          status: race.status,
          https: race.https,
          title: race.title,
          description: race.description,
          mobileFriendly: race.mobileFriendly,
          loadable: race.loadable,
          outdatedSignals: race.outdatedSignals,
          error: race.error,
        })
        websiteQuality = q.score
        websiteFactors = q.factors
        websiteScan = {
          exists: race.exists,
          status: race.status,
          https: race.https,
          title: race.title,
          description: race.description,
          mobileFriendly: race.mobileFriendly,
          loadable: race.loadable,
          outdatedSignals: race.outdatedSignals,
          checkedAt: race.checkedAt,
        }
      }
      company.website = website
      company.websiteQualityScore = websiteQuality
      company.websiteQualityFactors = websiteFactors
      company.websiteCheckedAt = nowIso()
      s.upsertCompany(company)
    }

    // Scoring (regras, explicável) + oportunidade rule-based
    const normalized: NormalizedDiscovered = {
      name: name.name,
      category: business.category,
      city,
      state,
      address: business.address,
      phone: phone,
      whatsapp: null,
      website: website,
      instagram: business.instagram,
      facebook: business.facebook,
      rating: business.rating,
      reviewCount: business.reviewCount,
      hours: business.hours,
      source: business.provider,
      normalizedName: name.name,
      normalizedPhone: phone,
      domain: hostnameOf(website),
      complete: Boolean(name.name && (phone || website)),
    }
    const score = computeScore({ company: normalized, websiteStatus, weights: s.settings.scoreWeights })
    const opp = analyzeOpportunity({
      companyName: name.name,
      websiteStatus: websiteStatus as Lead['websiteStatus'],
      websiteQualityScore: websiteQuality,
      instagram: business.instagram,
      facebook: business.facebook,
      rating: company.rating ?? null,
      reviewCount: company.reviewCount ?? null,
      score: score.score,
    })

    const lead: Lead = {
      id: uid('lead'),
      workspaceId: s.workspaceId,
      companyId: company.id,
      campaignId: run.campaignId,
      status: 'NEW',
      tier: score.tier as Lead['tier'],
      score: score.score,
      scoreBreakdown: score.breakdown,
      websiteStatus: websiteStatus as Lead['websiteStatus'],
      websiteScan: websiteScan,
      digitalPresenceScore: null,
      hasWhatsapp: false,
      hasInstagram: Boolean(business.instagram),
      hasFacebook: Boolean(business.facebook),
      hasPhone: Boolean(phone),
      analysis: {
        positives: opp.reasons,
        problems: [],
        opportunities: opp.reasons,
        recommendation: opp.recommendation,
        commercialArgument: '',
        whyRecommended: opp.reasons.join('; ') || 'Diagnóstico por regras',
      },
      analysisHash: null,
      lastAnalyzedAt: now,
      messages: [],
      proposal: null,
      favorite: false,
      tags: [],
      notesCount: 0,
      nextAction: null,
      nextActionAt: null,
      createdAt: now,
      updatedAt: now,
    }
    s.upsertLead(lead)

    // --- ENRIQUECIMENTO COM IA (ASSÍNCRONO/BACKGROUND) ---
    // Isso evita travar o loop de descoberta enquanto a IA navega na web.
    ;(async () => {
      try {
        const out = await searchCompanyData({
          name: name.name,
          city: city ?? '',
          state: state ?? '',
          category: business.category ?? ''
        })
        const comp = useApp.getState().companies.find(c => c.id === companyId)
        if (comp) {
          const updates: Partial<Company> = {}
          if (out.phone && !comp.phone) updates.phone = out.phone
          if (out.website && !comp.website) updates.website = out.website
          if (out.rating && !comp.rating) updates.rating = out.rating
          if (out.reviewCount && !comp.reviewCount) updates.reviewCount = out.reviewCount
          if (out.instagram && !comp.instagram) updates.instagram = out.instagram
          if (out.facebook && !comp.facebook) updates.facebook = out.facebook
          if (out.email && !comp.email) updates.email = out.email
          if (out.hours && !comp.hours) updates.hours = out.hours
          if (out.summary && !comp.summary) updates.summary = out.summary
          if (out.address && !comp.address) updates.address = out.address

          if (Object.keys(updates).length > 0) {
            useApp.getState().upsertCompany({ ...comp, ...updates })
          }
        }
      } catch (e) {
        console.warn('[DiscoveryService] Erro no enriquecimento com Kimi', e)
      }
    })()

    const liveRun = useApp.getState().discoveryRuns.find((r) => r.id === run.id) ?? run
    bump({ newCount: liveRun.newCount + 1 })
  }
}