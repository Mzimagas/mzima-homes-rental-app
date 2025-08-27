'use client'

import { useState } from 'react'
import supabase from '../../lib/supabase-client'

interface UploadDebuggerProps {
  propertyId: string
}

export default function UploadDebugger({ propertyId }: UploadDebuggerProps) {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [testing, setTesting] = useState(false)

  const runDebugTests = async () => {
    setTesting(true)
    const info: any = {
      timestamp: new Date().toISOString(),
      propertyId,
      tests: {}
    }

    try {
      // Test 1: Check authentication
      console.log('🔍 Debug Test 1: Authentication')
      const { data: userData, error: userError } = await supabase.auth.getUser()
      info.tests.auth = {
        success: !userError,
        user: userData?.user ? { id: userData.user.id, email: userData.user.email } : null,
        error: userError?.message || null
      }

      // Test 2: Check storage bucket access
      console.log('🔍 Debug Test 2: Storage Bucket Access')
      try {
        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
        info.tests.storage = {
          success: !bucketError,
          bucketsFound: buckets?.length || 0,
          documentsExists: buckets?.some(b => b.id === 'documents') || false,
          error: bucketError?.message || null
        }
      } catch (err) {
        info.tests.storage = {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown storage error'
        }
      }

      // Test 3: Check database access
      console.log('🔍 Debug Test 3: Database Access')
      try {
        const { data: docs, error: dbError } = await supabase
          .from('documents')
          .select('id, title, entity_type, entity_id')
          .eq('entity_type', 'property')
          .eq('entity_id', propertyId)
          .limit(1)

        info.tests.database = {
          success: !dbError,
          documentsFound: docs?.length || 0,
          error: dbError?.message || null
        }
      } catch (err) {
        info.tests.database = {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown database error'
        }
      }

      // Test 4: Test file upload simulation
      console.log('🔍 Debug Test 4: File Upload Simulation')
      try {
        // Create a small test file
        const testContent = 'Test file for debugging upload issues'
        const testFile = new File([testContent], 'debug-test.txt', { type: 'text/plain' })
        const testPath = `debug/${propertyId}/test-${Date.now()}.txt`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(testPath, testFile, {
            cacheControl: '3600',
            upsert: false,
          })

        info.tests.upload = {
          success: !uploadError,
          uploadData: uploadData,
          error: uploadError?.message || null
        }

        // Clean up test file
        if (!uploadError) {
          await supabase.storage.from('documents').remove([testPath])
        }
      } catch (err) {
        info.tests.upload = {
          success: false,
          error: err instanceof Error ? err.message : 'Unknown upload error'
        }
      }

      // Test 5: Check document types enum
      console.log('🔍 Debug Test 5: Document Types')
      try {
        const { data: enumData, error: enumError } = await supabase.rpc('get_enum_values', {
          enum_name: 'document_type'
        })

        info.tests.documentTypes = {
          success: !enumError,
          availableTypes: enumData || [],
          error: enumError?.message || null
        }
      } catch (err) {
        // This might fail if the function doesn't exist, which is okay
        info.tests.documentTypes = {
          success: false,
          error: 'Could not check document types (function may not exist)'
        }
      }

    } catch (error) {
      info.generalError = error instanceof Error ? error.message : 'Unknown error'
    }

    setDebugInfo(info)
    setTesting(false)
  }

  if (!debugInfo && !testing) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <h3 className="text-lg font-medium text-yellow-800 mb-2">Upload Debug Tool</h3>
        <p className="text-sm text-yellow-700 mb-3">
          If you're experiencing upload issues, run this debug test to identify the problem.
        </p>
        <button
          onClick={runDebugTests}
          className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700"
        >
          Run Debug Tests
        </button>
      </div>
    )
  }

  if (testing) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-blue-800">Running debug tests...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-800">Debug Results</h3>
        <button
          onClick={runDebugTests}
          className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
        >
          Refresh
        </button>
      </div>
      
      <div className="space-y-3 text-sm">
        {Object.entries(debugInfo.tests).map(([testName, result]: [string, any]) => (
          <div key={testName} className="flex justify-between items-start">
            <span className="font-medium capitalize">{testName.replace(/([A-Z])/g, ' $1')}:</span>
            <div className="text-right">
              <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                {result.success ? '✅ Pass' : '❌ Fail'}
              </span>
              {result.error && (
                <div className="text-xs text-red-600 mt-1 max-w-xs">
                  {result.error}
                </div>
              )}
              {result.success && result.documentsFound !== undefined && (
                <div className="text-xs text-gray-600">
                  {result.documentsFound} documents found
                </div>
              )}
              {result.success && result.bucketsFound !== undefined && (
                <div className="text-xs text-gray-600">
                  {result.bucketsFound} buckets, docs: {result.documentsExists ? 'yes' : 'no'}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {debugInfo.generalError && (
          <div className="bg-red-50 border border-red-200 rounded p-2 mt-2">
            <span className="font-medium text-red-800">General Error:</span>
            <span className="text-red-600 ml-2">{debugInfo.generalError}</span>
          </div>
        )}
        
        <div className="mt-4 p-2 bg-white border rounded text-xs">
          <details>
            <summary className="cursor-pointer font-medium">Raw Debug Data</summary>
            <pre className="mt-2 text-gray-600 overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  )
}
