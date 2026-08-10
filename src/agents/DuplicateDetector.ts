import { BaseAgent } from './base'
import type { AgentContext, NormalizedDiscovered } from './types'

export interface DuplicateKey {
  kind: 'name' | 'phone' | 'domain'
  value: string
}

export class DuplicateDetector extends BaseAgent {
  readonly name = 'DUPLICATE'
  readonly description = 'Detecta e remove empresas duplicadas'

  protected async runCore(input: Record<string, unknown>): Promise<{ companies: NormalizedDiscovered[]; removed: number }> {
    const companies = (input.companies ?? []) as NormalizedDiscovered[]
    const seen = new Map<string, string>()
    const keep: NormalizedDiscovered[] = []

    for (const c of companies) {
      const keys: string[] = []
      if (c.normalizedName) keys.push(`name:${c.normalizedName}`)
      if (c.normalizedPhone) keys.push(`phone:${c.normalizedPhone}`)
      if (c.domain) keys.push(`domain:${c.domain}`)

      let duplicateOf: string | undefined
      for (const k of keys) {
        if (seen.has(k)) {
          duplicateOf = seen.get(k)
          break
        }
      }
      if (duplicateOf) {
        const existing = keep.find((k) => k.normalizedName === duplicateOf || k.name === duplicateOf)
        if (existing) {
          mergeInto(existing, c)
          continue
        }
      }
      for (const k of keys) seen.set(k, c.normalizedName || c.name)
      keep.push(c)
    }

    return { companies: keep, removed: companies.length - keep.length }
  }
}

function mergeInto(target: NormalizedDiscovered, source: NormalizedDiscovered): void {
  if (!target.phone && source.phone) target.phone = source.phone
  if (!target.whatsapp && source.whatsapp) target.whatsapp = source.whatsapp
  if (!target.website && source.website) target.website = source.website
  if (!target.instagram && source.instagram) target.instagram = source.instagram
  if (!target.facebook && source.facebook) target.facebook = source.facebook
  if (!target.rating && source.rating) target.rating = source.rating
  if (!target.reviewCount && source.reviewCount) target.reviewCount = source.reviewCount
  if (!target.address && source.address) target.address = source.address
  if (source.source) target.source = source.source
  target.complete = target.complete || source.complete
}