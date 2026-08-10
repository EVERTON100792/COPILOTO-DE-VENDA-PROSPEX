type LogLevel = 'info' | 'warn' | 'error' | 'debug'

export interface LogEntry {
  id: string
  tag: string
  level: LogLevel
  message: string
  detail?: string
  createdAt: string
}

const MAX_LOGS = 500
const KEY = 'prospex_logs'

function load(): LogEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as LogEntry[]) : []
  } catch {
    return []
  }
}

function persist(entries: LogEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX_LOGS)))
  } catch {
    /* storage cheio ou indisponível — ignora */
  }
}

function emit(level: LogLevel, tag: string, message: string, detail?: string): void {
  const entry: LogEntry = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    tag,
    level,
    message,
    detail,
    createdAt: new Date().toISOString(),
  }
  const entries = load()
  entries.push(entry)
  persist(entries)
  if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error(`[${tag}]`, message, detail ?? '')
  } else if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(`[${tag}] ${message}`)
  }
}

export const logger = {
  info: (tag: string, message: string, detail?: string) => emit('info', tag, message, detail),
  warn: (tag: string, message: string, detail?: string) => emit('warn', tag, message, detail),
  error: (tag: string, message: string, detail?: string) => emit('error', tag, message, detail),
  debug: (tag: string, message: string, detail?: string) => emit('debug', tag, message, detail),
}

export function getLogs(): LogEntry[] {
  return load()
    .slice()
    .reverse()
}

export function clearLogs(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}