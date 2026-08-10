import type { Lead, Company } from '../types'

export interface OpportunityItem {
  id: string
  type:
    | 'sem_site'
    | 'site_fora_do_ar'
    | 'sem_https'
    | 'site_lento'
    | 'nao_responsivo'
    | 'sem_redes_sociais'
    | 'sem_whatsapp'
    | 'informacoes_incompletas'
    | 'nao_abordada'
  priority: 'alta' | 'media' | 'baixa'
  reason: string
  score: number
  serviceSuggestion: string
  approachSuggestion: string
}

export function detectOpportunitiesForLead(
  lead: Lead,
  company: Company | undefined
): OpportunityItem[] {
  const opps: OpportunityItem[] = []

  const website = company?.website ?? ''
  const semSite = !website || lead.websiteStatus === 'NO_WEBSITE'
  const siteForaDoAr = lead.websiteStatus === 'WEBSITE_BROKEN'
  const sitePoor = lead.websiteStatus === 'WEBSITE_OUTDATED' || lead.websiteStatus === 'WEBSITE_POOR_MOBILE'
  const semHttps = Boolean(lead.websiteScan && !lead.websiteScan.https && website)
  const semRedes = !lead.hasInstagram && !lead.hasFacebook && !company?.instagram && !company?.facebook
  const semWhatsapp = !lead.hasWhatsapp && !company?.whatsapp
  const infoIncompletas = !company?.phone && !company?.email

  if (semSite) {
    opps.push({
      id: `${lead.id}-sem-site`,
      type: 'sem_site',
      priority: 'alta',
      reason: 'Não possui site próprio — clientes não encontram o negócio no Google.',
      score: 40,
      serviceSuggestion: 'Criação de site institucional responsivo com WhatsApp',
      approachSuggestion: 'Oferecer auditoria digital gratuita e demonstrar site-modelo do segmento.'
    })
  }

  if (siteForaDoAr) {
    opps.push({
      id: `${lead.id}-fora-do-ar`,
      type: 'site_fora_do_ar',
      priority: 'alta',
      reason: 'Site atual com falha/fora do ar — a empresa está perdendo clientes agora.',
      score: 35,
      serviceSuggestion: 'Recuperação e modernização do site',
      approachSuggestion: 'Alertar sobre a falha (urgência) e oferecer restauração + novo design.'
    })
  }

  if (sitePoor) {
    opps.push({
      id: `${lead.id}-site-desatualizado`,
      type: 'nao_responsivo',
      priority: 'media',
      reason: 'Site antigo ou pouco otimizado para celulares.',
      score: 25,
      serviceSuggestion: 'Redesign responsivo (Mobile-first)',
      approachSuggestion: 'Demonstrar visualmente a experiência mobile ruim e apresentar novo protótipo.'
    })
  }

  if (semHttps) {
    opps.push({
      id: `${lead.id}-sem-https`,
      type: 'sem_https',
      priority: 'media',
      reason: 'Site sem SSL/HTTPS — navegadores alertam "não seguro".',
      score: 15,
      serviceSuggestion: 'Instalação de certificado SSL e migração HTTPS',
      approachSuggestion: 'Mostrar alerta visual do navegador e propor correção rápida.'
    })
  }

  if (semWhatsapp) {
    opps.push({
      id: `${lead.id}-sem-wa`,
      type: 'sem_whatsapp',
      priority: 'media',
      reason: 'Não possui botão de WhatsApp direto para conversão rápida de clientes.',
      score: 20,
      serviceSuggestion: 'Integração de botão flutuante e link direto WhatsApp',
      approachSuggestion: 'Explicar que mais de 80% das conversões locais vêm via WhatsApp.'
    })
  }

  if (semRedes) {
    opps.push({
      id: `${lead.id}-sem-redes`,
      type: 'sem_redes_sociais',
      priority: 'media',
      reason: 'Sem redes sociais identificadas — baixa prova social e alcance.',
      score: 10,
      serviceSuggestion: 'Gestão e estruturação de redes sociais (Instagram/Facebook)',
      approachSuggestion: 'Oferecer pacote inicial com fotos profissionais e branding.'
    })
  }

  if (infoIncompletas) {
    opps.push({
      id: `${lead.id}-incompletas`,
      type: 'informacoes_incompletas',
      priority: 'baixa',
      reason: 'Informações de contato incompletas no cadastro da empresa.',
      score: 10,
      serviceSuggestion: 'Otimização de Ficha do Google Meu Negócio',
      approachSuggestion: 'Auditoria gratuita de presença local com checklist de itens faltantes.'
    })
  }

  if (lead.status === 'NEW') {
    opps.push({
      id: `${lead.id}-nao-abordada`,
      type: 'nao_abordada',
      priority: 'baixa',
      reason: 'Empresa recém-descoberta — primeiro contato pendente.',
      score: 5,
      serviceSuggestion: 'Primeira prospecção consultiva',
      approachSuggestion: 'Contato inicial rápido com gancho específico da presença digital.'
    })
  }

  return opps
}
