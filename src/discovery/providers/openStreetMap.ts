/**
 * OpenStreetMapProvider — FREE REAL DISCOVERY (Fase 2.5)
 *
 * Dados públicos do OpenStreetMap via Overpass API (leitura, sem chave e sem
 * cartão). Geocodificação pontual via Nominatim (1 req por cidade, com cache;
 * NUNCA para bulk discovery). Docs oficiais consultadas:
 *   - Overpass API: https://wiki.openstreetmap.org/wiki/Overpass_API
 *   - Endpoint público: https://overpass-api.de/api/interpreter
 *   - Uso/referência: https://dev.overpass-api.de/overpass-doc/
 *   - Nominatim policy: https://operations.osmfoundation.org/policies/nominatim/
 *   - Política de uso OSMF: https://operations.osmfoundation.org/policies/api/
 *
 * Garantias:
 *  - Nenhuma query com entrada arbitrária do usuário: tags vêm de uma
 *    whitelist (OsmCategoryMapper + OverpassQueryBuilder com sanitização);
 *  - Timeout seguro (AbortController) + retry exponencial SÓ para erros
 *    transitórios (429/502/503/504/network), sem loop infinito;
 *  - Paginação por subdivisão da bounding box (chunks), respeitando
 *    maxRequests/delayMs do provider;
 *  - Atribuição exigida pela licença ODbL: "© OpenStreetMap contributors";
 *  - Resultados SEM rating/reviews (a fonte não fornece) → nunca inventados.
 */

import { getItem, setItem } from '../../database/storage'
import { logger } from '../../lib/logger'
import { ProviderError } from './types'
import type {
  DiscoveryProvider,
  DiscoverySearchParams,
  DiscoverySearchResponse,
  ProviderBusiness,
} from './types'

export const OSM_ATTRIBUTION = '© OpenStreetMap contributors'
export const OSM_LICENSE =
  'Dados © contribuidores do OpenStreetMap — licença ODbL (https://www.openstreetmap.org/copyright).'

export const DEFAULT_OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter'
export const DEFAULT_NOMINATIM_ENDPOINT = 'https://nominatim.openstreetmap.org/search'

export interface BoundingBox {
  south: number
  west: number
  north: number
  east: number
}

/* ------------------------------------------------------------------ */
/* 1. Categoria → tags OSM (whitelist — wiki.openstreetmap.org)        */
/* ------------------------------------------------------------------ */

export interface OsmCategorySpec {
  key: string
  value: string
}

export interface OsmCategory {
  id: string
  label: string
  /** Palavras-chave em pt-BR (fold de acento) para casar a intenção do usuário. */
  keywords: string[]
  /** Combinações (key=value) documentadas no wiki; qualquer match entra. */
  tags: OsmCategorySpec[]
}

/**
 * Whitelist de categorias mapeadas para tags OSM VALIDADOS no wiki oficial.
 * Valores deprecados (ex.: amenity=gym) ficam de fora; usamos os atuais
 * (ex.: leisure=fitness_centre).
 */
export const OSM_CATEGORIES: OsmCategory[] = [
  { id: 'odontologia', label: 'Odontologia', keywords: ['dentista', 'odontolog', 'clinica odontologica', 'ortodontia', 'dental'], tags: [{ key: 'amenity', value: 'dentist' }] },
  { id: 'restaurantes', label: 'Restaurantes', keywords: ['restaurante', 'pizzaria', 'pizza', 'hamburgueria', 'churrascaria', 'comida', 'gastronomia'], tags: [{ key: 'amenity', value: 'restaurant' }] },
  { id: 'cafes', label: 'Cafés', keywords: ['cafe', 'cafeteria', 'coffee', 'confeitaria'], tags: [{ key: 'amenity', value: 'cafe' }] },
  { id: 'bares', label: 'Bares e pubs', keywords: ['bar', 'boteco', 'pub', 'cervejaria'], tags: [{ key: 'amenity', value: 'bar' }, { key: 'amenity', value: 'pub' }] },
  { id: 'academias', label: 'Academias', keywords: ['academia', 'fitness', 'ginastica', 'musculacao', 'crossfit'], tags: [{ key: 'leisure', value: 'fitness_centre' }, { key: 'leisure', value: 'sports_centre' }] },
  { id: 'escolas', label: 'Escolas', keywords: ['escola', 'colegio', 'ensino', 'educacao', 'creche'], tags: [{ key: 'amenity', value: 'school' }, { key: 'amenity', value: 'kindergarten' }] },
  { id: 'clinicas', label: 'Clínicas de saúde', keywords: ['clinica medica', 'clinica de saude', 'clinica', 'saude'], tags: [{ key: 'amenity', value: 'clinic' }, { key: 'healthcare', value: 'clinic' }] },
  { id: 'imobiliarias', label: 'Imobiliárias', keywords: ['imobiliaria', 'imoveis', 'corretor'], tags: [{ key: 'shop', value: 'estate_agent' }] },
  { id: 'saloes', label: 'Salões de beleza', keywords: ['salão de beleza', 'salao de beleza', 'beleza', 'cabeleireiro'], tags: [{ key: 'shop', value: 'beauty' }] },
  { id: 'barbearias', label: 'Barbearias', keywords: ['barbearia', 'barbeiro', 'cabelereiro masculino'], tags: [{ key: 'shop', value: 'barber' }] },
  { id: 'oficinas', label: 'Oficinas mecânicas', keywords: ['oficina', 'mecanica', 'automotiva'], tags: [{ key: 'shop', value: 'car_repair' }] },
  { id: 'advogados', label: 'Advogados', keywords: ['advogado', 'advocacia', 'juridico'], tags: [{ key: 'office', value: 'lawyer' }] },
  { id: 'contadores', label: 'Contadores', keywords: ['contador', 'contabilidade', 'escritorio contabil'], tags: [{ key: 'office', value: 'accountant' }] },
  { id: 'hoteis', label: 'Hotéis e pousadas', keywords: ['hotel', 'pousada', 'hostel', 'motel', 'hospedagem'], tags: [{ key: 'tourism', value: 'hotel' }, { key: 'tourism', value: 'guest_house' }, { key: 'tourism', value: 'motel' }, { key: 'tourism', value: 'hostel' }] },
  { id: 'varejo', label: 'Lojas de varejo', keywords: ['loja', 'varejo', 'conveniencia', 'variedades'], tags: [{ key: 'shop', value: 'convenience' }, { key: 'shop', value: 'variety_store' }] },
  { id: 'estetica', label: 'Estética', keywords: ['estetica', 'depilacao', 'manicure', 'spa'], tags: [{ key: 'shop', value: 'beauty' }, { key: 'amenity', value: 'beauty_salon' }] },
  { id: 'pet', label: 'Pet shops e veterinária', keywords: ['pet shop', 'petshop', 'pet', 'veterinaria', 'animal'], tags: [{ key: 'shop', value: 'pet' }, { key: 'amenity', value: 'veterinary' }] },
  { id: 'construtoras', label: 'Construtoras', keywords: ['construtora', 'construcao civil', 'materiais de construcao'], tags: [{ key: 'shop', value: 'building_supplies' }] },
  { id: 'mercados', label: 'Mercados', keywords: ['mercado', 'supermercado', 'mercearia', 'minimercado'], tags: [{ key: 'shop', value: 'supermarket' }, { key: 'shop', value: 'convenience' }] },
  { id: 'farmacias', label: 'Farmácias', keywords: ['farmacia', 'drogaria', 'dosagem'], tags: [{ key: 'amenity', value: 'pharmacy' }] },
  { id: 'consultorias', label: 'Consultorias', keywords: ['consultoria', 'consultor', 'gestao'], tags: [{ key: 'office', value: 'consulting' }] },
  { id: 'fotografia', label: 'Fotografia', keywords: ['fotografia', 'fotografo', 'estudio fotografico'], tags: [{ key: 'craft', value: 'photographer' }] },
  { id: 'padarias', label: 'Padarias', keywords: ['padaria', 'panificadora', 'confeitaria'], tags: [{ key: 'shop', value: 'bakery' }] },
]

const FOLD = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export function resolveOsmCategory(segment: string): OsmCategory | null {
  const seg = FOLD(segment)
  if (!seg) return null
  for (const cat of OSM_CATEGORIES) {
    for (const kw of cat.keywords) {
      const k = FOLD(kw)
      if (seg.includes(k) || k.includes(seg)) return cat
    }
  }
  return null
}

export const OSM_SUPPORTED_LABELS = OSM_CATEGORIES.map((c) => `${c.label} (${c.tags.map((t) => `${t.key}=${t.value}`).join(', ')})`)

/* ------------------------------------------------------------------ */
/* 2. Query Builder Overpass (sanitização total)                       */
/* ------------------------------------------------------------------ */

export function sanitizeBBox(raw: BoundingBox): BoundingBox {
  const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v))
  let south = clamp(Number(raw.south) || 0, -90, 90)
  let west = clamp(Number(raw.west) || 0, -180, 180)
  let north = clamp(Number(raw.north) || 0, -90, 90)
  let east = clamp(Number(raw.east) || 0, -180, 180)
  if (south >= north) south = north - 0.001
  if (west >= east) east = west + 0.001
  return { south, west, north, east }
}

const VALID_KEY = /^[a-z0-9_]+$/

export function buildOverpassQuery(
  tags: OsmCategorySpec[],
  bbox: BoundingBox,
  opts: { timeoutSec?: number; pageSize?: number } = {}
): string {
  const timeoutSec = Math.min(60, Math.max(10, opts.timeoutSec ?? 25))
  const pageSize = Math.min(200, Math.max(1, opts.pageSize ?? 100))
  const b = sanitizeBBox(bbox)

  const byKey = new Map<string, string[]>()
  for (const spec of tags) {
    if (!VALID_KEY.test(spec.key.trim())) continue
    const esc = spec.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const list = byKey.get(spec.key) ?? []
    list.push(esc)
    byKey.set(spec.key, list)
  }

  const s = b.south.toFixed(6)
  const w = b.west.toFixed(6)
  const n = b.north.toFixed(6)
  const e = b.east.toFixed(6)

  const statements = [...byKey.entries()]
    .map(([key, values]) => {
      const filter = `"${key}"~"^(${values.join('|')})$"`
      return `  nwr[${filter}](${s},${w},${n},${e});`
    })
    .join('\n')

  return `[out:json][timeout:${timeoutSec}];\n(\n${statements}\n);\nout center ${pageSize};`
}

/* ------------------------------------------------------------------ */
/* 3. Parser de elementos OSM → ProviderBusiness                       */
/* ------------------------------------------------------------------ */

export interface OsmElement {
  type?: 'node' | 'way' | 'relation'
  id?: number
  lat?: number
  lon?: number
  center?: { lat?: number; lon?: number }
  tags?: Record<string, string>
}

function onlyHttpUrl(v: string | undefined): string | null {
  if (!v) return null
  const m = /^https?:\/\//i.exec(v.trim())
  if (!m) return null
  try {
    return new URL(v.trim()).href
  } catch {
    return null
  }
}

function pickTag(tags: Record<string, string>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = tags[k]
    if (v && v.trim()) return v.trim()
  }
  return undefined
}

export function parseOsmBusiness(
  el: OsmElement,
  ctx: { fallbackCity?: string | null; fallbackState?: string | null; country?: string | null } = {}
): ProviderBusiness | null {
  if (!el || (el.type !== 'node' && el.type !== 'way' && el.type !== 'relation') || !Number.isFinite(el.id)) {
    return null
  }
  const tags = el.tags ?? {}
  const name = pickTag(tags, ['name', 'official_name', 'brand', 'operator'])
  if (!name) return null

  const lat = el.type === 'node' ? el.lat : el.center?.lat
  const lon = el.type === 'node' ? el.lon : el.center?.lon

  const house = pickTag(tags, ['addr:housenumber'])
  const street = pickTag(tags, ['addr:street'])
  const addressParts = [street && house ? `${street}, ${house}` : house ?? street, pickTag(tags, ['addr:suburb']), pickTag(tags, ['addr:postcode'])].filter(Boolean)
  const address = addressParts.length > 0 ? addressParts.join(' — ') : null

  return {
    provider: 'openstreetmap',
    providerRecordId: `osm:${el.type}:${el.id}`,
    name,
    category: null, // preenchido pelo provider com a categoria detectada
    address,
    phone: pickTag(tags, ['contact:phone', 'phone']) ?? null,
    website: pickTag(tags, ['contact:website', 'website']) ?? null,
    instagram: onlyHttpUrl(pickTag(tags, ['contact:instagram', 'instagram'])),
    facebook: onlyHttpUrl(pickTag(tags, ['contact:facebook', 'facebook'])),
    email: pickTag(tags, ['contact:email', 'email']) ?? null,
    rating: null,
    reviewCount: null,
    hours: pickTag(tags, ['opening_hours']) ?? null,
    city: pickTag(tags, ['addr:city']) ?? ctx.fallbackCity ?? null,
    state: pickTag(tags, ['addr:state']) ?? ctx.fallbackState ?? null,
    country: ctx.country ?? 'BR',
    sourceUrl: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    lat,
    lon,
    raw: el as unknown as Record<string, unknown>,
  }
}

/* ------------------------------------------------------------------ */
/* 4. Geocodificação (Nominatim, 1 req/s + cache localStorage)         */
/* ------------------------------------------------------------------ */

export interface GeocodeResult {
  lat: number
  lon: number
  bbox: BoundingBox
  displayName: string
  provider: 'nominatim'
  retrievedAt: string
}

interface NominatimBody {
  lat?: string
  lon?: string
  boundingbox?: string[]
  display_name?: string
}

export function geocodeCacheKey(city: string, state: string, country: string): string {
  return `geocode_${country}_${state}_${city}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]/g, '')
}

let lastNominatimAt = 0

export async function geocodeCity(
  params: { city: string; state: string; country?: string },
  endpoints: { nominatimEndpoint: string },
  opts: { fetchImpl?: typeof fetch } = {}
): Promise<GeocodeResult> {
  const city = params.city.trim()
  const state = params.state.trim()
  const country = params.country ?? 'BR'
  if (!city) throw new ProviderError('Cidade é obrigatória para a busca no OpenStreetMap.', { retryable: false })

  const key = geocodeCacheKey(city, state, country)
  const cached = getItem<GeocodeResult | null>(key, null)
  if (cached && cached.bbox && Number.isFinite(cached.bbox.south) && Number.isFinite(cached.bbox.east)) {
    return cached
  }

  const q = [city, state, country === 'BR' ? 'Brasil' : country].filter(Boolean).join(', ')
  const url = `${endpoints.nominatimEndpoint}?q=${encodeURIComponent(q)}&format=jsonv2&limit=1&accept-language=pt-BR&countrycodes=${country.toLowerCase()}`
  const fetcher = opts.fetchImpl ?? fetch

  // Política do Nominatim: máximo 1 requisição por segundo por cliente.
  const wait = Math.max(0, 1100 - (Date.now() - lastNominatimAt))
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastNominatimAt = Date.now()

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 15000)
  let res: Response
  try {
    res = await fetcher(url, { signal: controller.signal, headers: { Accept: 'application/json' } })
  } catch (e) {
    throw new ProviderError('Não foi possível consultar o geocodificador (Nominatim) neste momento.', { retryable: true, cause: e })
  } finally {
    clearTimeout(timer)
  }

  if (res.status === 429) {
    throw new ProviderError('Limite do geocodificador atingido. Aguarde um instante e tente novamente.', { retryable: true, statusCode: 429 })
  }
  if (!res.ok) {
    throw new ProviderError(`O geocodificador respondeu com erro (HTTP ${res.status}).`, { retryable: res.status >= 500, statusCode: res.status })
  }

  let body: unknown
  try {
    body = await res.json()
  } catch (e) {
    throw new ProviderError('Resposta inválida do geocodificador.', { retryable: false, cause: e })
  }
  const first: NominatimBody | undefined = Array.isArray(body) ? (body as NominatimBody[])[0] : undefined
  if (!first || !Array.isArray(first.boundingbox) || first.boundingbox.length < 4) {
    throw new ProviderError(`Não foi possível localizar "${q}" nas fontes públicas. Confira o nome da cidade.`, { retryable: false })
  }

  const [s, n, w, e] = first.boundingbox.map(Number)
  const result: GeocodeResult = {
    lat: Number(first.lat),
    lon: Number(first.lon),
    bbox: sanitizeBBox({ south: s, west: w, north: n, east: e }),
    displayName: first.display_name ?? q,
    provider: 'nominatim',
    retrievedAt: new Date().toISOString(),
  }
  setItem(key, result)
  return result
}

/* ------------------------------------------------------------------ */
/* 5. Paginação por quadrantes (chunks)                                */
/* ------------------------------------------------------------------ */

function quadrantOf(bbox: BoundingBox, i: number): BoundingBox {
  const midLat = (bbox.south + bbox.north) / 2
  const midLon = (bbox.west + bbox.east) / 2
  switch (i % 4) {
    case 0: return { south: bbox.south, west: bbox.west, north: midLat, east: midLon }
    case 1: return { south: midLat, west: bbox.west, north: bbox.north, east: midLon }
    case 2: return { south: bbox.south, west: midLon, north: midLat, east: bbox.east }
    default: return { south: midLat, west: midLon, north: bbox.north, east: bbox.east }
  }
}

function boxForPath(b: BoundingBox, path: number[]): BoundingBox {
  let cur = { ...b }
  for (const i of path) cur = quadrantOf(cur, i)
  return cur
}

function decodeQueue(token: string | null | undefined): number[][] {
  if (!token) return []
  try {
    const parsed: unknown = JSON.parse(token)
    if (!Array.isArray(parsed)) return []
    return (parsed as string[])
      .map((p) => (typeof p === 'string' ? [...p].map((c) => Number(c)) : []))
      .filter((path) => path.length > 0 && path.every((n) => Number.isInteger(n) && n >= 0 && n <= 3))
  } catch {
    return []
  }
}

function encodeQueue(queue: number[][]): string {
  return JSON.stringify(queue.map((p) => p.join('')))
}

const RETRYABLE_STATUS = new Set([429, 502, 503, 504])
const RETRY_DELAYS = [1200, 3000, 8000]

export interface OpenStreetMapProviderOptions {
  overpassEndpoint?: string
  nominatimEndpoint?: string
  timeoutMs?: number
  maxDepth?: number
  fetchImpl?: typeof fetch
}

export class OpenStreetMapProvider implements DiscoveryProvider {
  readonly id = 'openstreetmap'
  readonly name = 'OpenStreetMap (Overpass)'
  readonly description = 'Empresas reais mapeadas publicamente pelo OpenStreetMap via Overpass — sem API key, sem cartão.'
  readonly tier = 'free'
  readonly needsConfig = false
  readonly rateLimit = { maxRequests: 12, delayMs: 400 }

  private readonly overpassEndpoint: string
  private readonly nominatimEndpoint: string
  private readonly timeoutMs: number
  private readonly maxDepth: number
  private readonly fetchImpl: typeof fetch

  constructor(opts: OpenStreetMapProviderOptions = {}) {
    this.overpassEndpoint = opts.overpassEndpoint ?? DEFAULT_OVERPASS_ENDPOINT
    this.nominatimEndpoint = opts.nominatimEndpoint ?? DEFAULT_NOMINATIM_ENDPOINT
    this.timeoutMs = opts.timeoutMs ?? 45000
    this.maxDepth = opts.maxDepth ?? 3
    this.fetchImpl = opts.fetchImpl ?? fetch
  }

  isConfigured(): boolean {
    return true
  }

  async search(params: DiscoverySearchParams): Promise<DiscoverySearchResponse> {
    const category = resolveOsmCategory(params.segment)
    if (!category) {
      throw new ProviderError(
        `A categoria "${params.segment}" ainda não é suportada pelo OpenStreetMap. Suportadas: ${OSM_CATEGORIES.map((c) => c.label).join(', ')}.`,
        { retryable: false }
      )
    }

    const geo = await geocodeCity(
      { city: params.city, state: params.state, country: params.country },
      { nominatimEndpoint: this.nominatimEndpoint },
      { fetchImpl: this.fetchImpl }
    )

    const limit = Math.min(200, Math.max(1, Math.floor(params.limit)))
    const queue = decodeQueue(params.pageToken)
    const path = queue.shift() ?? []
    const region = boxForPath(geo.bbox, path)

    const query = buildOverpassQuery(category.tags, region, { timeoutSec: 25, pageSize: limit })
    const raw = await this.queryOverpass(query)

    const businesses: ProviderBusiness[] = []
    for (const el of raw.elements ?? []) {
      const parsed = parseOsmBusiness(el, {
        fallbackCity: params.city,
        fallbackState: params.state,
        country: params.country,
      })
      if (!parsed) continue
      parsed.category = category.label
      businesses.push(parsed)
    }

    // Chunk: se a fonte voltou a página cheia, agenda os 4 quadrantes seguintes
    // (limitado pela profundidade máxima para não explodir requisições).
    const nextQueue = [...queue]
    if (businesses.length >= limit && path.length < this.maxDepth) {
      for (let i = 0; i < 4; i++) nextQueue.push(path.concat([i]))
    }

    return {
      businesses,
      nextPageToken: nextQueue.length > 0 ? encodeQueue(nextQueue) : null,
      hasMore: nextQueue.length > 0,
      totalEstimate: null,
    }
  }

  private async queryOverpass(query: string): Promise<{ elements?: OsmElement[] }> {
    const endpoints = [
      this.overpassEndpoint,
      'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
      'https://overpass.openstreetmap.ru/api/interpreter',
    ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i)

    let lastErr: unknown = null

    if (import.meta.env.DEV) {
      logger.info('OSM DEBUG', `Executando consulta Overpass:\n${query}`)
    }

    for (const endpoint of endpoints) {
      for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), this.timeoutMs)
        let res: Response | null = null

        try {
          res = await this.fetchImpl(endpoint, {
            method: 'POST',
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Accept: 'application/json',
            },
            body: `data=${encodeURIComponent(query)}`,
          })
        } catch (e) {
          lastErr = e
          logger.warn('OSM', `Falha de conexão com ${endpoint} (tentativa ${attempt + 1}): ${String(e)}`)
        } finally {
          clearTimeout(timer)
        }

        if (!res) {
          if (attempt < RETRY_DELAYS.length) {
            await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]))
            continue
          }
          break
        }

        const responseText = await res.text().catch(() => '')

        if (res.ok) {
          try {
            return JSON.parse(responseText) as { elements?: OsmElement[] }
          } catch (e) {
            logger.error('OSM', `Resposta de ${endpoint} não é JSON válido:\n${responseText.slice(0, 500)}`)
            throw new ProviderError('Resposta inválida da fonte (Overpass).', { retryable: false, cause: e })
          }
        }

        if (res.status === 400) {
          logger.error(
            'OSM',
            `Overpass HTTP 400 Bad Request em ${endpoint}:\n${responseText.slice(0, 1000)}`,
            `status=${res.status}`
          )
          throw new ProviderError(
            `A fonte rejeitou a consulta (HTTP 400 Bad Request). Verifique os parâmetros de busca.`,
            { retryable: false, statusCode: 400 }
          )
        }

        logger.warn(
          'OSM',
          `Overpass HTTP ${res.status} em ${endpoint}:\n${responseText.slice(0, 500)}`,
          `status=${res.status}`
        )

        const retryable = RETRYABLE_STATUS.has(res.status)
        if (retryable && attempt < RETRY_DELAYS.length) {
          await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]))
          continue
        }
        break
      }
    }

    throw new ProviderError('Não foi possível consultar a fonte (Overpass) neste momento.', { retryable: true, cause: lastErr })
  }
}