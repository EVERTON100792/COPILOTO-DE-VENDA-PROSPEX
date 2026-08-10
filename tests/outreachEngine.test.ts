import { describe, it, expect, beforeEach } from 'vitest'
import { useApp } from '../src/services/store'
import { OutreachService } from '../src/services/outreach'
import { ResponseClassificationService, analyzeLeadReplyText } from '../src/services/responseClassification'
import { FollowUpEngineService } from '../src/services/followUpEngine'
import type { Company, Lead } from '../src/types'

describe('FASE 4 — OUTREACH ENGINE', () => {
  beforeEach(() => {
    useApp.getState().resetAll()

    const companyA: Company = {
      id: 'c-out-1',
      workspaceId: 'ws_main',
      name: 'Pizzaria Rolândia',
      category: 'Restaurantes',
      city: 'Rolândia',
      state: 'PR',
      address: 'Rua Principal, 100',
      phone: '(43) 99999-1111',
      whatsapp: null,
      email: 'contato@pizzariarolandia.com.br',
      website: null,
      instagram: null,
      facebook: null,
      rating: 4.5,
      reviewCount: 20,
      hours: null,
      source: 'openstreetmap',
      isDemo: false,
      createdAt: new Date().toISOString(),
    }

    const companyB: Company = {
      id: 'c-out-2',
      workspaceId: 'ws_main',
      name: 'Mecânica Silva',
      category: 'Oficinas',
      city: 'Rolândia',
      state: 'PR',
      address: 'Av. Brasil, 200',
      phone: '(43) 98888-2222',
      whatsapp: null,
      email: null,
      website: 'https://mecanicasilva.com.br',
      instagram: null,
      facebook: null,
      rating: 4.0,
      reviewCount: 15,
      hours: null,
      source: 'openstreetmap',
      isDemo: false,
      createdAt: new Date().toISOString(),
    }

    const leadA: Lead = {
      id: 'lead-out-1',
      workspaceId: 'ws_main',
      companyId: companyA.id,
      campaignId: null,
      status: 'NEW',
      tier: 'HIGH',
      score: 85,
      scoreBreakdown: [],
      websiteStatus: 'NO_WEBSITE',
      websiteScan: null,
      digitalPresenceScore: 20,
      hasWhatsapp: false,
      hasInstagram: false,
      hasFacebook: false,
      hasPhone: true,
      analysis: null,
      messages: [],
      proposal: null,
      favorite: false,
      tags: [],
      notesCount: 0,
      nextAction: null,
      nextActionAt: null,
      analysisHash: null,
      lastAnalyzedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const leadB: Lead = {
      id: 'lead-out-2',
      workspaceId: 'ws_main',
      companyId: companyB.id,
      campaignId: null,
      status: 'NEW',
      tier: 'MEDIUM',
      score: 65,
      scoreBreakdown: [],
      websiteStatus: 'WEBSITE_FOUND',
      websiteScan: null,
      digitalPresenceScore: 60,
      hasWhatsapp: false,
      hasInstagram: false,
      hasFacebook: false,
      hasPhone: true,
      analysis: null,
      messages: [],
      proposal: null,
      favorite: false,
      tags: [],
      notesCount: 0,
      nextAction: null,
      nextActionAt: null,
      analysisHash: null,
      lastAnalyzedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    useApp.getState().upsertCompany(companyA)
    useApp.getState().upsertCompany(companyB)
    useApp.getState().upsertLead(leadA)
    useApp.getState().upsertLead(leadB)
  })

  it('1. Cria campanha de outreach e seleciona leads compatíveis', () => {
    const service = new OutreachService()
    const campaign = service.createCampaign({
      name: 'Campanha Restaurantes Rolândia',
      minScore: 70,
      targetCity: 'Rolândia',
      channel: 'MANUAL',
      requiresApproval: true,
    })

    expect(campaign.id).toBeDefined()
    expect(campaign.stats.selectedCount).toBe(1) // Apenas leadA (score 85 >= 70)

    const updatedLeads = useApp.getState().leads
    const leadA = updatedLeads.find((l) => l.id === 'lead-out-1')
    expect(leadA?.campaignId).toBe(campaign.id)
  })

  it('2. Gera mensagens de prospecção usando templates determinísticos quando IA está desativada', async () => {
    const service = new OutreachService()
    const campaign = service.createCampaign({
      name: 'Campanha Teste',
      minScore: 50,
      requiresApproval: true,
    })

    const messages = await service.generateCampaignMessages(campaign.id)
    expect(messages.length).toBe(2)
    expect(messages[0].status).toBe('PENDING_APPROVAL')
    expect(messages[0].body).toContain('Pizzaria Rolândia')
  })

  it('3. Aprova mensagem e atualiza status do lead para READY_TO_CONTACT', async () => {
    const service = new OutreachService()
    const campaign = service.createCampaign({
      name: 'Campanha Teste',
      minScore: 50,
      requiresApproval: true,
    })

    const [msg] = await service.generateCampaignMessages(campaign.id)
    service.approveMessage(msg.id)

    const updatedMsg = useApp.getState().outreachMessages.find((m) => m.id === msg.id)
    const updatedLead = useApp.getState().leads.find((l) => l.id === msg.leadId)

    expect(updatedMsg?.status).toBe('APPROVED')
    expect(updatedLead?.status).toBe('READY_TO_CONTACT')
  })

  it('4. Copiar ou abrir WhatsApp NUNCA marca a mensagem como SENT (sem falso envio)', async () => {
    const service = new OutreachService()
    const campaign = service.createCampaign({ name: 'Campanha Teste', minScore: 50 })
    const [msg] = await service.generateCampaignMessages(campaign.id)

    service.recordMessageCopied(msg.leadId, msg.id)
    service.recordWhatsappOpened(msg.leadId, msg.id)

    const updatedMsg = useApp.getState().outreachMessages.find((m) => m.id === msg.id)
    const updatedLead = useApp.getState().leads.find((l) => l.id === msg.leadId)

    expect(updatedMsg?.status).not.toBe('SENT')
    expect(updatedLead?.status).not.toBe('CONTACTED')

    const activities = useApp.getState().outreachActivities
    expect(activities.some((a) => a.type === 'MESSAGE_COPIED')).toBe(true)
    expect(activities.some((a) => a.type === 'WHATSAPP_OPENED')).toBe(true)
  })

  it('5. Confirmar contato manual atualiza lead para CONTACTED e agenda follow-up', async () => {
    const service = new OutreachService()
    const campaign = service.createCampaign({ name: 'Campanha Teste', minScore: 50 })
    const [msg] = await service.generateCampaignMessages(campaign.id)

    service.recordManualContact(msg.leadId, msg.id, 'MANUAL')

    const updatedMsg = useApp.getState().outreachMessages.find((m) => m.id === msg.id)
    const updatedLead = useApp.getState().leads.find((l) => l.id === msg.leadId)
    const followups = useApp.getState().followups

    expect(updatedMsg?.status).toBe('SENT')
    expect(updatedLead?.status).toBe('CONTACTED')
    expect(followups.length).toBeGreaterThan(0)
    expect(followups[0].leadId).toBe(msg.leadId)
  })

  it('6. Analisa e classifica resposta do cliente (INTERESTED, PRICE, OPT_OUT)', async () => {
    const priceRes = analyzeLeadReplyText('Quanto custa a criação do site?')
    expect(priceRes.category).toBe('PRICE')
    expect(priceRes.intentScore).toBeGreaterThanOrEqual(80)

    const optOutRes = analyzeLeadReplyText('Não tenho interesse e por favor pare de enviar mensagens!')
    expect(optOutRes.category).toBe('OPT_OUT')
    expect(optOutRes.intentScore).toBe(0)

    const respService = new ResponseClassificationService()
    await respService.recordLeadReply('lead-out-1', 'Por favor pare de enviar mensagens e tire meu número do cadastro')

    const companyA = useApp.getState().companies.find((c) => c.id === 'c-out-1')
    const leadA = useApp.getState().leads.find((l) => l.id === 'lead-out-1')

    expect(companyA?.doNotContact).toBe(true)
    expect(leadA?.status).toBe('DO_NOT_CONTACT')
  })

  it('7. FollowUpEngine cancela follow-ups quando lead entra em opt-out ou responde', () => {
    const followEngine = new FollowUpEngineService()
    followEngine.scheduleNextFollowUp('lead-out-1', 'INITIAL')

    expect(useApp.getState().followups.some((f) => f.leadId === 'lead-out-1' && f.status === 'PENDING')).toBe(true)

    followEngine.cancelFollowUps('lead-out-1', 'Cliente respondeu')

    expect(useApp.getState().followups.some((f) => f.leadId === 'lead-out-1' && f.status === 'PENDING')).toBe(false)
  })
})
