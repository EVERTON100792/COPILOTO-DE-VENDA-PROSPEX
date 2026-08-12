// Sales AI Engine — Prospex Autopilot
// Modo demo: templates determinísticos ricos, humanos e hiper-precisos
// Modo real: API unificada (OpenCode Go, OpenRouter, OpenAI, Gemini, etc.)

import type { Company } from '../types'
import { callAI } from './aiClient'
import { SALES_BRAIN_PROMPT } from './salesBrainPrompt'

export type SalesResponseCategory =
  | 'INTERESTED'
  | 'OBJECTION_PRICE'
  | 'OBJECTION_BUDGET'
  | 'OBJECTION_NEED'
  | 'THINK_ABOUT'
  | 'QUESTION'
  | 'NOT_INTERESTED'
  | 'WON'

export type SalesStage =
  | 'OPENING'
  | 'WAITING_RESPONSE'
  | 'ANALYZING'
  | 'INSTRUCTING'
  | 'CLOSING'
  | 'WON'
  | 'LOST'

export interface SalesMessage {
  id: string
  role: 'AI_OPENING' | 'CLIENT' | 'AI_INSTRUCTION'
  content: string
  category?: SalesResponseCategory
  timestamp: string
}

export interface SalesConversation {
  id: string
  companyId: string
  stage: SalesStage
  messages: SalesMessage[]
  createdAt: string
  updatedAt: string
}

export interface SalesAnalysis {
  category: SalesResponseCategory
  confidence: number
  summary: string
  emoji: string
}

export interface SalesInstruction {
  analysis: SalesAnalysis
  whatToDo: string
  whatToSay: string
  suggestedReply: string
  showSiteButton: boolean
  showProposalButton: boolean
  isWon: boolean
  isLost: boolean
}

function getNiche(category: string | null): string {
  const cat = (category || '').toLowerCase()
  if (cat.includes('restaurante') || cat.includes('comida') || cat.includes('bar') || cat.includes('pizzaria') || cat.includes('churrascaria') || cat.includes('padaria') || cat.includes('lanchonete')) return 'gastronomia'
  if (cat.includes('odonto') || cat.includes('dentista') || cat.includes('médic') || cat.includes('saúde') || cat.includes('clínica') || cat.includes('terapia') || cat.includes('psicolog')) return 'saude'
  if (cat.includes('salão') || cat.includes('estética') || cat.includes('barbe') || cat.includes('beleza') || cat.includes('nail') || cat.includes('sobrancelha')) return 'estetica'
  if (cat.includes('advoga') || cat.includes('juríd') || cat.includes('direito') || cat.includes('contábil') || cat.includes('contador')) return 'profissional'
  if (cat.includes('auto') || cat.includes('mecanic') || cat.includes('carro') || cat.includes('pneu') || cat.includes('funilaria')) return 'automotivo'
  if (cat.includes('academia') || cat.includes('personal') || cat.includes('crossfit') || cat.includes('pilates') || cat.includes('yoga')) return 'fitness'
  if (cat.includes('pet') || cat.includes('veterinár') || cat.includes('banho e tosa')) return 'pet'
  return 'servicos'
}

export function generateOpeningMessage(company: Company | any): string {
  const name = company?.name || 'sua empresa'
  const niche = getNiche(company?.category)

  const nicheDetail =
    niche === 'gastronomia' ? 'cardápio digital e integração direta com WhatsApp' :
    niche === 'saude' ? 'agendamento online de consultas e apresentação de tratamentos' :
    niche === 'estetica' ? 'catálogo visual de procedimentos e fotos de antes/depois' :
    niche === 'automotivo' ? 'tabela interativa de serviços e solicitação de orçamento rápido' :
    niche === 'fitness' ? 'grade de horários, modalidades e tabela de planos' :
    niche === 'pet' ? 'agendamento fácil de banho, tosa e consultas' : 'apresentação profissional de serviços e botão direto para WhatsApp'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia!' : hour < 18 ? 'Boa tarde!' : 'Boa noite!'

  return `${greeting} Tudo bem? Me chamo Everton, moro aqui em Rolândia e sou especialista em criação de sites para empresas locais. Pesquisei o ${name} e notei que vocês ainda não possuem um site institucional moderno. Hoje, estar sem site significa perder clientes todos os dias para concorrentes que aparecem primeiro no Google. Montei uma demonstração gratuita de um site exclusivo para o ${name} (com ${nicheDetail}). Posso te enviar o link para dar uma olhada sem compromisso?`
}

export async function generateOpeningMessageAI(company: Company | any, apiKey?: string): Promise<string> {
  if (!apiKey) return generateOpeningMessage(company)

  const extraFacts = [
    company?.summary ? `Resumo do negócio: ${company.summary}` : '',
    company?.hours ? `Horário de funcionamento: ${company.hours}` : '',
    company?.address ? `Endereço: ${company.address}` : '',
  ].filter(Boolean).join('\n')

  const system = `${SALES_BRAIN_PROMPT}

O sistema solicita a GERAÇÃO DA PRIMEIRA ABORDAGEM para a empresa abaixo.
Você deve agir como Everton, de Rolândia/PR, especialista em sites locais.
A empresa é: ${company?.name || 'Empresa Local'}
Categoria: ${company?.category || 'Negócio Local'}
Cidade: ${company?.city || 'Rolândia'}
${extraFacts ? `\nFATOS DESCOBERTOS NA INTERNET SOBRE A EMPRESA:\n${extraFacts}` : ''}

INSTRUÇÕES:
- Inicie SEMPRE com uma saudação educada (ex: "Bom dia!", "Boa tarde!") e pergunte se está tudo bem (ex: "Tudo bem com vocês?"). NUNCA inicie de forma seca apenas com "Olá,".
- O texto deve ser natural, educado e ir direto ao ponto de forma cordial.
- Diga que você preparou uma demonstração gratuita de um site exclusivo para eles e pergunte se pode enviar o link.
- ${extraFacts ? 'USE SUTILMENTE 1 DOS FATOS DESCOBERTOS (resumo, horário ou endereço) para provar que você estudou a empresa. Ex: "Notei que o endereço de vocês fica na..." ou "Vi que o foco de vocês é...".' : 'Seja direto e cordial.'}
- Não use palavras difíceis ou jargões.
- Retorne APENAS o texto da mensagem, sem aspas, sem formatação JSON, sem introduções.`

  try {
    const raw = await callAI({
      systemPrompt: system,
      userMessage: "Gere a mensagem inicial de prospecção para esta empresa agora.",
    })
    return raw.trim() || `[IA retornou vazio] ${generateOpeningMessage(company)}`
  } catch (err: any) {
    console.warn('[salesAI] Falha ao gerar abordagem com IA:', err)
    return `[ERRO NA IA: ${err.message || String(err)}] - Fallback ativado:\n\n${generateOpeningMessage(company)}`
  }
}


// Rule Engine Keywords
const WON_KW = ['fechado', 'fechei', 'contrato', 'aceito', 'aceitar', 'combinado', 'pode fazer', 'vamos em frente', 'aprovado', 'faz aí', 'pode começar', 'quero fechar']
const NOT_INTERESTED_KW = [
  'não gostei', 'nao gostei', 'não gostamos', 'nao gostamos', 'não curti', 'nao curti',
  'não tenho interesse', 'sem interesse', 'não preciso', 'nao preciso', 'não quero', 'nao quero',
  'não obrigado', 'nao obrigado', 'pode parar', 'remov', 'bloquear', 'nao tenho', 'não muito obrigado',
  'nao obg', 'odiei', 'detestei', 'péssimo', 'pessimo', 'horrível', 'horrivel', 'ruim', 'fraco',
  'nada a ver', 'esquece', 'fora', 'descarte', 'não faz sentido', 'nao faz sentido'
]
const BUDGET_KW = [
  'sem dinheiro', 'sem grana', 'sem verba', 'sem caixa', 'grana curta', 'ta difícil', 'tá difícil',
  'crise', 'apertado', 'não tenho dinheiro', 'nao tenho dinheiro', 'sem condições', 'sem condicoes',
  'tá caro', 'ta caro', 'muito caro', 'sem dinheiro mesmo', 'estou sem dinheiro'
]
const PRICE_KW = ['custa', 'preço', 'preco', 'valor', 'quanto', 'quando custa', 'quanto e', 'quanto é', 'investimento', 'orçamento', 'orcamento', 'cobr', 'pagamento', 'parcel', 'valores', 'tabela']
const THINK_KW = ['deixa pensar', 'vou pensar', 'vou ver', 'amanhã', 'depois', 'próxima semana', 'espera', 'aguarda', 'consultar', 'sócio', 'esposa', 'marido', 'decidir']
const INTERESTED_KW = ['interesse', 'quero', 'queria', 'como funciona', 'me conta', 'adorei', 'gostei', 'sim', 'pode ser', 'vamos', 'topo', 'curioso', 'me manda', 'ver mais', 'que legal', 'bacana', 'me mostra', 'interessante']

export function analyzeClientResponse(response: string): SalesAnalysis {
  const lower = response.toLowerCase().trim()

  // 1. Check WON
  if (WON_KW.some((k) => lower.includes(k))) {
    return { category: 'WON', confidence: 0.97, summary: 'Cliente fechou o negócio!', emoji: '🎉' }
  }

  // 2. Check NOT_INTERESTED
  if (
    NOT_INTERESTED_KW.some((k) => lower.includes(k)) ||
    lower.includes('não gost') || lower.includes('nao gost') ||
    lower.includes('não curti') || lower.includes('nao curti') ||
    lower.includes('não quer') || lower.includes('nao quer')
  ) {
    return { category: 'NOT_INTERESTED', confidence: 0.95, summary: 'Cliente sinalizou desinteresse.', emoji: '😔' }
  }

  // 3. Check BUDGET CONSTRAINTS ("sem dinheiro", "sem caixa")
  if (BUDGET_KW.some((k) => lower.includes(k))) {
    return { category: 'OBJECTION_BUDGET', confidence: 0.95, summary: 'Cliente relatou limitação de orçamento ou caixa.', emoji: '💸' }
  }

  // 4. Check PRICE QUESTIONS ("quanto custa", "valor")
  if (PRICE_KW.some((k) => lower.includes(k))) {
    return { category: 'OBJECTION_PRICE', confidence: 0.95, summary: 'Cliente quer saber valores e orçamento.', emoji: '💰' }
  }

  // 5. Check THINK ABOUT
  if (THINK_KW.some((k) => lower.includes(k))) {
    return { category: 'THINK_ABOUT', confidence: 0.88, summary: 'Cliente quer mais tempo para decidir.', emoji: '🤔' }
  }

  // 6. Check INTERESTED
  const isNegated = lower.startsWith('não') || lower.startsWith('nao') || lower.includes(' não ') || lower.includes(' nao ')
  if (!isNegated && INTERESTED_KW.some((k) => lower.includes(k))) {
    return { category: 'INTERESTED', confidence: 0.90, summary: 'Cliente demonstrou interesse claro!', emoji: '🔥' }
  }

  // 7. Check QUESTION
  if (lower.includes('?')) {
    return { category: 'QUESTION', confidence: 0.80, summary: 'Cliente fez uma pergunta pontual.', emoji: '❓' }
  }

  // Default fallback
  return { category: 'NOT_INTERESTED', confidence: 0.70, summary: 'Cliente deu um retorno neutro ou negativo.', emoji: '😔' }
}

export function buildInstruction(analysis: SalesAnalysis, company: Company | any): SalesInstruction {
  const name = company?.name || 'a empresa'
  const city = company?.city || 'Rolândia'
  const niche = getNiche(company?.category)

  type InstrMap = {
    whatToDo: string
    whatToSay: string
    suggestedReply: string
  }

  const map: Record<SalesResponseCategory, InstrMap> = {
    WON: {
      whatToDo: 'PARABÉNS! Formalize agora. Envie o contrato/resumo e combine a data de início.',
      whatToSay: 'Confirme os detalhes e o próximo passo imediato.',
      suggestedReply: `Que ótima notícia! Vou te enviar agora o resumo do que combinamos e os próximos passos. Me confirma o melhor e-mail para te mandar o contrato. Quando você prefere que eu comece?`,
    },
    INTERESTED: {
      whatToDo: 'CLIENTE INTERESSADO! Mostre a demonstração gratuita agora e destaque o valor para o negócio dele.',
      whatToSay: 'Envia o link da demo e mostre os diferenciais.',
      suggestedReply: `Fico muito feliz pelo interesse! Preparei uma demonstração exclusiva de um site moderno para o ${name}, com botão de WhatsApp e estrutura pronta para atração de clientes no Google. Posso te enviar o link para dar uma olhada agora mesmo?`,
    },
    OBJECTION_BUDGET: {
      whatToDo: 'CLIENTE COM ORÇAMENTO APERTADO! Responda com empatia pelo caixa dele. Enfatize que a demonstração é 100% GRATUITA e sem compromisso, e mencione condições parceladas muito leves.',
      whatToSay: 'Acolha a situação e ofereça a demo sem custo.',
      suggestedReply: `Entendo perfeitamente a sua situação! Manter o caixa protegido é prioridade em qualquer empresa. Por isso mesmo, eu montei uma demonstração 100% gratuita do site do ${name} para você ver como ficaria sem gastar nada. E se um dia fizer sentido, facilitamos o pagamento em parcelas super baixas. Posso te enviar o link da demo só para você dar uma olhada sem compromisso?`,
    },
    OBJECTION_PRICE: {
      whatToDo: 'CLIENTE PERGUNTOU VALORES! Dê uma faixa transparente (R$ 600 a R$ 1.500 em até 12x) e convide para ver a demonstração gratuita.',
      whatToSay: 'Fale dos valores com clareza e direcione para a demonstração.',
      suggestedReply: `Nossos projetos de site profissional para empresas variam geralmente entre R$ 600 e R$ 1.500 (em até 12x), incluindo toda a criação, domínio e suporte. Mas montei uma demonstração gratuita exclusiva para o ${name} para você avaliar a qualidade sem nenhum custo antes. Posso te mandar o link da demo?`,
    },
    OBJECTION_NEED: {
      whatToDo: 'Mostre o valor da presença digital no Google e como os concorrentes captam clientes.',
      whatToSay: 'Mostre o impacto nas vendas locais.',
      suggestedReply: `Entendo perfeitamente! Mas hoje a maioria das pessoas em ${city} pesquisa no Google antes de comprar ou contratar. O site funciona como seu melhor vendedor 24 horas por dia. Quer ver a demonstração que montei sem compromisso nenhum?`,
    },
    THINK_ABOUT: {
      whatToDo: 'Deixe a demonstração com ele para analisar no próprio tempo.',
      whatToSay: 'Respeite o tempo dele e ofereça a demo.',
      suggestedReply: `Com certeza, faz todo sentido! Deixa eu te mandar o link da demonstração gratuita que montei para o ${name} — você pode dar uma olhada com calma no seu tempo, sem compromisso nenhum. Me avisa quando puder ver!`,
    },
    QUESTION: {
      whatToDo: 'Responda a dúvida de forma direta e convide para ver o site.',
      whatToSay: 'Responda com clareza e apresente a demo.',
      suggestedReply: `Ótima pergunta! Criamos sites 100% modernos, otimizados para celular e prontos para gerar contatos no WhatsApp. Quer dar uma olhada na demonstração que montei para o ${name}?`,
    },
    NOT_INTERESTED: {
      whatToDo: 'Agradeça educadamente e não insista.',
      whatToSay: 'Encerrar contato de forma cortês e elegante.',
      suggestedReply: `Poxa, sem problemas! Agradeço de coração pelo seu retorno. Deixo as portas abertas se no futuro o ${name} precisar de um site profissional. Desejo muito sucesso aos seus negócios!`,
    },
  }

  const instr = map[analysis.category]
  return {
    analysis,
    ...instr,
    showSiteButton: ['INTERESTED', 'WON', 'QUESTION', 'OBJECTION_PRICE', 'OBJECTION_BUDGET'].includes(analysis.category),
    showProposalButton: ['INTERESTED', 'WON', 'OBJECTION_PRICE'].includes(analysis.category),
    isWon: analysis.category === 'WON',
    isLost: analysis.category === 'NOT_INTERESTED',
  }
}

export async function analyzeClientResponseAI(
  response: string,
  company: Company | any,
  apiKey: string
): Promise<SalesInstruction> {
  const systemPrompt = `${SALES_BRAIN_PROMPT}

O sistema solicita a ANÁLISE DA MENSAGEM DO CLIENTE para a empresa abaixo.
Você deve agir como o SALES BRAIN.
A empresa prospectada é: ${company?.name || 'Empresa Local'}
Categoria: ${company?.category || 'Negócio Local'}
Cidade: ${company?.city || 'Rolândia'}

Retorne EXATAMENTE no formato JSON válido:
{
  "category": "INTERESTED" | "OBJECTION_BUDGET" | "OBJECTION_PRICE" | "OBJECTION_NEED" | "THINK_ABOUT" | "QUESTION" | "NOT_INTERESTED" | "WON",
  "summary": "Resumo em 1 frase curta do posicionamento do cliente",
  "whatToDo": "Instrução tática direta para o vendedor",
  "suggestedReply": "Mensagem exata pronta para enviar no WhatsApp do cliente"
}`

  try {
    const raw = await callAI({
      systemPrompt,
      userMessage: `Empresa: ${company?.name || 'Empresa'} (${company?.category || 'Negócio Local'} em ${company?.city || 'Rolândia'})\nResposta enviada pelo cliente no WhatsApp: "${response}"`,
    })

    const cleaned = raw.replace(/```json\s*|```/g, '').trim()
    const json = JSON.parse(cleaned)

    const category: SalesResponseCategory = json.category || analyzeClientResponse(response).category

    const emojiMap: Record<SalesResponseCategory, string> = {
      INTERESTED: '🔥',
      OBJECTION_BUDGET: '💸',
      OBJECTION_PRICE: '💰',
      OBJECTION_NEED: '🎯',
      THINK_ABOUT: '🤔',
      QUESTION: '❓',
      NOT_INTERESTED: '😔',
      WON: '🎉',
    }

    const analysis: SalesAnalysis = {
      category,
      confidence: 0.95,
      summary: json.summary || `Cliente sinalizou: ${category}`,
      emoji: emojiMap[category] || '💬',
    }

    return {
      analysis,
      whatToDo: json.whatToDo || 'Responda mantendo o tom humano e profissional.',
      whatToSay: json.whatToDo || '',
      suggestedReply: json.suggestedReply || '',
      showSiteButton: ['INTERESTED', 'WON', 'QUESTION', 'OBJECTION_PRICE', 'OBJECTION_BUDGET'].includes(category),
      showProposalButton: ['INTERESTED', 'WON', 'OBJECTION_PRICE'].includes(category),
      isWon: category === 'WON',
      isLost: category === 'NOT_INTERESTED',
    }
  } catch (err: any) {
    console.warn('[salesAI] Usando motor de regras inteligentes devido a erro na chamada AI:', err)
    const analysis = analyzeClientResponse(response)
    const instruction = buildInstruction(analysis, company)
    instruction.whatToDo = `[ERRO NA IA: ${err.message || String(err)}] - Fallback ativado:\n${instruction.whatToDo}`
    instruction.suggestedReply = `[⚠️ A IA falhou ao gerar a resposta. Erro: ${err.message || String(err)}]\n\n${instruction.suggestedReply}`
    return instruction
  }
}
