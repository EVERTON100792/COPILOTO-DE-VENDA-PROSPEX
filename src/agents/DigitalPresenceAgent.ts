import { BaseAgent } from './base'
import type { AgentContext, NormalizedDiscovered } from './types'

export interface PresenceResult {
  companyIndex: number
  digitalPresenceScore: number
  channels: {
    website: boolean
    instagram: boolean
    facebook: boolean
    whatsapp: boolean
    googlePresence: boolean
    verified: boolean
  }
}

export class DigitalPresenceAgent extends BaseAgent {
  readonly name = 'PRESENCE'
  readonly description = 'Analisa presença digital'

  protected async runCore(input: Record<string, unknown>): Promise<{ results: PresenceResult[] }> {
    const companies = (input.companies ?? []) as NormalizedDiscovered[]
    const results = companies.map((c, idx) => {
      const hasWebsite = Boolean(c.website)
      const hasInstagram = Boolean(c.instagram)
      const hasFacebook = Boolean(c.facebook)
      const hasWhatsapp = Boolean(c.whatsapp)
      const googlePresence = c.reviewCount !== null && c.reviewCount !== undefined

      let score = 0
      if (hasWebsite) score += 30
      if (hasInstagram) score += 25
      if (hasFacebook) score += 15
      if (hasWhatsapp) score += 15
      if (googlePresence) score += 15
      score = Math.min(100, score)

      return {
        companyIndex: idx,
        digitalPresenceScore: score,
        channels: {
          website: hasWebsite,
          instagram: hasInstagram,
          facebook: hasFacebook,
          whatsapp: hasWhatsapp,
          googlePresence,
          verified: c.complete,
        },
      }
    })
    return { results }
  }
}