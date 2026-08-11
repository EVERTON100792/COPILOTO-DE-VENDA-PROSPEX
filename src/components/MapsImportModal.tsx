import { useState, useEffect } from 'react'
import { Modal, Button, Field } from './ui'
import { useApp } from '../services/store'
import { importFromMaps, extractDataFromImage } from '../services/mapsImport'

import type { ReactNode } from 'react'

const IMAGE_STEPS = [
  "Iniciando motores da IA...",
  "Lendo a imagem com Visão Computacional (OCR)...",
  "Analisando contexto e extraindo dados importantes...",
  "Finalizando e estruturando JSON..."
]

const PROSPECT_STEPS = [
  "Validando dados da empresa...",
  "Buscando informações avançadas na Web...",
  "Avaliando o nível de oportunidade (Lead Score)...",
  "Cadastrando no CRM..."
]

function PipelineUI({ steps, currentStep, title }: { steps: string[], currentStep: number, title: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', padding: '24px',
      background: 'rgba(17, 24, 39, 0.95)', borderRadius: '16px',
      border: '1px solid rgba(55, 65, 81, 0.6)', width: '100%',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1), 0 0 15px rgba(168, 85, 247, 0.15)',
      transition: 'all 0.3s'
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px',
        borderBottom: '1px solid rgba(31, 41, 55, 0.8)', paddingBottom: '16px'
      }}>
        {/* Pulsing dot */}
        <div style={{ position: 'relative', display: 'flex', width: '14px', height: '14px' }}>
          <div style={{
            position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
            background: 'var(--primary)', opacity: 0.75, animation: 'slideIn 2s ease infinite'
          }}></div>
          <div style={{
            position: 'relative', width: '14px', height: '14px', borderRadius: '50%',
            background: 'var(--primary)', boxShadow: '0 0 10px var(--primary)'
          }}></div>
        </div>
        <span style={{
          color: '#fff', fontWeight: 800, letterSpacing: '0.15em', fontSize: '14px',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}>
          {title}
        </span>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isDone = index < currentStep;
          return (
            <div key={index} style={{
              display: 'flex', alignItems: 'center', gap: '16px',
              transition: 'all 0.7s ease-out',
              opacity: isDone || isActive ? 1 : 0.3,
              transform: isDone || isActive ? 'translateX(0)' : 'translateX(-16px)'
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                border: '2px solid', transition: 'all 0.5s',
                ...(isDone 
                  ? { background: 'rgba(34, 197, 94, 0.1)', borderColor: 'rgb(34, 197, 94)', color: 'rgb(74, 222, 128)', boxShadow: '0 0 10px rgba(34,197,94,0.3)' } 
                  : isActive
                  ? { background: 'rgba(168, 85, 247, 0.2)', borderColor: 'var(--primary)', color: 'var(--primary)', boxShadow: '0 0 15px var(--primary)', transform: 'scale(1.1)' }
                  : { background: 'rgba(31, 41, 55, 1)', borderColor: 'rgba(55, 65, 81, 1)', color: 'rgba(107, 114, 128, 1)' })
              }}>
                {isDone ? '✓' : isActive ? '⚡' : (index + 1)}
              </div>
              <span style={{
                fontSize: '15px', fontWeight: 500, transition: 'color 0.5s',
                ...(isDone
                  ? { color: 'rgba(156, 163, 175, 1)' }
                  : isActive
                  ? { color: '#fff', textShadow: '0 0 8px rgba(255,255,255,0.6)' }
                  : { color: 'rgba(75, 85, 99, 1)' })
              }}>
                {step}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface MapsImportModalProps {
  open: boolean
  onClose: () => void
}

export function MapsImportModal({ open, onClose }: MapsImportModalProps) {
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [category, setCategory] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  
  const [loading, setLoading] = useState(false)
  const [loadingImage, setLoadingImage] = useState(false)
  
  const [imageStep, setImageStep] = useState(0)
  const [prospectStep, setProspectStep] = useState(0)
  
  const [extractedData, setExtractedData] = useState<any>(null)

  const toast = useApp(s => s.toast)

  // Reseta os estados quando o modal for fechado
  useEffect(() => {
    if (!open) {
      setName('')
      setCity('')
      setCategory('')
      setPhone('')
      setAddress('')
      setImagePreview(null)
      setExtractedData(null)
      setLoading(false)
      setLoadingImage(false)
      setImageStep(0)
      setProspectStep(0)
    }
  }, [open])

  // Pipeline intervals
  useEffect(() => {
    let interval: any;
    if (loadingImage) {
      setImageStep(0)
      interval = setInterval(() => {
        setImageStep(s => (s < IMAGE_STEPS.length - 1 ? s + 1 : s))
      }, 3000)
    }
    return () => clearInterval(interval)
  }, [loadingImage])

  useEffect(() => {
    let interval: any;
    if (loading) {
      setProspectStep(0)
      interval = setInterval(() => {
        setProspectStep(s => (s < PROSPECT_STEPS.length - 1 ? s + 1 : s))
      }, 2500)
    }
    return () => clearInterval(interval)
  }, [loading])

  // Lida com colar imagem no modal
  useEffect(() => {
    if (!open) return

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      
      for (const item of items) {
        if (item.type.indexOf('image') === 0) {
          const file = item.getAsFile()
          if (file) handleImageFile(file)
          break
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [open])

  const handleImageFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        setImagePreview(e.target.result as string)
      }
    }
    reader.readAsDataURL(file)
  }

  const processImage = async () => {
    if (!imagePreview) return
    
    setLoadingImage(true)
    try {
      toast('info', 'Analisando a imagem. Isso pode levar alguns segundos...')
      const data = await extractDataFromImage(imagePreview)
      setName(data.name || '')
      setCity(data.city || '')
      setCategory(data.category || '')
      setPhone(data.phone || '')
      setAddress(data.address || '')
      setExtractedData(data)
      toast('success', 'Dados extraídos com sucesso! Revise e clique em Prospectar.')
    } catch (err: any) {
      toast('error', err.message || 'Erro ao processar imagem.')
    } finally {
      setLoadingImage(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast('error', 'Por favor, insira o nome da empresa ou utilize as formas de extração.')
      return
    }

    setLoading(true)
    try {
      // Usa os dados extraídos, combinados com o que o usuário alterou nos inputs
      const submitData = extractedData ? { ...extractedData, name, city, category, phone, address } : undefined
      const result = await importFromMaps(name, city, '', submitData) 
      if (result.success) {
        toast('success', `Empresa ${result.company?.name} cadastrada com sucesso!`)
        onClose()
      } else {
        toast('error', result.error || 'Erro ao cadastrar empresa.')
      }
    } catch (error) {
      toast('error', 'Ocorreu um erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Extração Inteligente de Empresa" wide>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="text-center space-y-2 mb-6">
          <p className="text-gray-300">
            A IA analisará sua imagem para extrair os dados automaticamente.
          </p>
          <p className="text-sm text-gray-500">
            Copie qualquer imagem (Google Maps, sites, cartões) e pressione <kbd className="bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded text-xs">Ctrl+V</kbd> nesta tela.
          </p>
        </div>
        
        {!imagePreview ? (
          <div 
            className="group relative overflow-hidden border-2 border-dashed border-gray-700 bg-gray-900/60 transition-all duration-300 rounded-2xl p-12 flex flex-col items-center justify-center shadow-inner"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="bg-gray-800 p-4 rounded-full shadow-xl mb-4 group-hover:scale-110 transition-transform duration-300 border border-gray-700">
              <span className="text-4xl block translate-y-px">📋</span>
            </div>
            <span className="text-gray-300 font-medium text-lg text-center leading-relaxed">
              Pressione <kbd className="bg-gray-800 border border-gray-700 px-1.5 py-0.5 rounded text-sm text-primary mx-1">Ctrl+V</kbd><br/> para colar o print aqui
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden border border-gray-700 bg-black/40 flex items-center justify-center h-48 shadow-lg ring-1 ring-white/5">
              <img src={imagePreview} alt="Preview" className="max-h-full max-w-full object-contain drop-shadow-xl" />
              <button 
                type="button"
                onClick={() => setImagePreview(null)}
                className="absolute top-3 right-3 bg-red-500/90 hover:bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors shadow-lg"
              >
                ×
              </button>
            </div>
            {loadingImage ? (
              <PipelineUI steps={IMAGE_STEPS} currentStep={imageStep} title="IA TRABALHANDO NOS DADOS..." />
            ) : (
              <Button 
                type="button" 
                variant="primary" 
                onClick={processImage} 
                disabled={loading}
                className="w-full py-4 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
              >
                ✨ Mágica: Extrair Dados com IA
              </Button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4">
          <Field label="Nome da Empresa">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full bg-gray-900/50"
              placeholder="Ex: Pizzaria Bate Papo"
              required
              disabled={loading}
            />
          </Field>
          
          <Field label="Cidade">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="input w-full bg-gray-900/50"
              placeholder="Ex: São Paulo"
              disabled={loading}
            />
          </Field>
          
          <Field label="Nicho/Categoria (para a IA buscar)">
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input w-full bg-gray-900/50"
              placeholder="Ex: Serviços Jurídicos"
              disabled={loading}
            />
          </Field>

          <Field label="Telefone">
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input w-full bg-gray-900/50"
              placeholder="Ex: (11) 99999-9999"
              disabled={loading}
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Endereço">
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="input w-full bg-gray-900/50"
                placeholder="Ex: Rua das Flores, 123"
                disabled={loading}
              />
            </Field>
          </div>
        </div>

        <div className={`flex ${loading ? 'flex-col' : 'justify-end gap-3'} mt-8 pt-6 border-t border-gray-800/60`}>
          {loading ? (
            <PipelineUI steps={PROSPECT_STEPS} currentStep={prospectStep} title="CRIANDO PROSPECÇÃO..." />
          ) : (
            <>
              <Button type="button" variant="secondary" onClick={onClose} disabled={loadingImage}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" disabled={loadingImage || !name}>
                Confirmar e Prospectar
              </Button>
            </>
          )}
        </div>
      </form>
    </Modal>
  )
}
