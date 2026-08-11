import type { ScoreBreakdown, Campaign } from '../types'
import type { NicheDna } from '../config/niches'

export interface AgentContext {
  workspaceId: string
  demoMode: boolean
  nicheDna: NicheDna | null
  campaign: Campaign | null
  settings: import('../types').GlobalSettings
}

export interface AgentResult<T = unknown> {
  status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'RETRYING' | 'CANCELLED'
  output: T | null
  error: string | null
  durationMs: number
  retries: number
}

export interface Discovered {
  name: string
  category: string | null
  city: string | null
  state: string | null
  address: string | null
  phone: string | null
  whatsapp: string | null
  website: string | null
  instagram: string | null
  facebook: string | null
  rating: number | null
  reviewCount: number | null
  hours: string | null
  summary?: string | null
  email?: string | null
  source: string | null
}

export interface DiscoveryOutput {
  companies: Discovered[]
  source: string
}

export interface NormalizedDiscovered extends Discovered {
  normalizedName: string
  normalizedPhone: string | null
  domain: string | null
  complete: boolean
}

export interface WebsiteAnalysis {
  statusCode: number | null
  loadable: boolean
  title: string | null
  description: string | null
  mobileFriendly: boolean | null
  outdatedSignals: number
}

export interface ScoreOutput {
  score: number
  tier: string
  breakdown: ScoreBreakdown[]
  explanation: string[]
}

export interface OpportunityOutput {
  positives: string[]
  problems: string[]
  opportunities: string[]
  recommendation: string
  commercialArgument: string
  whyRecommended: string
}

export interface MessageVariant {
  version: 'short' | 'consultive' | 'direct'
  body: string
}

export interface QualityOutput {
  passed: boolean
  issues: string[]
  regenerated: boolean
}

export interface PipelineProgress {
  step: string
  detail: string
  percent: number
  stats: {
    discovered: number
    analyzed: number
    noWebsite: number
    qualified: number
    duplicatesRemoved: number
  }
}