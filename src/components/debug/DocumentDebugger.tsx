'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../lib/auth-context'
import supabase from '../../lib/supabase-client'

interface DocumentDebuggerProps {
  propertyId?: string
}

interface DebugInfo {
  isAuthenticated: boolean
  userId: string | null
  userEmail: string | null
  documentsFound: number
  documentsData: any[]
  storageTest: string
  error: string | null
}

export default function DocumentDebugger({ propertyId }: DocumentDebuggerProps) {
  const { user, session } = useAuth()
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [loading, setLoading] = useState(false)

  const runDebugTest = async () => {
    setLoading(true)
    const info: DebugInfo = {
      isAuthenticated: !!user,
      userId: user?.id || null,
      userEmail: user?.email || null,
      documentsFound: 0,
      documentsData: [],
      storageTest: 'Not tested',
      error: null
    }

    try {
                                          const testPropertyId = propertyId || '345cf10e-22a6-43c7-8ecc-859238a11fd6'
      
      const { data: documents, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('entity_type', 'property')
        .eq('entity_id', testPropertyId)
        .eq('is_current_version', true)
        .order('uploaded_at', { ascending: false })

      if (docError) {
        info.error = `Document query error: ${docError.message}`
              } else {
        info.documentsFound = documents.length
        info.documentsData = documents
              }

                  if (documents && documents.length > 0) {
        const testDoc = documents[0]
        try {
          const { data: urlData, error: urlError } = await supabase.storage
            .from('documents')
            .createSignedUrl(testDoc.file_url, 60)

          if (urlError) {
            info.storageTest = `Storage error: ${urlError.message}`
          } else {
            info.storageTest = 'Storage access successful'
                      }
        } catch (err) {
          info.storageTest = `Storage exception: ${err}`
        }
      } else {
        info.storageTest = 'No documents to test storage with'
      }

    } catch (error) {
      info.error = `General error: ${error}`
          }

    setDebugInfo(info)
    setLoading(false)
  }

  useEffect(() => {
    if (user) {
      runDebugTest()
    }
  }, [user, propertyId])

  if (!debugInfo && !loading) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-4">
        <h3 className="text-lg font-medium text-yellow-800 mb-2">Document Debug Tool</h3>
        <button
          onClick={runDebugTest}
          className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
        >
          Run Debug Test
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 m-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-blue-800">Running document debug tests...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 m-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-800">Document Debug Results</h3>
        <button
          onClick={runDebugTest}
          className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
        >
          Refresh
        </button>
      </div>
      
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="font-medium">Authentication:</span>
          <span className={debugInfo?.isAuthenticated ? 'text-green-600' : 'text-red-600'}>
            {debugInfo?.isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
          </span>
        </div>
        
        {debugInfo?.isAuthenticated && (
          <>
            <div className="flex justify-between">
              <span className="font-medium">User ID:</span>
              <span className="text-gray-600 font-mono text-xs">{debugInfo?.userId}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-medium">Email:</span>
              <span className="text-gray-600">{debugInfo?.userEmail}</span>
            </div>
          </>
        )}
        
        <div className="flex justify-between">
          <span className="font-medium">Documents Found:</span>
          <span className={debugInfo?.documentsFound && debugInfo.documentsFound > 0 ? 'text-green-600' : 'text-orange-600'}>
            {debugInfo?.documentsFound || 0} documents
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="font-medium">Storage Access:</span>
          <span className={debugInfo?.storageTest?.includes('successful') ? 'text-green-600' : 'text-orange-600'}>
            {debugInfo?.storageTest || 'Unknown'}
          </span>
        </div>
        
        {debugInfo?.error && (
          <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
            <span className="font-medium text-red-800">Error:</span>
            <span className="text-red-600 ml-2">{debugInfo?.error}</span>
          </div>
        )}
        
        {debugInfo?.documentsData && debugInfo.documentsData.length > 0 && (
          <div className="mt-4">
            <span className="font-medium">Document Details:</span>
            <div className="bg-white border rounded p-2 mt-1 max-h-32 overflow-y-auto">
              <pre className="text-xs text-gray-600">
                {JSON.stringify(debugInfo?.documentsData || [], null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
