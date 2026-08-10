import { logger } from './logger'

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export interface RetryOptions {
  maxRetries?: number
  baseDelayMs?: number
  label?: string
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const { maxRetries = 3, baseDelayMs = 600, label = 'operação' } = opts
  let lastError: unknown = null
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastError = e
      if (attempt >= maxRetries) break
      const delay = baseDelayMs * 2 ** attempt
      // eslint-disable-next-line no-console
      console.warn(`[RETRY] ${label} tentativa ${attempt + 1}/${maxRetries + 1} falhou, aguardando ${delay}ms`)
      await sleep(delay)
    }
  }
  throw lastError
}

/** Erro amigável para exibir ao usuário (nunca expõe detalhes técnicos). */
export function friendlyError(e: unknown, fallback = 'Não foi possível concluir esta operação agora. O sistema continuará tentando automaticamente.'): string {
  return fallback
}

/** Converte erro qualquer em mensagem técnica para logs. */
export function technicalError(e: unknown): string {
  if (!(e instanceof Error)) return String(e)
  return `${e.message}${e.stack ? `\n${e.stack}` : ''}`
}