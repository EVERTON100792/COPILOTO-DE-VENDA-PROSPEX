export type ID = string

export type AgentStatus = 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'RETRYING' | 'CANCELLED'

export type WebsiteStatus =
  | 'NO_WEBSITE'
  | 'WEBSITE_FOUND'
  | 'WEBSITE_UNVERIFIED'
  | 'WEBSITE_BROKEN'
  | 'WEBSITE_OUTDATED'
  | 'WEBSITE_POOR_MOBILE'
  | 'WEBSITE_UNKNOWN'

export type LeadStatus =
  | 'NEW'
  | 'QUALIFIED'
  | 'READY_TO_CONTACT'
  | 'CONTACTED'
  | 'REPLIED'
  | 'INTERESTED'
  | 'NEGOTIATION'
  | 'PROPOSAL_SENT'
  | 'WON'
  | 'LOST'
  | 'NO_RESPONSE'
  | 'DO_NOT_CONTACT'

export type LeadTier = 'HOT' | 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW'

export type CampaignStatus = 'DRAFT' | 'RUNNING' | 'PAUSED' | 'FINISHED' | 'STOPPED' | 'FAILED'

export type ProposalStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'NEGOTIATING' | 'ACCEPTED' | 'REJECTED'

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'

export type ActivityType =
  | 'LEAD_CREATED'
  | 'LEAD_ANALYZED'
  | 'SCORE_CALCULATED'
  | 'MESSAGE_GENERATED'
  | 'MESSAGE_EDITED'
  | 'CONTACT_MADE'
  | 'REPLY_RECEIVED'
  | 'FOLLOWUP_SCHEDULED'
  | 'STATUS_CHANGED'
  | 'NOTE_ADDED'
  | 'PROPOSAL_CREATED'
  | 'PROPOSAL_STATUS'
  | 'TASK_CREATED'
  | 'FAVORITE_TOGGLED'
  | 'TAG_ADDED'
  | 'TAG_REMOVED'
  | 'CAMPAIGN_STARTED'
  | 'CAMPAIGN_FINISHED'
  | 'OPT_OUT'

export type NotificationType =
  | 'HOT_LEAD'
  | 'REPLY_RECEIVED'
  | 'FOLLOWUP_DUE'
  | 'PROPOSAL_ACCEPTED'
  | 'CAMPAIGN_FINISHED'
  | 'INTEGRATION_ERROR'
  | 'SYSTEM'

export interface Workspace {
  id: ID
  name: string
  createdAt: string
}

export interface AppUser {
  id: ID
  email: string
  name: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
  workspaceId: ID
  createdAt: string
}

export type DataStatus = 'REAL' | 'DEMO' | 'IMPORTED' | 'MANUAL' | 'UNVERIFIED'
export type DiscoveryConfidence = 'HIGH' | 'MEDIUM' | 'LOW'
export type WhatsAppStatus = 'UNKNOWN' | 'VERIFIED' | 'NOT_VERIFIED'
export type DiscoveryMode = 'DEMO' | 'REAL' | 'HYBRID'
export type DiscoveryRunStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'CANCELLED'

/** AI Qualification Engine (Fase 3) */
export type QualificationLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNVERIFIED'
export type QualificationMethod = 'AI' | 'RULE_BASED' | 'RULE_BASED_FALLBACK' | 'DEMO'
export type AIMode = 'DISABLED' | 'OPTIONAL' | 'REQUIRED'

/** Outreach Engine (Fase 4) */
export type OutreachCampaignStatus = 'DRAFT' | 'READY' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'
export type LeadOutreachStatus =
  | 'NOT_CONTACTED'
  | 'QUEUED'
  | 'PENDING_APPROVAL'
  | 'READY'
  | 'CONTACTED'
  | 'WAITING_REPLY'
  | 'REPLIED'
  | 'INTERESTED'
  | 'NOT_INTERESTED'
  | 'FOLLOW_UP'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST'
  | 'DO_NOT_CONTACT'
  | 'INVALID_CONTACT'

export type OutreachChannel = 'MANUAL' | 'WHATSAPP' | 'EMAIL'
export type MessageType = 'INITIAL' | 'FOLLOW_UP_1' | 'FOLLOW_UP_2' | 'FOLLOW_UP_3' | 'RESPONSE' | 'CLOSING'
export type OutreachMessageStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'READY'
  | 'SENT'
  | 'DELIVERED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REJECTED'

export type OutreachQueueStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'SKIPPED'
export type ResponseCategory = 'INTERESTED' | 'QUESTION' | 'PRICE' | 'LATER' | 'NOT_INTERESTED' | 'OPT_OUT' | 'UNKNOWN'

export interface OutreachCampaign {
  id: ID
  workspaceId: string
  name: string
  description: string | null
  status: OutreachCampaignStatus
  targetNiche: string | null
  targetCity: string | null
  targetSegment: string | null
  minScore: number
  opportunityFilter: QualificationLevel | 'ALL'
  offerName: string
  offerDescription: string | null
  offerPrice: number | null
  channel: OutreachChannel
  requiresApproval: boolean
  autoFollowUpEnabled: boolean
  maxContactsPerDay: number
  maxContactsPerHour: number
  stats: {
    selectedCount: number
    readyCount: number
    contactedCount: number
    repliedCount: number
    interestedCount: number
    wonCount: number
    optOutCount: number
  }
  createdAt: string
  updatedAt: string
  startedAt: string | null
  finishedAt: string | null
}

export interface OutreachMessage {
  id: ID
  workspaceId: string
  campaignId: string | null
  leadId: string
  channel: OutreachChannel
  type: MessageType
  body: string
  status: OutreachMessageStatus
  generatedBy: 'AI' | 'TEMPLATE'
  aiProvider: string | null
  aiModel: string | null
  promptVersion: string | null
  editedByUser?: boolean
  approvedAt?: string | null
  sentAt?: string | null
  copiedAt?: string | null
  whatsappOpenedAt?: string | null
  createdAt: string
  updatedAt: string
  errorCode?: string | null
  errorMessage?: string | null
}

export interface OutreachActivity {
  id: ID
  workspaceId: string
  leadId: string
  campaignId: string | null
  type:
    | 'CAMPAIGN_CREATED'
    | 'LEAD_QUEUED'
    | 'MESSAGE_GENERATED'
    | 'MESSAGE_EDITED'
    | 'MESSAGE_APPROVED'
    | 'MESSAGE_REJECTED'
    | 'MESSAGE_COPIED'
    | 'WHATSAPP_OPENED'
    | 'MESSAGE_SENT'
    | 'RESPONSE_RECEIVED'
    | 'FOLLOW_UP_SCHEDULED'
    | 'FOLLOW_UP_SENT'
    | 'FOLLOW_UP_CANCELLED'
    | 'STATUS_CHANGED'
    | 'OPT_OUT'
    | 'NOTE_ADDED'
  channel: OutreachChannel
  direction: 'OUTBOUND' | 'INBOUND' | 'INTERNAL'
  summary: string
  detail?: string | null
  actor: string
  createdAt: string
}

export interface ResponseAnalysis {
  category: ResponseCategory
  intentScore: number
  confidence: number
  summary: string
  suggestedNextAction: string
  suggestedReply: string
  createdAt: string
}

export type OpportunityType =
  | 'NO_WEBSITE_IDENTIFIED'
  | 'LOW_QUALITY_WEBSITE'
  | 'OUTDATED_WEBSITE'
  | 'WEAK_DIGITAL_PRESENCE'
  | 'GOOD_DIGITAL_PRESENCE'
  | 'MOBILE_ISSUE'
  | 'MISSING_CONTACT_CTA'
  | 'MISSING_WHATSAPP_CTA'
  | 'MISSING_SERVICE_INFORMATION'
  | 'MISSING_LOCATION_INFORMATION'
  | 'UNKNOWN'

export type RecommendedService =
  | 'WEBSITE_INSTITUTIONAL'
  | 'LANDING_PAGE'
  | 'WEBSITE_REDESIGN'
  | 'WHATSAPP_LANDING_PAGE'
  | 'MENU_DIGITAL'
  | 'BOOKING_PAGE'
  | 'LOCAL_SEO'
  | 'DIGITAL_PRESENCE'
  | 'UNKNOWN'

export interface LeadEvidence {
  signal: string
  source: string
  value: string
  impact: 'positive' | 'negative' | 'neutral'
  confidence: number
}

export interface LeadQualification {
  id: ID
  workspaceId: string
  companyId: string
  leadId: string
  campaignId: string | null

  ruleBasedScore: number
  aiScore: number | null
  finalScore: number

  qualification: QualificationLevel
  confidence: number

  qualificationMethod: QualificationMethod

  opportunityTypes: OpportunityType[]

  positiveSignals: string[]
  negativeSignals: string[]
  evidence: LeadEvidence[]
  opportunityReasons: string[]

  recommendedService: RecommendedService
  recommendedApproach: string
  nextAction: string

  summary?: string
  websiteAssessment?: string

  aiProvider: string | null
  aiModel: string | null
  promptVersion: string | null
  inputHash: string

  status: 'COMPLETED' | 'FAILED' | 'SKIPPED'
  errorCode?: string | null
  errorMessage?: string | null

  createdAt: string
  updatedAt: string
}

export interface CompanySocial {
  platform: 'instagram' | 'facebook' | 'linkedin' | 'youtube' | 'tiktok' | 'website' | 'other'
  name: string
  verifiedAt: string
}

export interface Company {
  id: ID
  workspaceId: string
  name: string
  category: string | null
  city: string | null
  state: string | null
  country?: string | null
  address: string | null
  phone: string | null
  whatsapp: string | null
  email?: string | null
  website?: string | null
  instagram?: string | null
  facebook?: string | null
  rating?: number | null
  reviewCount?: number | null
  hours?: string | null
  summary?: string | null
  source?: string | null
  isDemo: boolean
  createdAt: string
  /** Real Discovery (Fase 2) */
  dataStatus?: DataStatus
  sourceType?: string | null
  sourceRecordId?: string | null
  sourceUrl?: string | null
  retrievedAt?: string | null
  lastVerifiedAt?: string | null
  verificationStatus?: 'VERIFIED' | 'UNVERIFIED' | 'CHECK_PENDING' | null
  rawDataId?: string | null
  discoveryConfidence?: DiscoveryConfidence | null
  confidenceReasons?: string[]
  phoneNormalized?: string | null
  phoneCountry?: string | null
  phoneType?: string | null
  whatsappStatus?: WhatsAppStatus | null
  websiteQualityScore?: number | null
  websiteQualityFactors?: ScoreBreakdown[] | null
  websiteCheckedAt?: string | null
  doNotContact?: boolean
  fieldSources?: Record<string, 'SOURCE' | 'MANUAL'>
  socials?: CompanySocial[]
}

export interface WebsiteScan {
  exists: boolean
  status: number | null
  https: boolean
  title: string | null
  description: string | null
  mobileFriendly: boolean | null
  loadable: boolean
  outdatedSignals: number
  checkedAt: string | null
  url?: string | null
  demoOnly?: boolean
  error?: string | null
}

export interface ScoreBreakdown {
  label: string
  points: number
  reason: string
}

export interface OpportunityAnalysis {
  positives: string[]
  problems: string[]
  opportunities: string[]
  recommendation: string
  commercialArgument: string
  whyRecommended: string
}

export interface LeadMessage {
  id: ID
  version: 'short' | 'consultive' | 'direct'
  body: string
  approved: boolean
  used: boolean
  createdAt: string
  editedAt: string | null
}

export interface MessageCheck {
  passed: boolean
  issues: string[]
  regenerated: boolean
}

export interface Lead {
  id: ID
  workspaceId: string
  companyId: string
  campaignId: string | null
  status: LeadStatus
  tier: LeadTier | null
  score: number | null
  scoreBreakdown: ScoreBreakdown[] | null
  websiteStatus: WebsiteStatus
  websiteScan: WebsiteScan | null
  digitalPresenceScore: number | null
  hasWhatsapp: boolean
  hasInstagram: boolean
  hasFacebook: boolean
  hasPhone: boolean
  analysis: OpportunityAnalysis | null
  analysisHash: string | null
  lastAnalyzedAt: string | null
  messages: LeadMessage[]
  proposal: Proposal | null
  favorite: boolean
  tags: string[]
  notesCount: number
  nextAction: string | null
  nextActionAt: string | null
  createdAt: string
  updatedAt: string
}

export interface LeadActivity {
  id: ID
  leadId: ID
  type: ActivityType
  description: string
  detail: string | null
  actor: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface Note {
  id: ID
  leadId: ID
  body: string
  author: string
  createdAt: string
}

export interface Followup {
  id: ID
  leadId: ID
  sequence: number
  scheduledAt: string
  status: 'PENDING' | 'SENT' | 'SKIPPED' | 'DONE'
  messageId: ID | null
  body: string | null
  createdAt: string
}

export interface CampaignCriteria {
  onlyNoWebsite: boolean
  onlyWithWhatsapp: boolean
  onlyWithInstagram: boolean
  minScore: number
  minReviews: number
  minRating: number
}

export interface Campaign {
  id: ID
  workspaceId: string
  name: string
  niche: string
  city: string
  state: string
  country: string
  quantity: number
  keywords: string[]
  criteria: CampaignCriteria
  offer: Offer
  messagePrompt: string
  status: CampaignStatus
  progress: number
  stats: {
    discovered: number
    analyzed: number
    noWebsite: number
    qualified: number
    duplicatesRemoved: number
    contacted: number
    replied: number
  }
  startedAt: string | null
  finishedAt: string | null
  createdAt: string
}

export interface Offer {
  product: string
  price: number
  deliverable: string
  benefit: string
  cta: string
}

export interface Proposal {
  id: ID
  offer: Offer
  description: string
  deadline: string | null
  observations: string | null
  status: ProposalStatus
  createdAt: string
}

export interface Notification {
  id: ID
  type: NotificationType
  title: string
  message: string
  leadId: ID | null
  read: boolean
  createdAt: string
}

export interface Task {
  id: ID
  leadId: ID | null
  title: string
  description: string | null
  assignee: string
  dueAt: string | null
  priority: TaskPriority
  status: TaskStatus
  createdAt: string
}

export interface AgentRun {
  id: ID
  runId: string
  agent: string
  status: AgentStatus
  input: Record<string, unknown>
  output: Record<string, unknown> | null
  error: string | null
  durationMs: number
  retries: number
  startedAt: string
  finishedAt: string | null
}

export interface AiUsage {
  requests: number
  tokensUsed: number
  estimatedCostUsd: number
}

export interface ScoreWeights {
  noWebsite: number
  poorWebsite: number
  greatWebsite: number
  manyReviews: number
  goodRating: number
  instagramActive: number
  facebookActive: number
  hasWhatsapp: number
  hasPhone: number
  activeBusiness: number
  incompleteData: number
}

export interface AutomationRule {
  id: ID
  name: string
  enabled: boolean
  trigger: 'LEAD_NEW' | 'REPLY_RECEIVED' | 'PROPOSAL_SENT'
  conditions: { field: string; operator: string; value: number | string }[]
  actions: string[] // e.g. 'generate_message', 'score_lead'
}

export interface GlobalSettings {
  demoMode: boolean
  masterSwitch: 'ON' | 'OFF' | 'PAUSED'
  scoreWeights: ScoreWeights
  dailyContactLimit: number
  hourlyContactLimit: number
  campaignLimit: number
  cooldownDays: number
  followupIntervalDays: number[]
  followupMax: number
  companyName: string
  aiProvider: string
  language: 'pt-BR'
  dataRetentionDays: number
  cacheHours: number
  /** Real Discovery (Fase 2) */
  discoveryMode?: DiscoveryMode
  dataFreshnessDays?: number
  /** AI Qualification Engine (Fase 3) */
  aiMode?: AIMode
  aiModel?: string
  aiApiKey?: string
  aiBaseUrl?: string
  aiMaxCalls?: number
  aiMaxConcurrency?: number
  promptVersion?: string
  cacheEnabled?: boolean
}

export interface IntegrationStatus {
  key: string
  name: string
  status: 'READY' | 'CONFIGURATION_REQUIRED' | 'DEMO_ONLY'
  configured: boolean
  provider: string | null
  description: string
  envKeys: string[]
}

export interface DiscoveredCompany {
  name: string
  category: string | null
  address: string | null
  city: string | null
  state: string | null
  phone: string | null
  whatsapp: string | null
  website: string | null
  instagram: string | null
  facebook: string | null
  rating: number | null
  reviewCount: number | null
  hours: string | null
  source: string | null
}

export interface AgentDefinition {
  id: string
  name: string
  description: string
  enabled: boolean
  model: string | null
  temperature: number | null
  inputLimit: number
}

export interface AuditEntry {
  id: ID
  actor: string
  action: string
  entity: string
  entityId: string | null
  oldValue: string | null
  newValue: string | null
  createdAt: string
}

export interface DiscoveryRun {
  id: ID
  workspaceId: string
  campaignId: ID | null
  mode: DiscoveryMode
  provider: string
  query: string
  location: string
  requestedLimit: number
  foundCount: number
  processedCount: number
  newCount: number
  duplicateCount: number
  errorCount: number
  status: DiscoveryRunStatus
  startedAt: string
  completedAt: string | null
  errorMessage: string | null
  cancelled?: boolean
  steps: { name: string; at: string }[]
  quota: { used: number; limit: number | null } | null
  costEstimateUsd: number | null
}

export interface DiscoveryResultRow {
  id: ID
  workspaceId: string
  runId: ID
  provider: string
  providerRecordId: string
  rawPayload: Record<string, unknown>
  retrievedAt: string
  status: 'NEW' | 'DUPLICATE' | 'IMPORTED' | 'ERROR'
  companyId: ID | null
  processed: boolean
}

export interface OpportunityQuality {
  level: 'HIGH' | 'MEDIUM' | 'LOW'
  reasons: string[]
  recommendation: string
}

export interface OpportunityAssessment {
  level: 'HIGH' | 'MEDIUM' | 'LOW'
  reasons: string[]
  recommendation: string
}

export interface DiscoveryQuery {
  segment: string
  city: string
  state: string
  country?: string
  limit: number
  mode: DiscoveryMode
  providerId: string
}

/** Fase 5 — Demo Generation Engine */
export type DemoStatus =
  | 'DRAFT'
  | 'ANALYZING'
  | 'GENERATING'
  | 'PREVIEW'
  | 'READY'
  | 'PUBLISHED'
  | 'FAILED'

export interface DemoBrand {
  primaryColor: string
  secondaryColor: string
  fontHeading: string
  fontBody: string
  visualStyle: string
}

export interface DemoContent {
  headline: string
  subheadline: string
  about: string
  services: Array<{ title: string; description: string; price?: string }>
  ctaText: string
  ctaMessage: string
}

export interface Demo {
  id: ID
  leadId: ID
  companyId: ID
  slug: string
  niche: string
  status: DemoStatus
  version: number
  brand: DemoBrand
  content: DemoContent
  deploymentUrl: string | null
  whatsappMessage: string
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

// ============================================================
// PROSPECÇÃO COM IA — Conversa e CRM por empresa
// ============================================================

export type ProspectingStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'REPLIED'
  | 'INTERESTED'
  | 'NEGOTIATION'
  | 'WON'
  | 'NOT_INTERESTED'
  | 'NO_RESPONSE'

export type ProspectingMessageRole =
  | 'USER_SENT'     // mensagem que o vendedor enviou/copiou
  | 'CLIENT'        // resposta do cliente registrada pelo vendedor
  | 'AI_SUGGESTION' // sugestão de resposta da IA
  | 'AI_ANALYSIS'   // análise/instrução da IA
  | 'SYSTEM'        // mensagem do sistema

export interface ProspectingMessage {
  id: ID
  role: ProspectingMessageRole
  content: string
  metadata?: {
    category?: string
    emoji?: string
    whatToDo?: string
    suggestedReply?: string
    showSiteButton?: boolean
    isWon?: boolean
    isLost?: boolean
  }
  createdAt: string
}

export interface ProspectingSession {
  id: ID
  companyId: ID
  status: ProspectingStatus
  messages: ProspectingMessage[]
  openingMessage: string | null
  uiState?: {
    stage: string
    clientInput: string
    instruction: any
  }
  createdAt: string
  updatedAt: string
}

// ============================================================
// GERADOR DE SITES COM AGENTES — Projetos e Versões
// ============================================================

export type SiteGenerationStepStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'ERROR'

export interface SiteGenerationStep {
  id: string
  label: string
  detail: string
  status: SiteGenerationStepStatus
}

export type WebsiteVersionStatus = 'GENERATING' | 'REVIEWING' | 'READY' | 'FAILED'

export interface WebsiteVersion {
  id: ID
  projectId: ID
  version: number
  status: WebsiteVersionStatus
  plan: Record<string, unknown> | null
  files: Record<string, string> | null
  reviewIssues: string[]
  reviewScore: number
  createdAt: string
}

export interface WebsiteProject {
  id: ID
  companyId: ID
  currentVersionId: string | null
  versions: WebsiteVersion[]
  createdAt: string
  updatedAt: string
}