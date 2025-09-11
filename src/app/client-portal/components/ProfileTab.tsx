'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../../components/auth/AuthProvider'

interface NextOfKin {
  id?: string
  full_name: string
  relationship: string
  phone_number: string
  email?: string
}

interface ClientProfile {
  id: string
  full_name: string
  email: string
  phone_number?: string
  notes?: string
  next_of_kin: NextOfKin[]
}

interface ProfileTabProps {
  clientData: any
  onUpdate: () => void
}

export default function ProfileTab({ clientData, onUpdate }: ProfileTabProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<ClientProfile>({
    id: clientData.id || '',
    full_name: typeof clientData.full_name === 'string' ? clientData.full_name : '',
    email: clientData.email || '',
    phone_number: clientData.phone || '',
    notes: clientData.notes || '',
    next_of_kin: clientData.next_of_kin || []
  })

  const { user } = useAuth()

  // Keep local form state in sync when parent data changes (after save refresh)
  useEffect(() => {
    setProfile({
      id: clientData.id || '',
      full_name: typeof clientData.full_name === 'string' ? clientData.full_name : '',
      email: clientData.email || '',
      phone_number: clientData.phone || '',
      notes: clientData.notes || '',
      next_of_kin: clientData.next_of_kin || []
    })
  }, [clientData])

  const handleSave = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/clients/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(profile)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Profile update failed:', response.status, errorData)
        throw new Error(errorData.error || `Failed to update profile (${response.status})`)
      }

      const result = await response.json()
      console.log('Profile updated successfully:', result)

      // Optimistically update local form immediately from server response
      if (result?.client) {
        setProfile(prev => ({
          ...prev,
          full_name: result.client.full_name ?? prev.full_name,
          phone_number: result.client.phone ?? prev.phone_number,
          notes: result.client.notes ?? prev.notes,
          next_of_kin: Array.isArray(result.client.next_of_kin) ? result.client.next_of_kin : prev.next_of_kin,
        }))
      }

      setIsEditing(false)
      onUpdate()
    } catch (error) {
      console.error('Error updating profile:', error)
      alert(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const addNextOfKin = () => {
    setProfile(prev => ({
      ...prev,
      next_of_kin: [
        ...prev.next_of_kin,
        {
          full_name: '',
          relationship: '',
          phone_number: '',
          email: ''
        }
      ]
    }))
  }

  const updateNextOfKin = (index: number, field: keyof NextOfKin, value: string) => {
    setProfile(prev => ({
      ...prev,
      next_of_kin: prev.next_of_kin.map((nok, i) => 
        i === index ? { ...nok, [field]: value } : nok
      )
    }))
  }

  const removeNextOfKin = (index: number) => {
    setProfile(prev => ({
      ...prev,
      next_of_kin: prev.next_of_kin.filter((_, i) => i !== index)
    }))
  }

  const relationshipOptions = [
    'Spouse',
    'Parent',
    'Child',
    'Sibling',
    'Relative',
    'Friend',
    'Business Partner',
    'Other'
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Profile Settings</h2>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Edit Profile
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={() => setIsEditing(false)}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Basic Information */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            {isEditing ? (
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900">{profile.full_name || 'Not specified'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <p className="text-gray-900">{profile.email}</p>
            <p className="text-xs text-gray-500">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            {isEditing ? (
              <input
                type="tel"
                value={profile.phone_number || ''}
                onChange={(e) => setProfile(prev => ({ ...prev, phone_number: e.target.value }))}
                placeholder="+254 700 000 000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-gray-900">{profile.phone_number || 'Not specified'}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
            <p className="text-gray-900">
              {new Date(clientData.registration_date).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Notes Section */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          {isEditing ? (
            <textarea
              value={profile.notes || ''}
              onChange={(e) => setProfile(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Add any additional notes or preferences..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <p className="text-gray-900">{profile.notes || 'No notes added'}</p>
          )}
        </div>
      </div>

      {/* Next of Kin Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Next of Kin</h3>
          {isEditing && (
            <button
              onClick={addNextOfKin}
              className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors text-sm"
            >
              Add Next of Kin
            </button>
          )}
        </div>

        {profile.next_of_kin.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">👥</div>
            <p>No next of kin added yet</p>
            {isEditing && (
              <button
                onClick={addNextOfKin}
                className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                Add your first next of kin
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {profile.next_of_kin.map((nok, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Next of Kin #{index + 1}</h4>
                  {isEditing && (
                    <button
                      onClick={() => removeNextOfKin(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={nok.full_name}
                        onChange={(e) => updateNextOfKin(index, 'full_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{nok.full_name || 'Not specified'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                    {isEditing ? (
                      <select
                        value={nok.relationship}
                        onChange={(e) => updateNextOfKin(index, 'relationship', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select relationship</option>
                        {relationshipOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-gray-900">{nok.relationship || 'Not specified'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={nok.phone_number}
                        onChange={(e) => updateNextOfKin(index, 'phone_number', e.target.value)}
                        placeholder="+254 700 000 000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{nok.phone_number || 'Not specified'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email (Optional)</label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={nok.email || ''}
                        onChange={(e) => updateNextOfKin(index, 'email', e.target.value)}
                        placeholder="email@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-gray-900">{nok.email || 'Not specified'}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
