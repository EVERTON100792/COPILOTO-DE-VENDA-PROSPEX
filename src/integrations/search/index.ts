import { env } from '../../config/env'
import { logger } from '../../lib/logger'
import { withRetry } from '../../lib/retry'
import type { SearchProvider, SearchResult } from '../types'

export class SerpApiProvider implements SearchProvider {
  readonly name = 'serpapi'
  async search(query: string, limit = 5): Promise<SearchResult[]> {
    const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&num=${limit}&api_key=${env.searchApiKey}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`SerpAPI ${res.status}`)
    const data = await res.json()
    return (data?.organic_results ?? []).map((r: { title?: string; link?: string; snippet?: string }) => ({
      title: r.title ?? '',
      url: r.link ?? null,
      description: r.snippet ?? null,
    }))
  }
}

class DemoSearchProvider implements SearchProvider {
  readonly name = 'demo-search'
  async search(query: string): Promise<SearchResult[]> {
    logger.info('SEARCH', `Busca demo para: ${query}`)
    return []
  }
}

export function getSearchProvider(): SearchProvider {
  if (env.searchApiKey && env.searchProvider === 'serpapi') return new SerpApiProvider()
  return new DemoSearchProvider()
}

export async function searchWeb(query: string, limit = 5): Promise<SearchResult[]> {
  const provider = getSearchProvider()
  try {
    return await withRetry(() => provider.search(query, limit), {
      maxRetries: 2,
      label: `SEARCH:${provider.name}`,
    })
  } catch (e) {
    logger.error('SEARCH', 'Falha ao consultar buscador', e instanceof Error ? e.message : String(e))
    return []
  }
}