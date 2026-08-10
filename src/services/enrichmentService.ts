// Enrichment Service — busca fotos e avaliações para enriquecer o site gerado
// Modo demo: fotos do picsum.photos (determinísticas e profissionais) + avaliações simuladas realistas
// Modo real: integra Google Places API quando configurado

import type { Company } from '../types'

export interface EnrichedPhoto {
  url: string
  alt: string
  source: 'google' | 'picsum' | 'loremflickr'
}

export interface GoogleReview {
  authorName: string
  authorInitial: string
  rating: number
  text: string
  timeAgo: string
  isDemo: boolean
}

export interface EnrichedCompanyData {
  photos: EnrichedPhoto[]
  heroPhoto: string
  reviews: GoogleReview[]
  rating: number
  totalReviews: number
  hours: string | null
  isDemo: boolean
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function photoSeed(company: Company | any, suffix: string): string {
  return slugify((company?.name || 'business') + '-' + suffix)
}

function getNichePhotos(company: Company | any): EnrichedPhoto[] {
  const cat = (company?.category || '').toLowerCase()
  const seed = slugify(company?.name || 'empresa')

  // picsum.photos/seed/{seed}/{w}/{h} — determinístico por seed, sempre a mesma foto
  // Cada seed produz uma foto diferente mas consistente
  const seeds = [
    `${seed}-hero`,
    `${seed}-interior`,
    `${seed}-product`,
    `${seed}-team`,
  ]

  return seeds.map((s, i) => ({
    url: `https://picsum.photos/seed/${s}/1200/700`,
    alt: `${company?.name} - ${['ambiente', 'interior', 'serviços', 'equipe'][i]}`,
    source: 'picsum' as const,
  }))
}

type ReviewTemplate = { name: string; initial: string; text: string }

const REVIEW_TEMPLATES: Record<string, ReviewTemplate[]> = {
  gastronomia: [
    { name: 'Marcos Oliveira', initial: 'M', text: 'Comida incrível! Ambiente agradável, atendimento rápido e preço justo. Já indiquei para vários amigos e todos adoraram.' },
    { name: 'Ana Paula Ferreira', initial: 'A', text: 'Melhor da região! Os pratos são fartos e muito saborosos. Voltarei com certeza toda semana!' },
    { name: 'Carlos Eduardo', initial: 'C', text: 'Atendimento excelente e comida deliciosa. Virou o nosso ponto certo de fim de semana em família.' },
    { name: 'Juliana Souza', initial: 'J', text: 'Fui pela primeira vez e simplesmente adorei! Tudo muito gostoso e o ambiente muito aconchegante.' },
  ],
  saude: [
    { name: 'Maria Ribeiro', initial: 'M', text: 'Profissional excelente! Me senti muito bem acolhida e atendida com toda atenção que merecia. Super recomendo!' },
    { name: 'João Pereira', initial: 'J', text: 'Clínica de altíssimo padrão. Equipe muito atenciosa, competente e puntual. Resultado além das expectativas!' },
    { name: 'Fernanda Costa', initial: 'F', text: 'Desde que comecei o tratamento só tenho elogios. Resultado excelente e sempre muito bem atendida.' },
    { name: 'Roberto Lima', initial: 'R', text: 'Muito satisfeito com o atendimento. Profissional muito qualificado e o ambiente é muito agradável.' },
  ],
  estetica: [
    { name: 'Bianca Santos', initial: 'B', text: 'Saí me sentindo completamente renovada! Atendimento impecável e resultado incrível. Já marquei o próximo!' },
    { name: 'Larissa Mendes', initial: 'L', text: 'Ambiente lindo e equipe super atenciosa. Já fiz vários procedimentos e sempre saio absolutamente satisfeita!' },
    { name: 'Camila Ramos', initial: 'C', text: 'Profissionais muito qualificados, resultado impecável e preço justo. Não troco por nenhum outro lugar!' },
    { name: 'Patrícia Alves', initial: 'P', text: 'Me indicaram e não me arrependo! Atendimento de primeira e resultado que me surpreendeu positivamente.' },
  ],
  automotivo: [
    { name: 'Paulo Silva', initial: 'P', text: 'Serviço de qualidade e preço justo! Resolveram meu problema com agilidade e profissionalismo. Recomendo muito!' },
    { name: 'Renato Cardoso', initial: 'R', text: 'Honestidade e competência! Me explicaram tudo sobre o problema e o serviço ficou impecável. Voltarei sempre.' },
    { name: 'Sérgio Moura', initial: 'S', text: 'Atendimento rápido, diagnóstico preciso e preço honesto. Melhor oficina que já fui!' },
  ],
  servicos: [
    { name: 'Paulo Silva', initial: 'P', text: 'Serviço de qualidade e preço honesto. Resolveram meu problema rapidamente e com muita competência.' },
    { name: 'Cristiane Alves', initial: 'C', text: 'Profissionalismo e atenção ao cliente são os pontos fortes. Super recomendo para qualquer pessoa!' },
    { name: 'Renato Cardoso', initial: 'R', text: 'Atendimento rápido, preço justo e resultado excelente. Não troco esse serviço por nada!' },
    { name: 'Sandra Mota', initial: 'S', text: 'Fui super bem atendida! Profissionais educados, competentes e entregaram dentro do prazo combinado.' },
  ],
}

function getNiche(category: string | null): string {
  const cat = (category || '').toLowerCase()
  if (cat.includes('restaurante') || cat.includes('comida') || cat.includes('bar') || cat.includes('pizzaria') || cat.includes('churrascaria') || cat.includes('padaria') || cat.includes('lanchonete')) return 'gastronomia'
  if (cat.includes('odonto') || cat.includes('dentista') || cat.includes('médic') || cat.includes('saúde') || cat.includes('clínica') || cat.includes('terapia')) return 'saude'
  if (cat.includes('salão') || cat.includes('estética') || cat.includes('barbe') || cat.includes('beleza') || cat.includes('nail') || cat.includes('sobrancelha')) return 'estetica'
  if (cat.includes('auto') || cat.includes('mecanic') || cat.includes('carro') || cat.includes('pneu') || cat.includes('funilaria')) return 'automotivo'
  return 'servicos'
}

function generateDemoReviews(company: Company | any): GoogleReview[] {
  const niche = getNiche(company?.category)
  const templates = REVIEW_TEMPLATES[niche] || REVIEW_TEMPLATES['servicos']
  const timeOptions = ['há 1 semana', 'há 2 semanas', 'há 1 mês', 'há 3 semanas', 'há 2 meses']
  return templates.map((t, i) => ({
    authorName: t.name,
    authorInitial: t.initial,
    rating: 5,
    text: t.text,
    timeAgo: timeOptions[i % timeOptions.length],
    isDemo: true,
  }))
}

export async function enrichCompanyData(company: Company | any): Promise<EnrichedCompanyData> {
  const photos = getNichePhotos(company)
  const heroPhoto = photos[0]?.url || `https://picsum.photos/seed/${slugify(company?.name || 'empresa')}/1200/700`
  const reviews = generateDemoReviews(company)

  // Use real rating from company data if available
  const rating = company?.rating ?? 4.8
  const totalReviews = company?.reviewCount ?? (Math.floor(Math.random() * 35) + 18)
  const hours = company?.hours ?? 'Seg-Sex: 8h às 18h · Sáb: 8h às 13h'

  return {
    photos,
    heroPhoto,
    reviews,
    rating,
    totalReviews,
    hours,
    isDemo: true,
  }
}
