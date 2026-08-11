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
    <div className="flex flex-col p-6 bg-gray-900/90 rounded-2xl border border-gray-700/60 shadow-2xl shadow-primary/10 w-full transition-all duration-300">
      <div className="flex items-center gap-3 mb-5 border-b border-gray-800/80 pb-4">
        <span className="relative flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-primary shadow-[0_0_10px_var(--primary)]"></span>
        </span>
        <span className="text-white font-bold tracking-[0.15em] text-sm drop-shadow-md">{title}</span>
      </div>
      <div className="flex flex-col gap-4">
        {steps.map((step, index) => {
          const isActive = index === currentStep;
          const isDone = index < currentStep;
          return (
            <div key={index} className={`flex items-center gap-4 transition-all duration-700 ease-out ${isDone || isActive ? 'opacity-100 translate-x-0' : 'opacity-20 -translate-x-4'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-500 ${
                isDone ? 'bg-green-500/10 border-green-500 text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 
                isActive ? 'bg-primary/20 border-primary text-primary shadow-[0_0_15px_var(--primary)] scale-110' : 
                'bg-gray-800 border-gray-700 text-gray-500'
              }`}>
                {isDone ? '✓' : isActive ? '⚡' : (index + 1)}
              </div>
              <span className={`text-[15px] font-medium transition-colors duration-500 ${
                isDone ? 'text-gray-400' : 
                isActive ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]' : 
                'text-gray-600'
              }`}>
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
