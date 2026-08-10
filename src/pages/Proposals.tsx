import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../services/store'
import { Card, Badge, Button, EmptyState, Field, Modal } from '../components/ui'
import { formatDate, formatDateTime, uid, nowIso } from '../lib/utils'
import { recordActivity } from '../services/crm'
import { downloadProposalPdf } from '../services/proposalGenerator'
import type { Lead, ProposalStatus } from '../types'

const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  DRAFT: 'Rascunho', SENT: 'Enviada', VIEWED: 'Visualizada',
  NEGOTIATING: 'Em negociação', ACCEPTED: 'Aceita', REJECTED: 'Recusada',
}

export default function Proposals() {
  const navigate = useNavigate()
  const leads = useApp((s) => s.leads)
  const companies = useApp((s) => s.companies)
  const s = useApp.getState()

  const withProposal = leads
    .filter((l) => l.proposal)
    .sort((a, b) => (b.proposal?.createdAt ?? '').localeCompare(a.proposal?.createdAt ?? ''))

  const [open, setOpen] = useState(false)
  const [leadId, setLeadId] = useState('')
  const [form, setForm] = useState({ product: '', price: '', deliverable: '', benefit: '', cta: '', description: '', deadline: '' })

  function createProposal() {
    if (!leadId || !form.product.trim()) return
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return
    const proposal = {
      id: uid('prp'),
      offer: {
        product: form.product.trim(),
        price: Number(form.price) || 0,
        deliverable: form.deliverable.trim(),
        benefit: form.benefit.trim(),
        cta: form.cta.trim() || 'Responder este e-mail',
      },
      description: form.description.trim(),
      deadline: form.deadline || null,
      observations: null,
      status: 'DRAFT' as ProposalStatus,
      createdAt: nowIso(),
    }
    s.upsertLead({ ...lead, proposal, updatedAt: nowIso() })
    recordActivity(lead.id, 'PROPOSAL_CREATED', 'Proposta criada para o lead')
    s.toast('success', 'Proposta criada')
    setOpen(false)
    setLeadId('')
    setForm({ product: '', price: '', deliverable: '', benefit: '', cta: '', description: '', deadline: '' })
  }

  function changeStatus(lead: Lead, status: ProposalStatus) {
    if (!lead.proposal) return
    s.upsertLead({ ...lead, proposal: { ...lead.proposal, status }, updatedAt: nowIso() })
    recordActivity(lead.id, 'PROPOSAL_STATUS', `Proposta marcada como ${PROPOSAL_STATUS_LABELS[status]}`)
  }

  const candidates = leads.filter((l) => !l.proposal && l.status !== 'DO_NOT_CONTACT')

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Propostas</h1>
          <p className="page-subtitle">{withProposal.length} propostas criadas</p>
        </div>
        <div className="page-actions">
          <Button variant="primary" onClick={() => setOpen(true)}>+ Nova proposta</Button>
        </div>
      </div>

      {withProposal.length === 0 ? (
        <EmptyState
          icon="📄"
          title="Nenhuma proposta"
          subtitle="Crie propostas para leads em negociação ou pré-contrato."
          action={<Button onClick={() => setOpen(true)}>Criar proposta</Button>}
        />
      ) : (
        <div className="grid grid-3">
          {withProposal.map((l) => {
            const company = companies.find((c) => c.id === l.companyId)
            const p = l.proposal!
            return (
              <Card key={l.id} className="card-hover">
                <div className="flex justify-between mb-8">
                  <b className="clickable" onClick={() => navigate(`/leads/${l.id}`)}>{company?.name ?? '—'}</b>
                  <Badge variant={statusVariant(p.status)}>{PROPOSAL_STATUS_LABELS[p.status]}</Badge>
                </div>
                <div className="small mb-8">
                  <div className="bold">{p.offer.product}</div>
                  <div className="muted">R$ {p.offer.price.toLocaleString('pt-BR')}</div>
                  {p.description && <div className="muted small mt-4">{p.description}</div>}
                  {p.deadline && <div className="tiny muted mt-4">Prazo: {formatDate(p.deadline)}</div>}
                </div>
                <div className="small muted mb-8">Criada em {formatDateTime(p.createdAt)}</div>
                <div className="flex gap-8 wrap mt-4">
                  {(Object.keys(PROPOSAL_STATUS_LABELS) as ProposalStatus[]).map((st) => (
                    <Button key={st} size="sm" variant={p.status === st ? 'primary' : 'secondary'} onClick={() => changeStatus(l, st)}>
                      {PROPOSAL_STATUS_LABELS[st]}
                    </Button>
                  ))}
                  {company && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() =>
                        downloadProposalPdf(company, [
                          {
                            name: p.offer.product || 'Desenvolvimento de Site',
                            description: p.description || 'Criação de site otimizado.',
                            price: p.offer.price || 1490
                          },
                          {
                            name: 'Registro de Domínio (Anual)',
                            description: 'Domínio profissional.',
                            price: 40
                          }
                        ])
                      }
                    >
                      📥 Baixar PDF
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={open}
        title="Nova proposta"
        onClose={() => setOpen(false)}
      >
          <div className="flex col gap-12">
            <Field label="Lead">
              <select className="select" value={leadId} onChange={(e) => setLeadId(e.target.value)}>
                <option value="">Selecione...</option>
                {candidates.map((l) => {
                  const c = companies.find((x) => x.id === l.companyId)
                  return <option key={l.id} value={l.id}>{c?.name ?? '—'} ({l.score ?? 'sem score'})</option>
                })}
              </select>
            </Field>
            <div className="grid grid-2">
              <Field label="Produto/serviço"><input className="input" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} placeholder="Site institucional" /></Field>
              <Field label="Preço (R$)"><input type="number" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="2990" /></Field>
              <Field label="Entregável"><input className="input" value={form.deliverable} onChange={(e) => setForm({ ...form, deliverable: e.target.value })} placeholder="Homepage + 4 páginas + SEO" /></Field>
              <Field label="Benefício"><input className="input" value={form.benefit} onChange={(e) => setForm({ ...form, benefit: e.target.value })} placeholder="Mais clientes vindo do Google" /></Field>
              <Field label="CTA"><input className="input" value={form.cta} onChange={(e) => setForm({ ...form, cta: e.target.value })} placeholder="Posso marcar uma call?" /></Field>
              <Field label="Prazo"><input type="date" className="input" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} /></Field>
            </div>
            <Field label="Descrição"><textarea className="textarea" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="O que está incluso na proposta..." /></Field>
            <div className="modal-foot">
              <Button variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button variant="primary" disabled={!leadId || !form.product.trim()} onClick={createProposal}>Criar proposta</Button>
            </div>
          </div>
        </Modal>
    </div>
  )
}

function statusVariant(st: ProposalStatus): 'success' | 'warning' | 'info' | 'muted' | 'danger' {
  if (st === 'ACCEPTED') return 'success'
  if (st === 'REJECTED') return 'danger'
  if (st === 'SENT' || st === 'VIEWED' || st === 'NEGOTIATING') return 'warning'
  return 'muted'
}