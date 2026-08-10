# 🌐 FREE REAL DISCOVERY ENGINE (OpenStreetMap + Overpass API)

Este documento descreve a arquitetura e operação do mecanismo de **Busca Real Gratuita** do Prospex Autopilot (Fase 2.5).

---

## 🎯 Objetivo

Permitir que o sistema encontre empresas reais em qualquer cidade do Brasil **sem depender de Google Maps API, Google Cloud Billing ou cartão de crédito**.

---

## 🏗️ Arquitetura de Fontes Públicas

```text
               Nicho & Localização (ex: Restaurantes em Rolândia - PR)
                                      │
                                      ▼
                             OsmCategoryMapper
                   (Termo pt-BR ➔ Tags OSM Whitelisted)
                                      │
                                      ▼
                             Geocoding (Nominatim)
                  (1 req/cidade + Cache LocalStorage BBox)
                                      │
                                      ▼
                            OverpassQueryBuilder
                  (Monta Overpass QL sanitizado com BBox)
                                      │
                                      ▼
                            Overpass API Interpreter
                    (https://overpass-api.de/api/interpreter)
                                      │
                                      ▼
                             parseOsmBusiness()
               (Node/Way/Relation ➔ Candidate Business)
                                      │
                                      ▼
                            DiscoveryService Pipeline
           (Normalização ➔ Deduplicação ➔ Scoring ➔ CRM REAL)
```

---

## 🔑 Componentes Principais

### 1. `OpenStreetMapProvider` (`src/discovery/providers/openStreetMap.ts`)
- Implementa a interface `DiscoveryProvider`.
- Tier: `'free'`.
- `needsConfig`: `false` (funciona imediatamente sem API key).
- Atribuição obrigatória: `© OpenStreetMap contributors` (licença ODbL).

### 2. `OsmCategoryMapper` (`OSM_CATEGORIES`)
Mapeamento seguro de intenções em português para tags válidas no wiki do OpenStreetMap:
- **Odontologia**: `amenity=dentist`
- **Restaurantes**: `amenity=restaurant`
- **Cafés**: `amenity=cafe`
- **Bares**: `amenity=bar`, `amenity=pub`
- **Academias**: `leisure=fitness_centre`, `leisure=sports_centre`
- **Escolas**: `amenity=school`, `amenity=kindergarten`
- **Clínicas**: `amenity=clinic`, `healthcare=clinic`
- **Hotéis**: `tourism=hotel`, `tourism=guest_house`, `tourism=hostel`
- **Salões**: `shop=beauty`, `amenity=beauty_salon`
- **Oficinas**: `shop=car_repair`
- ... e mais de 20 categorias validadas.

### 3. Geocodificação Responsável (Nominatim)
- Utilizado **apenas** para converter cidade + estado em uma *Bounding Box* geográfica (`south, west, north, east`).
- **NUNCA** utilizado para bulk discovery empresa por empresa.
- **Cache LocalStorage** (`geocodeCacheKey`) evita requisições repetidas para a mesma cidade.
- Respeita o limite oficial da OSMF de **1 requisição por segundo**.

### 4. Overpass QL Query Builder
- Constrói consultas seguras com sanitização estrita de entradas.
- Busca simultânea em elementos `node`, `way` e `relation`.
- Timeout padrão: 25 segundos com retry exponencial em caso de instabilidade transitória (HTTP 429, 502, 503, 504).

---

## 🛡️ Políticas de Uso & Licença

- **Licença**: Open Database License (ODbL).
- **Atribuição**: Exibida em relatórios e interface (`© OpenStreetMap contributors`).
- **Sem Scraping Proibido**: Utiliza APIs oficiais e documentadas.
- **Transparência**: Empresas descobertas pelo OSM recebem `dataStatus = 'REAL'`, `sourceType = 'openstreetmap'` e `sourceRecordId = 'osm:node:123456'`.

---

## 🧪 Como Testar sem Google e sem Cartão

1. Remova ou desative `VITE_MAPS_API_KEY` do arquivo `.env` (ou na tela Integrações).
2. Acesse a tela **Nova Campanha** (`/campaigns/new`).
3. No passo **Fonte**, selecione **OpenStreetMap (Overpass)**.
4. No passo **Modo**, selecione **Real**.
5. Preencha segmento (ex.: `Restaurantes`) e cidade (ex.: `Rolândia - PR`).
6. Inicie a prospecção real.
7. As empresas reais encontradas aparecerão no CRM identificadas com o selo **🟢 REAL** e fonte **OpenStreetMap**.
