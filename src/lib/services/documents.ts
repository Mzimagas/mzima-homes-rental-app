// Document Management Service
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Document types enum
export const DOCUMENT_TYPES = {
  TITLE: 'title',
  DEED_PLAN: 'deed_plan',
  MUTATION: 'mutation',
  EIA: 'eia',
  CONSENT: 'consent',
  AGREEMENT: 'agreement',
  RECEIPT: 'receipt',
  VALUATION: 'valuation',
  MAP: 'map',
  PHOTO: 'photo',
  SURVEY_REPORT: 'survey_report',
  CONTRACT: 'contract',
  INVOICE: 'invoice',
  CORRESPONDENCE: 'correspondence',
  LEGAL_OPINION: 'legal_opinion',
  COMPLIANCE_CERTIFICATE: 'compliance_certificate'
} as const

export type DocumentType = typeof DOCUMENT_TYPES[keyof typeof DOCUMENT_TYPES]

// Access levels
export const ACCESS_LEVELS = {
  PUBLIC: 'public',
  INTERNAL: 'internal',
  RESTRICTED: 'restricted'
} as const

export type AccessLevel = typeof ACCESS_LEVELS[keyof typeof ACCESS_LEVELS]

// Document schema
export const documentSchema = z.object({
  entity_type: z.string().min(1, 'Entity type is required'),
  entity_id: z.string().uuid('Invalid entity ID'),
  doc_type: z.nativeEnum(DOCUMENT_TYPES),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  file_url: z.string().url('Invalid file URL'),
  file_name: z.string().min(1, 'File name is required'),
  file_size_bytes: z.number().positive('File size must be positive'),
  mime_type: z.string().min(1, 'MIME type is required'),
  file_hash: z.string().optional(),
  version_no: z.number().positive().default(1),
  is_current_version: z.boolean().default(true),
  parent_document_id: z.string().uuid().optional(),
  access_level: z.nativeEnum(ACCESS_LEVELS).default(ACCESS_LEVELS.INTERNAL),
  expiry_date: z.string().optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional()
})

export type DocumentInput = z.infer<typeof documentSchema>

export interface Document extends DocumentInput {
  document_id: string
  uploaded_by: string
  uploaded_at: string
  downloaded_count: number
  last_downloaded_at?: string
  last_downloaded_by?: string
}

export interface DocumentSearchFilters {
  entity_type?: string
  entity_id?: string
  doc_type?: DocumentType
  access_level?: AccessLevel
  search?: string
  tags?: string[]
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}

export class DocumentService {
  // Upload document to Supabase Storage
  async uploadFile(
    file: File,
    bucket: string = 'documents',
    folder?: string
  ): Promise<{ url: string; path: string }> {
    try {
      // Generate unique file name
      const timestamp = Date.now()
      const randomString = Math.random().toString(36).substring(2, 15)
      const extension = file.name.split('.').pop()
      const fileName = `${timestamp}_${randomString}.${extension}`
      const filePath = folder ? `${folder}/${fileName}` : fileName

      // Upload file
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) throw error

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath)

      return {
        url: urlData.publicUrl,
        path: filePath
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      throw new Error('Failed to upload file')
    }
  }

  // Calculate file hash (SHA-256)
  async calculateFileHash(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      return hashHex
    } catch (error) {
      console.error('Error calculating file hash:', error)
      return ''
    }
  }

  // Create document record
  async createDocument(
    documentData: DocumentInput,
    userId: string
  ): Promise<Document> {
    try {
      const validatedData = documentSchema.parse(documentData)

      // Check if this is a new version of existing document
      if (validatedData.parent_document_id) {
        // Mark previous version as not current
        await supabase
          .from('documents')
          .update({ is_current_version: false })
          .eq('document_id', validatedData.parent_document_id)
      }

      const { data, error } = await supabase
        .from('documents')
        .insert({
          ...validatedData,
          uploaded_by: userId,
          uploaded_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      // Log document creation
      await this.logDocumentActivity(data.document_id, 'upload', userId, {
        document_title: data.title,
        file_name: data.file_name
      })

      return data
    } catch (error) {
      console.error('Error creating document:', error)
      throw new Error('Failed to create document record')
    }
  }

  // Get documents with filtering
  async getDocuments(filters: DocumentSearchFilters = {}): Promise<Document[]> {
    try {
      let query = supabase
        .from('documents')
        .select('*')
        .eq('is_current_version', true)
        .order('uploaded_at', { ascending: false })

      if (filters.entity_type) {
        query = query.eq('entity_type', filters.entity_type)
      }
      if (filters.entity_id) {
        query = query.eq('entity_id', filters.entity_id)
      }
      if (filters.doc_type) {
        query = query.eq('doc_type', filters.doc_type)
      }
      if (filters.access_level) {
        query = query.eq('access_level', filters.access_level)
      }
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,file_name.ilike.%${filters.search}%`)
      }
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags)
      }
      if (filters.date_from) {
        query = query.gte('uploaded_at', filters.date_from)
      }
      if (filters.date_to) {
        query = query.lte('uploaded_at', filters.date_to)
      }
      if (filters.limit) {
        query = query.limit(filters.limit)
      }
      if (filters.offset) {
        query = query.range(filters.offset, (filters.offset + (filters.limit || 10)) - 1)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting documents:', error)
      throw new Error('Failed to retrieve documents')
    }
  }

  // Get document by ID
  async getDocumentById(documentId: string): Promise<Document | null> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('document_id', documentId)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting document:', error)
      return null
    }
  }

  // Update document
  async updateDocument(
    documentId: string,
    updates: Partial<DocumentInput>,
    userId: string
  ): Promise<Document> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .update(updates)
        .eq('document_id', documentId)
        .select()
        .single()

      if (error) throw error

      // Log document update
      await this.logDocumentActivity(documentId, 'update', userId, {
        updates: Object.keys(updates)
      })

      return data
    } catch (error) {
      console.error('Error updating document:', error)
      throw new Error('Failed to update document')
    }
  }

  // Delete document
  async deleteDocument(documentId: string, userId: string): Promise<void> {
    try {
      // Get document info for logging
      const document = await this.getDocumentById(documentId)
      
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('document_id', documentId)

      if (error) throw error

      // Log document deletion
      if (document) {
        await this.logDocumentActivity(documentId, 'delete', userId, {
          document_title: document.title,
          file_name: document.file_name
        })
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      throw new Error('Failed to delete document')
    }
  }

  // Track document download
  async trackDownload(documentId: string, userId: string): Promise<void> {
    try {
      // Update download count and last download info
      await supabase
        .from('documents')
        .update({
          downloaded_count: supabase.rpc('increment_download_count', { doc_id: documentId }),
          last_downloaded_at: new Date().toISOString(),
          last_downloaded_by: userId
        })
        .eq('document_id', documentId)

      // Log download activity
      await this.logDocumentActivity(documentId, 'download', userId)
    } catch (error) {
      console.error('Error tracking download:', error)
    }
  }

  // Get document versions
  async getDocumentVersions(parentDocumentId: string): Promise<Document[]> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .or(`document_id.eq.${parentDocumentId},parent_document_id.eq.${parentDocumentId}`)
        .order('version_no', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting document versions:', error)
      return []
    }
  }

  // Create new document version
  async createNewVersion(
    parentDocumentId: string,
    file: File,
    updates: Partial<DocumentInput>,
    userId: string
  ): Promise<Document> {
    try {
      // Get parent document
      const parentDoc = await this.getDocumentById(parentDocumentId)
      if (!parentDoc) {
        throw new Error('Parent document not found')
      }

      // Upload new file
      const { url, path } = await this.uploadFile(
        file,
        'documents',
        `${parentDoc.entity_type}/${parentDoc.entity_id}`
      )

      // Calculate file hash
      const fileHash = await this.calculateFileHash(file)

      // Create new version
      const newVersion = await this.createDocument({
        ...parentDoc,
        ...updates,
        file_url: url,
        file_name: file.name,
        file_size_bytes: file.size,
        mime_type: file.type,
        file_hash: fileHash,
        version_no: parentDoc.version_no + 1,
        parent_document_id: parentDocumentId,
        is_current_version: true
      }, userId)

      return newVersion
    } catch (error) {
      console.error('Error creating document version:', error)
      throw new Error('Failed to create document version')
    }
  }

  // Check document access permissions
  async checkAccess(documentId: string, userId: string, userRole: string): Promise<boolean> {
    try {
      const document = await this.getDocumentById(documentId)
      if (!document) return false

      switch (document.access_level) {
        case ACCESS_LEVELS.PUBLIC:
          return true
        case ACCESS_LEVELS.INTERNAL:
          return ['admin', 'staff', 'agent'].includes(userRole)
        case ACCESS_LEVELS.RESTRICTED:
          return userRole === 'admin'
        default:
          return false
      }
    } catch (error) {
      console.error('Error checking document access:', error)
      return false
    }
  }

  // Get documents by entity
  async getDocumentsByEntity(entityType: string, entityId: string): Promise<Document[]> {
    return this.getDocuments({
      entity_type: entityType,
      entity_id: entityId
    })
  }

  // Get documents by type
  async getDocumentsByType(docType: DocumentType, entityId?: string): Promise<Document[]> {
    return this.getDocuments({
      doc_type: docType,
      entity_id: entityId
    })
  }

  // Search documents
  async searchDocuments(searchTerm: string, filters: Partial<DocumentSearchFilters> = {}): Promise<Document[]> {
    return this.getDocuments({
      ...filters,
      search: searchTerm
    })
  }

  // Get document statistics
  async getDocumentStats(): Promise<{
    total_documents: number
    by_type: Record<string, number>
    by_access_level: Record<string, number>
    total_size_bytes: number
    recent_uploads: number
  }> {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('doc_type, access_level, file_size_bytes, uploaded_at')
        .eq('is_current_version', true)

      if (error) throw error

      const stats = {
        total_documents: data.length,
        by_type: {} as Record<string, number>,
        by_access_level: {} as Record<string, number>,
        total_size_bytes: 0,
        recent_uploads: 0
      }

      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      data.forEach(doc => {
        // Count by type
        stats.by_type[doc.doc_type] = (stats.by_type[doc.doc_type] || 0) + 1
        
        // Count by access level
        stats.by_access_level[doc.access_level] = (stats.by_access_level[doc.access_level] || 0) + 1
        
        // Sum file sizes
        stats.total_size_bytes += doc.file_size_bytes || 0
        
        // Count recent uploads
        if (new Date(doc.uploaded_at) > oneWeekAgo) {
          stats.recent_uploads++
        }
      })

      return stats
    } catch (error) {
      console.error('Error getting document stats:', error)
      throw new Error('Failed to get document statistics')
    }
  }

  // Log document activity
  private async logDocumentActivity(
    documentId: string,
    action: string,
    userId: string,
    metadata?: any
  ): Promise<void> {
    try {
      await supabase
        .from('activities_audit')
        .insert({
          actor_id: userId,
          entity_type: 'document',
          entity_id: documentId,
          action: action,
          description: `Document ${action}`,
          after_snapshot: metadata
        })
    } catch (error) {
      console.error('Error logging document activity:', error)
    }
  }
}

// Export singleton instance
export const documentService = new DocumentService()

// Utility functions
export const documentUtils = {
  // Format file size
  formatFileSize: (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  },

  // Get file extension
  getFileExtension: (fileName: string): string => {
    return fileName.split('.').pop()?.toLowerCase() || ''
  },

  // Check if file is image
  isImageFile: (mimeType: string): boolean => {
    return mimeType.startsWith('image/')
  },

  // Check if file is PDF
  isPdfFile: (mimeType: string): boolean => {
    return mimeType === 'application/pdf'
  },

  // Get document type display name
  getDocumentTypeDisplayName: (docType: DocumentType): string => {
    const displayNames: Record<DocumentType, string> = {
      [DOCUMENT_TYPES.TITLE]: 'Title Deed',
      [DOCUMENT_TYPES.DEED_PLAN]: 'Deed Plan',
      [DOCUMENT_TYPES.MUTATION]: 'Mutation',
      [DOCUMENT_TYPES.EIA]: 'Environmental Impact Assessment',
      [DOCUMENT_TYPES.CONSENT]: 'Consent',
      [DOCUMENT_TYPES.AGREEMENT]: 'Agreement',
      [DOCUMENT_TYPES.RECEIPT]: 'Receipt',
      [DOCUMENT_TYPES.VALUATION]: 'Valuation Report',
      [DOCUMENT_TYPES.MAP]: 'Map',
      [DOCUMENT_TYPES.PHOTO]: 'Photo',
      [DOCUMENT_TYPES.SURVEY_REPORT]: 'Survey Report',
      [DOCUMENT_TYPES.CONTRACT]: 'Contract',
      [DOCUMENT_TYPES.INVOICE]: 'Invoice',
      [DOCUMENT_TYPES.CORRESPONDENCE]: 'Correspondence',
      [DOCUMENT_TYPES.LEGAL_OPINION]: 'Legal Opinion',
      [DOCUMENT_TYPES.COMPLIANCE_CERTIFICATE]: 'Compliance Certificate'
    }
    return displayNames[docType] || docType
  }
}
