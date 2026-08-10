import React from 'react'
import type { LeadQualification } from '../types'

interface AIInsightsProps {
  qualification: LeadQualification
  onReanalyze?: () => void
  isReanalyzing?: boolean
}

export const AIInsights: React.FC<AIInsightsProps> = ({
  qualification: q,
  onReanalyze,
  isReanalyzing = false,
}) => {
  const methodLabel =
    q.qualificationMethod === 'AI'
      ? 'Inteligência Artificial (OpenRouter)'
      : q.qualificationMethod === 'RULE_BASED_FALLBACK'
      ? 'Análise Determinística (Fallback da IA)'
      : q.qualificationMethod === 'DEMO'
      ? 'Modo Demonstração (Demo)'
      : 'Análise Determinística (Baseada em Regras)'

  const qualBadgeClass =
    q.qualification === 'HIGH'
      ? 'badge-success'
      : q.qualification === 'MEDIUM'
      ? 'badge-warning'
      : q.qualification === 'LOW'
      ? 'badge-info'
      : 'badge-neutral'

  const qualLabel =
    q.qualification === 'HIGH'
      ? 'Alta Oportunidade'
      : q.qualification === 'MEDIUM'
      ? 'Média Oportunidade'
      : q.qualification === 'LOW'
      ? 'Baixa Oportunidade'
      : 'Não Verificado'

  return (
    <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', background: 'var(--bg-card)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🤖</span>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Análise de Oportunidade & Qualificação IA</h3>
            <span className={`badge ${qualBadgeClass}`}>{qualLabel}</span>
          </div>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Método: <strong>{methodLabel}</strong> • Confiança: {Math.round(q.confidence * 100)}%
          </p>
        </div>

        {onReanalyze && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={onReanalyze}
            disabled={isReanalyzing}
            title="Reanalisar com dados atualizados"
          >
            {isReanalyzing ? 'Analisando...' : '🔄 Reanalisar'}
          </button>
        )}
      </div>

      {/* Scores breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Score Final</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{q.finalScore}/100</div>
        </div>
        <div style={{ background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Score de Regras</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{q.ruleBasedScore}/100</div>
        </div>
        <div style={{ background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: '6px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Score IA</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{q.aiScore !== null ? `${q.aiScore}/100` : 'N/A'}</div>
        </div>
      </div>

      {/* Executive Summary */}
      {q.summary && (
        <div style={{ marginBottom: '1rem', background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: '6px', borderLeft: '3px solid var(--primary)' }}>
          <strong style={{ fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem' }}>Resumo Diagnóstico:</strong>
          <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.4 }}>{q.summary}</p>
        </div>
      )}

      {/* Recommended Service & Approach */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        <div style={{ background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>💡 Serviço Recomendado</span>
          <strong style={{ fontSize: '0.95rem', color: 'var(--primary-bright)' }}>{formatServiceLabel(q.recommendedService)}</strong>
          {q.websiteAssessment && (
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {q.websiteAssessment}
            </p>
          )}
        </div>
        <div style={{ background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: '6px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>🎯 Orientação de Abordagem</span>
          <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.4 }}>{q.recommendedApproach}</p>
        </div>
      </div>

      {/* Signals & Evidence */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {/* Positives */}
        <div>
          <h4 style={{ fontSize: '0.85rem', margin: '0 0 0.5rem 0', color: 'var(--success)' }}>✔ Sinais Positivos</h4>
          <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.8rem', lineHeight: 1.4 }}>
            {q.positiveSignals.length > 0 ? (
              q.positiveSignals.map((sig, idx) => <li key={idx}>{sig}</li>)
            ) : (
              <li style={{ color: 'var(--text-muted)' }}>Nenhum sinal positivo específico</li>
            )}
          </ul>
        </div>

        {/* Evidence */}
        <div>
          <h4 style={{ fontSize: '0.85rem', margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>📋 Evidências Verificadas</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {q.evidence.length > 0 ? (
              q.evidence.map((ev, idx) => (
                <div key={idx} style={{ fontSize: '0.75rem', background: 'var(--bg-subtle)', padding: '0.4rem', borderRadius: '4px' }}>
                  <strong>{ev.signal}:</strong> {ev.value} <span style={{ color: 'var(--text-muted)' }}>({ev.source})</span>
                </div>
              ))
            ) : (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sem evidências estruturadas</div>
            )}
          </div>
        </div>
      </div>

      {/* Provenance footer */}
      <div style={{ marginTop: '1rem', paddingTop: '0.5rem', borderTop: '1px dashed var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <span>Versão do Algoritmo: {q.promptVersion || 'v1'}</span>
        <span>Analisado em: {new Date(q.createdAt).toLocaleString('pt-BR')}</span>
      </div>
    </div>
  )
}

function formatServiceLabel(srv: string): string {
  switch (srv) {
    case 'WEBSITE_INSTITUTIONAL':
      return 'Website Institucional Completo'
    case 'LANDING_PAGE':
      return 'Landing Page de Alta Conversão'
    case 'WEBSITE_REDESIGN':
      return 'Redesign e Modernização de Website'
    case 'WHATSAPP_LANDING_PAGE':
      return 'Página com Foco em Atendimento WhatsApp'
    case 'MENU_DIGITAL':
      return 'Cardápio / Catálogo Digital'
    case 'BOOKING_PAGE':
      return 'Sistema de Agendamento Online'
    case 'LOCAL_SEO':
      return 'Otimização de Presença Local (SEO)'
    default:
      return 'Melhoria de Presença Digital'
  }
}
