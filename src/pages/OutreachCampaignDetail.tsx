import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useApp } from '../services/store'
import { Card, Button, Badge } from '../components/ui'

export default function OutreachCampaignDetail() {
  const { id } = useParams<{ id: string }>()
  const { outreachCampaigns, leads, companies, outreachMessages, qualifications, upsertOutreachCampaign } = useApp()

  const campaign = outreachCampaigns.find((c) => c.id === id)
  if (!campaign) {
    return (
      <Card style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Campanha de prospecção não encontrada.</h2>
        <Link to="/outreach"><Button variant="secondary">Voltar ao Outreach</Button></Link>
      </Card>
    )
  }

  const campaignLeads = leads.filter((l) => l.campaignId === campaign.id)
  const campaignMessages = outreachMessages.filter((m) => m.campaignId === campaign.id)

  const companyMap = new Map(companies.map((c) => [c.id, c]))
  const qualMap = new Map(qualifications.map((q) => [q.leadId, q]))

  const handleToggleStatus = () => {
    const nextStatus = campaign.status === 'RUNNING' ? 'PAUSED' : 'RUNNING'
    upsertOutreachCampaign({
      ...campaign,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    })
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>{campaign.name}</h1>
            <Badge variant={campaign.status === 'RUNNING' ? 'success' : campaign.status === 'PAUSED' ? 'warning' : 'info'}>
              {campaign.status}
            </Badge>
          </div>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--muted)' }}>
            Oferta: {campaign.offerName} {campaign.offerPrice ? `(R$ ${campaign.offerPrice})` : ''} • Canal: {campaign.channel}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="secondary" onClick={handleToggleStatus}>
            {campaign.status === 'RUNNING' ? '⏸️ Pausar' : '▶️ Iniciar'}
          </Button>
          <Link to="/outreach/approval">
            <Button variant="primary">⚡ Aprovações Pendentes</Button>
          </Link>
        </div>
      </div>

      {/* Grid de Estatísticas da Campanha */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
        <Card style={{ padding: '1rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Leads Selecionados</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{campaignLeads.length}</div>
        </Card>
        <Card style={{ padding: '1rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Mensagens Geradas</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{campaignMessages.length}</div>
        </Card>
        <Card style={{ padding: '1rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Aprovadas/Prontas</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--violet)' }}>
            {campaignMessages.filter((m) => m.status === 'APPROVED' || m.status === 'READY').length}
          </div>
        </Card>
        <Card style={{ padding: '1rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Contatadas</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--primary)' }}>
            {campaignMessages.filter((m) => m.status === 'SENT').length}
          </div>
        </Card>
      </div>

      {/* Fila de Leads da Campanha */}
      <Card style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>📋 Fila de Leads da Campanha</h3>
        {campaignLeads.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Nenhum lead associado a esta campanha.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {campaignLeads.map((lead) => {
              const company = companyMap.get(lead.companyId)
              const qual = qualMap.get(lead.id)
              const msg = campaignMessages.find((m) => m.leadId === lead.id)

              return (
                <div key={lead.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--surface-2)', borderRadius: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Link to={`/leads/${lead.id}`} style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
                        {company?.name || lead.companyId}
                      </Link>
                      <Badge variant={qual?.qualification === 'HIGH' ? 'danger' : 'warning'}>
                        Score: {qual?.finalScore ?? lead.score ?? '—'}
                      </Badge>
                      <Badge variant="info">Status CRM: {lead.status}</Badge>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                      {company?.category} • {company?.city}/{company?.state} • Tel: {company?.phone || 'Ausente'}
                    </div>
                  </div>

                  <div>
                    {msg ? (
                      <Badge variant={msg.status === 'SENT' ? 'success' : msg.status === 'PENDING_APPROVAL' ? 'warning' : 'info'}>
                        Msg: {msg.status}
                      </Badge>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Sem mensagem</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
