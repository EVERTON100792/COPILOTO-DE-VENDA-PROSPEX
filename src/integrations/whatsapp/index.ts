import { env } from '../../config/env'
import { logger } from '../../lib/logger'
import { withRetry } from '../../lib/retry'
import type { WhatsAppProvider } from '../types'

class OfficialWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'cloud-api'
  async send(to: string, body: string): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    const phoneNumberId = env.whatsappPhoneNumberId
    if (!phoneNumberId) return { ok: false, error: 'WHATSAPP_PHONE_NUMBER_ID_MISSING' }
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.whatsappApiKey}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body },
        }),
      },
    )
    if (!res.ok) {
      const bodyRaw = await res.text()
      return { ok: false, error: `WhatsApp ${res.status}: ${bodyRaw.slice(0, 160)}` }
    }
    const data = await res.json()
    return { ok: true, messageId: data?.messages?.[0]?.id }
  }
}

class NoopWhatsAppProvider implements WhatsAppProvider {
  readonly name = 'none'
  async send(to: string, body: string): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    logger.warn('WHATSAPP', 'Envio bloqueado: provedor WhatsApp não configurado', to)
    return { ok: false, error: 'WHATSAPP_PROVIDER_NOT_CONFIGURED' }
  }
}

export function getWhatsAppProvider(): WhatsAppProvider {
  if (env.whatsappApiKey) return new OfficialWhatsAppProvider()
  return new NoopWhatsAppProvider()
}

export async function sendWhatsApp(to: string, body: string): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const provider = getWhatsAppProvider()
  try {
    return await withRetry(() => provider.send(to, body), { maxRetries: 2, label: 'WHATSAPP' })
  } catch (e) {
    logger.error('WHATSAPP', 'Falha ao enviar WhatsApp', e instanceof Error ? e.message : String(e))
    return { ok: false, error: 'SEND_FAILED' }
  }
}

export function isWhatsAppConfigured(): boolean {
  return Boolean(env.whatsappApiKey)
}