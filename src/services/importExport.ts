import { useApp } from './store'
import { getCompany } from './crm'
import type { Lead } from '../types'
import { csvToJson } from '../lib/utils'

export function exportLeadsCsv(leads: Lead[]): string {
  const headers = [
    'nome', 'categoria', 'cidade', 'estado', 'telefone', 'whatsapp', 'email', 'website',
    'instagram', 'facebook', 'score', 'classificacao', 'status', 'campanha', 'data',
  ]
  const rows = leads.map((l) => {
    const c = getCompany(l)
    return [
      c?.name ?? '', c?.category ?? '', c?.city ?? '', c?.state ?? '', c?.phone ?? '',
      c?.whatsapp ?? '', c?.email ?? '', c?.website ?? '', c?.instagram ?? '', c?.facebook ?? '',
      l.score ?? '', l.tier ?? '', l.status, l.campaignId ?? '', l.createdAt.slice(0, 10),
    ]
  })
  return [headers, ...rows].map((r) => r.map(esc).join(';')).join('\n')
}

export function exportLeadsJson(leads: Lead[]): string {
  const data = leads.map((l) => {
    const c = getCompany(l)
    return {
      nome: c?.name ?? '',
      categoria: c?.category ?? null,
      cidade: c?.city ?? null,
      estado: c?.state ?? null,
      telefone: c?.phone ?? null,
      whatsapp: c?.whatsapp ?? null,
      email: c?.email ?? null,
      website: c?.website ?? null,
      instagram: c?.instagram ?? null,
      facebook: c?.facebook ?? null,
      score: l.score,
      classificacao: l.tier,
      status: l.status,
      campanha: l.campaignId,
      data: l.createdAt.slice(0, 10),
    }
  })
  return JSON.stringify(data, null, 2)
}

function esc(v: string | number | null | undefined): string {
  const s = String(v ?? '')
  if (s.includes(';') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

export async function downloadText(filename: string, content: string, mime = 'text/plain'): Promise<void> {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}

export interface ImportCandidate {
  name: string
  category: string | null
  city: string | null
  state: string | null
  phone: string | null
  whatsapp: string | null
  website: string | null
  instagram: string | null
  facebook: string | null
  email: string | null
  rating: number | null
  reviewCount: number | null
  issues: string[]
  duplicateOf: string | null
}

export function parseImportCsv(text: string): ImportCandidate[] {
  const rows = csvToJson(text)
  const s = useApp.getState()
  return rows.map((row) => {
    const issues: string[] = []
    const name = (row.nome || row.name || '').trim()
    if (!name) issues.push('Sem nome')
    const phone = (row.telefone || row.phone || '').trim() || null
    const whatsapp = (row.whatsapp || '').trim() || null
    const website = ((row.website || row.site || '').trim().toLowerCase()) || null
    const instagram = (row.instagram || '').trim() || null
    const facebook = (row.facebook || '').trim() || null
    const email = ((row.email || '').trim()) || null
    const rating = parseNum(row.rating || row.nota || '')
    const reviewCount = parseNum(row.avaliacoes || row.reviews || '')

    if (!phone && !whatsapp && !email) issues.push('Sem contato')

    const dup = s.companies.find(
      (c) =>
        (name && c.name.localeCompare(name, undefined, { sensitivity: 'base' }) === 0) ||
        (phone && c.phone?.replace(/\D/g, '') === phone.replace(/\D/g, '')) ||
        (website && c.website?.toLowerCase() === website)
    )

    return {
      name,
      category: (row.categoria || '').trim() || null,
      city: (row.cidade || row.city || '').trim() || null,
      state: (row.estado || row.state || '').trim().toUpperCase() || null,
      phone,
      whatsapp,
      website,
      instagram,
      facebook,
      email,
      rating,
      reviewCount,
      issues,
      duplicateOf: dup ? dup.name : null,
    }
  })
}

function parseNum(v: string): number | null {
  if (!v) return null
  const n = parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function importCandidates(candidates: ImportCandidate[]): { imported: number; skipped: number } {
  const s = useApp.getState()
  let imported = 0
  let skipped = 0
  for (const cand of candidates) {
    if (cand.duplicateOf || cand.issues.length > 0) {
      skipped++
      continue
    }
    const now = new Date().toISOString()
    const company = {
      id: 'cmp_' + Math.random().toString(36).slice(2, 10),
      workspaceId: s.workspaceId,
      name: cand.name,
      category: cand.category,
      city: cand.city,
      state: cand.state,
      country: 'BR',
      address: null,
      phone: cand.phone,
      whatsapp: cand.whatsapp,
      email: cand.email,
      website: cand.website,
      instagram: cand.instagram,
      facebook: cand.facebook,
      rating: cand.rating,
      reviewCount: cand.reviewCount,
      hours: null,
      source: 'CSV (importação)',
      isDemo: false,
      createdAt: now,
      dataStatus: 'IMPORTED' as const,
      sourceType: 'CSV',
      sourceRecordId: null,
      sourceUrl: null,
      retrievedAt: now,
      lastVerifiedAt: now,
      verificationStatus: cand.issues.length === 0 ? ('VERIFIED' as const) : ('UNVERIFIED' as const),
      discoveryConfidence: cand.name && cand.phone ? ('MEDIUM' as const) : ('LOW' as const),
      confidenceReasons: cand.name && cand.phone ? ['Nome informado', 'Telefone informado'] : ['Dados mínimos'],
      phoneNormalized: cand.phone ? cand.phone.replace(/\D/g, '') : null,
      phoneCountry: 'BR',
      phoneType: null,
      whatsappStatus: cand.whatsapp ? ('NOT_VERIFIED' as const) : ('UNKNOWN' as const),
      doNotContact: false,
      fieldSources: {},
    }
    s.upsertCompany(company)
    imported++
  }
  return { imported, skipped }
}

export interface ImportPreview {
  total: number
  valid: number
  duplicates: number
  incomplete: number
}

export function previewImportCsv(candidates: ImportCandidate[]): ImportPreview {
  let duplicates = 0
  let incomplete = 0
  let valid = 0
  for (const c of candidates) {
    if (c.duplicateOf) duplicates++
    else if (c.issues.length > 0) incomplete++
    else valid++
  }
  return { total: candidates.length, valid, duplicates, incomplete }
}