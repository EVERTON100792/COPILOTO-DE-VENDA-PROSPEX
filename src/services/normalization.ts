/**
 * NormalizationService — Real Discovery (Fase 2)
 * Funções puras de normalização: nome, telefone, URL, cidade, estado.
 * Conversões são explicitamente conservadoras: nada é inventado.
 */

export interface NormalizedName {
  name: string
  cleaned: string
}

const BRAZILIAN_STATES: Record<string, string> = {
  'ACRE': 'AC', 'ALAGOAS': 'AL', 'AMAPA': 'AP', 'AMAZONAS': 'AM', 'BAHIA': 'BA',
  'CEARA': 'CE', 'DISTRITO FEDERAL': 'DF', 'ESPIRITO SANTO': 'ES', 'GOIAS': 'GO',
  'MARANHAO': 'MA', 'MATO GROSSO': 'MT', 'MATO GROSSO DO SUL': 'MS',
  'MINAS GERAIS': 'MG', 'PARA': 'PA', 'PARAIBA': 'PB', 'PARANA': 'PR',
  'PERNAMBUCO': 'PE', 'PIAUI': 'PI', 'RIO DE JANEIRO': 'RJ',
  'RIO GRANDE DO NORTE': 'RN', 'RIO GRANDE DO SUL': 'RS', 'RONDONIA': 'RO',
  'RORAIMA': 'RR', 'SANTA CATARINA': 'SC', 'SAO PAULO': 'SP',
  'SERGIPE': 'SE', 'TOCANTINS': 'TO',
}

export function normalizeName(raw: unknown): NormalizedName {
  const name = String(raw ?? '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return { name, cleaned: name.toLowerCase() }
}

/**
 * Telefone → +55 (DDD) + número. Aceita dígitos com formatação brasileira.
 * Retorna null quando o formato não é reconhecido (não inventa).
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  if (digits.length === 8 || digits.length === 9) return null // local sem DDD — ambíguo
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`
  if (digits.length === 12 && digits.startsWith('55')) return `+55${digits.slice(2)}`
  if (digits.length === 13 && digits.startsWith('55')) return `+55${digits.slice(2)}`
  if (digits.length >= 12) return `+${digits}`
  return null
}

/** URL → https://host (sem www), preservando path. Invalid/campo joker → null. */
export function normalizeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  let text = String(raw).trim()
  if (!text || /^(about:|javascript:|data:)/i.test(text)) return null
  if (!/^https?:\/\//i.test(text)) text = `https://${text}`
  let parsed: URL
  try {
    parsed = new URL(text)
  } catch {
    return null
  }
  if (!parsed.hostname || !parsed.hostname.includes('.')) return null
  parsed.protocol = 'https:'
  return parsed.toString().replace(/\/$/, '')
}

export function normalizeState(raw: string | null | undefined): string | null {
  if (!raw) return null
  const value = String(raw).trim().toUpperCase()
  if (/^[A-Z]{2}$/.test(value)) return value
  const idx = value
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z\s]/g, '').trim()
  return BRAZILIAN_STATES[idx.replace(/\s+/g, ' ').trim()] ?? null
}

export function normalizeCity(raw: string | null | undefined, stateHint?: string | null): string | null {
  if (!raw) return null
  let city = String(raw).trim()
  city = city.replace(/\s+/g, ' ').replace(/-([A-Z]{2,3})$/i, '').trim()
  const suffix = stateHint ? ` ${stateHint.toUpperCase()}` : ''
  if (suffix && city.toUpperCase().endsWith(suffix)) {
    city = city.slice(0, -suffix.length).trim()
  }
  if (!city) return null
  return city
    .split(' ')
    .map((w) => (w.length <= 2 && /^[a-z]/i.test(w) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ')
}

export function digitsOf(phone: string | null | undefined): string | null {
  if (!phone) return null
  const d = String(phone).replace(/\D/g, '')
  return d.length >= 8 ? d : null
}

export function hostnameOf(url: string | null | undefined): string | null {
  const normalized = normalizeUrl(url)
  if (!normalized) return null
  try {
    return new URL(normalized).hostname.replace(/^www\./i, '')
  } catch {
    return null
  }
}