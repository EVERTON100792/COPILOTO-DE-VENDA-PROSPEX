import { useApp } from '../services/store'
import { downloadText, exportLeadsCsv, exportLeadsJson } from '../services/importExport'
import type { Lead } from '../types'

export async function doExport(
  data: Lead[] | Record<string, unknown>[],
  format: 'csv' | 'json',
  filename?: string,
): Promise<void> {
  const stamp = new Date().toISOString().slice(0, 10)
  const isLeads = data.length > 0 && 'companyId' in (data[0] as Lead)

  if (format === 'csv') {
    const content = isLeads
      ? exportLeadsCsv(data as Lead[])
      : (data as Record<string, unknown>[]).length === 0
        ? ''
        : recordsToCsv(data as Record<string, unknown>[])
    await downloadText(filename ?? `prospex-leads-${stamp}.csv`, content, 'text/csv;charset=utf-8')
  } else {
    const content = isLeads
      ? exportLeadsJson(data as Lead[])
      : JSON.stringify(data, null, 2)
    await downloadText(filename ?? `prospex-leads-${stamp}.json`, content, 'application/json')
  }
  useApp.getState().toast('success', `Exportação ${format.toUpperCase()} concluída`)
}

function recordsToCsv(rows: Record<string, unknown>[]): string {
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))]
  const esc = (v: unknown): string => {
    const s = String(v ?? '')
    if (s.includes(';') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }
  return [headers, ...rows.map((r) => headers.map((h) => esc(r[h])))].map((r) => r.join(';')).join('\n')
}

export function whatsappLink(phone: string | null, body?: string): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  const txt = body ? `?text=${encodeURIComponent(body)}` : ''
  return `https://wa.me/${digits}${txt}`
}