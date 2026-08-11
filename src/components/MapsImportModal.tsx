import { useState, useEffect } from 'react'
import { Modal, Button, Field } from './ui'
import { useApp } from '../services/store'
import { importFromMaps } from '../services/mapsImport'

interface MapsImportModalProps {
  open: boolean
  onClose: () => void
}

export function MapsImportModal({ open, onClose }: MapsImportModalProps) {
  const [url, setUrl] = useState('')
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [loading, setLoading] = useState(false)
  const toast = useApp(s => s.toast)

  // Tenta extrair NOME e LAT/LON de URLs longas do Google Maps
  useEffect(() => {
    if (!url) return

    try {
      const parsedUrl = new URL(url)
      if (parsedUrl.hostname.includes('google.com') && parsedUrl.pathname.includes('/maps/place/')) {
        // Ex: /maps/place/Nome+da+Empresa/@-23.123,-46.123,15z
        const parts = parsedUrl.pathname.split('/')
        const placeIndex = parts.indexOf('place')
        if (placeIndex !== -1 && parts.length > placeIndex + 1) {
          const rawName = parts[placeIndex + 1]
          if (rawName) {
            const decodedName = decodeURIComponent(rawName.replace(/\+/g, ' '))
            setName(decodedName)
          }
        }

        // Tenta achar as coordenadas para buscar a cidade
        const coordsMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/)
        if (coordsMatch) {
          const lat = coordsMatch[1]
          const lon = coordsMatch[2]
          // Busca cidade via Nominatim
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
            .then(res => res.json())
            .then(data => {
              if (data && data.address) {
                const foundCity = data.address.city || data.address.town || data.address.village || data.address.municipality
                if (foundCity) setCity(foundCity)
              }
            })
            .catch(err => console.warn('Nominatim error', err))
        }
      }
    } catch (e) {
      // Ignora erro de parsing
    }
  }, [url])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast('error', 'Por favor, insira o nome da empresa ou cole uma URL completa.')
      return
    }

    setLoading(true)
    try {
      const result = await importFromMaps(name, city, url)
      if (result.success) {
        toast('success', `Empresa ${result.company?.name} cadastrada com sucesso! A IA está analisando os dados em background.`)
        setUrl('')
        setName('')
        setCity('')
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
    <Modal open={open} onClose={onClose} title="Cadastrar via Google Maps">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-400 mb-4">
          Cole a URL do Google Maps. Se for um link completo, o sistema preencherá os dados automaticamente.
        </p>

        <Field label="URL do Google Maps">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="input w-full"
            placeholder="https://www.google.com/maps/place/..."
            required
            disabled={loading}
          />
        </Field>

        {isShortUrl && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 p-3 rounded text-sm mb-2">
            <strong>Link Curto Detectado:</strong> Por favor, preencha o Nome e a Cidade manualmente abaixo para ajudar a IA a extrair os dados.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nome da Empresa (detectado ou manual)">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
              placeholder="Nome exato da empresa"
              required
              disabled={loading}
            />
          </Field>
          
          <Field label="Cidade (detectada ou manual)">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="input w-full"
              placeholder="Ex: São Paulo"
              disabled={loading}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-800">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={loading || !name}>
            {loading ? 'Buscando Dados...' : 'Buscar e Cadastrar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
