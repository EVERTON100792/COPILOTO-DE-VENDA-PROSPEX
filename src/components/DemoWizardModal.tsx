import React, { useState } from 'react'
import { Modal, Button, Badge } from './ui'
import { useApp } from '../services/store'
import { analyzeLeadIntelligence, generateDemoForLead } from '../services/demoEngine'
import { downloadProposalPdf } from '../services/proposalGenerator'
import { downloadSiteZip } from '../services/siteGenerator'
import type { Lead, Demo } from '../types'
import { useNavigate } from 'react-router-dom'

interface DemoWizardModalProps {
  open: boolean
  lead: Lead | null
  onClose: () => void
}

export const DemoWizardModal: React.FC<DemoWizardModalProps> = ({ open, lead, onClose }) => {
  const navigate = useNavigate()
  const companies = useApp((s) => s.companies)
  const company = lead ? companies.find((c) => c.id === lead.companyId) : undefined

  const [step, setStep] = useState<number>(1)
  const [generating, setGenerating] = useState<boolean>(false)
  const [demoCreated, setDemoCreated] = useState<Demo | null>(null)
  const [copiedWa, setCopiedWa] = useState<boolean>(false)

  if (!open || !lead) return null

  const intelligence = analyzeLeadIntelligence(lead, company)

  const handleStartGeneration = () => {
    setStep(4)
    setGenerating(true)
    setTimeout(() => {
      try {
        const demo = generateDemoForLead(lead.id)
        setDemoCreated(demo)
        setGenerating(false)
        setStep(5)
      } catch (err) {
        setGenerating(false)
        useApp.getState().toast('error', 'Não foi possível gerar a demonstração.')
      }
    }, 1500)
  }

  const handleCopyWhatsApp = () => {
    if (!demoCreated || !company) return
    navigator.clipboard.writeText(demoCreated.whatsappMessage)
    setCopiedWa(true)
    useApp.getState().toast('success', 'Texto para WhatsApp copiado!')
    setTimeout(() => setCopiedWa(false), 3000)
  }

  const handleOpenWhatsApp = () => {
    if (!demoCreated || !company) return
    const phone = company.whatsapp || company.phone
    if (!phone) {
      handleCopyWhatsApp()
      return
    }
    const digits = phone.replace(/\D/g, '')
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(demoCreated.whatsappMessage)}`
    window.open(url, '_blank')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={
        <div className="flex items-center gap-8">
          <span>⚡ Demo Generation Engine — Fase 5</span>
          <Badge variant="primary">Passo {step} de 5</Badge>
        </div>
      }
    >
      <div className="flex col gap-16 p-4">
        {/* Step Indicators */}
        <div className="grid grid-5 text-center gap-4 border-soft pb-12" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className={`tiny bold ${step === 1 ? 'text-primary' : 'muted'}`}>1. Lead</div>
          <div className={`tiny bold ${step === 2 ? 'text-primary' : 'muted'}`}>2. Inteligência</div>
          <div className={`tiny bold ${step === 3 ? 'text-primary' : 'muted'}`}>3. Direção</div>
          <div className={`tiny bold ${step === 4 ? 'text-primary' : 'muted'}`}>4. Geração</div>
          <div className={`tiny bold ${step === 5 ? 'text-primary' : 'muted'}`}>5. Preview</div>
        </div>

        {/* STEP 1: LEAD OVERVIEW */}
        {step === 1 && (
          <div className="flex col gap-12">
            <div className="bold text-lg">{company?.name || 'Empresa'}</div>
            <div className="small muted">
              {company?.category || 'Negócio Local'} · {company?.city || 'Sua Cidade'}
            </div>

            <div className="card p-12 mt-8">
              <div className="tiny bold text-primary uppercase mb-4">Dados Brutos Capturados</div>
              <div className="small flex col gap-4">
                <div>📞 Telefone: <b>{company?.phone || 'Não informado'}</b></div>
                <div>💬 WhatsApp: <b>{company?.whatsapp || company?.phone || 'Não informado'}</b></div>
                <div>📍 Endereço: <b>{company?.address || 'Não informado'}</b></div>
                <div>🌐 Site Atual: <b>{company?.website || 'Sem site registrado'}</b></div>
              </div>
            </div>

            <div className="flex justify-end gap-8 mt-12">
              <Button variant="secondary" onClick={onClose}>Cancelar</Button>
              <Button variant="primary" onClick={() => setStep(2)}>Avançar: Inteligência →</Button>
            </div>
          </div>
        )}

        {/* STEP 2: LEAD INTELLIGENCE */}
        {step === 2 && (
          <div className="flex col gap-12">
            <div className="bold text-base">Análise de Inteligência de Nicho</div>
            <div className="small muted">
              Mapeamento de posicionamento, diferenciais e oportunidade de conversão.
            </div>

            <div className="grid grid-2 gap-12">
              <div className="card">
                <div className="tiny bold text-primary uppercase">Nicho Identificado</div>
                <div className="bold text-base mt-4">{intelligence.subniche}</div>
                <div className="tiny muted mt-2">Cor da marca: <span style={{ color: intelligence.primaryColor, fontWeight: 'bold' }}>{intelligence.primaryColor}</span></div>
              </div>
              <div className="card">
                <div className="tiny bold text-success uppercase">CTA Recomendado</div>
                <div className="bold text-base mt-4">{intelligence.recommendedCTA}</div>
                <div className="tiny muted mt-2">Botão de conversão direta via WhatsApp</div>
              </div>
            </div>

            <div className="card">
              <div className="tiny bold text-primary uppercase mb-4">Diferenciais do Negócio</div>
              <ul className="small flex col gap-4 pl-16">
                {intelligence.differentiators.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>

            <div className="flex justify-between mt-12">
              <Button variant="secondary" onClick={() => setStep(1)}>← Voltar</Button>
              <Button variant="primary" onClick={() => setStep(3)}>Avançar: Direção Criativa →</Button>
            </div>
          </div>
        )}

        {/* STEP 3: CREATIVE DIRECTION */}
        {step === 3 && (
          <div className="flex col gap-12">
            <div className="bold text-base">Direção Criativa e Blueprint da Demo</div>
            <div className="small muted">
              Estrutura comercial adaptada para {intelligence.businessName}.
            </div>

            <div className="card">
              <div className="tiny bold text-primary uppercase mb-8">Estrutura Escolhida</div>
              <div className="flex gap-8 wrap">
                <Badge variant="primary">Hero com Vídeo/Foto</Badge>
                <Badge variant="info">Diferenciais</Badge>
                <Badge variant="success">Grade de Serviços</Badge>
                <Badge variant="warning">Sobre a Empresa</Badge>
                <Badge variant="violet">Mapa & Contato</Badge>
                <Badge variant="pink">Botão Flutuante WhatsApp</Badge>
              </div>
            </div>

            <div className="flex justify-between mt-12">
              <Button variant="secondary" onClick={() => setStep(2)}>← Voltar</Button>
              <Button variant="primary" onClick={handleStartGeneration}>⚡ Criar Demonstração Agora</Button>
            </div>
          </div>
        )}

        {/* STEP 4: GENERATING ANIMATION */}
        {step === 4 && (
          <div className="text-center p-24 flex col items-center justify-center gap-12">
            <div className="spinner" style={{ width: 40, height: 40 }} />
            <div className="bold text-lg">Construindo Demonstração Personalizada...</div>
            <div className="tiny muted">
              Aplicando dados reais de {intelligence.businessName} · Estilo {intelligence.subniche}
            </div>
          </div>
        )}

        {/* STEP 5: PREVIEW & ACTIONS */}
        {step === 5 && demoCreated && (
          <div className="flex col gap-12">
            <div className="card p-16 text-center" style={{ background: 'var(--surface-2)', borderColor: 'var(--success)' }}>
              <div className="text-2xl mb-4">🎉</div>
              <div className="bold text-lg text-success">Demonstração Pronta!</div>
              <div className="small muted mt-4">
                A demonstração exclusiva de <b>{intelligence.businessName}</b> foi gerada e vinculada ao lead no CRM.
              </div>
            </div>

            <div className="card">
              <div className="tiny bold text-primary uppercase mb-4">Mensagem para Envio no WhatsApp</div>
              <textarea
                className="textarea"
                rows={4}
                value={demoCreated.whatsappMessage}
                onChange={(e) => setDemoCreated({ ...demoCreated, whatsappMessage: e.target.value })}
              />
              <div className="flex justify-end gap-8 mt-8">
                <Button variant="secondary" size="sm" onClick={handleCopyWhatsApp}>
                  {copiedWa ? '✓ Copiado!' : '📋 Copiar Texto'}
                </Button>
                <Button variant="success" size="sm" onClick={handleOpenWhatsApp}>
                  💬 Abrir WhatsApp
                </Button>
              </div>
            </div>

            <div className="grid grid-3 gap-8 mt-12">
              <Button
                variant="primary"
                onClick={() => {
                  onClose()
                  navigate(`/demo/${demoCreated.id}`)
                }}
              >
                👁️ Abrir Preview Interativo
              </Button>
              <Button
                variant="secondary"
                onClick={() => company && downloadProposalPdf(company)}
              >
                📄 Proposta PDF
              </Button>
              <Button
                variant="secondary"
                onClick={() => company && downloadSiteZip(company)}
              >
                📦 Baixar Pacote ZIP
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
