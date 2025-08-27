import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

export interface ExportOptions {
  title: string
  subtitle?: string
  dateRange: {
    startDate: string
    endDate: string
  }
  filters?: Record<string, string>
  data: any
  filename: string
}

export interface TableData {
  headers: string[]
  rows: (string | number)[][]
}

export interface ChartData {
  title: string
  data: { label: string; value: number }[]
}

// Utility functions for formatting
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export const formatDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export const formatPercentage = (value: number): string => {
  return `${value.toFixed(1)}%`
}

// PDF Export Functions
export const createPDFHeader = (doc: jsPDF, options: ExportOptions): number => {
  const pageWidth = doc.internal.pageSize.width
  let yPosition = 20

  // Company header
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('VOI Rental Management', pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 10

  // Report title
  doc.setFontSize(16)
  doc.text(options.title, pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 8

  // Subtitle if provided
  if (options.subtitle) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(options.subtitle, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 6
  }

  // Date range
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  const dateRangeText = `Period: ${formatDate(options.dateRange.startDate)} - ${formatDate(options.dateRange.endDate)}`
  doc.text(dateRangeText, pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 6

  // Filters if provided
  if (options.filters && Object.keys(options.filters).length > 0) {
    const filtersText = Object.entries(options.filters)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' | ')
    doc.text(filtersText, pageWidth / 2, yPosition, { align: 'center' })
    yPosition += 6
  }

  // Generated timestamp
  const timestamp = `Generated on: ${new Date().toLocaleString()}`
  doc.text(timestamp, pageWidth / 2, yPosition, { align: 'center' })
  yPosition += 15

  // Add a line separator
  doc.setLineWidth(0.5)
  doc.line(20, yPosition, pageWidth - 20, yPosition)
  yPosition += 10

  return yPosition
}

export const addTableToPDF = (
  doc: jsPDF,
  tableData: TableData,
  startY: number,
  title?: string
): number => {
  let currentY = startY

  // Add table title if provided
  if (title) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(title, 20, currentY)
    currentY += 10
  }

  // Add table using autoTable function directly
  autoTable(doc, {
    head: [tableData.headers],
    body: tableData.rows,
    startY: currentY,
    theme: 'grid',
    headStyles: {
      fillColor: [59, 130, 246], // Blue color
      textColor: 255,
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Light gray
    },
  })

  return (doc as any).lastAutoTable?.finalY + 15 || currentY + 50
}

export const addSummaryCardsToPDF = (
  doc: jsPDF,
  cards: { title: string; value: string; color?: string }[],
  startY: number,
  title?: string
): number => {
  let currentY = startY

  if (title) {
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(title, 20, currentY)
    currentY += 10
  }

  const cardWidth = 40
  const cardHeight = 20
  const cardsPerRow = 4
  const spacing = 5

  cards.forEach((card, index) => {
    const row = Math.floor(index / cardsPerRow)
    const col = index % cardsPerRow
    const x = 20 + col * (cardWidth + spacing)
    const y = currentY + row * (cardHeight + spacing)

    // Draw card background
    doc.setFillColor(248, 250, 252)
    doc.rect(x, y, cardWidth, cardHeight, 'F')

    // Add border
    doc.setDrawColor(229, 231, 235)
    doc.rect(x, y, cardWidth, cardHeight, 'S')

    // Add title
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.text(card.title, x + 2, y + 6)

    // Add value
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(card.value, x + 2, y + 15)
  })

  const totalRows = Math.ceil(cards.length / cardsPerRow)
  return currentY + totalRows * (cardHeight + spacing) + 10
}

// Excel Export Functions
export const createExcelWorkbook = (options: ExportOptions): XLSX.WorkBook => {
  const workbook = XLSX.utils.book_new()

  // Add metadata worksheet
  const metadataData = [
    ['Report Title', options.title],
    ['Subtitle', options.subtitle || ''],
    ['Start Date', formatDate(options.dateRange.startDate)],
    ['End Date', formatDate(options.dateRange.endDate)],
    ['Generated On', new Date().toLocaleString()],
    [''],
    ['Filters:'],
    ...(options.filters ? Object.entries(options.filters).map(([key, value]) => [key, value]) : []),
  ]

  const metadataSheet = XLSX.utils.aoa_to_sheet(metadataData)
  XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Report Info')

  return workbook
}

export const addTableToExcel = (
  workbook: XLSX.WorkBook,
  tableData: TableData,
  sheetName: string
): void => {
  const worksheetData = [tableData.headers, ...tableData.rows]
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData)

  // Style the header row
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
    if (!worksheet[cellAddress]) continue

    worksheet[cellAddress].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '3B82F6' } }, // Blue background to match PDF
      alignment: { horizontal: 'center' },
    }
  }

  // Style alternating rows to match PDF
  for (let row = 1; row <= tableData.rows.length; row++) {
    if (row % 2 === 0) {
      // Even rows (alternating)
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = {
            ...worksheet[cellAddress].s,
            fill: { fgColor: { rgb: 'F8FAFC' } }, // Light gray to match PDF
          }
        }
      }
    }
  }

  // Auto-size columns
  const colWidths = tableData.headers.map((header, i) => {
    const maxLength = Math.max(
      header.length,
      ...tableData.rows.map((row) => String(row[i] || '').length)
    )
    return { wch: Math.min(maxLength + 2, 50) }
  })
  worksheet['!cols'] = colWidths

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
}

// Enhanced Excel summary sheet creation
export const addSummaryDashboardToExcel = (
  workbook: XLSX.WorkBook,
  summaryData: { title: string; value: string | number }[],
  options: ExportOptions
): void => {
  const dashboardData = [
    ['VOI RENTAL MANAGEMENT', '', '', ''],
    [options.title, '', '', ''],
    [options.subtitle || '', '', '', ''],
    [''],
    [
      `Period: ${formatDate(options.dateRange.startDate)} - ${formatDate(options.dateRange.endDate)}`,
      '',
      '',
      '',
    ],
    [`Generated: ${new Date().toLocaleString()}`, '', '', ''],
    [''],
    ['KEY METRICS', '', '', ''],
    [''],
    ...summaryData.map((item) => [item.title, item.value, '', '']),
    [''],
    ['FILTERS', '', '', ''],
    ...(options.filters
      ? Object.entries(options.filters).map(([key, value]) => [key, value, '', ''])
      : []),
  ]

  const worksheet = XLSX.utils.aoa_to_sheet(dashboardData)

  // Style the header
  const headerCells = ['A1', 'A2', 'A3']
  headerCells.forEach((cell, index) => {
    if (worksheet[cell]) {
      worksheet[cell].s = {
        font: { bold: true, size: index === 0 ? 16 : index === 1 ? 14 : 12 },
        alignment: { horizontal: 'center' },
      }
    }
  })

  // Style section headers
  const sectionHeaders = ['A8', 'A13'] // KEY METRICS, FILTERS
  sectionHeaders.forEach((cell) => {
    if (worksheet[cell]) {
      worksheet[cell].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '3B82F6' } },
        alignment: { horizontal: 'center' },
      }
    }
  })

  // Set column widths
  worksheet['!cols'] = [
    { wch: 25 }, // Column A
    { wch: 20 }, // Column B
    { wch: 15 }, // Column C
    { wch: 15 }, // Column D
  ]

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Executive Summary')
}

export const saveExcelFile = (workbook: XLSX.WorkBook, filename: string): void => {
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  saveAs(blob, `${filename}.xlsx`)
}

export const savePDFFile = (doc: jsPDF, filename: string): void => {
  doc.save(`${filename}.pdf`)
}

// Generate filename with timestamp
export const generateFilename = (
  reportType: string,
  dateRange: { startDate: string; endDate: string }
): string => {
  const start = new Date(dateRange.startDate).toISOString().split('T')[0]
  const end = new Date(dateRange.endDate).toISOString().split('T')[0]
  const timestamp = new Date().toISOString().split('T')[0]
  return `${reportType}-${start}-to-${end}-${timestamp}`
}
