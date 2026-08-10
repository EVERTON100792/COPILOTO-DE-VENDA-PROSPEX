import { env } from '../../config/env'
import { logger } from '../../lib/logger'
import type { MapsProvider, MapsBusiness } from '../types'

export class GooglePlacesProvider implements MapsProvider {
  readonly name = 'google-places'
  async findBusinesses(niche: string, city: string, state: string, limit: number): Promise<MapsBusiness[]> {
    const query = `${niche} em ${city} - ${state}`
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=pt-BR&region=br&key=${env.mapsApiKey}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Google Places ${res.status}`)
    const data = await res.json()
    if (data.status !== 'OK') throw new Error(`Google Places: ${data.status}`)
    const results = (data.results ?? []).slice(0, limit)
    const businesses: MapsBusiness[] = []
    for (const place of results) {
      const detail = await fetchDetails(place.place_id)
      businesses.push({
        name: place.name ?? 'Desconhecido',
        address: place.formatted_address ?? null,
        phone: detail?.formatted_phone_number ?? detail?.international_phone_number ?? null,
        website: detail?.website ?? null,
        rating: place.rating ?? null,
        reviewCount: place.user_ratings_total ?? null,
      })
    }
    return businesses
  }
}

async function fetchDetails(placeId: string): Promise<{ formatted_phone_number?: string; international_phone_number?: string; website?: string }> {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=formatted_phone_number,international_phone_number,website&language=BR&key=${env.mapsApiKey}`
    const res = await fetch(url)
    const data = await res.json()
    return data?.result ?? {}
  } catch {
    return {}
  }
}

class DemoMapsProvider implements MapsProvider {
  readonly name = 'demo-maps'
  async findBusinesses(niche: string, city: string, state: string, limit: number): Promise<MapsBusiness[]> {
    logger.info('MAPS', `Busca demo: ${niche} em ${city}/${state} (limite ${limit})`)
    return []
  }
}

export function getMapsProvider(): MapsProvider {
  if (env.mapsApiKey) return new GooglePlacesProvider()
  return new DemoMapsProvider()
}