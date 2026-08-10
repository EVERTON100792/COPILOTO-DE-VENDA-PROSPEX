import { aiGenerate } from './index'
import { logger } from '../../lib/logger'
import type {
  Company,
  Lead,
  QualificationLevel,
  OpportunityType,
  RecommendedService,
  LeadEvidence,
} from '../../types'

export interface AIQualificationInput {
  company: {
    name: string
    category: string | null
    city: string | null
    state: string | null
    address: string | null
    phone: string | null
    website: string | null
    instagram: string | null
    facebook: string | null
    rating: number | null
    reviewCount: number | null
    dataStatus: string
    sourceType: string | null
    sourceUrl: string | null
  }
  websiteScan: {
    exists: boolean
    status: number | null
    https: boolean
    title: string | null
    description: string | null
    mobileFriendly: boolean | null
    loadable: boolean
    outdatedSignals: number
  } | null
  websiteQualityScore: number | null
  ruleBasedScore: number
  opportunityReasons: string[]
  discoveryConfidence: string | null
  confidenceReasons: string[]
}

export interface AIQualificationResponse {
  qualification: QualificationLevel
  confidence: number
  summary: string
  positiveSignals: string[]
  negativeSignals: string[]
  evidence: LeadEvidence[]
  opportunityReasons: string[]
  opportunityTypes: OpportunityType[]
  recommendedService: RecommendedService
  recommendedApproach: string
  websiteAssessment: string
  nextAction: string
  aiScore: number
}

const SYSTEM_PROMPT = `Você é um analista sênior de inteligência comercial B2B especializado em prospecção de negócios locais.

SUA MISSÃO:
Analisar exclusivamente os dados fornecidos sobre a empresa e avaliar a oportunidade comercial para serviços de presença digital, websites, landing pages e automação.

REGRAS ABSOLUTAS (ANTI-ALUCINAÇÃO):
1. Use APENAS os dados fornecidos. NUNCA invente telefones, endereços, faturamento, quantidade de funcionários, redes sociais ou preços.
2. Se o campo de website for nulo/ausente, NUNCA afirme com certeza absoluta que "a empresa não possui site". Em vez disso, use linguagem precisa: "Não identificamos um site oficial registrado nas fontes públicas consultadas".
3. Se um dado não estiver disponível, registre-o como "Não informado" ou "Não verificado". NUNCA preencha lacunas com suposições apresentadas como fatos.
4. Diferencie fatos verificados de inferências comerciais. Cada conclusão relevante DEVE ter evidência suportada.

RESPOSTA OBRIGATÓRIA EM FORMATO JSON VÁLIDO:
Retorne estritamente um objeto JSON com o seguinte schema:
{
  "qualification": "HIGH" | "MEDIUM" | "LOW" | "UNVERIFIED",
  "confidence": number (de 0.00 a 1.00),
  "aiScore": number (de 0 a 100),
  "summary": "Resumo executivo de 2-3 frases",
  "positiveSignals": ["sinal positivo 1", "sinal positivo 2"],
  "negativeSignals": ["sinal negativo 1"],
  "evidence": [
    {
      "signal": "Nome da evidência",
      "source": "Fonte do dado (ex: OpenStreetMap / Scanner)",
      "value": "Valor ou observação factual",
      "impact": "positive" | "negative" | "neutral",
      "confidence": number (0.0 a 1.0)
    }
  ],
  "opportunityReasons": ["motivo 1", "motivo 2"],
  "opportunityTypes": ["NO_WEBSITE_IDENTIFIED" | "LOW_QUALITY_WEBSITE" | "OUTDATED_WEBSITE" | "WEAK_DIGITAL_PRESENCE" | "GOOD_DIGITAL_PRESENCE" | "MOBILE_ISSUE" | "MISSING_CONTACT_CTA" | "MISSING_WHATSAPP_CTA" | "MISSING_SERVICE_INFORMATION" | "MISSING_LOCATION_INFORMATION" | "UNKNOWN"],
  "recommendedService": "WEBSITE_INSTITUTIONAL" | "LANDING_PAGE" | "WEBSITE_REDESIGN" | "WHATSAPP_LANDING_PAGE" | "MENU_DIGITAL" | "BOOKING_PAGE" | "LOCAL_SEO" | "DIGITAL_PRESENCE" | "UNKNOWN",
  "recommendedApproach": "Orientação para abordagem comercial segura sem suposições falsas",
  "websiteAssessment": "Avaliação objetiva do site ou da ausência de registros",
  "nextAction": "Próxima ação recomendada"
}`

export async function requestAIQualification(
  input: AIQualificationInput,
  apiKey?: string
): Promise<AIQualificationResponse | null> {
  const prompt = `Analise a seguinte empresa para qualificação B2B:

DADOS DA EMPRESA:
- Nome: ${input.company.name}
- Categoria: ${input.company.category ?? 'Não informado'}
- Localização: ${input.company.city ?? 'Não informado'} - ${input.company.state ?? 'Não informado'}
- Endereço: ${input.company.address ?? 'Não informado'}
- Telefone: ${input.company.phone ?? 'Não informado'}
- Website registrado: ${input.company.website ?? 'Nenhum registrado nas fontes públicas'}
- Instagram: ${input.company.instagram ?? 'Não informado'}
- Facebook: ${input.company.facebook ?? 'Não informado'}
- Avaliação: ${input.company.rating ? `${input.company.rating} (${input.company.reviewCount ?? 0} avaliações)` : 'Não informado'}
- Status dos dados: ${input.company.dataStatus} (Fonte: ${input.company.sourceType ?? 'Desconhecida'})

DIAGNÓSTICO TÉCNICO E DE OPORTUNIDADE:
- Score baseado em regras: ${input.ruleBasedScore}/100
- Qualidade do site: ${input.websiteQualityScore !== null ? `${input.websiteQualityScore}/100` : 'Não analisado'}
- Scan do site: ${input.websiteScan ? (input.websiteScan.exists ? `Online (Status ${input.websiteScan.status ?? 'OK'}, HTTPS: ${input.websiteScan.https})` : 'Inacessível ou não encontrado') : 'Não executado'}
- Motivos de oportunidade identificados: ${input.opportunityReasons.join('; ') || 'Nenhum registrado'}
- Confiança da descoberta: ${input.discoveryConfidence ?? 'Não especificada'} (${(input.confidenceReasons || []).join('; ')})

Gere a qualificação comercial completa respeitando rigorosamente o schema JSON e as regras anti-alucinação.`

  try {
    const aiRes = await aiGenerate({
      system: SYSTEM_PROMPT,
      prompt,
      temperature: 0.2,
      maxTokens: 1200,
    })

    if (!aiRes.text || aiRes.provider === 'demo-template') {
      return null
    }

    // Extrai bloco JSON da resposta
    const jsonMatch = aiRes.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      logger.warn('AI_QUALIFICATION', 'Resposta da IA não contém JSON válido', aiRes.text.slice(0, 200))
      return null
    }

    const parsed = JSON.parse(jsonMatch[0]) as Partial<AIQualificationResponse>

    // Validação estrita do schema
    if (!parsed.qualification || typeof parsed.aiScore !== 'number') {
      logger.warn('AI_QUALIFICATION', 'JSON da IA não possui campos obrigatórios schema')
      return null
    }

    return {
      qualification: sanitizeQualification(parsed.qualification),
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.7)),
      aiScore: Math.min(100, Math.max(0, Math.round(Number(parsed.aiScore) || 50))),
      summary: String(parsed.summary || '').trim() || 'Qualificação realizada por IA.',
      positiveSignals: Array.isArray(parsed.positiveSignals) ? parsed.positiveSignals.map(String) : [],
      negativeSignals: Array.isArray(parsed.negativeSignals) ? parsed.negativeSignals.map(String) : [],
      evidence: Array.isArray(parsed.evidence)
        ? parsed.evidence.map((ev) => ({
            signal: String(ev.signal || 'Evidência'),
            source: String(ev.source || 'IA'),
            value: String(ev.value || ''),
            impact: ev.impact === 'negative' ? 'negative' : ev.impact === 'neutral' ? 'neutral' : 'positive',
            confidence: Math.min(1, Math.max(0, Number(ev.confidence) || 0.8)),
          }))
        : [],
      opportunityReasons: Array.isArray(parsed.opportunityReasons) ? parsed.opportunityReasons.map(String) : [],
      opportunityTypes: Array.isArray(parsed.opportunityTypes)
        ? (parsed.opportunityTypes as OpportunityType[]).filter(Boolean)
        : ['UNKNOWN'],
      recommendedService: (parsed.recommendedService as RecommendedService) || 'UNKNOWN',
      recommendedApproach: String(parsed.recommendedApproach || '').trim() || 'Abordagem consultiva padrão.',
      websiteAssessment: String(parsed.websiteAssessment || '').trim() || 'Sem observações adicionais de site.',
      nextAction: String(parsed.nextAction || '').trim() || 'Revisar qualificação e preparar rascunho.',
    }
  } catch (e) {
    logger.error('AI_QUALIFICATION', 'Erro ao processar resposta da IA', String(e))
    return null
  }
}

function sanitizeQualification(q: unknown): QualificationLevel {
  if (q === 'HIGH' || q === 'MEDIUM' || q === 'LOW') return q
  return 'UNVERIFIED'
}
