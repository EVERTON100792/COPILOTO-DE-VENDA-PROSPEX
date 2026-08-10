/**
 * DiscoveryProvider — contrato de fontes de descoberta (Real Discovery, Fase 2).
 * Frontend NUNCA chama provedores externos diretamente; sempre via
 * DiscoveryService → DiscoveryProvider.
 */

export type DiscoveryProviderTier = 'free' | 'optional' | 'import' | 'demo'

export interface ProviderBusiness {
  provider: string
  providerRecordId: string
  name: string
  category: string | null
  address: string | null
  city: string | null
  state: string | null
  country?: string | null
  phone: string | null
  website: string | null
  instagram: string | null
  facebook: string | null
  email?: string | null
  rating: number | null
  reviewCount: number | null
  hours: string | null
  sourceUrl: string | null
  lat?: number | null
  lon?: number | null
  raw: Record<string, unknown>
}

export interface DiscoverySearchParams {
  segment: string
  city: string
  state: string
  country?: string
  limit: number
  pageToken?: string | null
}

export interface DiscoverySearchResponse {
  businesses: ProviderBusiness[]
  nextPageToken: string | null
  hasMore: boolean
  totalEstimate: number | null
}

export interface ProviderRateLimit {
  maxRequests: number
  delayMs: number
}

export interface DiscoveryProvider {
  readonly id: string
  readonly name: string
  readonly description: string
  /** free = público sem chave · optional = requer config externa · import = CSV · demo = fictício */
  readonly tier: DiscoveryProviderTier
  readonly needsConfig: boolean
  readonly rateLimit?: ProviderRateLimit
  isConfigured(): boolean
  search(params: DiscoverySearchParams): Promise<DiscoverySearchResponse>
}

export class ProviderError extends Error {
  statusCode?: number
  retryable: boolean
  constructor(message: string, opts?: { statusCode?: number; retryable?: boolean; cause?: unknown }) {
    super(message, { cause: opts?.cause })
    this.name = 'ProviderError'
    this.statusCode = opts?.statusCode
    this.retryable = opts?.retryable ?? false
  }
}

export class ProviderNotConfiguredError extends ProviderError {
  constructor(providerName: string) {
    super(`Nenhuma fonte real configurada para ${providerName}.`, { retryable: false })
    this.name = 'ProviderNotConfiguredError'
  }
}