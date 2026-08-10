import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useApp } from '../services/store'
import { generateSiteFiles } from '../services/siteGenerator'
import { downloadSiteZip } from '../services/siteGenerator'
import { Card, Button, Badge } from '../components/ui'
import { ProposalEditorModal } from '../components/ProposalEditorModal'

export const DemoPreview: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const demos = useApp((s) => s.demos)
  const companies = useApp((s) => s.companies)

  const demo = demos.find((d) => d.id === id || d.slug === id) || demos[0]
  const company = demo ? companies.find((c) => c.id === demo.companyId) : undefined

  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [activeTab, setActiveTab] = useState<'index.html' | 'sobre.html' | 'servicos.html' | 'contato.html'>('index.html')
  const [isPublished, setIsPublished] = useState<boolean>(demo?.status === 'PUBLISHED')
  const [proposalModalOpen, setProposalModalOpen] = useState(false)

  if (!demo) {
    return (
      <div className="p-24 text-center">
        <h2>Demonstração não encontrada.</h2>
        <Button variant="primary" className="mt-12" onClick={() => navigate('/demos')}>
          Voltar para Demos
        </Button>
      </div>
    )
  }

  const siteFiles = generateSiteFiles({
    name: demo.content.headline.split('—')[0].trim(),
    tagline: demo.content.subheadline,
    primaryColor: demo.brand.primaryColor,
    about: demo.content.about,
    services: demo.content.services,
    phone: company?.phone || undefined,
    whatsapp: company?.whatsapp || company?.phone || undefined,
    address: company?.address || undefined,
    city: company?.city || undefined
  })

  const handlePublish = () => {
    const url = `https://demo.prospex.app/d/${demo.slug}`
    useApp.getState().publishDemo(demo.id, url)
    setIsPublished(true)
    useApp.getState().toast('success', 'Demonstração publicada com sucesso!')
  }

  const handleOpenWhatsApp = () => {
    if (!company) return
    const phone = company.whatsapp || company.phone
    if (!phone) return
    const digits = phone.replace(/\D/g, '')
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(demo.whatsappMessage)}`
    window.open(url, '_blank')
  }

  const frameWidth = device === 'mobile' ? '375px' : device === 'tablet' ? '768px' : '100%'

  return (
    <div className="flex col gap-16">
      {/* Page Header Bar */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-8 mb-4">
            <h1 className="page-title">{demo.content.headline}</h1>
            <Badge variant={isPublished ? 'success' : 'warning'}>
              {isPublished ? 'PUBLISHED' : 'PREVIEW READY'}
            </Badge>
          </div>
          <p className="page-subtitle">
            Demonstração personalizada gerada para {company?.name || 'Cliente'} ({company?.city || 'Local'}).
          </p>
        </div>
        <div className="page-actions">
          <Button variant="secondary" onClick={() => company && setProposalModalOpen(true)}>
            📄 Proposta PDF
          </Button>
          <Button variant="secondary" onClick={() => company && downloadSiteZip(company)}>
            📦 Baixar ZIP
          </Button>
          <Button variant="success" onClick={handleOpenWhatsApp}>
            💬 Enviar no WhatsApp
          </Button>
          {!isPublished && (
            <Button variant="primary" onClick={handlePublish}>
              🌐 Publicar Demo
            </Button>
          )}
        </div>
      </div>

      {/* Device & Page View Controls */}
      <Card>
        <div className="flex justify-between items-center wrap gap-12">
          <div className="flex gap-8 items-center">
            <span className="tiny bold muted uppercase">Dispositivo:</span>
            <Button
              size="sm"
              variant={device === 'desktop' ? 'primary' : 'secondary'}
              onClick={() => setDevice('desktop')}
            >
              💻 Desktop
            </Button>
            <Button
              size="sm"
              variant={device === 'tablet' ? 'primary' : 'secondary'}
              onClick={() => setDevice('tablet')}
            >
              📱 Tablet
            </Button>
            <Button
              size="sm"
              variant={device === 'mobile' ? 'primary' : 'secondary'}
              onClick={() => setDevice('mobile')}
            >
              📱 Mobile
            </Button>
          </div>

          <div className="flex gap-8 items-center">
            <span className="tiny bold muted uppercase">Página:</span>
            {(['index.html', 'sobre.html', 'servicos.html', 'contato.html'] as const).map((tab) => (
              <Button
                key={tab}
                size="sm"
                variant={activeTab === tab ? 'primary' : 'ghost'}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Interactive Frame Box */}
      <div className="flex justify-center w-full">
        <div
          style={{
            width: frameWidth,
            transition: 'width 0.3s ease',
            background: '#ffffff',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            border: '1px solid var(--border)'
          }}
        >
          <iframe
            title="Demo Live Preview"
            srcDoc={siteFiles[activeTab]}
            style={{ width: '100%', height: '650px', border: 'none' }}
          />
        </div>
      </div>

      <ProposalEditorModal
        open={proposalModalOpen}
        company={company || null}
        onClose={() => setProposalModalOpen(false)}
      />
    </div>
  )
}
