import type { Company, Lead, MessageType } from '../types'

export interface TemplateContext {
  companyName: string
  city: string
  category: string
  service: string
  offerPrice?: string
}

export function buildTemplateContext(company: Company, lead: Lead, offerPrice?: number | null): TemplateContext {
  return {
    companyName: company.name || 'Empresa',
    city: company.city || 'sua região',
    category: company.category || 'negócios',
    service: company.website ? 'redesign e otimização de website' : 'criação de website profissional',
    offerPrice: offerPrice ? `R$ ${offerPrice.toLocaleString('pt-BR')}` : undefined,
  }
}

export function renderTemplate(type: MessageType, ctx: TemplateContext): string {
  switch (type) {
    case 'INITIAL':
      return `Olá, tudo bem?\n\nEncontrei a ${ctx.companyName} durante uma pesquisa de empresas do segmento de ${ctx.category} em ${ctx.city}.\n\nAnálise pública da presença digital de vocês indicou uma excelente oportunidade para implementar um ${ctx.service}, facilitando o contato de novos clientes locais.\n\nTrabalho com desenvolvimento de soluções digitais para empresas da região. Se fizer sentido, posso preparar uma demonstração sem compromisso para vocês visualizarem como ficaria.`

    case 'FOLLOW_UP_1':
      return `Olá! Passando só para saber se conseguiu dar uma olhada na mensagem que enviei sobre a ${ctx.companyName}.\n\nCaso tenham interesse em ver a demonstração do ${ctx.service}, estou à disposição!`

    case 'FOLLOW_UP_2':
      return `Olá! Tudo certo?\n\nSei que a rotina na ${ctx.companyName} deve ser bastante corrida. Preparei algumas ideias rápidas de como um ${ctx.service} pode aumentar a captação de clientes em ${ctx.city}.\n\nSe quiser, posso te mandar um resumo simples por aqui.`

    case 'FOLLOW_UP_3':
      return `Olá! Para não tomar seu tempo, este será meu último contato.\n\nCaso no futuro a ${ctx.companyName} decida investir na melhoria da presença digital e ${ctx.service}, meu contato continua à disposição.\n\nDesejo muito sucesso aos negócios!`

    case 'RESPONSE':
      return `Olá! Agradeço o retorno.\n\nFico à disposição para apresentar uma demonstração personalizada para a ${ctx.companyName}. Qual seria um bom momento para conversarmos rapidamente?`

    case 'CLOSING':
      return `Perfeito! Muito obrigado pela atenção. Fico à disposição para quando precisarem!`

    default:
      return `Olá! Gostaria de apresentar uma proposta de ${ctx.service} para a ${ctx.companyName}.`
  }
}
