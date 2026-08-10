import React from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import type { Company, Lead } from '../types'

// Fix default Leaflet icon paths
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

interface LeadMapProps {
  companies: Company[]
  leads?: Lead[]
  onSelectCompany?: (company: Company) => void
}

export const LeadMap: React.FC<LeadMapProps> = ({ companies, onSelectCompany }) => {
  // Default center: Brasil (or first company coordinates / Rolândia PR default)
  const defaultLat = -23.3102
  const defaultLng = -51.4124

  return (
    <div className="w-full h-80 rounded-xl overflow-hidden border border-slate-200 shadow-sm relative z-0">
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <MapContainer
        center={[defaultLat, defaultLng]}
        zoom={12}
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {companies.map((c, i) => {
          // Fake pseudo-random spread for demo pins if lat/lng not stored
          const lat = defaultLat + (i % 5 - 2) * 0.015
          const lng = defaultLng + (i % 7 - 3) * 0.015

          return (
            <Marker key={c.id || i} position={[lat, lng]} icon={customIcon}>
              <Popup>
                <div className="p-1 max-w-xs text-slate-800">
                  <h4 className="font-bold text-sm text-blue-600">{c.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{c.category || 'Estabelecimento'}</p>
                  <p className="text-xs mt-1 font-medium">{c.city ? `${c.city}/${c.state || 'PR'}` : 'Local sem cidade'}</p>

                  <div className="mt-2 text-xs flex gap-1 flex-wrap">
                    {!c.website ? (
                      <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Sem Site</span>
                    ) : (
                      <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Com Site</span>
                    )}
                    {c.whatsapp ? (
                      <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">WhatsApp</span>
                    ) : null}
                  </div>

                  {onSelectCompany && (
                    <button
                      onClick={() => onSelectCompany(c)}
                      className="mt-3 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium px-2.5 py-1 rounded w-full transition-colors"
                    >
                      Ver Detalhes / Prospectar
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
