export function normalizeName(raw: string): string {
  return (raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const digits = String(raw).replace(/\D/g, '')
  if (digits.length < 10) return null
  let d = digits
  if (d.length === 13 && d.startsWith('55')) d = d.slice(2)
  if (d.length === 12 && d.startsWith('55')) d = d.slice(2)
  if (d.length === 11 && (d.startsWith('0') || d.startsWith('55'))) d = d.slice(2)
  return d
}

export function extractDomain(raw: string | null | undefined): string | null {
  if (!raw) return null
  let d = raw.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '')
  d = d.split('/')[0].split('?')[0]
  if (!d.includes('.')) return null
  return d
}

export function isValidEmail(raw: string | null | undefined): boolean {
  return Boolean(raw && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw))
}

export function normalizeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null
  let url = raw.trim()
  if (/^https?:\/\//i.test(url)) return url
  return 'https://' + url
}

export function normalizeInstagram(raw: string | null | undefined): string | null {
  if (!raw) return null
  let v = raw.trim().toLowerCase()
  v = v.replace(/^https?:\/\/(www\.)?(instagram|ig)\.com\//, '')
  v = v.replace(/\/$/, '')
  if (!v.startsWith('@')) v = '@' + v
  return v.length > 45 ? null : v
}

export function normalizeFacebook(raw: string | null | undefined): string | null {
  if (!raw) return null
  let v = raw.trim().toLowerCase()
  v = v.replace(/^https?:\/\/(www\.)?facebook\.com\//, '').replace(/\/$/, '')
  if (!v || v.includes('share')) return null
  return v.length > 60 ? null : v
}

export function detectIncomplete(data: Record<string, unknown>): boolean {
  return !data.name || !data['city'] || (!data['phone'] && !data['whatsapp'])
}