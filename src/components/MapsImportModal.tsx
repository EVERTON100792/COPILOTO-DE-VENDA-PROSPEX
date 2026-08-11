import { useState, useEffect, useRef } from 'react'
import { Modal, Button, Field } from './ui'
import { useApp } from '../services/store'
import { importFromMaps, extractDataFromImage } from '../services/mapsImport'

interface MapsImportModalProps {
  open: boolean
  onClose: () => void
}

export function MapsImportModal({ open, onClose }: MapsImportModalProps) {
  const [mode, setMode] = useState<'url' | 'print'>('url')
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [category, setCategory] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  
  const [loading, setLoading] = useState(false)
  const [loadingImage, setLoadingImage] = useState(false)
  
  const [extractedData, setExtractedData] = useState<any>(null)

  const toast = useApp(s => s.toast)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reseta os estados quando o modal for fechado
  useEffect(() => {
    if (!open) {
      setUrl('')
      setName('')
      setCity('')
      setCategory('')
      setImagePreview(null)
      setExtractedData(null)
      setMode('url')
      setLoading(false)
      setLoadingImage(false)
    }
  }, [open])

  // Extrai NOME e LAT/LON de URLs do Maps
  useEffect(() => {
    if (!url || mode !== 'url') return

    try {
      const parsedUrl = new URL(url)
      if (parsedUrl.hostname.includes('google.com') && parsedUrl.pathname.includes('/maps/place/')) {
        const parts = parsedUrl.pathname.split('/')
        const placeIndex = parts.indexOf('place')
        if (placeIndex !== -1 && parts.length > placeIndex + 1) {
          const rawName = parts[placeIndex + 1]
          if (rawName) {
            setName(decodeURIComponent(rawName.replace(/\+/g, ' ')))
          }
        }

        const coordsMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
        if (coordsMatch) {
          const lat = coordsMatch[1]
          const lon = coordsMatch[2]
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
            .then(res => res.json())
            .then(data => {
              if (data && data.address) {
                const foundCity = data.address.city || data.address.town || data.address.village || data.address.municipality
                if (foundCity) setCity(foundCity)
              }
            })
            .catch(() => {})
        }
      }
    } catch (e) {
      // url inválida, ignora
    }
  }, [url, mode])

  // Lida com colar imagem no modal
  useEffect(() => {
    if (!open || mode !== 'print') return

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
  }, [open, mode])

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
      // Usa os dados extraídos, combinados com o que o usuário alterou nos inputs (nome, cidade, categoria)
      const submitData = extractedData ? { ...extractedData, name, city, category } : undefined
      const result = await importFromMaps(name, city, url, submitData) 
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

  const isShortUrl = url.includes('maps.app.goo.gl')

  return (
    <Modal open={open} onClose={onClose} title="Cadastrar Empresa">
      <div className="flex gap-4 mb-6 border-b border-gray-800 pb-2">
        <button 
          className={`pb-2 px-2 font-medium text-sm transition-colors ${mode === 'url' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-200'}`}
          onClick={() => setMode('url')}
        >
          Usar URL do Maps
        </button>
        <button 
          className={`pb-2 px-2 font-medium text-sm transition-colors ${mode === 'print' ? 'text-primary border-b-2 border-primary' : 'text-gray-400 hover:text-gray-200'}`}
          onClick={() => setMode('print')}
        >
          Extrair de Print (IA)
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'url' ? (
          <>
            <p className="text-sm text-gray-400 mb-4">
              Cole a URL do Google Maps. O sistema preencherá os dados iniciais automaticamente.
            </p>
            <Field label="URL do Google Maps">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="input w-full"
                placeholder="https://www.google.com/maps/place/..."
                disabled={loading}
              />
            </Field>

            {isShortUrl && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 p-3 rounded text-sm mb-2">
                <strong>Link Curto Detectado:</strong> Por favor, preencha o Nome e a Cidade manualmente abaixo.
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-gray-400 mb-4">
              Cole um print (Ctrl+V) de um perfil de empresa ou clique para enviar uma foto.
            </p>
            
            {!imagePreview ? (
              <div 
                className="border-2 border-dashed border-gray-700 hover:border-primary/50 transition-colors rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer bg-gray-900/50"
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageFile(file)
                  }}
                />
                <span className="text-2xl mb-2">📸</span>
                <span className="text-gray-400 font-medium">Clique ou cole (Ctrl+V) a imagem aqui</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-lg overflow-hidden border border-gray-700 bg-gray-900 flex items-center justify-center h-48">
                  <img src={imagePreview} alt="Preview" className="max-h-full max-w-full object-contain" />
                  <button 
                    type="button"
                    onClick={() => setImagePreview(null)}
                    className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center transition-colors"
                  >
                    ×
                  </button>
                </div>
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={processImage} 
                  disabled={loadingImage || loading}
                  className="w-full"
                >
                  {loadingImage ? 'Analisando com IA...' : '✨ Extrair Dados com IA'}
                </Button>
              </div>
            )}
          </>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <Field label="Nome da Empresa">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
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
              className="input w-full"
              placeholder="Ex: São Paulo"
              disabled={loading}
            />
          </Field>
          
          <Field label="Nicho/Categoria (detectado)">
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input w-full"
              placeholder="Ex: Restaurante"
              disabled={loading}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading || loadingImage}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={loading || loadingImage || !name}>
            {loading ? 'Processando...' : 'Prospectar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
