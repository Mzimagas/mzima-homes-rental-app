/**
 * Purchase Pipeline Document Types Configuration
 * Maps STAGE_DOCUMENT_REQUIREMENTS to expandable card format
 */

import { DOCUMENT_TYPES } from '../services/documents'

export interface PurchasePipelineDocType {
  key: string
  label: string
  description: string
  icon: string
  accept: string[]
  multiple: boolean
  required: boolean
  capture?: 'environment' | 'user'
  stage: number
  category: 'required' | 'optional'
}

// Document type mapping from database enum to UI configuration
export const DOC_TYPE_CONFIG: Record<string, { icon: string; accept: string[]; multiple: boolean; capture?: 'environment' | 'user' }> = {
  [DOCUMENT_TYPES.TITLE]: {
    icon: '📜',
    accept: ['.pdf', '.jpg', '.jpeg', '.png'],
    multiple: false
  },
  [DOCUMENT_TYPES.DEED_PLAN]: {
    icon: '🗺️',
    accept: ['.pdf', '.jpg', '.jpeg', '.png'],
    multiple: false
  },
  [DOCUMENT_TYPES.SURVEY_REPORT]: {
    icon: '📏',
    accept: ['.pdf', '.doc', '.docx'],
    multiple: false
  },
  [DOCUMENT_TYPES.PHOTO]: {
    icon: '📸',
    accept: ['.jpg', '.jpeg', '.png', '.heic'],
    multiple: true,
    capture: 'environment'
  },
  [DOCUMENT_TYPES.AGREEMENT]: {
    icon: '🤝',
    accept: ['.pdf', '.doc', '.docx'],
    multiple: false
  },
  [DOCUMENT_TYPES.CONTRACT]: {
    icon: '📋',
    accept: ['.pdf', '.doc', '.docx'],
    multiple: false
  },
  [DOCUMENT_TYPES.VALUATION]: {
    icon: '💰',
    accept: ['.pdf', '.doc', '.docx'],
    multiple: false
  },
  [DOCUMENT_TYPES.RECEIPT]: {
    icon: '🧾',
    accept: ['.pdf', '.jpg', '.jpeg', '.png'],
    multiple: true
  },
  [DOCUMENT_TYPES.CORRESPONDENCE]: {
    icon: '📧',
    accept: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
    multiple: true
  },
  [DOCUMENT_TYPES.LEGAL_OPINION]: {
    icon: '⚖️',
    accept: ['.pdf', '.doc', '.docx'],
    multiple: false
  },
  [DOCUMENT_TYPES.MAP]: {
    icon: '🗺️',
    accept: ['.pdf', '.jpg', '.jpeg', '.png'],
    multiple: false
  },
  [DOCUMENT_TYPES.INVOICE]: {
    icon: '📄',
    accept: ['.pdf', '.jpg', '.jpeg', '.png'],
    multiple: true
  },
  [DOCUMENT_TYPES.COMPLIANCE_CERTIFICATE]: {
    icon: '✅',
    accept: ['.pdf', '.jpg', '.jpeg', '.png'],
    multiple: false
  },
  // Generic fallback for 'other' and unmapped types
  'other': {
    icon: '📎',
    accept: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
    multiple: true
  },
  'legal': {
    icon: '⚖️',
    accept: ['.pdf', '.doc', '.docx'],
    multiple: false
  }
}

// Stage-specific document configurations
export const PURCHASE_PIPELINE_DOC_TYPES: Record<number, PurchasePipelineDocType[]> = {
  1: [ // Initial Search & Evaluation
    {
      key: 'photo_property',
      label: 'Property Photos',
      description: 'Current photos of the property',
      icon: '📸',
      accept: ['.jpg', '.jpeg', '.png', '.heic'],
      multiple: true,
      required: true,
      capture: 'environment',
      stage: 1,
      category: 'required'
    },
    {
      key: 'other_location_map',
      label: 'Location Map',
      description: 'Property location and access map',
      icon: '🗺️',
      accept: ['.pdf', '.jpg', '.jpeg', '.png'],
      multiple: false,
      required: true,
      stage: 1,
      category: 'required'
    },
    {
      key: 'other_property_details',
      label: 'Property Details',
      description: 'Property specifications and features',
      icon: '📋',
      accept: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
      multiple: false,
      required: true,
      stage: 1,
      category: 'required'
    },
    {
      key: 'other_initial_valuation',
      label: 'Initial Valuation',
      description: 'Preliminary property valuation',
      icon: '💰',
      accept: ['.pdf', '.doc', '.docx'],
      multiple: false,
      required: false,
      stage: 1,
      category: 'optional'
    },
    {
      key: 'correspondence_seller',
      label: 'Seller Communication',
      description: 'Communication with property seller',
      icon: '📧',
      accept: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
      multiple: true,
      required: false,
      stage: 1,
      category: 'optional'
    }
  ],
  2: [ // Survey & Mapping
    {
      key: 'survey_report',
      label: 'Survey Report',
      description: 'Professional land survey report',
      icon: '📏',
      accept: ['.pdf', '.doc', '.docx'],
      multiple: false,
      required: true,
      stage: 2,
      category: 'required'
    },
    {
      key: 'deed_plan_survey',
      label: 'Survey Map',
      description: 'Detailed survey map with beacons',
      icon: '🗺️',
      accept: ['.pdf', '.jpg', '.jpeg', '.png'],
      multiple: false,
      required: true,
      stage: 2,
      category: 'required'
    },
    {
      key: 'deed_plan_official',
      label: 'Deed Plan',
      description: 'Official deed plan if available',
      icon: '📜',
      accept: ['.pdf', '.jpg', '.jpeg', '.png'],
      multiple: false,
      required: true,
      stage: 2,
      category: 'required'
    },
    {
      key: 'photo_beacons',
      label: 'Beacon Photos',
      description: 'Photos of placed survey beacons',
      icon: '📸',
      accept: ['.jpg', '.jpeg', '.png', '.heic'],
      multiple: true,
      required: false,
      capture: 'environment',
      stage: 2,
      category: 'optional'
    },
    {
      key: 'other_site_visit',
      label: 'Site Visit Report',
      description: 'Detailed site inspection report',
      icon: '📋',
      accept: ['.pdf', '.doc', '.docx'],
      multiple: false,
      required: false,
      stage: 2,
      category: 'optional'
    }
  ],
  3: [ // Legal Verification
    {
      key: 'title',
      label: 'Title Deed',
      description: 'Original or certified copy of title deed',
      icon: '📜',
      accept: ['.pdf', '.jpg', '.jpeg', '.png'],
      multiple: false,
      required: true,
      stage: 3,
      category: 'required'
    },
    {
      key: 'legal_witness',
      label: 'Witness Statements',
      description: 'Verified witness statements',
      icon: '⚖️',
      accept: ['.pdf', '.doc', '.docx'],
      multiple: true,
      required: true,
      stage: 3,
      category: 'required'
    },
    {
      key: 'legal_opinion',
      label: 'Legal Opinion',
      description: 'Lawyer\'s legal opinion on the property',
      icon: '⚖️',
      accept: ['.pdf', '.doc', '.docx'],
      multiple: false,
      required: true,
      stage: 3,
      category: 'required'
    },
    {
      key: 'other_meeting_minutes',
      label: 'Meeting Minutes',
      description: 'Stakeholder meeting documentation',
      icon: '📋',
      accept: ['.pdf', '.doc', '.docx'],
      multiple: true,
      required: false,
      stage: 3,
      category: 'optional'
    },
    {
      key: 'correspondence_legal',
      label: 'Legal Correspondence',
      description: 'Legal communication records',
      icon: '📧',
      accept: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
      multiple: true,
      required: false,
      stage: 3,
      category: 'optional'
    }
  ],
  4: [ // Agreement & Documentation
    {
      key: 'agreement',
      label: 'Purchase Agreement',
      description: 'Signed purchase agreement',
      icon: '🤝',
      accept: ['.pdf', '.doc', '.docx'],
      multiple: false,
      required: true,
      stage: 4,
      category: 'required'
    },
    {
      key: 'legal_contract',
      label: 'Sale Contract',
      description: 'Legal sale contract',
      icon: '📋',
      accept: ['.pdf', '.doc', '.docx'],
      multiple: false,
      required: true,
      stage: 4,
      category: 'required'
    },
    {
      key: 'other_amendments',
      label: 'Contract Amendments',
      description: 'Any amendments to the original contract',
      icon: '📝',
      accept: ['.pdf', '.doc', '.docx'],
      multiple: true,
      required: false,
      stage: 4,
      category: 'optional'
    },
    {
      key: 'legal_review',
      label: 'Contract Review',
      description: 'Legal review of contract terms',
      icon: '⚖️',
      accept: ['.pdf', '.doc', '.docx'],
      multiple: false,
      required: false,
      stage: 4,
      category: 'optional'
    }
  ],
  5: [ // Valuation & Financial Assessment
    {
      key: 'valuation',
      label: 'Professional Valuation',
      description: 'Certified property valuation report',
      icon: '💰',
      accept: ['.pdf', '.doc', '.docx'],
      multiple: false,
      required: true,
      stage: 5,
      category: 'required'
    },
    {
      key: 'other_financial_analysis',
      label: 'Financial Analysis',
      description: 'Investment analysis and projections',
      icon: '📊',
      accept: ['.pdf', '.doc', '.docx', '.xlsx'],
      multiple: false,
      required: true,
      stage: 5,
      category: 'required'
    },
    {
      key: 'other_market_comparison',
      label: 'Market Comparison',
      description: 'Comparative market analysis',
      icon: '📈',
      accept: ['.pdf', '.doc', '.docx'],
      multiple: false,
      required: false,
      stage: 5,
      category: 'optional'
    }
  ],
  6: [ // Payment & Financial Arrangements
    {
      key: 'receipt_deposit',
      label: 'Deposit Receipt',
      description: 'Receipt for initial deposit payment',
      icon: '🧾',
      accept: ['.pdf', '.jpg', '.jpeg', '.png'],
      multiple: false,
      required: true,
      stage: 6,
      category: 'required'
    },
    {
      key: 'other_payment_schedule',
      label: 'Payment Schedule',
      description: 'Agreed payment plan and schedule',
      icon: '📅',
      accept: ['.pdf', '.doc', '.docx'],
      multiple: false,
      required: true,
      stage: 6,
      category: 'required'
    },
    {
      key: 'receipt_additional',
      label: 'Additional Payments',
      description: 'Receipts for subsequent payments',
      icon: '🧾',
      accept: ['.pdf', '.jpg', '.jpeg', '.png'],
      multiple: true,
      required: false,
      stage: 6,
      category: 'optional'
    }
  ],
  7: [ // Final Documentation & Registration
    {
      key: 'other_transfer_documents',
      label: 'Transfer Documents',
      description: 'Property transfer documentation',
      icon: '📋',
      accept: ['.pdf', '.doc', '.docx'],
      multiple: true,
      required: true,
      stage: 7,
      category: 'required'
    },
    {
      key: 'receipt_final',
      label: 'Final Payment Receipt',
      description: 'Receipt for final payment',
      icon: '🧾',
      accept: ['.pdf', '.jpg', '.jpeg', '.png'],
      multiple: false,
      required: true,
      stage: 7,
      category: 'required'
    },
    {
      key: 'other_registration',
      label: 'Registration Documents',
      description: 'Property registration paperwork',
      icon: '📜',
      accept: ['.pdf', '.jpg', '.jpeg', '.png'],
      multiple: true,
      required: false,
      stage: 7,
      category: 'optional'
    }
  ],
  8: [ // Property Transfer & Handover
    {
      key: 'other_handover_certificate',
      label: 'Handover Certificate',
      description: 'Official property handover certificate',
      icon: '🏆',
      accept: ['.pdf', '.jpg', '.jpeg', '.png'],
      multiple: false,
      required: true,
      stage: 8,
      category: 'required'
    },
    {
      key: 'other_keys_receipt',
      label: 'Keys Receipt',
      description: 'Receipt for property keys',
      icon: '🔑',
      accept: ['.pdf', '.jpg', '.jpeg', '.png'],
      multiple: false,
      required: true,
      stage: 8,
      category: 'required'
    },
    {
      key: 'photo_handover',
      label: 'Handover Photos',
      description: 'Photos taken during handover',
      icon: '📸',
      accept: ['.jpg', '.jpeg', '.png', '.heic'],
      multiple: true,
      required: false,
      capture: 'environment',
      stage: 8,
      category: 'optional'
    },
    {
      key: 'other_condition_report',
      label: 'Condition Report',
      description: 'Final property condition report',
      icon: '📋',
      accept: ['.pdf', '.doc', '.docx'],
      multiple: false,
      required: false,
      stage: 8,
      category: 'optional'
    }
  ]
}

// File size limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_FILES_PER_TYPE = 10 // Maximum files per document type

// Supported MIME types mapping
export const MIME_TYPE_MAP: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.heic': ['image/heic'],
  '.gif': ['image/gif']
}

// Get MIME types for a document type
export function getMimeTypesForDocType(docTypeKey: string): string[] {
  const docType = getAllDocTypesForStage(1).find(dt => dt.key === docTypeKey) ||
                  getAllDocTypesForStage(2).find(dt => dt.key === docTypeKey) ||
                  getAllDocTypesForStage(3).find(dt => dt.key === docTypeKey) ||
                  getAllDocTypesForStage(4).find(dt => dt.key === docTypeKey) ||
                  getAllDocTypesForStage(5).find(dt => dt.key === docTypeKey) ||
                  getAllDocTypesForStage(6).find(dt => dt.key === docTypeKey) ||
                  getAllDocTypesForStage(7).find(dt => dt.key === docTypeKey) ||
                  getAllDocTypesForStage(8).find(dt => dt.key === docTypeKey)
  
  if (!docType) return []
  
  return docType.accept.flatMap(ext => MIME_TYPE_MAP[ext] || [])
}

// Validate file type for a document type
export function isValidFileType(file: File, docTypeKey: string): boolean {
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
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊'
  return '📎'
}

// Helper function to get all document types for a stage
export function getAllDocTypesForStage(stageId: number): PurchasePipelineDocType[] {
  return PURCHASE_PIPELINE_DOC_TYPES[stageId] || []
}

// Helper function to get required document types for a stage
export function getRequiredDocTypesForStage(stageId: number): PurchasePipelineDocType[] {
  return getAllDocTypesForStage(stageId).filter(doc => doc.required)
}

// Helper function to get optional document types for a stage
export function getOptionalDocTypesForStage(stageId: number): PurchasePipelineDocType[] {
  return getAllDocTypesForStage(stageId).filter(doc => !doc.required)
}
