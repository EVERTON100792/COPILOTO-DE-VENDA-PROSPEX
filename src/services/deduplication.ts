/**
 * DeduplicationService — Real Discovery (Fase 2)
 * Identifica empresas repetidas com níveis de confiança.
 * Prioridade: provider_record_id → telefone → domínio → nome+endereço.
 * NUNCA une automaticamente com confiança baixa.
 */

import type { Company, DiscoveryConfidence } from '../types'
import { normalizeName, normalizePhone, digitsOf, hostnameOf } from './normalization'

export interface DedupCandidate {
  providerRecordId?: string | null
  name: string
  phone?: string | null
  website?: string | null
  city?: string | null
  address?: string | null
}

export interface DedupResult {
  candidate: DedupCandidate
  duplicateOf: string | null
  confidence: DiscoveryConfidence
  reason: string | null
}

/** Similaridade baseada em conjuntos de palavras (Dice coefficient), insensível a acentos e stopwords. */
const FOLD = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
const STOPWORDS = new Set(['do', 'da', 'de', 'das', 'dos', 'e', 'o', 'a', 'os', 'as', 'em', 'na', 'no'])
export function wordSimilarity(a: string, b: string): number {
  const wa = new Set(FOLD(a).replace(/[^a-z0-9 ]/gi, '').split(/\s+/).filter((w) => w && !STOPWORDS.has(w)))
  const wb = new Set(FOLD(b).replace(/[^a-z0-9 ]/gi, '').split(/\s+/).filter((w) => w && !STOPWORDS.has(w)))
  if (!wa.size || !wb.size) return 0
  let inter = 0
  for (const w of wa) if (wb.has(w)) inter++
  let union = wa.size + wb.size
  let dice = (2 * inter) / union
  // complemento: nomes com sufixos comuns de razão social
  const strip = (s: string) => FOLD(s).replace(/\b(ltda|me|epp|sa|s\s*a|limitada)\b/g, '')
  if (dice < 0.55 && strip(a) === strip(b)) dice = Math.max(dice, 0.9)
  return Math.min(1, dice)
}

function phoneOf(p: string | null | undefined): string | null {
  return digitsOf(normalizePhone(p) ?? p)
}

export function findExistingBusiness(
  candidate: DedupCandidate,
  existing: Company[]
): Omit<DedupResult, 'candidate'> & { companyId: string | null } {
  const phone = phoneOf(candidate.phone)
  const host = hostnameOf(candidate.website)
  const { cleaned } = normalizeName(candidate.name)

  const byId = existing.find((c) => c.sourceRecordId && candidate.providerRecordId && c.sourceRecordId === candidate.providerRecordId)
  if (byId) {
    return { companyId: byId.id, duplicateOf: byId.id, confidence: 'HIGH', reason: 'Identificador da fonte já cadastrado' }
  }

  const byPhone = phone ? existing.find((c) => phoneOf(c.phone) === phone) : undefined
  if (byPhone) {
    return { companyId: byPhone.id, duplicateOf: byPhone.id, confidence: 'HIGH', reason: 'Telefone idêntico' }
  }

  const byHost = host ? existing.find((c) => hostnameOf(c.website) === host) : undefined
  if (byHost) {
    return { companyId: byHost.id, duplicateOf: byHost.id, confidence: 'HIGH', reason: 'Domínio idêntico' }
  }

  let best: Company | undefined
  let bestScore = 0
  for (const c of existing) {
    const score = wordSimilarity(cleaned, c.name)
    if (score > bestScore) {
      bestScore = score
      best = c
    }
  }
  if (best && bestScore >= 0.8) {
    const sameCity = candidate.city && best.city && candidate.city.toLowerCase() === best.city.toLowerCase()
    const sameAddress = candidate.address && best.address && wordSimilarity(candidate.address, best.address) >= 0.7
    if (sameCity || sameAddress) {
      return {
        companyId: best.id,
        duplicateOf: best.id,
        confidence: 'MEDIUM',
        reason: sameAddress ? 'Nome e endereço semelhantes' : 'Nome e cidade semelhantes',
      }
    }
    if (bestScore >= 0.92 && candidate.city && best.city) {
      return { companyId: best.id, duplicateOf: best.id, confidence: 'MEDIUM', reason: 'Nome 92%+ semelhante (cidades distintas)' }
    }
  }
  return { companyId: null, duplicateOf: null, confidence: 'LOW', reason: null }
}

export function dedupeCandidates(candidates: DedupCandidate[], existing: Company[]): DedupResult[] {
  const results: DedupResult[] = []
  const reservoir: Company[] = [...existing]
  for (const candidate of candidates) {
    const match = findExistingBusiness(candidate, reservoir)
    results.push({ candidate, ...match })
    if (match.companyId) {
      const known = reservoir.find((c) => c.id === match.companyId)
      if (known && !candidate.providerRecordId) {
        // sane: não precisa mutar reservoir para duplicatas internas subsequentes
      }
    }
  }
  return results
}