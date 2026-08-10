export function sanitizeUrl(raw: string): string {
  let url = (raw || '').trim().toLowerCase()
  if (!url) return ''
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url
  return url
}

export function normalizeDomain(raw: string): string | null {
  const clean = (raw || '').trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/^www\./i, '')
  return clean || null
}

export function isValidDomain(raw: string): boolean {
  const d = normalizeDomain(raw)
  if (!d) return false
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d)
}

export async function isReachableUrl(raw: string): Promise<boolean> {
  try {
    const res = await fetch(sanitizeUrl(raw), { method: 'HEAD', redirect: 'follow' })
    return res.ok || res.status === 301 || res.status === 302
  } catch {
    return false
  }
}