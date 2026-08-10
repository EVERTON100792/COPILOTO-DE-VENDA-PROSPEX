import { logger } from '../../lib/logger'
import { withRetry } from '../../lib/retry'
import { sanitizeUrl } from './scanner'
import type { WebsiteProvider, WebsiteScanResult } from '../types'

export { sanitizeUrl }

const OUTDATED_TERMS = [
  'em construcao', 'em construção', 'criado com wix', 'wix site', 'powered by',
  '© 201', '© 200', '© 199', 'última atualização: 201', 'última atualização: 200',
]

export class BuiltinWebsiteProvider implements WebsiteProvider {
  readonly name = 'builtin-http'
  async scan(url: string): Promise<WebsiteScanResult> {
    const target = sanitizeUrl(url)
    const result: WebsiteScanResult = {
      exists: false,
      status: null,
      https: false,
      title: null,
      description: null,
      mobileFriendly: null,
      loadable: false,
      outdatedSignals: 0,
      checkedAt: null,
      error: null,
    }
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 12000)
      const res = await fetch(target, { method: 'GET', redirect: 'follow', signal: ctrl.signal })
      clearTimeout(timer)
      result.status = res.status
      result.exists = res.ok || res.status === 301 || res.status === 302
      result.loadable = res.ok
      result.https = res.url?.startsWith('https://') ?? target.startsWith('https://')
      result.checkedAt = new Date().toISOString()
      if (res.ok) {
        try {
          const html = await res.text()
          const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
          if (title) result.title = title[1].trim().slice(0, 200)
          const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)
          if (desc) result.description = desc[1].trim().slice(0, 300)
          const low = html.toLowerCase()
          if (/<meta[^>]+name=["']viewport/i.test(low)) {
            result.mobileFriendly = /width=device-width|initial-scale=1/i.test(low)
          } else {
            result.mobileFriendly = false
          }
          result.outdatedSignals = OUTDATED_TERMS.reduce((acc, term) => (low.includes(term) ? acc + 1 : acc), 0)
        } catch {
          result.mobileFriendly = null
        }
      }
      return result
    } catch (e) {
      result.error = e instanceof Error ? e.message : String(e)
      result.loadable = false
      result.exists = false
      result.checkedAt = new Date().toISOString()
      return result
    }
  }
}

class DemoWebsiteProvider implements WebsiteProvider {
  readonly name = 'demo-scan'
  async scan(url: string): Promise<WebsiteScanResult> {
    logger.info('WEBSITE', `Scan demo de ${url}`)
    return {
      exists: false,
      status: null,
      https: false,
      title: null,
      description: null,
      mobileFriendly: null,
      loadable: false,
      outdatedSignals: 0,
      checkedAt: new Date().toISOString(),
      error: null,
    }
  }
}

export function getWebsiteProvider(): WebsiteProvider {
  return new BuiltinWebsiteProvider()
}

export async function scanWebsite(url: string): Promise<WebsiteScanResult> {
  const provider = getWebsiteProvider()
  try {
    return await withRetry(() => provider.scan(url), { maxRetries: 2, label: 'WEBSITE' })
  } catch (e) {
    logger.error('WEBSITE', 'Falha ao escanear site', e instanceof Error ? e.message : String(e))
    return {
      exists: false,
      status: null,
      https: false,
      title: null,
      description: null,
      mobileFriendly: null,
      loadable: false,
      outdatedSignals: 0,
      checkedAt: new Date().toISOString(),
      error: null,
    }
  }
}

export function classifyScan(scan: WebsiteScanResult): 'NO_WEBSITE' | 'WEBSITE_FOUND' | 'WEBSITE_UNVERIFIED' | 'WEBSITE_BROKEN' | 'WEBSITE_OUTDATED' | 'WEBSITE_POOR_MOBILE' | 'WEBSITE_UNKNOWN' {
  if (!scan.exists && scan.status === null) return 'WEBSITE_UNKNOWN'
  if (!scan.exists) return 'WEBSITE_BROKEN'
  if (scan.outdatedSignals > 1) return 'WEBSITE_OUTDATED'
  if (scan.mobileFriendly === false) return 'WEBSITE_POOR_MOBILE'
  if (scan.loadable && scan.title) return 'WEBSITE_FOUND'
  return 'WEBSITE_UNVERIFIED'
}