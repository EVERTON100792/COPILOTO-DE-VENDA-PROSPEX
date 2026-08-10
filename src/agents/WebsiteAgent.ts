import { BaseAgent } from './base'
import type { AgentContext } from './types'
import type { NormalizedDiscovered } from './types'
import { getWebsiteProvider } from '../integrations/website'
import type { WebsiteScanResult } from '../integrations/types'
import type { WebsiteStatus } from '../types'

export interface CompanyWebsiteResult {
  companyIndex: number
  websiteStatus: WebsiteStatus
  scan: WebsiteScanResult | null
}

export class WebsiteAgent extends BaseAgent {
  readonly name = 'WEBSITE'
  readonly description = 'Verifica presença e qualidade de sites'

  protected async runCore(input: Record<string, unknown>, ctx: AgentContext): Promise<{ results: CompanyWebsiteResult[] }> {
    const companies = (input.companies ?? []) as NormalizedDiscovered[]
    const results: CompanyWebsiteResult[] = []
    const provider = getWebsiteProvider()

    for (let i = 0; i < companies.length; i++) {
      const c = companies[i]
      if (!c.website) {
        results.push({ companyIndex: i, websiteStatus: 'NO_WEBSITE', scan: null })
        continue
      }
      if (ctx.demoMode) {
        results.push({
          companyIndex: i,
          websiteStatus: 'WEBSITE_FOUND',
          scan: {
            exists: true,
            status: 200,
            https: true,
            title: null,
            description: null,
            mobileFriendly: true,
            loadable: true,
            outdatedSignals: 0,
            checkedAt: new Date().toISOString(),
            error: null,
            demoOnly: true,
            url: c.website,
          },
        })
        continue
      }
      try {
        const scan = await provider.scan(c.website)
        results.push({ companyIndex: i, websiteStatus: classifyReal(scan), scan })
      } catch {
        results.push({
          companyIndex: i,
          websiteStatus: 'WEBSITE_UNKNOWN',
          scan: {
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
          },
        })
      }
    }
    return { results }
  }
}

function classifyReal(scan: WebsiteScanResult): WebsiteStatus {
  if (!scan.exists) return 'WEBSITE_UNKNOWN'
  if (scan.outdatedSignals > 1) return 'WEBSITE_OUTDATED'
  if (scan.mobileFriendly === false) return 'WEBSITE_POOR_MOBILE'
  if (scan.loadable) return 'WEBSITE_FOUND'
  return 'WEBSITE_UNVERIFIED'
}