import type { Company, Lead, Campaign, LeadStatus, WebsiteStatus } from '../types'

export interface DemoSpec {
  name: string
  category: string
  city: string
  state: string
  phone?: string
  whatsapp?: string
  website?: string
  instagram?: string
  facebook?: string
  rating?: number
  reviewCount?: number
  address?: string
  source: string
}

export const DEMO_COMPANIES: DemoSpec[] = [
  // --- Odontologia ---
  { name: 'Clínica OdontoVida Demo', category: 'Odontologia', city: 'Londrina', state: 'PR', phone: '(43) 3321-1180', whatsapp: '(43) 3321-1180', instagram: '@odontovida.londrina', facebook: 'odontovidaclilnica', rating: 4.8, reviewCount: 137, address: 'Rua Piauí, 810', source: 'DEMO: Google Maps (simulado)' },
  { name: 'Dental Center Londrina DEMO', category: 'Odontologia', city: 'Londrina', state: 'PR', phone: '(43) 3345-2290', whatsapp: '(43) 3345-2290', rating: 4.6, reviewCount: 84, address: 'Av. Higienópolis, 320', source: 'DEMO: Google Maps (simulado)' },
  { name: 'Odonto Clinic Demo', category: 'Odontologia', city: 'Londrina', state: 'PR', phone: '(43) 3361-4432', whatsapp: '(43) 99631-8842', instagram: '@odontoclinic.demo', rating: 4.9, reviewCount: 201, address: 'Rua Arapongas, 105', source: 'DEMO: Google Maps (simulado)' },
  { name: 'Sorriso Prime Clínica DEMO', category: 'Odontologia', city: 'Londrina', state: 'PR', phone: '(43) 3025-7711', rating: 4.2, reviewCount: 21, source: 'DEMO: Google Maps (simulado)' },
  { name: 'Studio Dental Demo', category: 'Odontologia', city: 'Ibiporã', state: 'PR', whatsapp: '(43) 99631-2210', instagram: '@studiodental.demo', rating: 4.7, reviewCount: 45, source: 'DEMO: Google Maps (simulado)' },
  { name: 'OdontoMais Demo', category: 'Odontologia', city: 'Ibiporã', state: 'PR', phone: '(43) 3258-3344', rating: 4.1, reviewCount: 22, address: 'Av. Aviadores do Vale', source: 'DEMO: Google Maps (simulado)' },
  { name: 'Dental Prisma DEMO', category: 'Odontologia', city: 'Londrina', state: 'PR', website: 'https://dentalprisma-demo.com.br', instagram: '@dentalprisma', facebook: 'dentalprisma', rating: 4.4, reviewCount: 150, source: 'DEMO: Google Maps (simulado)' },

  // --- Restaurantes ---
  { name: 'Restaurante Bom Gosto DEMO', category: 'Restaurantes', city: 'Londrina', state: 'PR', phone: '(43) 3354-1902', whatsapp: '(43) 9912-8890', instagram: '@restbomgosto.demo', rating: 4.7, reviewCount: 412, address: 'Rua Rio Grande do Sul, 45', source: 'DEMO: Google Maps (simulado)' },
  { name: 'Churrascaria Demo Center', category: 'Restaurantes', city: 'Londrina', state: 'PR', phone: '(43) 3336-2890', rating: 4.5, reviewCount: 198, source: 'DEMO: Google Maps (simulado)' },
  { name: 'Pizzaria Demo Cuore', category: 'Restaurantes', city: 'Londrina', state: 'PR', whatsapp: '(43) 9988-5566', instagram: '@pizzariademocuore', rating: 4.9, reviewCount: 251, source: 'DEMO: Google Maps (simulado)' },
  { name: 'Sushi Demo House', category: 'Restaurantes', city: 'Rolândia', state: 'PR', phone: '(43) 3255-8841', whatsapp: '(43) 3255-8841', rating: 4.3, reviewCount: 67, source: 'DEMO: Google Maps (simulado)' },
  { name: 'Café Demo Aroma', category: 'Restaurantes', city: 'Ibiporã', state: 'PR', instagram: '@cafedemaroma', rating: 4.6, reviewCount: 38, source: 'DEMO: Google Maps (simulado)' },

  // --- Academias ---
  { name: 'Academia Demo Fit', category: 'Academias', city: 'Londrina', state: 'PR', phone: '(43) 3348-7765', whatsapp: '(43) 3348-7765', instagram: '@academiafit.demo', rating: 4.8, reviewCount: 142, source: 'DEMO: Google Maps (simulado)' },
  { name: 'Cross Demo Box', category: 'Academias', city: 'Londrina', state: 'PR', whatsapp: '(43) 9990-1122', instagram: '@crossdemobox', rating: 4.9, reviewCount: 96, source: 'DEMO: Google Maps (simulado)' },
  { name: 'Academia Demo Saúde', category: 'Academias', city: 'Rolândia', state: 'PR', phone: '(43) 3237-9980', rating: 4.2, reviewCount: 51, source: 'DEMO: Google Maps (simulado)' },

  // --- Escolas ---
  { name: 'Escola Demo Sonho', category: 'Escolas', city: 'Londrina', state: 'PR', phone: '(43) 3342-1100', whatsapp: '(43) 9826-4455', instagram: '@escolademosonho', rating: 4.6, reviewCount: 73, source: 'DEMO: Google Maps (simulado)' },
  { name: 'Colégio Aventura DEMO', category: 'Escolas', city: 'Londrina', state: 'PR', rating: 4.4, reviewCount: 88, source: 'DEMO: Google Maps (simulado)' },

  // --- Imobiliárias ---
  { name: 'Imobiliária Demo Prime', category: 'Imobiliárias', city: 'Londrina', state: 'PR', phone: '(43) 3311-8890', whatsapp: '(43) 9977-5522', instagram: '@imobprime.demo', rating: 4.7, reviewCount: 119, address: 'Av. Tiradentes, 3311', source: 'DEMO: Google Maps (simulado)' },
  { name: 'Imóveis Demo Central', category: 'Imobiliárias', city: 'Ibiporã', state: 'PR', phone: '(43) 3258-4451', rating: 4.3, reviewCount: 41, source: 'DEMO: Google Maps (simulado)' },

  // --- Salões / Barbearias ---
  { name: 'Salão Beleza Demo', category: 'Salões de beleza', city: 'Londrina', state: 'PR', whatsapp: '(43) 9967-3345', instagram: '@salaobeleza.demo', rating: 4.8, reviewCount: 102, source: 'DEMO: Google Maps (simulado)' },
  { name: 'Barbearia Demo Corte', category: 'Barbearias', city: 'Londrina', state: 'PR', whatsapp: '(43) 9988-4470', instagram: '@barbercut.demo', rating: 4.9, reviewCount: 231, source: 'DEMO: Google Maps (simulado)' },
  { name: 'Barbearia Demo Vida', category: 'Barbearias', city: 'Rolândia', state: 'PR', phone: '(43) 3238-7788', rating: 4.5, reviewCount: 59, source: 'DEMO: Google Maps (simulado)' },

  // --- Oficinas ---
  { name: 'Oficina Demo Motors', category: 'Oficinas mecânicas', city: 'Londrina', state: 'PR', phone: '(43) 3328-6650', whatsapp: '(43) 9992-8811', rating: 4.6, reviewCount: 77, source: 'DEMO: Google Maps (simulado)' },
  { name: 'Oficina Demo Car', category: 'Oficinas mecânicas', city: 'Ibiporã', state: 'PR', phone: '(43) 3258-3420', rating: 4.1, reviewCount: 19, source: 'DEMO: Google Maps (simulado)' },

  // --- Advogados / Contadores ---
  { name: 'Advocacia Demo e Souza', category: 'Advogados', city: 'Londrina', state: 'PR', phone: '(43) 3341-9090', whatsapp: '(43) 9881-2290', instagram: '@advDemoesouza', rating: 4.9, reviewCount: 54, source: 'DEMO: Google Maps (simulado)' },
  { name: 'Escritório Demo Contábil', category: 'Contadores', city: 'Londrina', state: 'PR', phone: '(43) 3351-4472', rating: 4.4, reviewCount: 32, source: 'DEMO: Google Maps (simulado)' },

  // --- Pet / Estética / Farmácia ---
  { name: 'Pet Shop Demo Amigo', category: 'Pet shops', city: 'Londrina', state: 'PR', whatsapp: '(43) 9977-3340', instagram: '@petshop_demo_amigo', rating: 4.7, reviewCount: 88, source: 'DEMO: Google Maps (simulado)' },
  { name: 'Clínica Estética Demo Face', category: 'Estética e beleza', city: 'Londrina', state: 'PR', whatsapp: '(43) 9966-8821', instagram: '@demaface', rating: 4.8, reviewCount: 61, source: 'DEMO: Google Maps (simulado)' },
  { name: 'Farmácia Demo Popular', category: 'Farmácias', city: 'Ibiporã', state: 'PR', phone: '(43) 3258-3399', rating: 4.2, reviewCount: 44, source: 'DEMO: Google Maps (simulado)' },
]