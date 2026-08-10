import { useState } from 'react'
import { useApp } from '../services/store'
import { Card, Badge, Button, Field, Switch } from '../components/ui'
import { formatDate } from '../lib/utils'
import { uid } from '../lib/utils'

const TRIGGER_LABELS: Record<string, string> = {
  LEAD_NEW: 'Novo lead',
  REPLY_RECEIVED: 'Resposta recebida',
  PROPOSAL_SENT: 'Proposta enviada',
}

const ACTION_LABELS: Record<string, string> = {
  generate_message: 'Gerar mensagem',
  score_lead: 'Calcular score',
  plan_followups: 'Planejar follow-ups',
}

export default function Automations() {
  const settings = useApp((s) => s.settings)
  const rules = useApp((s) => s.rules)
  const s = useApp.getState()

  const [name, setName] = useState('')
  const [trigger, setTrigger] = useState('LEAD_NEW')
  const [enabled, setEnabled] = useState(true)

  const [dailyLimit, setDailyLimit] = useState(String(settings.dailyContactLimit))
  const [hourlyLimit, setHourlyLimit] = useState(String(settings.hourlyContactLimit))
  const [cooldown, setCooldown] = useState(String(settings.cooldownDays))

  function addRule() {
    if (!name.trim()) return
    s.addRule({
      id: uid('rule'),
      name: name.trim(),
      enabled,
      trigger: trigger as 'LEAD_NEW' | 'REPLY_RECEIVED' | 'PROPOSAL_SENT',
      conditions: [],
      actions: ['generate_message'],
    })
    setName('')
    s.toast('success', 'Regra criada')
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Automações</h1>
          <p className="page-subtitle">Interruptor mestre e regras de comportamento</p>
        </div>
      </div>

      <Card className="mb-16">
        <div className="flex items-center justify-between wrap gap-16">
          <div>
            <b>Interruptor mestre de automação</b>
            <div className="small muted mt-4">
              {settings.masterSwitch === 'ON' && 'Envios liberados dentro dos limites diários/horários.'}
              {settings.masterSwitch === 'PAUSED' && 'Nenhum envio acontece até reativar.'}
              {settings.masterSwitch === 'OFF' && 'Nenhuma automação roda (desligado).'}
            </div>
          </div>
          <div className="flex gap-8">
            {(['ON', 'PAUSED', 'OFF'] as const).map((st) => (
              <Button
                key={st}
                size="sm"
                variant={settings.masterSwitch === st ? (st === 'ON' ? 'primary' : st === 'PAUSED' ? 'secondary' : 'danger') : 'secondary'}
                onClick={() => { s.saveSettings({ masterSwitch: st }); s.toast('success', `Interruptor: ${st === 'ON' ? 'ligado' : st === 'PAUSED' ? 'pausado' : 'desligado'}`) }}
              >
                {st === 'ON' ? 'Ligado' : st === 'PAUSED' ? 'Pausado' : 'Desligado'}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-2 mb-16">
        <Card title="Limites de contato">
          <div className="flex col gap-12">
            <Field label="Contatos por dia"><input type="number" className="input" value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} /></Field>
            <Field label="Contatos por hora"><input type="number" className="input" value={hourlyLimit} onChange={(e) => setHourlyLimit(e.target.value)} /></Field>
            <Field label="Cooldown entre contatos (dias)"><input type="number" className="input" value={cooldown} onChange={(e) => setCooldown(e.target.value)} /></Field>
            <Button
              variant="secondary"
              onClick={() => s.saveSettings({
                dailyContactLimit: Number(dailyLimit) || 0,
                hourlyContactLimit: Number(hourlyLimit) || 0,
                cooldownDays: Number(cooldown) || 0,
              })}
            >
              Salvar limites
            </Button>
          </div>
        </Card>

        <Card title="Nova regra">
          <div className="flex col gap-12">
            <Field label="Nome da regra"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Gerar mensagem p/ novo lead" /></Field>
            <Field label="Gatilho">
              <select className="select" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
                <option value="LEAD_NEW">Novo lead</option>
                <option value="REPLY_RECEIVED">Resposta recebida</option>
                <option value="PROPOSAL_SENT">Proposta enviada</option>
              </select>
            </Field>
            <Switch checked={enabled} onChange={setEnabled} label="Ativa" />
            <Button variant="primary" disabled={!name.trim()} onClick={addRule}>Criar regra</Button>
          </div>
        </Card>
      </div>

      <Card title={`Regras existentes (${rules.length})`}>
        {rules.length === 0 ? (
          <div className="muted small">Nenhuma regra ainda. Crie a primeira acima.</div>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr><th>Nome</th><th>Gatilho</th><th>Ações</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {rules.map((r) => (
                  <tr key={r.id}>
                    <td className="bold">{r.name}</td>
                    <td><Badge variant="info">{TRIGGER_LABELS[r.trigger] ?? r.trigger}</Badge></td>
                    <td className="small">{r.actions.map((a) => ACTION_LABELS[a] ?? a).join(', ')}</td>
                    <td>
                      <Switch
                        checked={r.enabled}
                        onChange={(v) => { s.updateRule(r.id, { enabled: v }); s.toast('success', v ? 'Regra ativada' : 'Regra desativada') }}
                      />
                    </td>
                    <td>
                      <Button size="sm" variant="secondary" onClick={() => { s.removeRule(r.id); s.toast('info', 'Regra removida') }}>Remover</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="small muted mt-16">
        Auditoria e rastreamento: todas as mudanças ficam registradas no log de auditoria do sistema (página Settings).
      </div>
    </div>
  )
}