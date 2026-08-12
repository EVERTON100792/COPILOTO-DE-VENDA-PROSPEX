import { Component, Suspense, lazy, type ReactNode, type ComponentType } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuth, AuthProvider } from './contexts/AuthContext'
import { Login } from './pages/Login'
import { AppLayout } from './layouts/AppLayout'
import { ToastHost } from './components/ToastHost'
import { LoadingState } from './components/ui'
import { logger } from './lib/logger'

function ProtectedRoute() {
  const { session, loading } = useAuth()
  
  if (loading) return <LoadingState label="Verificando autenticação..." />
  
  if (!session) return <Navigate to="/login" replace />
  
  return <Outlet />
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: { componentStack?: string }) {
    logger.error('UI', 'Erro de componente capturado', `${error.message}${info.componentStack ? ` — ${info.componentStack}` : ''}`.slice(0, 2000))
  }
  render() {
    if (this.state.error) {
      return (
        <div className="page">
          <div className="error-state" role="alert">
            <span>⚠️</span>
            <div>
              <div className="bold">Algo deu errado nesta área.</div>
              <div className="small mt-4">O erro foi registrado. Recarregue a página para continuar.</div>
              <button className="btn btn-secondary btn-sm mt-8" onClick={() => window.location.reload()}>Recarregar</button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function lazyPage(loader: () => Promise<{ default: ComponentType }>) {
  const Lazy = lazy(loader)
  return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingState label="Carregando..." />}>
        <Lazy />
      </Suspense>
    </ErrorBoundary>
  )
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <AuthProvider>
        <ProtectedRoute />
      </AuthProvider>
    ),
    children: [
      {
        path: '',
        element: (
          <>
            <AppLayout />
            <ToastHost />
          </>
        ),
        children: [
          { index: true, element: lazyPage(() => import('./pages/Dashboard')) },
          { path: 'campaigns/new', element: lazyPage(() => import('./pages/NewCampaign')) },
      { path: 'campaigns', element: lazyPage(() => import('./pages/Campaigns')) },
      { path: 'campaigns/:id', element: lazyPage(() => import('./pages/CampaignDetail')) },
      { path: 'discovery', element: lazyPage(() => import('./pages/Discovery')) },
      { path: 'radar', element: lazyPage(() => import('./pages/Radar').then((m) => ({ default: m.Radar }))) },
      { path: 'sites', element: lazyPage(() => import('./pages/Sites').then((m) => ({ default: m.Sites }))) },
      { path: 'demos', element: lazyPage(() => import('./pages/Demos').then((m) => ({ default: m.Demos }))) },
      { path: 'demo/:id', element: lazyPage(() => import('./pages/DemoPreview').then((m) => ({ default: m.DemoPreview }))) },
      { path: 'outreach', element: lazyPage(() => import('./pages/OutreachDashboard')) },
      { path: 'outreach/new', element: lazyPage(() => import('./pages/NewOutreachCampaign')) },
      { path: 'outreach/approval', element: lazyPage(() => import('./pages/OutreachApproval')) },
      { path: 'outreach/campaigns/:id', element: lazyPage(() => import('./pages/OutreachCampaignDetail')) },
      { path: 'leads', element: lazyPage(() => import('./pages/Leads')) },
      { path: 'leads/:id', element: lazyPage(() => import('./pages/LeadDetail')) },
      { path: 'crm', element: lazyPage(() => import('./pages/Kanban')) },
      { path: 'messages', element: lazyPage(() => import('./pages/Messages')) },
      { path: 'followups', element: lazyPage(() => import('./pages/Followups')) },
      { path: 'companies', element: lazyPage(() => import('./pages/Companies')) },
      { path: 'companies/:id', element: lazyPage(() => import('./pages/CompanyDetail')) },

      { path: 'proposals', element: lazyPage(() => import('./pages/Proposals')) },
      { path: 'agents', element: lazyPage(() => import('./pages/Agents')) },
      { path: 'automations', element: lazyPage(() => import('./pages/Automations')) },
      { path: 'integrations', element: lazyPage(() => import('./pages/Integrations')) },
      { path: 'reports', element: lazyPage(() => import('./pages/Reports')) },
      { path: 'settings', element: lazyPage(() => import('./pages/Settings')) },
      { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])