import { DiscoveryAgent } from './DiscoveryAgent'
import { NormalizerAgent } from './NormalizerAgent'
import { DuplicateDetector } from './DuplicateDetector'
import { WebsiteAgent } from './WebsiteAgent'
import { DigitalPresenceAgent } from './DigitalPresenceAgent'
import { BusinessAnalyst } from './BusinessAnalyst'
import { ScoringAgent } from './ScoringAgent'
import { OpportunityAgent } from './OpportunityAgent'
import { CopywriterAgent } from './CopywriterAgent'
import { MessageQualityChecker } from './QualityChecker'
import type { CompanyWebsiteResult } from './WebsiteAgent'
import type { PresenceResult } from './DigitalPresenceAgent'
import type { BusinessAnalysis } from './BusinessAnalyst'
import type { QualityCheck } from './QualityChecker'
import type {
  AgentContext,
  PipelineProgress,
  NormalizedDiscovered,
  Discovered,
  DiscoveryOutput,
  ScoreOutput,
  OpportunityOutput,
  MessageVariant,
} from './types'
import { logger } from '../lib/logger'
import { useApp } from '../services/store'
import { uid, nowIso } from '../lib/utils'
import { tierFromScore } from '../config/defaults'
import type {
  Campaign,
  Company,
  Lead,
  LeadMessage,
  OpportunityAnalysis,
  WebsiteStatus,
} from '../types'

export interface PipelineResult {
  campaignId: string
  discovered: Discovered[]
  companies: Company[]
  leads: Lead[]
  errors: string[]
  stats: {
    discovered: number
    normalized: number
    duplicatesRemoved: number
    analyzed: number
    noWebsite: number
    qualified: number
  }
}

export interface RunOptions {
  campaign: Campaign
  onProgress?: (p: PipelineProgress) => void
}

type Stats = PipelineResult['stats']

const EMPTY_STATS: Stats = { discovered: 0, normalized: 0, duplicatesRemoved: 0, analyzed: 0, noWebsite: 0, qualified: 0 }

function asScoreSet(n: number): ScoreOutput[] {
  return Array.from({ length: n }, () => ({ score: 50, tier: 'MEDIUM', breakdown: [], explanation: [] }))
}

function toOpportunityAnalysis(o: OpportunityOutput | undefined): OpportunityAnalysis {
  return {
    positives: o?.positives ?? [],
    problems: o?.problems ?? [],
    opportunities: o?.opportunities ?? [],
    recommendation: o?.recommendation ?? '',
    commercialArgument: o?.commercialArgument ?? '',
    whyRecommended: o?.whyRecommended ?? '',
  }
}

export class AgentOrchestrator {
  private currentCampaignId: string | null = null
  private readonly discovery = new DiscoveryAgent()
  private readonly normalizer = new NormalizerAgent()
  private readonly duplicates = new DuplicateDetector()
  private readonly website = new WebsiteAgent()
  private readonly presence = new DigitalPresenceAgent()
  private readonly analyst = new BusinessAnalyst()
  private readonly scoring = new ScoringAgent()
  private readonly opportunity = new OpportunityAgent()
  private readonly copywriter = new CopywriterAgent()
  private readonly quality = new MessageQualityChecker()

  constructor(private readonly ctx: AgentContext) {}

  async runPipeline(opts: RunOptions): Promise<PipelineResult> {
    const { campaign, onProgress } = opts
    this.currentCampaignId = campaign.id
    const errors: string[] = []
    const stats: Stats = { ...EMPTY_STATS }

    const emit = (guid: 'step' | 'stat', step: string, percent: number, detail: string): void => {
      onProgress?.({ step, detail, percent, stats: { ...stats } })
      const current = useApp.getState().campaigns.find((c) => c.id === campaign.id)
      if (current) {
        useApp.getState().upsertCampaign({
          ...current,
          progress: percent,
          stats: { ...current.stats, ...stats },
        })
      }
      void guid
    }

    const result: PipelineResult = {
      campaignId: campaign.id,
      discovered: [],
      companies: [],
      leads: [],
      errors,
      stats,
    }
    const t0 = Date.now()

    try {
      emit('step', 'DISCOVERY', 5, 'Pesquisando empresas...')
      const d1 = await this.discovery.execute(
        {
          niche: campaign.niche,
          city: campaign.city,
          state: campaign.state,
          country: campaign.country,
          quantity: campaign.quantity,
          keywords: campaign.keywords,
        },
        this.ctx
      )
      if (d1.status !== 'SUCCESS' || !d1.output) throw new Error('Falha na descoberta de empresas')
      const discovered = (d1.output as DiscoveryOutput).companies
      result.discovered = discovered
      stats.discovered = discovered.length

      emit('step', 'NORMALIZING', 10, `Encontradas ${discovered.length} empresas`)
      const d2 = await this.normalizer.execute({ companies: discovered }, this.ctx)
      if (d2.status !== 'SUCCESS' || !d2.output) throw new Error('Falha na normalização')
      const normalized = (d2.output as { companies: NormalizedDiscovered[] }).companies
      stats.normalized = normalized.length
      emit('step', 'NORMALIZING', 16, 'Dados padronizados')

      const d3 = await this.duplicates.execute({ companies: normalized }, this.ctx)
      if (d3.status !== 'SUCCESS' || !d3.output) throw new Error('Falha na deduplicação')
      const dedup = (d3.output as { companies: NormalizedDiscovered[]; removed: number }).companies
      stats.duplicatesRemoved = (d3.output as { removed: number }).removed
      stats.analyzed = dedup.length
      emit('step', 'DUPLICATES', 22, `${stats.duplicatesRemoved} duplicadas removidas`)

      const d4 = await this.website.execute({ companies: dedup }, this.ctx)
      if (d4.status !== 'SUCCESS' || !d4.output) throw new Error('Falha na verificação de websites')
      const websiteResults = (d4.output as { results: CompanyWebsiteResult[] }).results
      stats.noWebsite = websiteResults.filter((r) => r.websiteStatus === 'NO_WEBSITE').length
      emit('step', 'WEBSITE', 25, `${stats.noWebsite} empresas sem site identificado`)

      const d5 = await this.presence.execute({ companies: dedup }, this.ctx)
      const presenceResults: PresenceResult[] = d5.status === 'SUCCESS' && d5.output
        ? (d5.output as { results: PresenceResult[] }).results
        : []

      emit('step', 'BUSINESS_ANALYST', 38, 'Analisando potencial comercial...')
      const d6 = await this.analyst.execute({ companies: dedup, niche: campaign.niche }, this.ctx)
      const analyses: BusinessAnalysis[] = d6.status === 'SUCCESS' && d6.output
        ? (d6.output as { analyses: BusinessAnalysis[] }).analyses
        : []

      const d7 = await this.scoring.execute(
        {
          companies: dedup,
          websiteStatuses: websiteResults.map((r) => r.websiteStatus),
          niche: campaign.niche,
        },
        this.ctx
      )
      const scores: ScoreOutput[] = d7.status === 'SUCCESS' && d7.output
        ? (d7.output as { scores: ScoreOutput[] }).scores
        : asScoreSet(dedup.length)
      emit('step', 'SCORING', 72, 'Scores calculados')

      const d8 = await this.opportunity.execute(
        {
          companies: dedup,
          scores: scores.map((s) => s.score),
          websiteStatuses: websiteResults.map((r) => r.websiteStatus),
          niche: campaign.niche,
        },
        this.ctx
      )
      const opportunities: OpportunityOutput[] = d8.status === 'SUCCESS' && d8.output
        ? (d8.output as { opportunities: OpportunityOutput[] }).opportunities
        : []

      const d9 = await this.copywriter.execute(
        {
          companies: dedup,
          opportunities,
          niche: campaign.niche,
          offer: campaign.offer,
        },
        this.ctx
      )
      const variants: MessageVariant[][] = d9.status === 'SUCCESS' && d9.output
        ? (d9.output as { messages: MessageVariant[][] }).messages
        : []

      const d10 = await this.quality.execute({ companies: dedup, messages: variants }, this.ctx)
      const checks: { companyIndex: number; check: QualityCheck }[] = d10.status === 'SUCCESS' && d10.output
        ? (d10.output as { checks: { companyIndex: number; check: QualityCheck }[] }).checks
        : []
      const withIssues = checks.filter((c) => !c.check.passed).length
      emit('step', 'QUALITY', 92, withIssues > 0 ? `${withIssues} mensagens com ressalvas` : 'Mensagens validadas')

      const { companies, leads } = this.materialize(
        dedup,
        websiteResults,
        presenceResults,
        analyses,
        scores,
        opportunities,
        variants,
        campaign
      )
      result.companies = companies
      result.leads = leads
      stats.qualified = leads.length
      emit('step', 'QUALIFIED', 98, `${leads.length} leads qualificados no CRM`)
      logger.info('ORCHESTRATOR', `Pipeline concluído em ${Date.now() - t0}ms`, `${leads.length} leads`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      errors.push(msg)
      logger.error('ORCHESTRATOR', 'Pipeline falhou', msg)
      emit('step', 'FAILED', 100, 'Pipeline interrompido')
    }
    return result
  }

  private materialize(
    dedup: NormalizedDiscovered[],
    websiteResults: CompanyWebsiteResult[],
    presenceResults: PresenceResult[],
    _analyses: BusinessAnalysis[],
    scores: ScoreOutput[],
    opportunities: OpportunityOutput[],
    variants: MessageVariant[][],
    campaign: Campaign
  ): { companies: Company[]; leads: Lead[] } {
    const s = useApp.getState()
    const companies: Company[] = []
    const leads: Lead[] = []

    const webOf = (idx: number): { status: WebsiteStatus; scan: CompanyWebsiteResult['scan'] } => {
      const w = websiteResults[idx]
      return w ? { status: w.websiteStatus, scan: w.scan ?? null } : { status: 'WEBSITE_UNKNOWN', scan: null }
    }
    const scoreOf = (idx: number): ScoreOutput => scores[idx] ?? { score: 0, tier: 'VERY_LOW', breakdown: [], explanation: [] }

    dedup.forEach((c, idx) => {
      const web = webOf(idx)
      const score = scoreOf(idx)

      const company: Company = {
        id: uid('cmp'),
        workspaceId: s.workspaceId,
        name: c.name,
        category: c.category ?? null,
        city: c.city ?? null,
        state: c.state ?? null,
        country: 'BR',
        address: c.address ?? null,
        phone: c.phone ?? null,
        whatsapp: c.whatsapp ?? null,
        email: null,
        website: c.website ?? null,
        instagram: c.instagram ?? null,
        facebook: c.facebook ?? null,
        rating: c.rating ?? null,
        reviewCount: c.reviewCount ?? null,
        hours: c.hours ?? null,
        source: c.source ?? null,
        isDemo: this.ctx.demoMode,
        createdAt: nowIso(),
      }

      const leadMessages: LeadMessage[] = (variants[idx] ?? []).map((mv) => ({
        id: uid('msg'),
        version: mv.version,
        body: mv.body,
        approved: false,
        used: false,
        createdAt: nowIso(),
        editedAt: null,
      }))

      const lead: Lead = {
        id: uid('lead'),
        workspaceId: s.workspaceId,
        companyId: company.id,
        campaignId: campaign.id,
        status: 'NEW',
        tier: tierFromScore(score.score),
        score: score.score,
        scoreBreakdown: score.breakdown,
        websiteStatus: web.status,
        websiteScan: web.scan,
        digitalPresenceScore: presenceResults[idx]?.digitalPresenceScore ?? null,
        hasWhatsapp: Boolean(c.whatsapp),
        hasInstagram: Boolean(c.instagram),
        hasFacebook: Boolean(c.facebook),
        hasPhone: Boolean(c.phone),
        analysis: toOpportunityAnalysis(opportunities[idx]),
        analysisHash: null,
        lastAnalyzedAt: nowIso(),
        messages: leadMessages,
        proposal: null,
        favorite: false,
        tags: [],
        notesCount: 0,
        nextAction: null,
        nextActionAt: null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }

      companies.push(company)
      leads.push(lead)
      s.upsertCompany(company)
    })

    s.setLeads([...s.leads, ...leads])
    return { companies, leads }
  }
}