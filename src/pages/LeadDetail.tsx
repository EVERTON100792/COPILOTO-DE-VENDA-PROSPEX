import { useState, useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useApp } from '../services/store'
import { Card, Badge, Button, Field, EmptyState, ScoreBadge, Tabs } from '../components/ui'
import { tierLabel, WEBSITE_STATUS_LABELS, PIPELINE_ORDER } from '../config/defaults'
import { whatsappLink } from '../components/exportHelpers'
import { CompanySourcePanel } from '../components/discovery'
import {
  changeLeadStatus, toggleFavorite, addTag, removeTag, addUserNote,
  createTask, setNextAction,
} from '../services/crm'
import {
  approveMessage, editMessage, sendLeadMessage,
} from '../services/messaging'
import { planFollowups, markFollowupDone, skipFollowup } from '../services/followups'
import { formatDate, formatDateTime, timeAgo } from '../lib/utils'
import type { Lead, LeadMessage, LeadStatus, ActivityType } from '../types'
import { AIInsights } from '../components/AIInsights'
import { DemoWizardModal } from '../components/DemoWizardModal'
import { QualificationService } from '../services/qualification'
import { OutreachService } from '../services/outreach'
import { ResponseClassificationService } from '../services/responseClassification'
import type { ResponseAnalysis } from '../types'

const VERSION_LABELS: Record<LeadMessage['version'], string> = {
  short: 'Direta (curta)',
  consultive: 'Consultiva',
  direct: 'Ousada (direct)',
}

const TAB_IDS = ['overview', 'outreach', 'messages', 'activity', 'notes', 'followups', 'tasks'] as const
type TabId = (typeof TAB_IDS)[number]

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const lead = useApp((s) => s.leads.find((l) => l.id === id))
  const allCompanies = useApp((s) => s.companies)
  const allActivities = useApp((s) => s.activities)
  const allNotes = useApp((s) => s.notes)
  const allFollowups = useApp((s) => s.followups)
  const allTasks = useApp((s) => s.tasks)
  const company = useMemo(() => (lead ? allCompanies.find((c) => c.id === lead.companyId) : undefined), [allCompanies, lead])
  const activities = useMemo(() => (lead ? allActivities.filter((a) => a.leadId === lead.id) : []), [allActivities, lead])
  const notes = useMemo(() => (lead ? allNotes.filter((n) => n.leadId === lead.id) : []), [allNotes, lead])
  const followups = useMemo(() => (lead ? allFollowups.filter((f) => f.leadId === lead.id) : []), [allFollowups, lead])
  const tasks = useMemo(() => (lead ? allTasks.filter((t) => t.leadId === lead.id) : []), [allTasks, lead])
  const s = useApp.getState()

  const [tab, setTab] = useState<TabId>('overview')
  const [noteText, setNoteText] = useState('')
  const [tagText, setTagText] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [sendBusy, setSendBusy] = useState(false)
  const [msgDraft, setMsgDraft] = useState<{ id: string; body: string } | null>(null)

  const [demoModalOpen, setDemoModalOpen] = useState(false)

  if (!lead) {
    return (
      <EmptyState
        icon="👤"
        title="Lead não encontrado"
        subtitle="Ele pode ter sido removido."
        action={<Link to="/leads" className="btn btn-secondary">Ver leads</Link>}
      />
    )
  }

  const l = lead as Lead
  const wa = whatsappLink(company?.whatsapp ?? null)

  async function handleSend(msg: LeadMessage, channel: 'whatsapp' | 'email') {
    setSendBusy(true)
    const res = await sendLeadMessage(l, msg, channel)
    setSendBusy(false)
    if (!res.ok) s.toast('error', res.error ?? 'Envio bloqueado')
    else if (res.simulated) s.toast('success', 'Envio simulado (modo demo) — registrado na atividade')
    else s.toast('success', 'Mensagem enviada!')
  }

  function handleStatusChange(st: string) {
    changeLeadStatus(l.id, st as LeadStatus)
    if (st === 'CONTACTED') planFollowups(l)
  }

  return (
    <div>
      <DemoWizardModal
        open={demoModalOpen}
        lead={l}
        onClose={() => setDemoModalOpen(false)}
      />
      <div className="page-header">
        <div>
          <h1 className="page-title">{company?.name ?? 'Empresa'}</h1>
          <p className="page-subtitle">
            {company?.category ?? '—'} · {company?.city ?? ''}{company?.state ? `/${company.state}` : ''} · <Link to={`/companies`} className="link-btn">ver empresas</Link>
          </p>
        </div>
        <div className="page-actions">
          {lead.status !== 'WON' && (
            <Button variant="success" onClick={() => { changeLeadStatus(l.id, 'WON'); s.toast('success', '🏆 Lead marcado como Ganho!') }}>🏆 Marcar Ganho</Button>
          )}
          {lead.status !== 'LOST' && (
            <Button variant="danger" onClick={() => { changeLeadStatus(l.id, 'LOST'); s.toast('success', '🗑️ Movido para Arquivo Morto') }}>🗑️ Arquivo Morto</Button>
          )}
          <Button variant="primary" onClick={() => setDemoModalOpen(true)}>
            ⚡ Gerar Demonstração (Fase 5)
          </Button>
          <Button variant="secondary" onClick={() => navigate('/leads')}>← Leads</Button>
          <Button variant={lead.favorite ? 'primary' : 'secondary'} onClick={() => toggleFavorite(lead)}>
            {lead.favorite ? '★ Favorito' : '☆ Favoritar'}
          </Button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '280px 1fr' }}>
        <div className="flex col gap-16">
          <Card className="ta-center">
            <ScoreBadge score={lead.score} />
            <div className="mt-8">
              <Badge variant="violet">{tierLabel(lead.tier)}</Badge>
            </div>
            <div className="mt-12">
              <select className="select" value={lead.status} onChange={(e) => handleStatusChange(e.target.value)}>
                {PIPELINE_ORDER.map((st) => (
                  <option key={st} value={st}>{statusLabel(st)}</option>
                ))}
              </select>
            </div>
            <div className="small muted mt-12">
              Criado {timeAgo(lead.createdAt)}<br />
              Atualizado {timeAgo(lead.updatedAt)}
            </div>
          </Card>

          <Card title="Contato">
            <ul className="contact-list">
              {company?.phone && (
                <li>
                  <span>💬</span>
                  <a 
                    href={`https://wa.me/55${company.phone.replace(/\D/g, '')}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    title="Abrir no WhatsApp"
                    style={{ textDecoration: 'none', color: 'var(--fg)' }}
                    className="hover-underline"
                  >
                    {company.phone}
                  </a>
                </li>
              )}
              {wa && <li><span>💬</span><a href={wa} target="_blank" rel="noreferrer">WhatsApp</a></li>}
              {company?.email && <li><span>✉️</span><a href={`mailto:${company.email}`}>{company.email}</a></li>}
              {company?.website && <li><span>🌐</span><a href={company.website} target="_blank" rel="noreferrer">{company.website}</a></li>}
              {company?.instagram && <li><span>📸</span><a href={company.instagram} target="_blank" rel="noreferrer">{company.instagram}</a></li>}
              {company?.facebook && <li><span>👍</span><a href={company.facebook} target="_blank" rel="noreferrer">{company.facebook}</a></li>}
            </ul>
            <div className="small muted mt-8">
              {company?.rating != null && <>⭐ {company.rating} ({company.reviewCount ?? 0} avaliações)<br /></>}
              {company?.hours && <>{company.hours}<br /></>}
              Origem: {company?.source ?? '—'}
            </div>
          </Card>

          <CompanySourcePanel company={company ?? undefined} />

          <Card title="Presença digital">
            <div className="small">
              <div className="flex justify-between mb-4"><span>Website</span><Badge variant={websiteVariant(lead.websiteStatus)}>{WEBSITE_STATUS_LABELS[lead.websiteStatus] ?? lead.websiteStatus}</Badge></div>
              <div className="flex justify-between mb-4"><span>WhatsApp</span>{lead.hasWhatsapp ? '✅' : '❌'}</div>
              <div className="flex justify-between mb-4"><span>Instagram</span>{lead.hasInstagram ? '✅' : '❌'}</div>
              <div className="flex justify-between mb-4"><span>Facebook</span>{lead.hasFacebook ? '✅' : '❌'}</div>
              <div className="flex justify-between"><span>Score digital</span><b>{lead.digitalPresenceScore ?? '—'}%</b></div>
            </div>
          </Card>

          {lead.nextAction && (
            <Card title="Próxima ação">
              <div className="small bold">{lead.nextAction}</div>
              {lead.nextActionAt && <div className="tiny muted mt-4">até {formatDate(lead.nextActionAt)}</div>}
            </Card>
          )}

          <Card title="Tags">
            <div className="tags">
              {lead.tags.map((t) => (
                <span key={t} className="tag tag-remove" onClick={() => removeTag(lead, t)}>
                  {t} ×
                </span>
              ))}
            </div>
            <div className="flex gap-8 mt-8">
              <input
                className="input"
                placeholder="+ tag"
                value={tagText}
                onChange={(e) => setTagText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagText.trim()) { addTag(lead, tagText.trim()); setTagText('') }
                }}
              />
            </div>
          </Card>
        </div>

        <div className="flex col gap-16">
          <Card>
            <Tabs
              tabs={[
                { id: 'overview', label: 'Visão geral' },
                { id: 'outreach', label: '📢 Outreach (Fase 4)' },
                { id: 'messages', label: `Mensagens (${lead.messages.length})` },
                { id: 'activity', label: `Atividade (${activities.length})` },
                { id: 'notes', label: `Notas (${notes.length})` },
                { id: 'followups', label: `Follow-ups (${followups.length})` },
                { id: 'tasks', label: `Tarefas (${tasks.length})` },
              ]}
              active={tab}
              onChange={(t) => setTab(t as TabId)}
            />
            <div className="mt-16">
              {tab === 'overview' && <OverviewTab lead={lead} onSetNextAction={() => setNextAction(lead, 'Entrar em contato', 3)} />}
              {tab === 'outreach' && <OutreachTab lead={lead} company={company} />}
              {tab === 'messages' && (
                <MessagesTab
                  lead={lead}
                  busy={sendBusy}
                  draft={msgDraft}
                  setDraft={setMsgDraft}
                  onApprove={(m) => { approveMessage(lead, m.id); s.toast('success', 'Mensagem aprovada') }}
                  onEdit={(m, body) => { editMessage(lead, m.id, body); setMsgDraft(null); s.toast('success', 'Mensagem editada') }}
                  onSend={(m, ch) => handleSend(m, ch)}
                />
              )}
              {tab === 'activity' && <ActivityTab items={activities} />}
              {tab === 'notes' && (
                <NotesTab
                  notes={notes}
                  value={noteText}
                  onChange={setNoteText}
                  onAdd={() => { if (noteText.trim()) { addUserNote(lead.id, noteText.trim()); setNoteText('') } }}
                />
              )}
              {tab === 'followups' && (
                <FollowupsTab
                  items={followups}
                  onDone={(f) => { markFollowupDone(f); s.toast('success', 'Follow-up concluído') }}
                  onSkip={(f) => { skipFollowup(f); s.toast('info', 'Follow-up ignorado') }}
                />
              )}
              {tab === 'tasks' && (
                <TasksTab
                  items={tasks}
                  value={taskTitle}
                  onChange={setTaskTitle}
                  onAdd={() => { if (taskTitle.trim()) { createTask(lead.id, taskTitle.trim()); setTaskTitle('') } }}
                  onToggle={(t) => useApp.getState().updateTask(t.id, { status: t.status === 'DONE' ? 'TODO' : 'DONE' })}
                />
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function OverviewTab({ lead, onSetNextAction }: { lead: Lead; onSetNextAction: () => void }) {
  const qualifications = useApp((s) => s.qualifications)
  const qualification = useMemo(() => qualifications.find((q) => q.leadId === lead.id), [qualifications, lead.id])
  const [reanalyzing, setReanalyzing] = useState(false)
  const toast = useApp((s) => s.toast)

  async function handleQualify(force = false) {
    setReanalyzing(true)
    try {
      const svc = new QualificationService()
      await svc.qualifyLead(lead.id, { forceReanalysis: force })
      toast('success', 'Qualificação atualizada com sucesso!')
    } catch (e) {
      toast('error', `Falha ao qualificar lead: ${String(e)}`)
    } finally {
      setReanalyzing(false)
    }
  }

  return (
    <div className="flex col gap-16">
      {qualification ? (
        <AIInsights
          qualification={qualification}
          onReanalyze={() => handleQualify(true)}
          isReanalyzing={reanalyzing}
        />
      ) : (
        <Card className="p-16 border bg-subtle flex items-center justify-between wrap gap-12 mb-16">
          <div>
            <b>Qualificação Comercial PENDENTE</b>
            <div className="small muted">Este lead ainda não passou pela qualificação de oportunidade da Fase 3.</div>
          </div>
          <Button variant="primary" size="sm" disabled={reanalyzing} onClick={() => handleQualify(true)}>
            {reanalyzing ? 'Analisando...' : '⚡ Qualificar Lead Agora'}
          </Button>
        </Card>
      )}

      <div className="grid grid-3">
        <Card title="Score explicado">
          {lead.scoreBreakdown && lead.scoreBreakdown.length > 0 ? (
            <ul className="score-list">
              {lead.scoreBreakdown.map((b, i) => (
                <li key={i}>
                  <div className="flex justify-between">
                    <span className="small">{b.label}</span>
                    <b className={`small ${b.points >= 0 ? 'c-success' : 'c-danger'}`}>{b.points >= 0 ? `+${b.points}` : b.points}</b>
                  </div>
                  <div className="tiny muted">{b.reason}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="muted small">Sem score detalhado.</div>
          )}
          {lead.analysisHash && <div className="tiny muted mt-8">Análise verificada (hash {lead.analysisHash.slice(0, 8)}…)</div>}
        </Card>

        <Card title="Análise de oportunidade">
          {lead.analysis ? (
            <div className="small">
              <div className="mb-12"><b>Ponto positivo:</b> {lead.analysis.positives.join('; ')}</div>
              <div className="mb-12"><b>Problemas:</b> {lead.analysis.problems.join('; ')}</div>
              <div className="mb-12"><b>Oportunidades:</b> {lead.analysis.opportunities.join('; ')}</div>
              <div className="mb-12"><b>Recomendação:</b> {lead.analysis.recommendation}</div>
              <div className="mb-12"><b>Argumento comercial:</b> {lead.analysis.commercialArgument}</div>
              <div className="muted"><b>Por quê recomendado:</b> {lead.analysis.whyRecommended}</div>
            </div>
          ) : (
            <div className="muted small">Sem análise de oportunidade para este lead.</div>
          )}
        </Card>

        <Card title="Website">
          {lead.websiteScan ? (
            <div className="small">
              <div className="mb-8">
                <Badge variant={websiteVariant(lead.websiteStatus)}>{WEBSITE_STATUS_LABELS[lead.websiteStatus] ?? lead.websiteStatus}</Badge>
              </div>
              {lead.websiteScan.url && <div className="mb-4">🔗 <a href={lead.websiteScan.url} target="_blank" rel="noreferrer">{lead.websiteScan.url}</a></div>}
              {lead.websiteScan.title && <div className="mb-4">Título: {lead.websiteScan.title}</div>}
              {lead.websiteScan.description && <div className="mb-4 muted">{lead.websiteScan.description}</div>}
              <div className="muted mb-4">HTTP {lead.websiteScan.status ?? '—'} · {lead.websiteScan.https ? 'HTTPS ✅' : 'sem HTTPS'}</div>
              <div className="muted mb-4">Mobile friendly: {lead.websiteScan.mobileFriendly ? 'sim' : lead.websiteScan.mobileFriendly === null ? 'desconhecido' : 'não'}</div>
              <div className="muted">Sinais de desatualização: {lead.websiteScan.outdatedSignals}</div>
            </div>
          ) : (
            <div className="muted small">Nenhum scan disponível.</div>
          )}
          <Button variant="secondary" size="sm" className="mt-12" onClick={onSetNextAction}>Definir próxima ação</Button>
        </Card>
      </div>
    </div>
  )
}

function MessagesTab(props: {
  lead: Lead
  busy: boolean
  draft: { id: string; body: string } | null
  setDraft: (d: { id: string; body: string } | null) => void
  onApprove: (m: LeadMessage) => void
  onEdit: (m: LeadMessage, body: string) => void
  onSend: (m: LeadMessage, channel: 'whatsapp' | 'email') => void
}) {
  const { lead, busy, draft, setDraft, onApprove, onEdit, onSend } = props
  if (lead.messages.length === 0) {
    return (
      <EmptyState
        icon="✉️"
        title="Nenhuma mensagem gerada"
        subtitle="Rode uma campanha ou gere a mensagem manualmente para este lead."
      />
    )
  }
  return (
    <div className="flex col gap-16">
      {lead.messages.map((m) => (
        <div key={m.id} className={`msg-card${m.approved ? ' approved' : ''}${m.used ? ' used' : ''}`}>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-8">
              <Badge variant={m.approved ? 'success' : 'muted'}>{m.approved ? 'Aprovada' : 'Rascunho'}</Badge>
              <Badge variant={m.used ? 'info' : 'muted'}>{m.used ? 'Enviada' : 'Não enviada'}</Badge>
            </div>
            <span className="tiny muted">{VERSION_LABELS[m.version]}</span>
          </div>
          {draft?.id === m.id ? (
            <>
              <textarea
                className="textarea"
                value={draft.body}
                onChange={(e) => setDraft({ id: m.id, body: e.target.value })}
                rows={5}
              />
              <div className="flex gap-8 mt-8 justify-end">
                <Button variant="secondary" size="sm" onClick={() => setDraft(null)}>Cancelar</Button>
                <Button variant="primary" size="sm" onClick={() => onEdit(m, draft.body)}>Salvar edição</Button>
              </div>
            </>
          ) : (
            <>
              <div className="msg-body">{m.body}</div>
              <div className="flex gap-8 mt-8 wrap">
                {!m.approved && <Button size="sm" onClick={() => onApprove(m)}>✓ Aprovar</Button>}
                <Button size="sm" variant="secondary" onClick={() => setDraft({ id: m.id, body: m.body })}>✎ Editar</Button>
                <Button size="sm" variant="secondary" disabled={busy || !m.approved} onClick={() => onSend(m, 'whatsapp')}>Enviar WhatsApp</Button>
                <Button size="sm" variant="secondary" disabled={busy || !m.approved} onClick={() => onSend(m, 'email')}>Enviar e-mail</Button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

function ActivityTab({ items }: { items: ReturnType<typeof useApp.getState>['activities'] }) {
  if (items.length === 0) return <div className="muted small">Nenhuma atividade registrada.</div>
  return (
    <div className="timeline">
      {items.map((a) => (
        <div key={a.id} className="timeline-item">
          <div className="timeline-dot" />
          <div className="timeline-content">
            <div className="flex justify-between">
              <b className="small">{activityLabel(a.type)}</b>
              <span className="tiny muted">{formatDateTime(a.createdAt)}</span>
            </div>
            <div className="small muted">{a.description}</div>
            {a.detail && <div className="tiny muted">{a.detail}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

function NotesTab(props: { notes: ReturnType<typeof useApp.getState>['notes']; value: string; onChange: (v: string) => void; onAdd: () => void }) {
  const { notes, value, onChange, onAdd } = props
  return (
    <div className="flex col gap-12">
      <Field label="Nova nota">
        <textarea className="textarea" rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Observação sobre este lead..." />
      </Field>
      <div className="flex justify-end">
        <Button size="sm" onClick={onAdd}>Adicionar nota</Button>
      </div>
      {notes.length === 0 ? (
        <div className="muted small">Sem notas.</div>
      ) : (
        <div className="flex col gap-8">
          {notes.map((n) => (
            <div key={n.id} className="note-card">
              <div className="flex justify-between mb-4">
                <span className="small bold">{n.author}</span>
                <span className="tiny muted">{timeAgo(n.createdAt)}</span>
              </div>
              <div className="small">{n.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FollowupsTab(props: { items: ReturnType<typeof useApp.getState>['followups']; onDone: (f: ReturnType<typeof useApp.getState>['followups'][number]) => void; onSkip: (f: ReturnType<typeof useApp.getState>['followups'][number]) => void }) {
  const { items, onDone, onSkip } = props
  if (items.length === 0) return <div className="muted small">Nenhum follow-up planejado. Marque o lead como "Contatado" para gerar a sequência.</div>
  return (
    <div className="flex col gap-8">
      {[...items].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)).map((f) => (
        <div key={f.id} className={`msg-card${f.status === 'SENT' ? ' used' : ''}`}>
          <div className="flex justify-between mb-8">
            <b className="small">Follow-up #{f.sequence}</b>
            <div className="flex items-center gap-8">
              <Badge variant={f.status === 'SENT' ? 'success' : f.status === 'DONE' ? 'info' : f.status === 'SKIPPED' ? 'muted' : 'warning'}>
                {f.status === 'SENT' ? 'Enviado' : f.status === 'DONE' ? 'Concluído' : f.status === 'SKIPPED' ? 'Ignorado' : 'Pendente'}
              </Badge>
              <span className="tiny muted">{formatDateTime(f.scheduledAt)}</span>
            </div>
          </div>
          {f.body && <div className="small muted mb-8">{f.body}</div>}
          {f.status === 'PENDING' && (
            <div className="flex gap-8">
              <Button size="sm" onClick={() => onDone(f)}>✓ Concluir</Button>
              <Button size="sm" variant="secondary" onClick={() => onSkip(f)}>Ignorar</Button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function TasksTab(props: { items: ReturnType<typeof useApp.getState>['tasks']; value: string; onChange: (v: string) => void; onAdd: () => void; onToggle: (t: ReturnType<typeof useApp.getState>['tasks'][number]) => void }) {
  const { items, value, onChange, onAdd, onToggle } = props
  return (
    <div className="flex col gap-12">
      <div className="flex gap-8">
        <input className="input" placeholder="Nova tarefa..." value={value} onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && value.trim()) onAdd() }} />
        <Button size="sm" onClick={onAdd}>Adicionar</Button>
      </div>
      {items.length === 0 ? (
        <div className="muted small">Sem tarefas.</div>
      ) : (
        <div className="flex col gap-8">
          {items.map((t) => (
            <div key={t.id} className={`msg-card${t.status === 'DONE' ? ' used' : ''}`}>
              <label className="checkbox-row">
                <input type="checkbox" checked={t.status === 'DONE'} onChange={() => onToggle(t)} />
                <span className={t.status === 'DONE' ? 'strike' : ''}>{t.title}</span>
              </label>
              {t.dueAt && <div className="tiny muted mt-4">Vence em {formatDate(t.dueAt)}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function activityLabel(t: ActivityType): string {
  return {
    LEAD_CREATED: 'Lead criado',
    LEAD_ANALYZED: 'Lead analisado',
    SCORE_CALCULATED: 'Score calculado',
    MESSAGE_GENERATED: 'Mensagem gerada',
    MESSAGE_EDITED: 'Mensagem editada',
    CONTACT_MADE: 'Contato feito',
    REPLY_RECEIVED: 'Resposta recebida',
    FOLLOWUP_SCHEDULED: 'Follow-up agendado',
    STATUS_CHANGED: 'Status alterado',
    NOTE_ADDED: 'Nota adicionada',
    PROPOSAL_CREATED: 'Proposta criada',
    PROPOSAL_STATUS: 'Proposta alterada',
    TASK_CREATED: 'Tarefa criada',
    FAVORITE_TOGGLED: 'Favorito alterado',
    TAG_ADDED: 'Tag adicionada',
    TAG_REMOVED: 'Tag removida',
    CAMPAIGN_STARTED: 'Campanha iniciada',
    CAMPAIGN_FINISHED: 'Campanha finalizada',
    OPT_OUT: 'Opt-out',
  }[t] ?? t
}

function statusLabel(st: LeadStatus): string {
  return {
    NEW: 'Novo', QUALIFIED: 'Qualificado', READY_TO_CONTACT: 'Pronto p/ contato',
    CONTACTED: 'Contatado', REPLIED: 'Respondeu', INTERESTED: 'Interessado',
    NEGOTIATION: 'Negociação', PROPOSAL_SENT: 'Proposta', WON: 'Fechado',
    LOST: 'Perdido', NO_RESPONSE: 'Sem resposta', DO_NOT_CONTACT: 'Não contatar',
  }[st] ?? st
}

function websiteVariant(s: string): 'success' | 'danger' | 'warning' | 'muted' {
  if (s === 'NO_WEBSITE' || s === 'WEBSITE_BROKEN') return 'danger'
  if (s === 'WEBSITE_OUTDATED' || s === 'WEBSITE_POOR_MOBILE') return 'warning'
  if (s === 'WEBSITE_FOUND') return 'success'
  return 'muted'
}

function OutreachTab({ lead, company }: { lead: Lead; company?: any }) {
  const { outreachMessages, outreachActivities, toast, upsertCompany, upsertLead } = useApp()
  const [replyInput, setReplyInput] = useState('')
  const [analysisResult, setAnalysisResult] = useState<ResponseAnalysis | null>(null)
  const [busy, setBusy] = useState(false)

  const messages = outreachMessages.filter((m) => m.leadId === lead.id)
  const activities = outreachActivities.filter((a) => a.leadId === lead.id)

  const service = new OutreachService()
  const responseService = new ResponseClassificationService()

  const handleRecordReply = async () => {
    if (!replyInput.trim()) return
    setBusy(true)
    try {
      const res = await responseService.recordLeadReply(lead.id, replyInput.trim())
      setAnalysisResult(res)
      setReplyInput('')
      toast('success', `Resposta classificada como ${res.category}!`)
    } catch (err: any) {
      toast('error', `Erro ao registrar resposta: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  const handleSetOptOut = () => {
    if (!window.confirm('Deseja marcar esta empresa como DO_NOT_CONTACT (Opt-out)? Esta ação cancela todas as abordagens e follow-ups.')) return

    if (company) {
      upsertCompany({ ...company, doNotContact: true })
    }
    upsertLead({ ...lead, status: 'DO_NOT_CONTACT', updatedAt: new Date().toISOString() })
    toast('warning', 'Lead marcado como DO_NOT_CONTACT. Abordagens bloqueadas.')
  }

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      {/* Informações de Status */}
      <div style={{ background: 'var(--surface-2)', padding: '1.25rem', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Status de Abordagem</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.25rem' }}>{lead.status}</div>
          {company?.doNotContact && (
            <div style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600, marginTop: '0.25rem' }}>
              ⛔ Bloqueado pelo Operador / Opt-out
            </div>
          )}
        </div>

        <Button variant="danger" size="sm" onClick={handleSetOptOut} disabled={company?.doNotContact || lead.status === 'DO_NOT_CONTACT'}>
          ⛔ Marcar Opt-Out (Do Not Contact)
        </Button>
      </div>

      {/* Mensagens Geradas */}
      <div>
        <h4 style={{ margin: '0 0 0.75rem 0' }}>💬 Mensagens de Prospecção ({messages.length})</h4>
        {messages.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Nenhuma mensagem gerada para este lead ainda.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {messages.map((m) => (
              <div key={m.id} style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: '8px', background: 'var(--surface-1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <Badge variant={m.status === 'SENT' ? 'success' : m.status === 'APPROVED' ? 'violet' : 'warning'}>
                    {m.type} • {m.status}
                  </Badge>
                  <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{new Date(m.createdAt).toLocaleString('pt-BR')}</span>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', marginBottom: '0.75rem' }}>{m.body}</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(m.body); service.recordMessageCopied(lead.id, m.id); toast('success', 'Copiado!') }}>
                    📋 Copiar
                  </Button>
                  {company?.phone && (
                    <Button size="sm" variant="secondary" onClick={() => { service.recordWhatsappOpened(lead.id, m.id); window.open(`https://wa.me/${company.phone.replace(/\D/g, '')}?text=${encodeURIComponent(m.body)}`, '_blank') }}>
                      📱 WhatsApp
                    </Button>
                  )}
                  {m.status !== 'SENT' && (
                    <Button size="sm" variant="success" onClick={() => { service.recordManualContact(lead.id, m.id, m.channel); toast('success', 'Contato Confirmado!') }}>
                      🚀 Registrar Envio
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Registrar Resposta do Cliente */}
      <div style={{ border: '1px solid var(--border)', padding: '1.25rem', borderRadius: '8px' }}>
        <h4 style={{ margin: '0 0 0.5rem 0' }}>💬 Registrar Resposta do Cliente</h4>
        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
          Insira o texto da resposta recebida para classificação automática e sugestão de próximo passo.
        </p>
        <textarea
          value={replyInput}
          onChange={(e) => setReplyInput(e.target.value)}
          placeholder='Ex.: "Quanto custa o serviço de vocês?" ou "Não tenho interesse."'
          rows={3}
          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--surface-1)', color: 'inherit', fontFamily: 'inherit' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <Button size="sm" variant="primary" disabled={busy || !replyInput.trim()} onClick={handleRecordReply}>
            {busy ? 'Analisando...' : '🔍 Classificar & Registrar Resposta'}
          </Button>
        </div>

        {analysisResult && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--surface-2)', borderRadius: '6px', borderLeft: '4px solid var(--primary)' }}>
            <div style={{ fontWeight: 700 }}>Categoria: {analysisResult.category} (Intent Score: {analysisResult.intentScore} pts)</div>
            <div style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>{analysisResult.summary}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
              <b>💡 Próxima Ação Sugerida:</b> {analysisResult.suggestedNextAction}
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
              <b>💬 Resposta Recomendada:</b> "{analysisResult.suggestedReply}"
            </div>
          </div>
        )}
      </div>

      {/* Timeline de Atividades de Outreach */}
      <div>
        <h4 style={{ margin: '0 0 0.75rem 0' }}>📜 Linha do Tempo de Prospecção ({activities.length})</h4>
        {activities.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Nenhum evento registrado ainda.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {activities.map((act) => (
              <div key={act.id} style={{ padding: '0.75rem', background: 'var(--surface-2)', borderRadius: '6px', fontSize: '0.85rem' }}>
                <div style={{ fontWeight: 600 }}>{act.summary}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                  {new Date(act.createdAt).toLocaleString('pt-BR')} • {act.actor}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}