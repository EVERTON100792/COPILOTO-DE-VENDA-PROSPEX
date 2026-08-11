import { useState, useEffect } from 'react'
import { Modal, Button, Field } from './ui'
import { useApp } from '../services/store'
import { importFromMaps, extractDataFromImage } from '../services/mapsImport'

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
    }
  }, [open])

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
            <Button 
              type="button" 
              variant="primary" 
              onClick={processImage} 
              disabled={loadingImage || loading}
              className="w-full py-4 text-base font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
            >
              {loadingImage ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-white shadow-[0_0_10px_#fff]"></span>
                  </span>
                  <span className="font-bold tracking-widest animate-pulse drop-shadow-md">IA TRABALHANDO NOS DADOS...</span>
                </span>
              ) : '✨ Mágica: Extrair Dados com IA'}
            </Button>
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

        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-800/60">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading || loadingImage}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={loading || loadingImage || !name} className={loading ? "shadow-[0_0_15px_var(--primary)] transition-shadow duration-500" : ""}>
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin -ml-1 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="font-semibold animate-pulse tracking-wide">CRIANDO PROSPECÇÃO...</span>
              </span>
            ) : 'Confirmar e Prospectar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
