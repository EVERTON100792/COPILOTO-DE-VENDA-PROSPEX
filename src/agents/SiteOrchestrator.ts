import { BusinessAnalyst } from './BusinessAnalyst'
import { WebsitePlannerAgent } from './WebsitePlannerAgent'
import { WebsiteGeneratorAgent } from './WebsiteGeneratorAgent'
import { WebsiteReviewerAgent } from './WebsiteReviewerAgent'
import { useApp } from '../services/store'
import { uid, nowIso } from '../lib/utils'
import type { Company, SiteGenerationStep, WebsiteProject, WebsiteVersion } from '../types'
import type { AgentContext } from './types'

export type SiteOrchestratorOptions = {
  company: Company
  apiKey?: string
  customPrompt?: string
  onProgress: (steps: SiteGenerationStep[]) => void
}

export type SiteOrchestratorResult = {
  success: boolean
  project: WebsiteProject | null
  error?: string
}

function makeStep(id: string, label: string, detail: string, status: SiteGenerationStep['status'] = 'PENDING'): SiteGenerationStep {
  return { id, label, detail, status }
}

function getCtx(company: Company): AgentContext {
  const s = useApp.getState()
  return {
    workspaceId: s.workspaceId,
    demoMode: s.settings.demoMode,
    nicheDna: null,
    campaign: null,
    settings: s.settings,
  }
}

export async function runSiteOrchestrator(options: SiteOrchestratorOptions): Promise<SiteOrchestratorResult> {
  const { company, apiKey, customPrompt, onProgress } = options
  const store = useApp.getState()
  const ctx = getCtx(company)

  const STEPS: SiteGenerationStep[] = [
    makeStep('analyst',  '📋 Analisando empresa e prompt', 'Levantando dados do negócio e diretrizes do usuário'),
    makeStep('planner',  '🎯 Planejando estrutura',        'Definindo seções, cores, tipografia, fotos e CTA'),
    makeStep('generator','⚙️ Gerando site HTML/CSS',       'Construindo código completo responsivo com mapas e fotos'),
    makeStep('reviewer', '🔍 Revisando qualidade',         'Verificando CTAs, mapa do Google e SEO'),
    makeStep('done',     '✅ Site pronto!',                 'Versão pronta para preview e download'),
  ]

  const update = (idx: number, status: SiteGenerationStep['status'], detail?: string) => {
    STEPS[idx] = { ...STEPS[idx], status, ...(detail ? { detail } : {}) }
    onProgress([...STEPS])
  }

  // Find or create project
  const existingProject = store.websiteProjects.find((p) => p.companyId === company.id)
  const projectId = existingProject?.id || uid('wbp')
  const versionNumber = (existingProject?.versions.length ?? 0) + 1
  const versionId = uid('wbv')

  const version: WebsiteVersion = {
    id: versionId,
    projectId,
    version: versionNumber,
    status: 'GENERATING',
    plan: null,
    files: null,
    reviewIssues: [],
    reviewScore: 0,
    createdAt: nowIso(),
  }

  const project: WebsiteProject = existingProject
    ? { ...existingProject, versions: [...existingProject.versions, version], updatedAt: nowIso() }
    : { id: projectId, companyId: company.id, currentVersionId: null, versions: [version], createdAt: nowIso(), updatedAt: nowIso() }

  store.upsertWebsiteProject(project)
  onProgress([...STEPS])

  try {
    // === STEP 1: Business Analyst ===
    update(0, 'RUNNING')
    const analyst = new BusinessAnalyst()
    await analyst.execute({ companies: [company], niche: company.category || '', customPrompt }, ctx)
    update(0, 'DONE', `Nicho: ${company.category || 'Serviços'} · ${company.city || 'Rolândia'} ${customPrompt ? '(Prompt Personalizado)' : ''}`)

    // === STEP 2: Website Planner ===
    update(1, 'RUNNING')
    const planner = new WebsitePlannerAgent()
    const planResult = await planner.execute({ company, apiKey, customPrompt }, ctx)
    const plan = (planResult.output as any)?.plan || null
    if (!plan) throw new Error('Falha no planejamento do site')
    store.patchWebsiteVersion(projectId, versionId, { plan: plan as Record<string, unknown> })
    update(1, 'DONE', `Estrutura: ${plan.sections?.length || 0} seções · CTA: "${plan.cta}"`)

    // === STEP 3: Website Generator ===
    update(2, 'RUNNING')
    const generator = new WebsiteGeneratorAgent()
    const genResult = await generator.execute({ company, plan, customPrompt }, ctx)
    const files = (genResult.output as any)?.files || null
    if (!files) throw new Error('Falha na geração do site')
    store.patchWebsiteVersion(projectId, versionId, { files: files as Record<string, string>, status: 'REVIEWING' })
    update(2, 'DONE', `Site gerado — ${Object.keys(files).length} arquivos`)

    // === STEP 4: Website Reviewer ===
    update(3, 'RUNNING')
    const reviewer = new WebsiteReviewerAgent()
    const reviewResult = await reviewer.execute({ company, files }, ctx)
    const review = reviewResult.output as any
    const reviewIssues = review?.issues || []
    const reviewScore = review?.score || 100
    store.patchWebsiteVersion(projectId, versionId, {
      status: 'READY',
      reviewIssues,
      reviewScore,
    })
    // Update project to mark this as current version
    store.upsertWebsiteProject({
      ...project,
      currentVersionId: versionId,
      versions: [...project.versions.filter((v) => v.id !== versionId), { ...version, files, plan, reviewIssues, reviewScore, status: 'READY' }],
      updatedAt: nowIso(),
    })
    const issueStr = reviewIssues.length > 0 ? `${reviewIssues.length} alerta(s) — score ${reviewScore}/100` : `Aprovado! Score ${reviewScore}/100`
    update(3, 'DONE', issueStr)

    // === DONE ===
    update(4, 'DONE', `Versão ${versionNumber} pronta · Clique para visualizar`)

    const finalProject = useApp.getState().websiteProjects.find((p) => p.id === projectId)
    return { success: true, project: finalProject || project }

  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // Mark all RUNNING steps as ERROR
    STEPS.forEach((s, i) => { if (s.status === 'RUNNING') update(i, 'ERROR', msg) })
    store.patchWebsiteVersion(projectId, versionId, { status: 'FAILED' })
    return { success: false, project: null, error: msg }
  }
}
