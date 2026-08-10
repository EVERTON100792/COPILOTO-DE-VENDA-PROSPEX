import React, { useState } from 'react'
import { Modal, Button, Card } from './ui'
import { downloadProposalPdf } from '../services/proposalGenerator'
import type { Company } from '../types'
import { useApp } from '../services/store'

interface Props {
  open: boolean
  company: Company | null
  onClose: () => void
}

export const ProposalEditorModal: React.FC<Props> = ({ open, company, onClose }) => {
  const [sitePrice, setSitePrice] = useState('400.00')
  const [domainPrice, setDomainPrice] = useState('40.00')

  if (!open || !company) return null

  const handleGenerate = () => {
    const siteVal = parseFloat(sitePrice) || 400
    const domainVal = parseFloat(domainPrice) || 40

    const services = [
      {
        name: 'Desenvolvimento de Site Institucional Responsivo',
        description: 'Criação de site de até 5 páginas otimizado para celulares, com botão de WhatsApp e SEO local.',
        price: siteVal
      },
      {
        name: 'Registro de Domínio (Anual)',
        description: 'Registro e configuração de domínio profissional (.com.br ou .com).',
        price: domainVal
      }
    ]

    downloadProposalPdf(company, services)
    useApp.getState().toast('success', 'Proposta gerada com sucesso!')
    onClose()
  }

  const total = (parseFloat(sitePrice) || 0) + (parseFloat(domainPrice) || 0)

  return (
    <Modal open={open} onClose={onClose} title="📝 Editar Proposta Comercial">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <p className="text-muted text-sm">
          Ajuste os valores e serviços antes de gerar o PDF para enviar ao cliente <b>{company.name}</b>.
        </p>

        <Card title="Serviços & Investimento">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Service 1 */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>1. Desenvolvimento de Site</div>
                <div className="text-muted" style={{ fontSize: 13 }}>Site completo, responsivo e otimizado.</div>
              </div>
              <div style={{ width: 140 }}>
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px' }}>
                  <span className="text-muted">R$</span>
                  <input
                    type="number"
                    style={{ border: 'none', background: 'transparent', width: '100%', padding: '8px', outline: 'none', fontWeight: 'bold' }}
                    value={sitePrice}
                    onChange={(e) => setSitePrice(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Service 2 */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>2. Registro de Domínio (Anual)</div>
                <div className="text-muted" style={{ fontSize: 13 }}>Domínio .com.br ou .com</div>
              </div>
              <div style={{ width: 140 }}>
                <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 8, padding: '0 8px' }}>
                  <span className="text-muted">R$</span>
                  <input
                    type="number"
                    style={{ border: 'none', background: 'transparent', width: '100%', padding: '8px', outline: 'none', fontWeight: 'bold' }}
                    value={domainPrice}
                    onChange={(e) => setDomainPrice(e.target.value)}
                  />
                </div>
              </div>
            </div>

          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 'bold', fontSize: 16 }}>TOTAL</span>
            <span style={{ fontWeight: 'bold', fontSize: 18, color: 'var(--primary)' }}>
              R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </Card>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleGenerate}>📄 Gerar PDF</Button>
        </div>
      </div>
    </Modal>
  )
}
