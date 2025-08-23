'use client'

import { useState } from 'react'
import { Button } from '../ui'

interface NewUser {
  email: string
  fullName: string
  memberNumber: string
  phoneNumber: string
  idPassportNumber: string
  initialRole: string
}

export default function UserAddition() {
  const [formData, setFormData] = useState<NewUser>({
    email: '',
    fullName: '',
    memberNumber: '',
    phoneNumber: '',
    idPassportNumber: '',
    initialRole: 'viewer'
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<NewUser>>({})
  const [successMessage, setSuccessMessage] = useState('')

  const roles = [
    { value: 'admin', label: '👑 Administrator', description: 'Full system access' },
    { value: 'supervisor', label: '👁️ Supervisor', description: 'View all sections' },
    { value: 'staff', label: '📝 Staff', description: 'Clerical work access' },
    { value: 'member', label: '👤 Member', description: 'Limited access' },
    { value: 'viewer', label: '👀 Viewer', description: 'Read-only access' }
  ]

  const validateForm = (): boolean => {
    const newErrors: Partial<NewUser> = {}

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    // Full name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required'
    }

    // Member number validation (mandatory)
    if (!formData.memberNumber.trim()) {
      newErrors.memberNumber = 'Member number is required'
    } else if (!/^[A-Z0-9]{3,10}$/.test(formData.memberNumber.toUpperCase())) {
      newErrors.memberNumber = 'Member number must be 3-10 alphanumeric characters'
    }

    // Phone number validation (mandatory)
    if (!formData.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required'
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(formData.phoneNumber.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.phoneNumber = 'Invalid phone number format'
    }

    // ID/Passport number validation (mandatory)
    if (!formData.idPassportNumber.trim()) {
      newErrors.idPassportNumber = 'ID/Passport number is required'
    } else if (formData.idPassportNumber.trim().length < 5) {
      newErrors.idPassportNumber = 'ID/Passport number must be at least 5 characters'
    }

    // Role validation
    if (!formData.initialRole) {
      newErrors.initialRole = 'Please select an initial role'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsSubmitting(true)
    setSuccessMessage('')

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Generate default password (phone number)
      const defaultPassword = formData.phoneNumber.replace(/[\s\-\(\)]/g, '')

      // Save to localStorage for demo
      const existingUsers = JSON.parse(localStorage.getItem('mzima_users') || '[]')
      const newUser = {
        id: `user_${Date.now()}`,
        memberNumber: formData.memberNumber.toUpperCase(),
        email: formData.email,
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        idPassportNumber: formData.idPassportNumber,
        role: formData.initialRole,
        defaultPassword: defaultPassword,
        mustChangePassword: true,
        profileComplete: false,
        nextOfKinComplete: false,
        createdAt: new Date().toISOString(),
        status: 'pending_first_login'
      }

      existingUsers.push(newUser)
      localStorage.setItem('mzima_users', JSON.stringify(existingUsers))

      setSuccessMessage(`✅ User "${formData.fullName}" (Member #${formData.memberNumber.toUpperCase()}) has been successfully added with ${roles.find(r => r.value === formData.initialRole)?.label} role. Default password: ${defaultPassword} (must change on first login)`)

      // Reset form
      setFormData({
        email: '',
        fullName: '',
        memberNumber: '',
        phoneNumber: '',
        idPassportNumber: '',
        initialRole: 'viewer'
      })
      setErrors({})
      
    } catch (error) {
      console.error('Error adding user:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof NewUser, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
    setSuccessMessage('')
  }

  return (
    <div className="space-y-6">
      {/* Quick Add User Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Add New User</h3>
            <p className="text-sm text-gray-600">Create a new user account with initial role assignment</p>
          </div>
          <div className="text-2xl">👤</div>
        </div>

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Member Number Field */}
          <div>
            <label htmlFor="memberNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Member Number * <span className="text-xs text-gray-500">(Office staff to use ID No.)</span>
            </label>
            <input
              type="text"
              id="memberNumber"
              value={formData.memberNumber}
              onChange={(e) => handleInputChange('memberNumber', e.target.value.toUpperCase())}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.memberNumber ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="EMP001"
              maxLength={10}
            />
            {errors.memberNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.memberNumber}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">3-10 alphanumeric characters (will be converted to uppercase)</p>
          </div>

          {/* Full Name Field */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
              Full Name *
            </label>
            <input
              type="text"
              id="fullName"
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.fullName ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="John Doe"
            />
            {errors.fullName && (
              <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="user@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Phone Number Field */}
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number * <span className="text-xs text-gray-500">(will be used as default password)</span>
            </label>
            <input
              type="tel"
              id="phoneNumber"
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.phoneNumber ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="+1234567890 or 0712345678"
            />
            {errors.phoneNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">User must change password after first login</p>
          </div>

          {/* ID/Passport Number Field */}
          <div>
            <label htmlFor="idPassportNumber" className="block text-sm font-medium text-gray-700 mb-1">
              ID / Passport Number *
            </label>
            <input
              type="text"
              id="idPassportNumber"
              value={formData.idPassportNumber}
              onChange={(e) => handleInputChange('idPassportNumber', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.idPassportNumber ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="12345678 or A1234567"
            />
            {errors.idPassportNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.idPassportNumber}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">National ID or Passport number for identification</p>
          </div>

          {/* Initial Role Field */}
          <div>
            <label htmlFor="initialRole" className="block text-sm font-medium text-gray-700 mb-1">
              Initial Role *
            </label>
            <select
              id="initialRole"
              value={formData.initialRole}
              onChange={(e) => handleInputChange('initialRole', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.initialRole ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
            >
              {roles.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label} - {role.description}
                </option>
              ))}
            </select>
            {errors.initialRole && (
              <p className="mt-1 text-sm text-red-600">{errors.initialRole}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              You can modify detailed permissions later in the Permission Management tab
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Adding User...
                </>
              ) : (
                '➕ Add User'
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* First Login Requirements Card */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-orange-900 mb-3">📋 First Login Requirements</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-start space-x-2">
            <span className="text-orange-600 mt-0.5">🔑</span>
            <div>
              <h4 className="font-medium text-orange-800">Password Change Required</h4>
              <p className="text-orange-700">User must change their default password (phone number) immediately after first login</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-orange-600 mt-0.5">👤</span>
            <div>
              <h4 className="font-medium text-orange-800">Profile Completion</h4>
              <p className="text-orange-700">User must complete their profile information including personal details and contact information</p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-orange-600 mt-0.5">👨‍👩‍👧‍👦</span>
            <div>
              <h4 className="font-medium text-orange-800">Next of Kin Details</h4>
              <p className="text-orange-700">User must provide next of kin information including relationship (spouse, children, parent, sibling, etc.)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Card */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-900 mb-2">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-blue-800">🔐 Manage Permissions</h4>
            <p className="text-blue-700">Use the Permission Management tab for detailed role and section-based permissions</p>
          </div>
          <div>
            <h4 className="font-medium text-blue-800">👥 Bulk Operations</h4>
            <p className="text-blue-700">Add multiple users and assign permissions in bulk using role templates</p>
          </div>
        </div>
      </div>
    </div>
  )
}
