import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../services/store'
import { Card, Button } from '../components/ui'
import { OutreachService } from '../services/outreach'
import type { OutreachChannel, QualificationLevel } from '../types'

export default function NewOutreachCampaign() {
  const navigate = useNavigate()
  const { qualifications, leads, companies, toast } = useApp()

  const [name, setName] = useState('Campanha Prospecção Rolândia')
  const [targetNiche, setTargetNiche] = useState('')
  const [targetCity, setTargetCity] = useState('')
  const [minScore, setMinScore] = useState(60)
  const [opportunityFilter, setOpportunityFilter] = useState<QualificationLevel | 'ALL'>('ALL')
  const [offerName, setOfferName] = useState('Website Institucional Profissional')
  const [offerPrice, setOfferPrice] = useState('497')
  const [channel, setChannel] = useState<OutreachChannel>('MANUAL')
  const [requiresApproval, setRequiresApproval] = useState(true)
  const [loading, setLoading] = useState(false)

  // Live preview calculation
  const qualMap = new Map(qualifications.map((q) => [q.leadId, q]))
  const companyMap = new Map(companies.map((c) => [c.id, c]))

  const eligibleLeads = leads.filter((l) => {
    const company = companyMap.get(l.companyId)
    if (!company || company.doNotContact || l.status === 'DO_NOT_CONTACT') return false

    const score = qualMap.get(l.id)?.finalScore ?? l.score ?? 0
    if (score < minScore) return false

    if (opportunityFilter !== 'ALL') {
      const q = qualMap.get(l.id)
      if (q && q.qualification !== opportunityFilter) return false
    }

    if (targetCity && company.city?.toLowerCase() !== targetCity.toLowerCase()) return false
    if (targetNiche && company.category?.toLowerCase() !== targetNiche.toLowerCase()) return false

    return true
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast('warning', 'Digite um nome para a campanha.')
      return
    }

    setLoading(true)
    try {
      const service = new OutreachService()
      const campaign = service.createCampaign({
        name,
        targetNiche: targetNiche || undefined,
        targetCity: targetCity || undefined,
        minScore,
        opportunityFilter,
        offerName,
        offerPrice: offerPrice ? parseFloat(offerPrice) : undefined,
        channel,
        requiresApproval,
        autoFollowUpEnabled: true,
      })

      // Gerar mensagens para os leads selecionados
      await service.generateCampaignMessages(campaign.id)

      toast('success', `Campanha "${campaign.name}" criada com ${eligibleLeads.length} leads selecionados!`)
      navigate('/outreach/approval')
    } catch (err: any) {
      toast('error', `Erro ao criar campanha: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'grid', gap: '1.5rem' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>➕ Nova Campanha de Prospecção</h1>
        <p style={{ margin: '0.25rem 0 0 0', color: 'var(--muted)' }}>
          Configure o segmento, filtros de pontuação, oferta comercial e canal de envio.
        </p>
      </div>

      <Card style={{ padding: '1.5rem' }}>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Nome da Campanha</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Restaurantes — Rolândia — Agosto" required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Nicho / Categoria (opcional)</label>
              <input className="input" value={targetNiche} onChange={(e) => setTargetNiche(e.target.value)} placeholder="Ex.: Restaurantes, Oficinas" />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Cidade (opcional)</label>
              <input className="input" value={targetCity} onChange={(e) => setTargetCity(e.target.value)} placeholder="Ex.: Rolândia" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Score Mínimo: {minScore} pts</label>
              <input
                type="range"
                min="0"
                max="100"
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Filtro de Oportunidade</label>
              <select
                value={opportunityFilter}
                onChange={(e) => setOpportunityFilter(e.target.value as any)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-1)', color: 'inherit' }}
              >
                <option value="ALL">Todas as Oportunidades</option>
                <option value="HIGH">🔥 Alta Oportunidade (HIGH)</option>
                <option value="MEDIUM">🟡 Média Oportunidade (MEDIUM)</option>
                <option value="LOW">🔵 Baixa Oportunidade (LOW)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Nome da Oferta</label>
              <input className="input" value={offerName} onChange={(e) => setOfferName(e.target.value)} placeholder="Ex.: Website Institucional Profissional" required />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Preço (R$)</label>
              <input className="input" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} placeholder="497" type="number" />
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>Canal</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as OutreachChannel)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-1)', color: 'inherit' }}
              >
                <option value="MANUAL">MANUAL (Seguro)</option>
                <option value="WHATSAPP">WHATSAPP (Link Oficial)</option>
                <option value="EMAIL">EMAIL</option>
              </select>
            </div>
          </div>

          <div style={{ background: 'var(--surface-2)', padding: '1rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600 }}>🔒 Aprovação Humana (Human-in-the-Loop)</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Exige aprovação manual do operador antes de permitir envio/cópia.</div>
            </div>
            <input
              type="checkbox"
              checked={requiresApproval}
              onChange={(e) => setRequiresApproval(e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
          </div>

          <div style={{ background: 'var(--surface-2)', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Prévia de Leads Selecionados:</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)', marginTop: '0.25rem' }}>
              {eligibleLeads.length} leads qualificados elegíveis
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button type="button" variant="secondary" onClick={() => navigate('/outreach')}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={loading || eligibleLeads.length === 0}>
              {loading ? 'Criando e Gerando Mensagens...' : '🚀 Criar Campanha & Gerar Mensagens'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
