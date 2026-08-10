export type IntegrationFeature = 'openstreetmap' | 'maps' | 'search' | 'website' | 'ai' | 'email' | 'whatsapp' | 'storage'

export interface IntegrationStatus {
  key: IntegrationFeature
  name: string
  status: 'READY' | 'CONFIGURATION_REQUIRED' | 'DEMO_ONLY'
  configured: boolean
  provider: string | null
  description: string
  envKeys: string[]
}

export interface AIRequest {
  system: string
  prompt: string
  maxTokens?: number
  temperature?: number
}

export interface AIResponse {
  text: string
  provider: string
  tokens: number
  estimatedCostUsd: number
}

export interface AIProvider {
  readonly name: string
  generate(req: AIRequest): Promise<AIResponse>
}

export interface SearchResult {
  title: string
  url: string | null
  description: string | null
}

export interface SearchProvider {
  readonly name: string
  search(query: string, limit?: number): Promise<SearchResult[]>
}

export interface MapsBusiness {
  name: string
  address: string | null
  phone: string | null
  website: string | null
  rating: number | null
  reviewCount: number | null
}

export interface MapsProvider {
  readonly name: string
  findBusinesses(niche: string, city: string, state: string, limit: number): Promise<MapsBusiness[]>
}

export interface WebsiteScanResult {
  exists: boolean
  status: number | null
  https: boolean
  title: string | null
  description: string | null
  mobileFriendly: boolean | null
  loadable: boolean
  outdatedSignals: number
  checkedAt: string | null
  error: string | null
  url?: string | null
  demoOnly?: boolean
}

export interface WebsiteProvider {
  readonly name: string
  scan(url: string): Promise<WebsiteScanResult>
}

export interface EmailMessage {
  to: string
  subject: string
  body: string
}

export interface EmailProvider {
  readonly name: string
  send(message: EmailMessage): Promise<{ ok: boolean; messageId?: string; error?: string }>
}

export interface WhatsAppProvider {
  readonly name: string
  send(to: string, body: string): Promise<{ ok: boolean; messageId?: string; error?: string }>
}

export const UNVERIFIED = 'Não verificado'
export const NOT_FOUND = 'Não encontrado'