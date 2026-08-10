/**
 * ValidationService — Real Discovery (Fase 2)
 * Valida dados mínimos antes de salvar como empresa real.
 * Sem dados mínimos → status UNVERIFIED (nunca descarta nem inventa).
 */

import type { DataStatus, DiscoveryConfidence } from '../types'
import { normalizeName, normalizePhone, normalizeUrl } from './normalization'

export interface BusinessValidationInput {
  name: string | null | undefined
  city?: string | null
  state?: string | null
  address?: string | null
  phone?: string | null
  website?: string | null
  providerRecordId?: string | null
  sourceType?: string | null
}

export interface ValidationOutput {
  valid: boolean
  status: DataStatus
  errors: string[]
  confidence: DiscoveryConfidence
  reasons: string[]
}

export function validateBusiness(input: BusinessValidationInput): ValidationOutput {
  const errors: string[] = []
  const reasons: string[] = []

  const { name, cleaned } = normalizeName(input.name ?? '')
  if (cleaned.length < 2) errors.push('Nome ausente ou muito curto')

  const hasLocation = Boolean(input.city || input.state)
  if (!hasLocation) errors.push('Localização ausente (cidade/estado)')

  const hasPhone = Boolean(input.phone && normalizePhone(input.phone))
  const hasWebsite = Boolean(input.website && normalizeUrl(input.website))
  const hasId = Boolean(input.providerRecordId)
  const hasSource = Boolean(input.sourceType)
  if (!hasPhone && !hasWebsite && !hasId) {
    errors.push('Sem identificador, telefone ou website — dados insuficientes')
  }

  let confidence: DiscoveryConfidence = 'LOW'
  if (hasId && hasPhone) {
    confidence = 'HIGH'
    reasons.push('Identificador da fonte', 'Telefone validado')
  } else if (name && hasLocation && (hasPhone || hasWebsite || hasId)) {
    confidence = 'MEDIUM'
    reasons.push('Nome e localização consistentes')
  } else if (name && hasLocation && Boolean(input.address)) {
    confidence = 'MEDIUM'
    reasons.push('Nome, localização e endereço')
  } else if (name && hasLocation) {
    confidence = 'LOW'
    reasons.push('Dados mínimos presentes')
  }

  const valid = errors.length === 0
  if (confidence === 'HIGH' && hasId) reasons.push('Fonte oficial')
  if (valid && reasons.length === 0) reasons.push('Dados mínimos presentes')

  return {
    valid,
    status: valid ? 'REAL' : 'UNVERIFIED',
    errors,
    confidence,
    reasons,
  }
}