import type { Offer } from '../types'

export interface NicheDna {
  name: string
  icon: string
  description: string
  focus: string
  services: string[]
  arguments: string[]
  defaultOffer: Offer
}

function offer(product: string, price: number, deliverable: string, benefit: string, cta: string): Offer {
  return { product, price, deliverable, benefit, cta }
}

export const NICHE_DNA: Record<string, NicheDna> = {
  Odontologia: {
    name: 'Odontologia',
    icon: '🦷',
    description: 'Clínicas e consultórios odontológicos',
    focus: 'agendamento de consultas',
    services: ['implantodontia', 'ortodontia', 'clareamento', 'estética dental', 'tratamento de canal', 'próteses dentárias'],
    arguments: ['pacientes buscam confiança antes de agendar', 'agendamento digital reduz faltas'],
    defaultOffer: offer(
      'Site profissional',
      497,
      'Site institucional com agendamento via WhatsApp',
      'Mais consultas agendadas e imagem profissional',
      'Posso preparar uma demonstração sem compromisso'
    ),
  },
  Restaurantes: {
    name: 'Restaurantes',
    icon: '🍽️',
    description: 'Restaurantes, bares e lanchonetes',
    focus: 'cardápio digital e reservas',
    services: ['entrega', 'reserva de mesas', 'eventos privados', 'serviço no local'],
    arguments: ['clientes buscam o cardápio antes de decidir', 'fotos de pratos aumentam pedidos'],
    defaultOffer: offer(
      'Site profissional',
      497,
      'Site com cardápio digital e link de WhatsApp',
      'Mais pedidos e clientes recorrentes',
      'Posso preparar uma página demo para vocês avaliarem'
    ),
  },
  Academias: {
    name: 'Academias',
    icon: '🏋️',
    description: 'Academias e estúdios de treino',
    focus: 'captação de matrículas',
    services: ['musculação', 'cross training', 'pilates', 'personal trainer', 'spinning'],
    arguments: ['alunos pesquisam planos e horários online', 'o treino vende pelo resultado visível'],
    defaultOffer: offer(
      'Site profissional',
      497,
      'Site com planos, horários e matrícula via WhatsApp',
      'Mais matrículas e menos alunos parados',
      'Posso montar uma demonstração para vocês'
    ),
  },
  Escolas: {
    name: 'Escolas',
    icon: '🎓',
    description: 'Escolas, cursos e ensino',
    focus: 'apresentação institucional e matrículas',
    services: ['educação infantil', 'ensino fundamental', 'ensino médio', 'cursos técnicos', 'idiomas', 'reforço'],
    arguments: ['famílias pesquisam a escola antes da matrícula', 'conteúdo institucional gera credibilidade'],
    defaultOffer: offer(
      'Site institucional',
      597,
      'Site institucional com matrículas e diferenciais',
      'Mais matrículas e credibilidade',
      'Posso preparar uma proposta com demonstração'
    ),
  },
  'Clínicas de saúde': {
    name: 'Clínicas de saúde',
    icon: '🏥',
    description: 'Clínicas médicas e de saúde',
    focus: 'agendamento e credibilidade',
    services: ['consultas', 'exames', 'convênios', 'telemedicina', 'especialidades'],
    arguments: ['pacientes buscam convênios e especialidades antes de ligar'],
    defaultOffer: offer(
      'Site profissional',
      497,
      'Site com agendamento, convênios e especialidades',
      'Mais agendamentos e menos faltas',
      'Posso preparar um modelo para avaliação'
    ),
  },
  Imobiliárias: {
    name: 'Imobiliárias',
    icon: '🏠',
    description: 'Imobiliárias e corretores',
    focus: 'captação de leads imobiliários',
    services: ['venda', 'aluguel', 'avaliação', 'financiamento', 'empreendimentos'],
    arguments: ['compradores buscam imóveis online 24h por dia'],
    defaultOffer: offer(
      'Portal de imóveis',
      997,
      'Site com vitrine de imóveis e formulário de contato',
      'Mais leads qualificados por mês',
      'Posso produzir uma demonstração com seus imóveis'
    ),
  },
  'Salões de beleza': {
    name: 'Salões de beleza',
    icon: '💇',
    description: 'Cabeleireiros e salões',
    services: ['cortes', 'coloração', 'manicure', 'maquiagem', 'estética capilar'],
    focus: 'agendamento e vitrine de serviços',
    arguments: ['o antes/depois vende o serviço'],
    defaultOffer: offer(
      'Site profissional',
      397,
      'Site com portfólio e agendamento via WhatsApp',
      'Menos faltas e mais clientes novos',
      'Posso montar um modelo para vocês'
    ),
  },
  Barbearias: {
    name: 'Barbearias',
    icon: '💈',
    description: 'Barbearias e barbeiros',
    services: ['cortes', 'barba', 'somboncelha', 'produtos', 'assinaturas'],
    focus: 'agendamento e fidelização',
    arguments: ['novidade da barbearia é a experiência'],
    defaultOffer: offer(
      'Site profissional',
      397,
      'Site com agendamento e lista de serviços',
      'Mais cortes agendados e menos espera',
      'Posso preparar uma demo para vocês'
    ),
  },
  'Oficinas mecânicas': {
    name: 'Oficinas mecânicas',
    icon: '🔧',
    description: 'Mecânicas e autocentros',
    services: ['troca de óleo', 'freios', 'suspensão', 'motor', 'alinhamento', 'diagnóstico'],
    focus: 'orçamento rápido e confiança',
    arguments: ['motorista pesquisa a oficina antes de confiar o carro'],
    defaultOffer: offer(
      'Site profissional',
      397,
      'Site com pedido de orçamento via WhatsApp',
      'Mais orçamentos e clientes fiéis',
      'Preparo uma demonstração sem compromisso'
    ),
  },
  Advogados: {
    name: 'Advogados',
    icon: '⚖️',
    description: 'Escritórios e advogados',
    services: ['cível', 'trabalhista', 'empresarial', 'familiar', 'previdenciário', 'imobiliário'],
    focus: 'autoridade e captação de clientes',
    arguments: ['o cliente pesquisa o advogado antes do contato'],
    defaultOffer: offer(
      'Site profissional',
      697,
      'Site institucional com áreas de atuação',
      'Mais autoridade e consultas',
      'Posso preparar uma demonstração'
    ),
  },
  Contadores: {
    name: 'Contadores',
    icon: '📊',
    description: 'Escritórios de contabilidade',
    services: ['abertura de empresa', 'Imposto de Renda', 'contabilidade', 'folha de pagamento', 'nitesão'],
    focus: 'captação de empresas',
    arguments: ['o empreendedor busca contador quando abre a empresa'],
    defaultOffer: offer(
      'Site profissional',
      497,
      'Site com serviços e captura de contato',
      'Mais empresas atendidas',
      'Posso fazer um modelo para avaliar'
    ),
  },
  'Hotéis e pousadas': {
    name: 'Hotéis e pousadas',
    icon: '🛏️',
    description: 'Hotéis, pousadas e hospedagens',
    services: ['hospedagem', 'eventos', 'turismo', 'restaurante'],
    focus: 'reservas diretas',
    arguments: ['fotos profissionais atraem reservas diretas'],
    defaultOffer: offer(
      'Site profissional',
      697,
      'Site com reservas e fotos dos ambientes',
      'Mais reservas sem taxas de intermediadores',
      'Posso preparar uma demonstração'
    ),
  },
  'Lojas de varejo': {
    name: 'Lojas de varejo',
    icon: '🛍️',
    description: 'Lojas e comércios locais',
    services: ['moda', 'eletrônicos', 'utensílios', 'gift'],
    focus: 'vendas online',
    arguments: ['o cliente quer ver o produto antes de ir à loja'],
    defaultOffer: offer(
      'E-commerce leve',
      997,
      'Vitrine com catálogo e WhatsApp',
      'Mais vendas com a loja fechada',
      'Posso fazer a demonstração'
    ),
  },
  Igrejas: {
    name: 'Igrejas',
    icon: '⛪',
    description: 'Igrejas e templos religiosos',
    services: ['cultos', 'eventos', 'doações', 'comunidade'],
    focus: 'comunicação com membros',
    arguments: ['um site ajuda a igreja a se conectar com a comunidade'],
    defaultOffer: offer(
      'Site institucional',
      497,
      'Site com agenda de cultos e botão de doação',
      'Maior alcance e facilidade para os membros',
      'Posso preparar um modelo'
    ),
  },
  Padarias: {
    name: 'Padarias',
    icon: '🥖',
    description: 'Padarias e confeitarias',
    services: ['encomendas', 'pães', 'bolos', 'salgados'],
    focus: 'encomendas via WhatsApp',
    arguments: ['facilita a vida de quem quer encomendar para festas'],
    defaultOffer: offer(
      'Catálogo online',
      397,
      'Cardápio digital com pedidos no WhatsApp',
      'Mais encomendas organizadas',
      'Posso mostrar como ficaria'
    ),
  },
  'Pet shops': {
    name: 'Pet shops',
    icon: '🐾',
    description: 'Pet shops e clínicas veterinárias',
    services: ['banho e tosa', 'veterinário', 'rações', 'acessórios'],
    focus: 'agendamento de banho e tosa',
    arguments: ['os donos de pet amam praticidade para agendar'],
    defaultOffer: offer(
      'Site com agendamento',
      497,
      'Site com agendamento e catálogo de produtos',
      'Mais clientes e organização de horários',
      'Posso criar uma demonstração'
    ),
  },
  Construtoras: {
    name: 'Construtoras',
    icon: '🏗️',
    description: 'Construtoras e empreiteiras',
    services: ['reformas', 'construção', 'projetos', 'orçamentos'],
    focus: 'orçamento de obras',
    arguments: ['um site passa a confiança que uma obra exige'],
    defaultOffer: offer(
      'Site profissional',
      697,
      'Site com portfólio de obras e formulário de orçamento',
      'Mais pedidos de orçamentos qualificados',
      'Posso preparar uma amostra'
    ),
  },
  Mercados: {
    name: 'Mercados',
    icon: '🛒',
    description: 'Supermercados e mercearias',
    services: ['encartes', 'ofertas', 'delivery', 'açougue'],
    focus: 'divulgação de ofertas e delivery',
    arguments: ['clientes buscam ofertas e comodidade de entrega'],
    defaultOffer: offer(
      'Site de ofertas',
      497,
      'Site com encarte digital e link para delivery',
      'Mais vendas online e divulgação de promoções',
      'Posso demonstrar como ficaria'
    ),
  },
  Farmácias: {
    name: 'Farmácias',
    icon: '💊',
    description: 'Farmácias e drogarias',
    services: ['medicamentos', 'perfumaria', 'delivery', 'manipulação'],
    focus: 'delivery no WhatsApp',
    arguments: ['na hora da urgência, a pessoa pesquisa a farmácia mais rápida'],
    defaultOffer: offer(
      'Site com catálogo rápido',
      497,
      'Site com contato rápido para delivery no WhatsApp',
      'Mais pedidos de entrega',
      'Preparo uma demonstração rápida'
    ),
  },
  Consultorias: {
    name: 'Consultorias',
    icon: '💼',
    description: 'Empresas de consultoria e gestão',
    services: ['gestão', 'financeiro', 'RH', 'marketing'],
    focus: 'captação de leads B2B',
    arguments: ['autoridade é fundamental para vender consultoria'],
    defaultOffer: offer(
      'Site de autoridade',
      697,
      'Site institucional focado em captura de leads',
      'Mais contatos B2B qualificados',
      'Posso criar um modelo inicial'
    ),
  },
  'Estética e beleza': {
    name: 'Estética e beleza',
    icon: '✨',
    description: 'Clínicas de estética avançada',
    services: ['botox', 'harmonização', 'depilação a laser', 'limpeza de pele'],
    focus: 'agendamento de avaliações',
    arguments: ['a estética vende pelo visual e confiança'],
    defaultOffer: offer(
      'Site de alta conversão',
      597,
      'Site com antes/depois e agendamento de avaliação',
      'Mais avaliações agendadas',
      'Preparo um modelo gratuito'
    ),
  },
  Fotografia: {
    name: 'Fotografia',
    icon: '📷',
    description: 'Fotógrafos e estúdios',
    services: ['ensaios', 'casamentos', 'eventos', 'produtos'],
    focus: 'portfólio visual',
    arguments: ['o cliente precisa ver a qualidade das fotos de forma profissional'],
    defaultOffer: offer(
      'Portfólio online',
      497,
      'Site vitrine com álbuns otimizados',
      'Mais pedidos de orçamento para eventos',
      'Posso montar uma amostra do portfólio'
    ),
  },
}

export const NICHE_ICONS: Record<string, string> = {
  Odontologia: '🦷',
  Restaurantes: '🍽️',
  Academias: '🏋️',
  Escolas: '🎓',
  'Clínicas de saúde': '🏥',
  Imobiliárias: '🏠',
  'Salões de beleza': '💇',
  Barbearias: '💈',
  'Oficinas mecânicas': '🔧',
  Advogados: '⚖️',
  Contadores: '📊',
  'Hotéis e pousadas': '🛏️',
  'Lojas de varejo': '🛍️',
  'Estética e beleza': '✨',
  Fotografia: '📷',
  'Pet shops': '🐾',
  Construtoras: '🏗️',
  Mercados: '🛒',
  Farmácias: '💊',
  Consultorias: '💼',
  Igrejas: '⛪',
  Padarias: '🥖',
}


export function getNicheDna(name: string): NicheDna | null {
  return NICHE_DNA[name] ?? null
}

export function defaultNicheOffer(niche: string): Offer {
  const dna = getNicheDna(niche)
  if (dna) return dna.defaultOffer
  return offer(
    'Site profissional',
    497,
    'Site profissional com WhatsApp',
    'Mais clientes e credibilidade',
    'Posso preparar uma demonstração para vocês'
  )
}