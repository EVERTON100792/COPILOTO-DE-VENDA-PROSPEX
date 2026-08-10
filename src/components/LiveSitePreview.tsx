import React, { useState } from 'react'
import { Button, Badge } from './ui'
import { generateSiteFiles, downloadSiteZip } from '../services/siteGenerator'
import { useApp } from '../services/store'
import type { Demo, Company } from '../types'

interface Props {
  demo: Demo
  company?: Company
}

export const LiveSitePreview: React.FC<Props> = ({ demo, company }) => {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [activeTab, setActiveTab] = useState<'index.html' | 'sobre.html' | 'servicos.html' | 'contato.html'>('index.html')
  const [isPublished, setIsPublished] = useState<boolean>(demo.status === 'PUBLISHED')

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

  const frameWidth = device === 'mobile' ? '375px' : device === 'tablet' ? '768px' : '100%'

  const handlePublish = () => {
    const url = `https://demo.prospex.app/d/${demo.slug}`
    useApp.getState().publishDemo(demo.id, url)
    setIsPublished(true)
    useApp.getState().toast('success', 'Demonstração publicada com sucesso!')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', height: '100%' }}>
      
      {/* Top Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>Preview do Site</h3>
          <Badge variant={isPublished ? 'success' : 'warning'}>
            {isPublished ? '🌐 PUBLICADO' : 'PRONTO PARA PUBLICAR'}
          </Badge>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={() => company && downloadSiteZip(company)}>
            📦 Baixar ZIP
          </Button>
          {!isPublished && (
            <Button variant="primary" size="sm" onClick={handlePublish}>
              🌐 Publicar Site
            </Button>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
        padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button
            size="sm"
            variant={device === 'desktop' ? 'primary' : 'secondary'}
            onClick={() => setDevice('desktop')}
          >
            💻 PC
          </Button>
          <Button
            size="sm"
            variant={device === 'mobile' ? 'primary' : 'secondary'}
            onClick={() => setDevice('mobile')}
          >
            📱 Mobile
          </Button>
        </div>

        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {(['index.html', 'sobre.html', 'servicos.html', 'contato.html'] as const).map((tab) => (
            <button
              key={tab}
              className={`btn btn-xs ${activeTab === tab ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.replace('.html', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Frame */}
      <div style={{ display: 'flex', justifyContent: 'center', width: '100%', flex: 1, minHeight: 400 }}>
        <div
          style={{
            width: frameWidth,
            transition: 'width 0.3s ease',
            background: '#ffffff',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <iframe
            title="Demo Live Preview"
            srcDoc={siteFiles[activeTab]}
            style={{ width: '100%', height: '100%', flex: 1, border: 'none' }}
          />
        </div>
      </div>
    </div>
  )
}
