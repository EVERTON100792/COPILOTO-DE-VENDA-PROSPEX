import React from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../services/store'
import { Card, Button, Badge } from '../components/ui'

export default function OutreachDashboard() {
  const { outreachCampaigns, outreachMessages, leads, outreachActivities, qualifications } = useApp()

  const pendingApprovals = outreachMessages.filter((m) => m.status === 'PENDING_APPROVAL')
  const readyMessages = outreachMessages.filter((m) => m.status === 'READY' || m.status === 'APPROVED')
  const sentMessages = outreachMessages.filter((m) => m.status === 'SENT')
  const repliedLeads = leads.filter((l) => l.status === 'REPLIED' || l.status === 'INTERESTED')
  const interestedLeads = leads.filter((l) => l.status === 'INTERESTED')
  const wonLeads = leads.filter((l) => l.status === 'WON')
  const optOutLeads = leads.filter((l) => l.status === 'DO_NOT_CONTACT')

  // Top Opportunities
  const qualMap = new Map(qualifications.map((q) => [q.leadId, q]))
  const topLeads = [...leads]
    .filter((l) => l.status !== 'DO_NOT_CONTACT' && l.status !== 'WON')
    .sort((a, b) => (qualMap.get(b.id)?.finalScore ?? b.score ?? 0) - (qualMap.get(a.id)?.finalScore ?? a.score ?? 0))
    .slice(0, 5)

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>📢 Outreach Control Center</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--muted)' }}>
            Gestão de campanhas, aprovações, abordagens e qualificação de respostas.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link to="/outreach/approval">
            <Button variant="secondary">
              ⚡ Central de Aprovação {pendingApprovals.length > 0 && `(${pendingApprovals.length})`}
            </Button>
          </Link>
          <Link to="/outreach/new">
            <Button variant="primary">➕ Nova Campanha</Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <Card style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Campanhas Criadas</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.25rem 0' }}>{outreachCampaigns.length}</div>
        </Card>

        <Card style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Aguardando Aprovação</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.25rem 0', color: pendingApprovals.length > 0 ? 'var(--warning)' : 'inherit' }}>
            {pendingApprovals.length}
          </div>
        </Card>

        <Card style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Contatos Realizados</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.25rem 0', color: 'var(--primary)' }}>
            {sentMessages.length}
          </div>
        </Card>

        <Card style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Interessados</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.25rem 0', color: 'var(--success)' }}>
            {interestedLeads.length}
          </div>
        </Card>

        <Card style={{ padding: '1.25rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Opt-Out (Bloqueados)</span>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0.25rem 0', color: optOutLeads.length > 0 ? 'var(--danger)' : 'var(--muted)' }}>
            {optOutLeads.length}
          </div>
        </Card>
      </div>

      {/* Funil Visual */}
      <Card style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>📊 Funil de Prospecção & Conversão</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', textAlign: 'center' }}>
          <div style={{ background: 'var(--surface-2)', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{leads.length}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Leads Totais</div>
          </div>
          <div style={{ background: 'var(--surface-2)', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--info)' }}>{qualifications.length}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Qualificados</div>
          </div>
          <div style={{ background: 'var(--surface-2)', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--violet)' }}>{readyMessages.length}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Prontos</div>
          </div>
          <div style={{ background: 'var(--surface-2)', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)' }}>{sentMessages.length}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Contatados</div>
          </div>
          <div style={{ background: 'var(--surface-2)', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--warning)' }}>{repliedLeads.length}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Responderam</div>
          </div>
          <div style={{ background: 'var(--surface-2)', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success)' }}>{interestedLeads.length}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Interessados</div>
          </div>
          <div style={{ background: 'var(--surface-2)', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--success)' }}>{wonLeads.length}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Ganhos</div>
          </div>
        </div>
      </Card>

      {/* Top Oportunidades & Atividades Recentes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>🔥 Top Oportunidades</h3>
          {topLeads.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Nenhum lead qualificado disponível.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {topLeads.map((lead) => {
                const q = qualMap.get(lead.id)
                return (
                  <div key={lead.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--surface-2)', borderRadius: '6px' }}>
                    <div>
                      <Link to={`/leads/${lead.id}`} style={{ fontWeight: 600, color: 'var(--primary)', textDecoration: 'none' }}>
                        {lead.companyId}
                      </Link>
                      <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                        Status: {lead.status}
                      </div>
                    </div>
                    <Badge variant={q?.qualification === 'HIGH' ? 'danger' : 'warning'}>
                      Score: {q?.finalScore ?? lead.score ?? '—'}
                    </Badge>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>📝 Atividades Recentes</h3>
          {outreachActivities.length === 0 ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Nenhuma atividade de prospecção registrada ainda.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
              {outreachActivities.slice(0, 10).map((act) => (
                <div key={act.id} style={{ fontSize: '0.85rem', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600 }}>{act.summary}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                    {new Date(act.createdAt).toLocaleString('pt-BR')} • {act.actor}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
