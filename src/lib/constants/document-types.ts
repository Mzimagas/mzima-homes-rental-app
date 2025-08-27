/**
 * Kenya Property Acquisition Document Types Configuration
 * Used by the new Direct Addition Documents system
 */

export const DOC_TYPES = [
  {
    key: 'title_copy',
    label: 'Copy of Sellers\' Title/Document',
    description: 'Original title deed or certified copy with title number',
    icon: '📜',
    accept: ['.pdf', '.jpg', '.jpeg', '.png'],
    multiple: false,
    required: true
  },
  {
    key: 'property_images',
    label: 'Property Images',
    description: 'Multiple photographs of the property (exterior, interior, boundaries)',
    icon: '📸',
    accept: ['.jpg', '.jpeg', '.png', '.heic'],
    multiple: true,
    required: true,
    capture: 'environment' // Enable camera capture for mobile
  },
  {
    key: 'search_certificate',
    label: 'Search Certificate',
    description: 'Official property search from the Ministry of Lands',
    icon: '🔍',
    accept: ['.pdf', '.jpg', '.jpeg', '.png'],
    multiple: false,
    required: true
  },
  {
    key: 'minutes_decision',
    label: 'Minutes/Decision to Buy',
    description: 'Meeting minutes or documentation showing decision-making process',
    icon: '📋',
    accept: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
    multiple: false,
    required: true
  },
  {
    key: 'sale_agreement',
    label: 'Agreement with Seller',
    description: 'Signed purchase agreement or sale contract with the property seller',
    icon: '🤝',
    accept: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
    multiple: false,
    required: true
  },
  {
    key: 'lcb_consent',
    label: 'LCB Consent',
    description: 'Land Control Board consent for the transaction',
    icon: '✅',
    accept: ['.pdf', '.jpg', '.jpeg', '.png'],
    multiple: false,
    required: true
  },
  {
    key: 'valuation_report',
    label: 'Valuation Report',
    description: 'Professional property valuation report',
    icon: '💰',
    accept: ['.pdf'],
    multiple: false,
    required: true
  },
  {
    key: 'assessment',
    label: 'Assessment',
    description: 'Property assessment documentation',
    icon: '📊',
    accept: ['.pdf', '.jpg', '.jpeg', '.png'],
    multiple: false,
    required: true
  },
  {
    key: 'stamp_duty',
    label: 'Stamp Duty Payment',
    description: 'Ardhi Sasa stamp duty payment receipts and confirmation',
    icon: '🧾',
    accept: ['.pdf', '.jpg', '.jpeg', '.png'],
    multiple: true,
    required: true
  },
  {
    key: 'registered_title',
    label: 'Registered Title',
    description: 'Final registered title deed after transfer completion',
    icon: '🏆',
    accept: ['.pdf', '.jpg', '.jpeg', '.png'],
    multiple: false,
    required: true
  }
] as const

export type DocType = typeof DOC_TYPES[number]
export type DocTypeKey = DocType['key']

// Document status types
export type DocumentStatus = 'missing' | 'partial' | 'complete'

// File size limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_FILES_PER_TYPE = 10 // Maximum files per document type

// Supported MIME types mapping
export const MIME_TYPE_MAP: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.heic': ['image/heic'],
  '.gif': ['image/gif']
}

// Get MIME types for a document type
export function getMimeTypesForDocType(docTypeKey: DocTypeKey): string[] {
  const docType = DOC_TYPES.find(dt => dt.key === docTypeKey)
  if (!docType) return []
  
  return docType.accept.flatMap(ext => MIME_TYPE_MAP[ext] || [])
}

// Validate file type for a document type
export function isValidFileType(file: File, docTypeKey: DocTypeKey): boolean {
  const allowedMimeTypes = getMimeTypesForDocType(docTypeKey)
  return allowedMimeTypes.includes(file.type)
}

// Get file extension from filename
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  return lastDot > 0 ? filename.substring(lastDot) : ''
}

// Generate unique filename
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 15)
  const extension = getFileExtension(originalName)
  return `${timestamp}_${randomString}${extension}`
}

// Get file icon based on MIME type
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType === 'application/pdf') return '📄'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  return '📎'
}
