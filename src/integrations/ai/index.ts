import { env } from '../../config/env'
import { logger } from '../../lib/logger'
import { withRetry } from '../../lib/retry'
import { useApp } from '../../services/store'
import type { AIProvider, AIRequest, AIResponse } from '../types'

interface OpenAiChatPayload {
  model: string
  temperature: number
  max_tokens: number
  messages: { role: 'system' | 'user'; content: string }[]
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export class OpenRouterProvider implements AIProvider {
  readonly name = 'openrouter'
  async generate(req: AIRequest): Promise<AIResponse> {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.aiApiKey}`,
        'HTTP-Referer': 'https://prospex.local',
        'X-Title': 'Prospex Autopilot',
      },
      body: JSON.stringify({
        model: env.aiModel ?? 'openai/gpt-4o-mini',
        temperature: req.temperature ?? 0.4,
        max_tokens: req.maxTokens ?? 900,
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: req.prompt },
        ],
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 200)}`)
    }
    const data = await res.json()
    const text = String(data?.choices?.[0]?.message?.content ?? '').trim()
    const tokens: number = data?.usage?.total_tokens ?? estimateTokens(`${req.system}\n${req.prompt}`)
    return { text, provider: this.name, tokens, estimatedCostUsd: (tokens / 1000) * 0.004 }
  }
}

export class OpenAiCompatibleProvider implements AIProvider {
  readonly name: string
  constructor(providerName: string) {
    this.name = providerName
  }
  async generate(req: AIRequest): Promise<AIResponse> {
    const provider: string = (env.aiProvider ?? 'openai').toLowerCase()
    const endpoint =
      provider === 'openai'
        ? 'https://api.openai.com/v1/chat/completions'
        : 'https://api.anthropic.com/v1/messages'

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    let body: string

    if (provider === 'anthropic') {
      headers['x-api-key'] = env.aiApiKey ?? ''
      headers['anthropic-version'] = '2023-06-01'
      body = JSON.stringify({
        model: env.aiModel ?? 'claude-3-5-haiku-latest',
        max_tokens: req.maxTokens ?? 900,
        messages: [{ role: 'user', content: `${req.system}\n\n${req.prompt}` }],
      })
    } else {
      headers.Authorization = `Bearer ${env.aiApiKey}`
      const payload: OpenAiChatPayload = {
        model: env.aiModel ?? 'gpt-4o-mini',
        temperature: req.temperature ?? 0.4,
        max_tokens: req.maxTokens ?? 900,
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: req.prompt },
        ],
      }
      body = JSON.stringify(payload)
    }

    const res = await fetch(endpoint, { method: 'POST', headers, body })
    if (!res.ok) throw new Error(`IA ${provider}: respondiu ${res.status}`)
    const data = await res.json()
    const text = String(data?.content?.[0]?.text ?? data?.choices?.[0]?.message?.content ?? '').trim()
    const tokens: number = data?.usage?.total_tokens ?? estimateTokens(`${req.system}\n\n${req.prompt}`)
    return { text, provider: this.name, tokens, estimatedCostUsd: (tokens / 1000) * 0.003 }
  }
}

/**
 * Provedor determinístico de fallback (modo DEMO).
 * O conteúdo externo é tratado como UNTRUSTED DATA: instruções vindas
 * de sites, descrições ou avaliações nunca são obedecidas.
 */
class DemoProvider implements AIProvider {
  readonly name = 'demo-template'
  async generate(req: AIRequest): Promise<AIResponse> {
    logger.info('AI', 'Usando provedor DEMO (templates determinísticos)')
    return { text: req.prompt, provider: this.name, tokens: 0, estimatedCostUsd: 0 }
  }
}

/**
 * Provedor OpenCode via proxy do servidor (Netlify Function / proxy do Vite).
 * Usado quando a chave NÃO está no navegador: o proxy injeta a autenticação.
 */
class OpenCodeProxyProvider implements AIProvider {
  readonly name = 'opencode-proxy'
  async generate(req: AIRequest): Promise<AIResponse> {
    const { callAI } = await import('../../services/aiClient')
    const text = await callAI({
      systemPrompt: req.system || '',
      userMessage: req.prompt,
      temperature: req.temperature ?? 0.4,
      maxTokens: req.maxTokens ?? 900,
    })
    return { text, provider: this.name, tokens: 0, estimatedCostUsd: 0 }
  }
}

export function getAiProvider(): AIProvider {
  const storeSettings = useApp.getState().settings
  const isDemo = storeSettings?.demoMode ?? env.demoMode

  if (isDemo) {
    return new DemoProvider()
  }

  const storeKey = storeSettings?.aiApiKey
  const key = storeKey !== undefined && storeKey !== '' ? storeKey : (env.aiApiKey || '')
  const provider = storeSettings?.aiProvider || env.aiProvider
  const baseUrl = storeSettings?.aiBaseUrl || ''

  // Sem chave no navegador: se o endpoint configurado for OpenCode,
  // roteia pelo proxy do servidor (que injeta a chave).
  if (!key && baseUrl.includes('opencode.ai')) {
    return new OpenCodeProxyProvider()
  }

  if (key && provider && provider !== 'openrouter') {
    return new OpenAiCompatibleProvider(provider)
  }
  if (key) {
    return new OpenRouterProvider()
  }
  return new DemoProvider()
}

export async function aiGenerate(req: AIRequest): Promise<AIResponse> {
  const provider = getAiProvider()
  try {
    const res = await withRetry(() => provider.generate(req), {
      maxRetries: 3,
      baseDelayMs: 800,
      label: `AI:${provider.name}`,
    })
    return res
  } catch (e) {
    logger.error('AI', 'Falha após retries, usando fallback de templates', e instanceof Error ? e.message : String(e))
    return { text: req.prompt, provider: 'fallback', tokens: 0, estimatedCostUsd: 0 }
  }
}