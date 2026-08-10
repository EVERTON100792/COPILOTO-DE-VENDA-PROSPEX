/**
 * GooglePlacesProvider — integração REAL de descoberta.
 *
 * API oficial documentada (não-burla proteções, sem endpoints privados):
 *   Google Places API (New) — Text Search
 *   POST https://places.googleapis.com/v1/places:searchText
 *   Autenticação: header X-Goog-Api-Key
 *   Paginação: pageToken → nextPageToken (campo solicitado via X-Goog-FieldMask)
 *   Campos: id, displayName, formattedAddress, internationalPhoneNumber,
 *           websiteUri, rating, userRatingCount, googleMapsUri, businessStatus
 *
 * Configuração (Google Cloud Console):
 *   1. Criar projeto + habilitar "Places API (New)".
 *   2. Gerar API Key com restrição por domínio/IP.
 *   3. Definir VITE_MAPS_API_KEY (ou salvar a chave na página Integrações).
 * Custo: cobrança da Google por chamada — consulte a tabela oficial de preços.
 * O sistema NÃO inventa cota nem custo: sem resposta oficial, exibe "não informado".
 */

import { ProviderError, ProviderNotConfiguredError } from './types'
import type {
  DiscoveryProvider,
  DiscoverySearchParams,
  DiscoverySearchResponse,
  ProviderBusiness,
} from './types'

const ENDPOINT = 'https://places.googleapis.com/v1/places:searchText'
const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.googleMapsUri',
  'places.businessStatus',
  'nextPageToken',
].join(',')

interface PlaceRaw {
  id?: string
  displayName?: { text?: string; languageCode?: string }
  formattedAddress?: string
  internationalPhoneNumber?: string
  websiteUri?: string
  rating?: number
  userRatingCount?: number
  googleMapsUri?: string
  businessStatus?: string
}

export class GooglePlacesProvider implements DiscoveryProvider {
  readonly id = 'google-places'
  readonly name = 'Google Places (API oficial)'
  readonly description =
    'Text Search da Places API (New). Requer VITE_MAPS_API_KEY ou chave salva em Integrações.'
  readonly tier = 'optional'
  readonly needsConfig = true
  readonly rateLimit = { maxRequests: 30, delayMs: 500 }

  constructor(private readonly getApiKey: () => string | undefined) {}

  isConfigured(): boolean {
    return Boolean(this.getApiKey()?.trim())
  }

  async search(params: DiscoverySearchParams): Promise<DiscoverySearchResponse> {
    const key = this.getApiKey()?.trim()
    if (!key) throw new ProviderNotConfiguredError(this.name)

    const textQuery = `${params.segment} em ${params.city}, ${params.state}${params.country ? `, ${params.country}` : ''}`
    const body: Record<string, unknown> = {
      textQuery,
      languageCode: 'pt-BR',
      regionCode: (params.country ?? 'BR').toUpperCase(),
    }
    if (params.pageToken) body.pageToken = params.pageToken

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 20000)
    let res: Response
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': FIELD_MASK,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
    } catch (e) {
      clearTimeout(timer)
      throw new ProviderError('Não foi possível consultar a fonte neste momento.', {
        retryable: true,
        cause: e,
      })
    }
    clearTimeout(timer)

    if (res.status === 429) {
      throw new ProviderError(
        'Limite de cota/rate da fonte atingido. Aguarde e tente novamente.',
        { statusCode: 429, retryable: true }
      )
    }
    if (res.status === 403) {
      throw new ProviderError('Acesso negado pela fonte (chave inválida ou billing não ativado).', {
        statusCode: 403,
        retryable: false,
      })
    }
    if (!res.ok) {
      throw new ProviderError(`Falha na fonte (HTTP ${res.status}).`, { statusCode: res.status, retryable: false })
    }

    let json: { places?: PlaceRaw[]; nextPageToken?: string }
    try {
      json = (await res.json()) as { places?: PlaceRaw[]; nextPageToken?: string }
    } catch (e) {
      throw new ProviderError('Resposta da fonte inválida.', { retryable: false, cause: e })
    }

    const businesses: ProviderBusiness[] = (json.places ?? []).map((p) => ({
      provider: this.id,
      providerRecordId: p.id ?? '',
      name: p.displayName?.text?.trim() || 'Sem nome',
      category: null,
      address: p.formattedAddress ?? null,
      city: params.city, // localização implícita na consulta (fonte não a informa)
      state: params.state,
      country: (params.country ?? 'BR').toUpperCase(),
      phone: p.internationalPhoneNumber ?? null,
      website: p.websiteUri ?? null,
      instagram: null,
      facebook: null,
      rating: p.rating ?? null,
      reviewCount: p.userRatingCount ?? null,
      hours: null,
      sourceUrl: p.googleMapsUri ?? null,
      raw: { ...p } as unknown as Record<string, never>,
    }))

    return {
      businesses,
      nextPageToken: json.nextPageToken ?? null,
      hasMore: Boolean(json.nextPageToken),
      totalEstimate: null,
    }
  }
}