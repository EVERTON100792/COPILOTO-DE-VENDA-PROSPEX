import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const navigate = useNavigate()

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouse)
    return () => window.removeEventListener('mousemove', handleMouse)
  }, [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('Conta criada! Verifique seu e-mail ou faça login diretamente.')
        setIsSignUp(false)
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        navigate('/')
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao autenticar')
    } finally {
      setLoading(false)
    }
  }

  const spotX = mousePos.x
  const spotY = mousePos.y

  return (
    <div className="login-root">
      {/* Dynamic spotlight follow cursor */}
      <div
        className="login-spotlight"
        style={{ left: spotX, top: spotY }}
      />

      {/* Animated background orbs */}
      <div className="login-orb login-orb-1" />
      <div className="login-orb login-orb-2" />
      <div className="login-orb login-orb-3" />

      {/* Grid overlay */}
      <div className="login-grid" />

      {/* Card */}
      <div className="login-card">
        {/* Logo section */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M14 2L26 8V20L14 26L2 20V8L14 2Z" stroke="url(#grad)" strokeWidth="1.5" fill="none"/>
              <path d="M14 7L21 11V17L14 21L7 17V11L14 7Z" fill="url(#grad)" opacity="0.3"/>
              <circle cx="14" cy="14" r="3" fill="url(#grad)"/>
              <defs>
                <linearGradient id="grad" x1="2" y1="2" x2="26" y2="26" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#f87171"/>
                  <stop offset="100%" stopColor="#818cf8"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div>
            <div className="login-brand">
              PROSPEX <span className="login-brand-ai">AI</span>
            </div>
            <div className="login-brand-sub">Prospecção Inteligente</div>
          </div>
        </div>

        {/* Divider */}
        <div className="login-divider" />

        {/* Title */}
        <div className="login-title-block">
          <h1 className="login-title">
            {isSignUp ? 'Criar conta' : 'Bem-vindo de volta'}
          </h1>
          <p className="login-subtitle">
            {isSignUp
              ? 'Preencha seus dados para começar'
              : 'Entre para continuar prospectando'}
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="login-alert login-alert-error">
            <span>⚠</span> {error}
          </div>
        )}
        {success && (
          <div className="login-alert login-alert-success">
            <span>✓</span> {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="login-form">
          <div className="login-field">
            <label className="login-label">E-mail</label>
            <div className="login-input-wrap">
              <svg className="login-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M2 7l10 7 10-7"/>
              </svg>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="login-input"
                placeholder="seu@email.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="login-field">
            <label className="login-label">Senha</label>
            <div className="login-input-wrap">
              <svg className="login-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="login-input"
                placeholder="••••••••"
                required
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? (
              <span className="login-btn-loading">
                <span className="login-spinner" />
                Aguardando...
              </span>
            ) : (
              <>
                <span>{isSignUp ? 'Criar Conta' : 'Entrar'}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Toggle */}
        <div className="login-toggle">
          {isSignUp ? 'Já tem uma conta?' : 'Não tem uma conta?'}
          <button onClick={() => { setIsSignUp(!isSignUp); setError(null); setSuccess(null) }} className="login-toggle-btn">
            {isSignUp ? 'Fazer login' : 'Cadastre-se grátis'}
          </button>
        </div>

        {/* Footer */}
        <div className="login-footer">
          Seus dados estão protegidos com criptografia de ponta a ponta
        </div>
      </div>

      <style>{`
        .login-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #030305;
          position: relative;
          overflow: hidden;
          font-family: 'Inter', system-ui, sans-serif;
        }

        /* Spotlight follow cursor */
        .login-spotlight {
          position: fixed;
          width: 600px;
          height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(248,113,113,0.06) 0%, transparent 70%);
          transform: translate(-50%, -50%);
          pointer-events: none;
          z-index: 0;
          transition: left 0.1s ease, top 0.1s ease;
        }

        /* Background animated orbs */
        .login-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          animation: orbFloat 8s ease-in-out infinite;
          pointer-events: none;
        }
        .login-orb-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(248,113,113,0.12), transparent);
          top: -150px; left: -150px;
          animation-delay: 0s;
        }
        .login-orb-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(129,140,248,0.12), transparent);
          bottom: -100px; right: -100px;
          animation-delay: -3s;
        }
        .login-orb-3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(236,72,153,0.08), transparent);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: -6s;
        }
        @keyframes orbFloat {
          0%, 100% { transform: scale(1) translateY(0px); }
          33% { transform: scale(1.05) translateY(-20px); }
          66% { transform: scale(0.97) translateY(10px); }
        }
        .login-orb-3 { 
          animation: orbFloat3 8s ease-in-out infinite;
        }
        @keyframes orbFloat3 {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.2); }
        }

        /* Grid overlay */
        .login-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
          background-size: 50px 50px;
          pointer-events: none;
          z-index: 0;
          mask-image: radial-gradient(ellipse at center, black 20%, transparent 80%);
        }

        /* Card */
        .login-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 420px;
          padding: 40px;
          background: rgba(10, 10, 15, 0.85);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          box-shadow:
            0 0 0 1px rgba(248,113,113,0.05),
            0 40px 80px -20px rgba(0,0,0,0.9),
            inset 0 1px 0 rgba(255,255,255,0.06);
          animation: cardReveal 0.6s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes cardReveal {
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }

        /* Logo */
        .login-logo {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }
        .login-logo-icon {
          width: 48px; height: 48px;
          background: linear-gradient(135deg, rgba(248,113,113,0.15), rgba(129,140,248,0.15));
          border: 1px solid rgba(248,113,113,0.2);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(248,113,113,0.1);
        }
        .login-brand {
          font-size: 20px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.5px;
        }
        .login-brand-ai {
          background: linear-gradient(90deg, #f87171, #818cf8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .login-brand-sub {
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          letter-spacing: 0.5px;
          margin-top: 2px;
        }

        /* Divider */
        .login-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          margin-bottom: 24px;
        }

        /* Title */
        .login-title-block { margin-bottom: 28px; }
        .login-title {
          font-size: 24px;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.5px;
          margin: 0 0 6px;
        }
        .login-subtitle {
          font-size: 14px;
          color: rgba(255,255,255,0.45);
          margin: 0;
        }

        /* Alerts */
        .login-alert {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 13px;
          margin-bottom: 20px;
          animation: alertIn 0.3s ease;
        }
        @keyframes alertIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .login-alert-error {
          background: rgba(239,68,68,0.1);
          border: 1px solid rgba(239,68,68,0.25);
          color: #fca5a5;
        }
        .login-alert-success {
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.25);
          color: #6ee7b7;
        }

        /* Form */
        .login-form { display: flex; flex-direction: column; gap: 16px; }
        .login-field { display: flex; flex-direction: column; gap: 8px; }
        .login-label {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255,255,255,0.5);
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        .login-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .login-input-icon {
          position: absolute;
          left: 14px;
          color: rgba(255,255,255,0.25);
          pointer-events: none;
          transition: color 0.2s;
        }
        .login-input-wrap:focus-within .login-input-icon {
          color: #f87171;
        }
        .login-input {
          width: 100%;
          padding: 13px 16px 13px 42px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          color: #fff;
          font-size: 14px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          box-sizing: border-box;
        }
        .login-input::placeholder { color: rgba(255,255,255,0.2); }
        .login-input:focus {
          border-color: rgba(248,113,113,0.5);
          background: rgba(248,113,113,0.05);
          box-shadow: 0 0 0 3px rgba(248,113,113,0.08), 0 0 20px rgba(248,113,113,0.05);
        }

        /* Button */
        .login-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px 24px;
          margin-top: 8px;
          background: linear-gradient(135deg, #f87171 0%, #c94d4d 100%);
          border: none;
          border-radius: 12px;
          color: #fff;
          font-size: 15px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          letter-spacing: 0.3px;
          transition: transform 0.2s, box-shadow 0.2s, filter 0.2s;
          box-shadow: 0 4px 20px rgba(248,113,113,0.3), 0 0 0 1px rgba(248,113,113,0.2);
          position: relative;
          overflow: hidden;
        }
        .login-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 30px rgba(248,113,113,0.4), 0 0 0 1px rgba(248,113,113,0.3);
          filter: brightness(1.05);
        }
        .login-btn:hover:not(:disabled)::before { opacity: 1; }
        .login-btn:active:not(:disabled) { transform: translateY(0); }
        .login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .login-btn-loading {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .login-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Toggle */
        .login-toggle {
          text-align: center;
          margin-top: 24px;
          font-size: 13px;
          color: rgba(255,255,255,0.4);
        }
        .login-toggle-btn {
          background: none;
          border: none;
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          color: #f87171;
          cursor: pointer;
          margin-left: 6px;
          padding: 0;
          transition: color 0.2s;
        }
        .login-toggle-btn:hover { color: #fca5a5; text-decoration: underline; }

        /* Footer */
        .login-footer {
          text-align: center;
          margin-top: 20px;
          font-size: 11px;
          color: rgba(255,255,255,0.2);
          letter-spacing: 0.3px;
        }
      `}</style>
    </div>
  )
}
