import { logger } from '../lib/logger'

const PREFIX = 'prospex_'

export function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch (e) {
    logger.warn('STORAGE', `Falha ao persistir ${key}`, String(e))
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    /* ignore */
  }
}

export function listKeys(): string[] {
  const out: string[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX)) out.push(k.slice(PREFIX.length))
    }
  } catch {
    /* ignore */
  }
  return out
}

export function clearAll(): void {
  listKeys().forEach((k) => removeItem(k))
  logger.info('STORAGE', 'Todos os dados locais removidos')
}