import { jsPDF } from 'jspdf'
import type { Company } from '../types'

export interface ProposalServiceItem {
  name: string
  description?: string
  price: number
}

export interface ProposalData {
  title: string
  companyName: string
  clientName: string
  clientCity?: string
  clientState?: string
  services: ProposalServiceItem[]
  validDays?: number
  observations?: string
}

export function generateProposalPdfDoc(data: ProposalData): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const margin = 20
  let y = 45

  // Modern Premium Colors
  const primaryColor: [number, number, number] = [15, 23, 42] // Slate 900
  const accentColor: [number, number, number] = [37, 99, 235] // Blue 600
  const darkColor: [number, number, number] = [30, 41, 59] // Slate 800
  const mutedColor: [number, number, number] = [100, 116, 139] // Slate 500
  const lightBg: [number, number, number] = [241, 245, 249] // Slate 100

  // Header Banner
  doc.setFillColor(...primaryColor)
  doc.rect(0, 0, pageW, 40, 'F')
  doc.setFillColor(...accentColor)
  doc.rect(0, 40, pageW, 2, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(255, 255, 255)
  doc.text('PROSPEX', margin, 20)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(24)
  doc.text(' AUTOPILOT', margin + 46, 20)

  doc.setFontSize(11)
  doc.setTextColor(200, 210, 220)
  doc.text('Proposta Comercial de Presença Digital', margin, 28)
  
  doc.setFontSize(9)
  doc.text(
    `Emitida em: ${new Date().toLocaleDateString('pt-BR')}  |  Validade: ${data.validDays || 15} dias`,
    margin,
    34
  )

  y = 60

  // Title & Client Info
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...darkColor)
  doc.text(data.title || 'Proposta de Serviços Digitais', margin, y)
  y += 10

  doc.setFontSize(12)
  doc.setTextColor(...primaryColor)
  doc.text(`Cliente: ${data.clientName}`, margin, y)
  y += 6
  if (data.clientCity) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.setTextColor(...mutedColor)
    doc.text(`Localização: ${data.clientCity}${data.clientState ? `/${data.clientState}` : ''}`, margin, y)
    y += 10
  }
  y += 8

  // Table Header
  doc.setFillColor(...lightBg)
  doc.rect(margin, y, pageW - margin * 2, 10, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...accentColor)
  doc.text('ESCOPO DO PROJETO & INVESTIMENTO', margin + 5, y + 6.5)
  y += 18

  // Service List
  let total = 0
  for (let i = 0; i < data.services.length; i++) {
    const item = data.services[i]
    total += item.price

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...darkColor)
    doc.text(`${i + 1}. ${item.name}`, margin, y)

    const priceText = `R$ ${item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...accentColor)
    doc.text(priceText, pageW - margin, y, { align: 'right' })
    y += 6

    if (item.description) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...mutedColor)
      const lines = doc.splitTextToSize(item.description, pageW - margin * 2 - 15)
      doc.text(lines, margin + 5, y)
      y += lines.length * 5.5
    }
    y += 8
  }

  // Total Divider & Value
  y += 5
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, y, pageW - margin, y)
  y += 12

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(...darkColor)
  doc.text('INVESTIMENTO TOTAL:', margin, y)
  
  doc.setFontSize(16)
  doc.setTextColor(...accentColor)
  doc.text(`R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, pageW - margin, y, { align: 'right' })
  y += 15

  // Observations & Terms
  if (data.observations) {
    doc.setFillColor(...lightBg)
    doc.rect(margin, y, pageW - margin * 2, 25, 'F')
    
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...darkColor)
    doc.text('Observações e Termos:', margin + 5, y + 8)
    
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...mutedColor)
    const obsLines = doc.splitTextToSize(data.observations, pageW - margin * 2 - 10)
    doc.text(obsLines, margin + 5, y + 14)
  }

  // Footer Info
  const footerY = 275
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, footerY - 5, pageW - margin, footerY - 5)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(...mutedColor)
  doc.text(`Este documento foi gerado automaticamente por Prospex Autopilot.`, margin, footerY)

  return doc
}

export function downloadProposalPdf(company: Company, services?: ProposalServiceItem[]) {
  const defaultServices = [
    {
      name: 'Desenvolvimento de Site Institucional Responsivo',
      description: 'Criação de site de até 5 páginas otimizado para celulares, com botão de WhatsApp e SEO local.',
      price: 1490
    },
    {
      name: 'Registro de Domínio (Anual)',
      description: 'Registro e configuração de domínio profissional (.com.br ou .com).',
      price: 40
    }
  ]

  const doc = generateProposalPdfDoc({
    title: `Proposta Comercial de Presença Digital — ${company.name}`,
    companyName: 'Prospex Autopilot',
    clientName: company.name,
    clientCity: company.city || undefined,
    clientState: company.state || undefined,
    services: services || defaultServices,
    validDays: 15,
    observations: 'Pagamento facilitado: 50% na entrada e 50% na aprovação final do projeto.'
  })

  doc.save(`proposta-${company.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`)
}
