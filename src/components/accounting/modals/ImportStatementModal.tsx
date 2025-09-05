'use client'

import React, { useState, useEffect } from 'react'
import {
  XMarkIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { BankReconciliationService } from '../../../lib/services/bank-reconciliation.service'

interface ImportStatementModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface BankAccount {
  id: string
  account_name: string
  bank_name: string
}

interface ImportedTransaction {
  date: string
  description: string
  amount: number
  type: 'CREDIT' | 'DEBIT'
  reference: string
  balance?: number
}

interface ValidationError {
  row: number
  field: string
  message: string
}

export default function ImportStatementModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportStatementModalProps) {
  const [loading, setLoading] = useState(false)
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])
  const [selectedAccount, setSelectedAccount] = useState('')
  const [importFormat, setImportFormat] = useState<'CSV' | 'EXCEL' | 'MPESA'>('CSV')
  const [file, setFile] = useState<File | null>(null)
  const [importedData, setImportedData] = useState<ImportedTransaction[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [importStep, setImportStep] = useState<'UPLOAD' | 'PREVIEW' | 'COMPLETE'>('UPLOAD')
  const [duplicateHandling, setDuplicateHandling] = useState<'SKIP' | 'UPDATE' | 'CREATE'>('SKIP')

  useEffect(() => {
    if (isOpen) {
      loadBankAccounts()
      resetImport()
    }
  }, [isOpen])

  const loadBankAccounts = async () => {
    try {
      const accounts = await BankReconciliationService.getBankAccounts()
      setBankAccounts(accounts)
      if (accounts.length > 0) {
        setSelectedAccount(accounts[0].id)
      }
    } catch (error) {
      console.error('Error loading bank accounts:', error)
    }
  }

  const resetImport = () => {
    setFile(null)
    setImportedData([])
    setValidationErrors([])
    setImportStep('UPLOAD')
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0]
    if (uploadedFile) {
      setFile(uploadedFile)
    }
  }

  const processFile = async () => {
    if (!file || !selectedAccount) {
      alert('Please select a bank account and upload a file')
      return
    }

    setLoading(true)
    try {
      const fileContent = await readFileContent(file)
      const parsedData = parseFileContent(fileContent, importFormat)
      const validationResult = validateImportData(parsedData)

      setImportedData(validationResult.validData)
      setValidationErrors(validationResult.errors)
      setImportStep('PREVIEW')
    } catch (error) {
      console.error('Error processing file:', error)
      alert('Failed to process file. Please check the format and try again.')
    } finally {
      setLoading(false)
    }
  }

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = (e) => reject(e)
      reader.readAsText(file)
    })
  }

  const parseFileContent = (content: string, format: string): ImportedTransaction[] => {
    // This is a simplified parser - in a real implementation, you'd handle different formats properly
    const lines = content.split('\n').filter((line) => line.trim())
    const data: ImportedTransaction[] = []

    if (format === 'CSV') {
      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(',').map((col) => col.trim().replace(/"/g, ''))
        if (columns.length >= 4) {
          data.push({
            date: columns[0],
            description: columns[1],
            amount: parseFloat(columns[2]) || 0,
            type: parseFloat(columns[2]) >= 0 ? 'CREDIT' : 'DEBIT',
            reference: columns[3] || `REF-${i}`,
            balance: columns[4] ? parseFloat(columns[4]) : undefined,
          })
        }
      }
    } else if (format === 'MPESA') {
      // M-PESA specific parsing logic
      for (let i = 1; i < lines.length; i++) {
        const columns = lines[i].split(',').map((col) => col.trim().replace(/"/g, ''))
        if (columns.length >= 6) {
          data.push({
            date: columns[1], // Completion Time
            description: columns[2], // Details
            amount: parseFloat(columns[4]) || 0, // Paid In or Withdrawn
            type: parseFloat(columns[4]) >= 0 ? 'CREDIT' : 'DEBIT',
            reference: columns[0], // Receipt No.
            balance: parseFloat(columns[5]) || 0, // Balance
          })
        }
      }
    }

    return data
  }

  const validateImportData = (data: ImportedTransaction[]) => {
    const errors: ValidationError[] = []
    const validData: ImportedTransaction[] = []

    data.forEach((transaction, index) => {
      const rowNumber = index + 1
      let isValid = true

      // Validate date
      if (!transaction.date || isNaN(Date.parse(transaction.date))) {
        errors.push({
          row: rowNumber,
          field: 'date',
          message: 'Invalid or missing date',
        })
        isValid = false
      }

      // Validate amount
      if (!transaction.amount || transaction.amount === 0) {
        errors.push({
          row: rowNumber,
          field: 'amount',
          message: 'Invalid or missing amount',
        })
        isValid = false
      }

      // Validate description
      if (!transaction.description || transaction.description.trim().length === 0) {
        errors.push({
          row: rowNumber,
          field: 'description',
          message: 'Missing description',
        })
        isValid = false
      }

      if (isValid) {
        validData.push(transaction)
      }
    })

    return { validData, errors }
  }

  const handleImport = async () => {
    setLoading(true)
    try {
      // Import the transactions
      const importResult = await BankReconciliationService.importTransactions(
        selectedAccount,
        importedData,
        duplicateHandling
      )

      setImportStep('COMPLETE')
      onSuccess()
    } catch (error) {
      console.error('Error importing transactions:', error)
      alert('Failed to import transactions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(Math.abs(amount))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <DocumentArrowUpIcon className="h-6 w-6 text-green-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Import Bank Statement</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  importStep === 'UPLOAD' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                }`}
              >
                1
              </div>
              <div
                className={`w-16 h-1 ${
                  ['PREVIEW', 'COMPLETE'].includes(importStep) ? 'bg-green-600' : 'bg-gray-300'
                }`}
              ></div>
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  importStep === 'PREVIEW'
                    ? 'bg-blue-600 text-white'
                    : importStep === 'COMPLETE'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                }`}
              >
                2
              </div>
              <div
                className={`w-16 h-1 ${importStep === 'COMPLETE' ? 'bg-green-600' : 'bg-gray-300'}`}
              ></div>
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  importStep === 'COMPLETE'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
              >
                3
              </div>
            </div>
          </div>

          {/* Upload Step */}
          {importStep === 'UPLOAD' && (
            <div className="space-y-6">
              {/* Bank Account Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Account *
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select bank account</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_name} - {account.bank_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Import Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Statement Format *
                </label>
                <div className="flex space-x-4">
                  {(['CSV', 'EXCEL', 'MPESA'] as const).map((format) => (
                    <label key={format} className="flex items-center">
                      <input
                        type="radio"
                        value={format}
                        checked={importFormat === format}
                        onChange={(e) => setImportFormat(e.target.value as any)}
                        className="mr-2"
                      />
                      {format === 'MPESA' ? 'M-PESA Statement' : `${format} File`}
                    </label>
                  ))}
                </div>
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Statement File *
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <DocumentArrowUpIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <div className="text-sm text-gray-600 mb-4">
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer text-blue-600 hover:text-blue-800"
                    >
                      Click to upload
                    </label>
                    <span> or drag and drop</span>
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {file && <p className="text-sm text-gray-900 font-medium">{file.name}</p>}
                </div>
              </div>

              {/* Format Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Expected Format:</h4>
                <div className="text-sm text-blue-800">
                  {importFormat === 'CSV' && (
                    <p>
                      CSV with columns: Date, Description, Amount, Reference, Balance (optional)
                    </p>
                  )}
                  {importFormat === 'MPESA' && (
                    <p>
                      M-PESA statement with columns: Receipt No., Completion Time, Details,
                      Transaction Status, Paid In/Withdrawn, Balance
                    </p>
                  )}
                  {importFormat === 'EXCEL' && <p>Excel file with same structure as CSV format</p>}
                </div>
              </div>
            </div>
          )}

          {/* Preview Step */}
          {importStep === 'PREVIEW' && (
            <div className="space-y-6">
              {/* Validation Errors */}
              {validationErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                    <h4 className="font-medium text-red-900">Validation Errors</h4>
                  </div>
                  <div className="text-sm text-red-800 space-y-1">
                    {validationErrors.slice(0, 5).map((error, index) => (
                      <p key={index}>
                        Row {error.row}: {error.message}
                      </p>
                    ))}
                    {validationErrors.length > 5 && (
                      <p>... and {validationErrors.length - 5} more errors</p>
                    )}
                  </div>
                </div>
              )}

              {/* Import Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                  <h4 className="font-medium text-green-900">Import Summary</h4>
                </div>
                <div className="text-sm text-green-800">
                  <p>{importedData.length} valid transactions ready to import</p>
                  <p>{validationErrors.length} transactions with errors (will be skipped)</p>
                </div>
              </div>

              {/* Duplicate Handling */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duplicate Transaction Handling
                </label>
                <select
                  value={duplicateHandling}
                  onChange={(e) => setDuplicateHandling(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="SKIP">Skip duplicates</option>
                  <option value="UPDATE">Update existing</option>
                  <option value="CREATE">Create anyway</option>
                </select>
              </div>

              {/* Preview Table */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Transaction Preview (First 10)</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Reference
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {importedData.slice(0, 10).map((transaction, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(transaction.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {transaction.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatAmount(transaction.amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                transaction.type === 'CREDIT'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {transaction.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.reference}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {importStep === 'COMPLETE' && (
            <div className="text-center py-8">
              <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Import Completed Successfully!
              </h3>
              <p className="text-gray-600 mb-4">
                {importedData.length} transactions have been imported to your bank account.
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
              >
                Close
              </button>
            </div>
          )}

          {/* Actions */}
          {importStep !== 'COMPLETE' && (
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              {importStep === 'UPLOAD' && (
                <button
                  onClick={processFile}
                  disabled={loading || !file || !selectedAccount}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Process File'}
                </button>
              )}
              {importStep === 'PREVIEW' && (
                <button
                  onClick={handleImport}
                  disabled={loading || importedData.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? 'Importing...' : `Import ${importedData.length} Transactions`}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
