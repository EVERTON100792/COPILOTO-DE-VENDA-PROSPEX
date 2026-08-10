import { env } from '../../config/env'
import { logger } from '../../lib/logger'
import { withRetry } from '../../lib/retry'
import type { EmailProvider, EmailMessage } from '../types'

class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend'
  async send(message: EmailMessage): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.emailApiKey}` },
      body: JSON.stringify({
        from: env.emailApiKey ? 'Prospex Studio <onboarding@prospex.local>' : undefined,
        to: [message.to],
        subject: message.subject,
        text: message.body,
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      return { ok: false, error: `Resend ${res.status}: ${body.slice(0, 150)}` }
    }
    const data = await res.json()
    return { ok: true, messageId: String(data?.id ?? '') }
  }
}

class SendGridEmailProvider implements EmailProvider {
  readonly name = 'sendgrid'
  async send(message: EmailMessage): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.emailApiKey}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: message.to }] }],
        from: { email: 'onboarding@prospex.local', name: 'Prospex Studio' },
        subject: message.subject,
        content: [{ type: 'text/plain', value: message.body }],
      }),
    })
    if (!res.ok) return { ok: false, error: `SendGrid ${res.status}` }
    return { ok: true, messageId: 'sendgrid' }
  }
}

class NoopEmailProvider implements EmailProvider {
  readonly name = 'none'
  async send(message: EmailMessage): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    logger.warn('EMAIL', 'Envio bloqueado: provedor de e-mail não configurado', message.to)
    return { ok: false, error: 'EMAIL_PROVIDER_NOT_CONFIGURED' }
  }
}

export function getEmailProvider(): EmailProvider {
  if (env.emailApiKey && env.emailProvider) {
    const provider = (env.emailProvider ?? '').toLowerCase()
    if (provider === 'sendgrid') return new SendGridEmailProvider()
    if (provider === 'resend') return new ResendEmailProvider()
  }
  return new NoopEmailProvider()
}

export async function sendEmail(message: EmailMessage): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const provider = getEmailProvider()
  try {
    return await withRetry(() => provider.send(message), { maxRetries: 2, label: 'EMAIL' })
  } catch (e) {
    logger.error('EMAIL', 'Falha ao enviar e-mail', e instanceof Error ? e.message : String(e))
    return { ok: false, error: 'SEND_FAILED' }
  }
}