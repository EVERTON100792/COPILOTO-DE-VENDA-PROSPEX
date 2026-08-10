import { env, isOperational } from '../config/env'
import type { IntegrationStatus } from './types'

export const integrationsStatus: IntegrationStatus[] = [
  {
    key: 'openstreetmap',
    name: 'OpenStreetMap (Overpass)',
    status: 'READY',
    configured: true,
    provider: 'openstreetmap',
    description: 'Descoberta gratuita de empresas reais via fontes públicas (sem API key, sem cartão).',
    envKeys: [],
  },
  {
    key: 'maps',
    name: 'Google Places (Opcional)',
    status: isOperational(env.mapsApiKey) ? 'READY' : 'CONFIGURATION_REQUIRED',
    configured: isOperational(env.mapsApiKey),
    provider: 'google-places',
    description: 'Provedor opcional para busca de empresas. Requer chave do Google Cloud com billing.',
    envKeys: ['VITE_MAPS_API_KEY'],
  },
  {
    key: 'search',
    name: 'Busca (SerpAPI / Google CSE)',
    status: isOperational(env.searchApiKey) ? 'READY' : env.demoMode ? 'DEMO_ONLY' : 'CONFIGURATION_REQUIRED',
    configured: isOperational(env.searchApiKey),
    provider: env.searchProvider ?? 'serpapi',
    description: 'Pesquisa de presença digital e conteúdo público. Sem chave, usa heurísticas locais.',
    envKeys: ['VITE_SEARCH_API_KEY', 'VITE_SEARCH_PROVIDER'],
  },
  {
    key: 'website',
    name: 'Website Scanner',
    status: 'READY',
    configured: true,
    provider: 'builtin',
    description: 'Verificação de status HTTP, HTTPS, título, meta description e sinais de abandono. Funciona sem API.',
    envKeys: [],
  },
  {
    key: 'ai',
    name: 'IA (OpenRouter / OpenAI / Anthropic)',
    status: isOperational(env.aiApiKey) ? 'READY' : env.demoMode ? 'DEMO_ONLY' : 'CONFIGURATION_REQUIRED',
    configured: isOperational(env.aiApiKey),
    provider: env.aiProvider ?? 'none',
    description: 'Diagnósticos, oportunidades e mensagens personalizadas. Sem chave, usa templates determinísticos verificáveis.',
    envKeys: ['VITE_AI_API_KEY', 'VITE_AI_PROVIDER', 'VITE_AI_MODEL'],
  },
  {
    key: 'email',
    name: 'E-mail (Resend / SendGrid / SMTP)',
    status: isOperational(env.emailApiKey) ? 'READY' : env.demoMode ? 'DEMO_ONLY' : 'CONFIGURATION_REQUIRED',
    configured: isOperational(env.emailApiKey),
    provider: env.emailProvider ?? 'none',
    description: 'Envio de e-mail transacional. Sem chave, o envio fica bloqueado e a ação é registrada como simulação.',
    envKeys: ['VITE_EMAIL_API_KEY', 'VITE_EMAIL_PROVIDER'],
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp (API oficial / Evolution)',
    status: isOperational(env.whatsappApiKey) ? 'READY' : env.demoMode ? 'DEMO_ONLY' : 'CONFIGURATION_REQUIRED',
    configured: isOperational(env.whatsappApiKey),
    provider: env.whatsappProvider ?? 'none',
    description: 'Envio de mensagens via API oficial. Sem chave, o envio fica bloqueado e a ação é registrada como simulação.',
    envKeys: ['VITE_WHATSAPP_API_KEY', 'VITE_WHATSAPP_PROVIDER'],
  },
  {
    key: 'storage',
    name: 'Banco de dados',
    status: env.demoMode ? 'DEMO_ONLY' : 'CONFIGURATION_REQUIRED',
    configured: false,
    provider: null,
    description: 'Persistência: Supabase quando configurado; caso contrário, armazenamento local do navegador.',
    envKeys: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
  },
]

export function getIntegrationStatus(key: string): IntegrationStatus {
  return integrationsStatus.find((i) => i.key === key) ?? integrationsStatus[0]
}