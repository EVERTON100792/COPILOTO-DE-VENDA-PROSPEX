import { BaseAgent } from './base'
import type { AgentContext, Discovered, NormalizedDiscovered } from './types'
import { normalizeName, normalizePhone, extractDomain, normalizeInstagram, normalizeFacebook, detectIncomplete } from './normalize'

export class NormalizerAgent extends BaseAgent {
  readonly name = 'NORMALIZER'
  readonly description = 'Padroniza e valida dados de empresas'

  protected async runCore(input: Record<string, unknown>): Promise<{ companies: NormalizedDiscovered[] }> {
    const raw = (input.companies ?? []) as Discovered[]
    const companies: NormalizedDiscovered[] = raw.map((c) => {
      const name = (c.name || '').trim()
      const normalizedName = normalizeName(name)
      const normalizedPhone = normalizePhone(c.phone ?? c.whatsapp)
      const domain = extractDomain(c.website)
      return {
        ...c,
        name,
        phone: c.phone ? String(c.phone).trim() : null,
        whatsapp: c.whatsapp ? String(c.whatsapp).trim() : null,
        website: c.website ? String(c.website).trim().toLowerCase() : null,
        instagram: normalizeInstagram(c.instagram),
        facebook: normalizeFacebook(c.facebook),
        city: c.city ? String(c.city).trim() : null,
        state: c.state ? String(c.state).trim().toUpperCase() : null,
        normalizedName,
        normalizedPhone,
        domain,
        complete: !detectIncomplete({ name, city: c.city, phone: c.phone, whatsapp: c.whatsapp }),
      }
    })
    return { companies }
  }
}