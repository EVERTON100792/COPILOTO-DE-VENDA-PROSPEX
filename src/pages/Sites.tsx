import React, { useState } from 'react'
import { useApp } from '../services/store'
import { downloadSiteZip, generateSiteFiles } from '../services/siteGenerator'
import { Card, Button, EmptyState } from '../components/ui'

export const Sites: React.FC = () => {
  const companies = useApp((s) => s.companies)
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companies[0]?.id || '')
  const [activeTab, setActiveTab] = useState<'index.html' | 'sobre.html' | 'servicos.html' | 'contato.html'>('index.html')

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId) || companies[0]

  const siteFiles = selectedCompany
    ? generateSiteFiles({
        name: selectedCompany.name,
        tagline: `Excelência em ${selectedCompany.category || 'serviços com qualidade e confiança.'}`,
        primaryColor: '#6366f1',
        services: [
          { title: 'Atendimento Personalizado', description: 'Soluções sob medida adaptadas à sua necessidade.' },
          { title: 'Qualidade Garantida', description: 'Profissionais capacitados e suporte dedicado.' },
          { title: 'Orçamento Rápido', description: 'Resposta imediata para o seu projeto via WhatsApp.' }
        ],
        phone: selectedCompany.phone || undefined,
        whatsapp: selectedCompany.whatsapp || selectedCompany.phone || undefined,
        email: selectedCompany.email || undefined,
        address: selectedCompany.address || undefined
      })
    : null

  return (
    <div className="flex col gap-16">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">🌐 Estúdio Gerador de Sites</h1>
          <p className="page-subtitle">
            Crie sites institucionais responsivos de 5 páginas. Exporte o pacote ZIP e publique no Netlify Drop de graça.
          </p>
        </div>
        <div className="page-actions">
          {selectedCompany && (
            <Button variant="success" onClick={() => downloadSiteZip(selectedCompany)}>
              📦 Baixar Pacote ZIP do Site
            </Button>
          )}
        </div>
      </div>

      {/* Select Company Card */}
      <Card title="Selecionar Empresa">
        <div className="flex items-center gap-12">
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="select flex-1"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.city || 'Sem cidade'}) — {c.website ? 'Com site' : 'Sem site'}
              </option>
            ))}
          </select>
          {selectedCompany && (
            <Button variant="primary" onClick={() => downloadSiteZip(selectedCompany)}>
              Gerar ZIP agora
            </Button>
          )}
        </div>
      </Card>

      {/* Live Preview Container */}
      {selectedCompany && siteFiles ? (
        <Card title={`Pré-visualização do site: ${selectedCompany.name}`}>
          <div className="flex items-center justify-between mb-12 pb-12" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex gap-8">
              {(['index.html', 'sobre.html', 'servicos.html', 'contato.html'] as const).map((tab) => (
                <Button
                  key={tab}
                  size="sm"
                  variant={activeTab === tab ? 'primary' : 'secondary'}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </Button>
              ))}
            </div>
            <div className="tiny muted">5 Páginas em HTML5/CSS3 · Mobile-first</div>
          </div>

          <div style={{ background: '#ffffff', borderRadius: '12px', overflow: 'hidden', padding: '4px', border: '1px solid var(--border)' }}>
            <iframe
              title="Site Preview"
              srcDoc={siteFiles[activeTab]}
              style={{ width: '100%', height: '550px', border: 'none', borderRadius: '8px' }}
            />
          </div>
        </Card>
      ) : (
        <EmptyState
          icon="🌐"
          title="Nenhuma empresa selecionada"
          subtitle="Realize buscas de estabelecimentos em Descoberta para popular o estúdio."
        />
      )}
    </div>
  )
}
