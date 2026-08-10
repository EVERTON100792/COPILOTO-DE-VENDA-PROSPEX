/**
 * DiscoveryProvider registry + config local de chaves.
 *
 * Tiers (Fase 2.5 — FREE DISCOVERY):
 *   free     → público, sem chave (OpenStreetMap) — nunca bloqueado
 *   optional → requer configuração externa (Google Places)
 *   import   → CSV (sem classe Discovery — importação dedicada)
 *   demo     → mock (somente modo DEMO/testes)
 *
 * A chave do Google vem do ambiente (VITE_MAPS_API_KEY) ou de chave salva
 * manualmente na página Integrações. Nunca exposta na UI.
 */

import { env } from '../config/env'
import { GooglePlacesProvider } from './providers/googlePlaces'
import { MockDiscoveryProvider } from './providers/mock'
import { OpenStreetMapProvider } from './providers/openStreetMap'
import type { DiscoveryProvider, DiscoveryProviderTier } from './providers/types'

const KEY_PREFIX = 'prospex_provider_key_'

export function getSavedKey(providerId: string): string | undefined {
  try {
    return localStorage.getItem(KEY_PREFIX + providerId) ?? undefined
  } catch {
    return undefined
  }
}

export function saveProviderKey(providerId: string, key: string): void {
  try {
    localStorage.setItem(KEY_PREFIX + providerId, key.trim())
  } catch {
    /* storage indisponível */
  }
}

export function clearProviderKey(providerId: string): void {
  try {
    localStorage.removeItem(KEY_PREFIX + providerId)
  } catch {
    /* noop */
  }
}

export function getDiscoveryKey(providerId: string): string | undefined {
  if (providerId === 'google-places') {
    return env.mapsApiKey ?? getSavedKey('google-places') ?? undefined
  }
  return undefined
}

/** Fonte CSV — descrita no catálogo (Integrações) sem classe Discovery. */
export interface CatalogProvider {
  id: string
  name: string
  description: string
  tier: DiscoveryProviderTier
  needsConfig: boolean
}

export const CSV_CATALOG_ENTRY: CatalogProvider = {
  id: 'csv',
  name: 'Importação CSV',
  description: 'Importa sua própria lista de empresas (nome, telefone, cidade, site). Marca como IMPORTED.',
  tier: 'import',
  needsConfig: false,
}

export function createDiscoveryProviders(): DiscoveryProvider[] {
  return [
    new OpenStreetMapProvider({
      overpassEndpoint: env.overpassEndpoint,
      nominatimEndpoint: env.nominatimEndpoint,
    }),
    new GooglePlacesProvider(() => getDiscoveryKey('google-places')),
    new MockDiscoveryProvider(),
  ]
}

/** Catálogo completo para a página Integrações (inclui CSV). */
export function createDiscoveryCatalog(): (DiscoveryProvider | CatalogProvider)[] {
  return [...createDiscoveryProviders(), CSV_CATALOG_ENTRY]
}

export function getDiscoveryProvider(id: string): DiscoveryProvider | null {
  return createDiscoveryProviders().find((p) => p.id === id) ?? null
}

/** Providers aptos para modo REAL: tier ≠ demo E (sem config ou configurado). */
export function getAvailableRealProviders(): DiscoveryProvider[] {
  return createDiscoveryProviders().filter((p) => p.tier !== 'demo' && (!p.needsConfig || p.isConfigured()))
}

/** Provider REAL recomendado (prioridade: free primeiro). */
export function getRecommendedRealProvider(): DiscoveryProvider | null {
  const available = getAvailableRealProviders()
  return (available.find((p) => p.tier === 'free') ?? available[0] ?? null)
}

export function providerLabel(id: string): string {
  if (id === 'openstreetmap' || id === 'osm') return 'OpenStreetMap'
  if (id === 'google-places') return 'Google Places'
  if (id === 'mock') return 'Dataset demo'
  if (id === 'csv') return 'CSV'
  return id
}

export function tierLabel(tier: DiscoveryProviderTier): string {
  return { free: 'GRÁTIS', optional: 'OPCIONAL', import: 'IMPORTAÇÃO', demo: 'DEMO' }[tier]
}

export type { DiscoveryProviderTier }