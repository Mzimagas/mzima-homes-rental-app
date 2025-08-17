"use client"
import { useState, useEffect } from 'react'

// Unit Comparison Feature
interface Unit {
  unit_id: string
  unit_label: string
  property_name: string
  monthly_rent_kes: number | null
  deposit_kes: number | null
  thumbnail_url?: string | null
}

export function UnitComparison() {
  const [compareList, setCompareList] = useState<Unit[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('compareUnits')
    if (saved) {
      setCompareList(JSON.parse(saved))
    }
  }, [])

  const addToCompare = (unit: Unit) => {
    if (compareList.length >= 3) return false
    if (compareList.some(u => u.unit_id === unit.unit_id)) return false
    
    const newList = [...compareList, unit]
    setCompareList(newList)
    localStorage.setItem('compareUnits', JSON.stringify(newList))
    return true
  }

  const removeFromCompare = (unitId: string) => {
    const newList = compareList.filter(u => u.unit_id !== unitId)
    setCompareList(newList)
    localStorage.setItem('compareUnits', JSON.stringify(newList))
  }

  const clearAll = () => {
    setCompareList([])
    localStorage.removeItem('compareUnits')
  }

  if (compareList.length === 0) return null

  return (
    <>
      {/* Floating Compare Button */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-primary-600 text-white px-4 py-3 rounded-full shadow-lg hover:bg-primary-700 transition-colors flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span>Compare ({compareList.length})</span>
        </button>
      </div>

      {/* Comparison Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Compare Units</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {compareList.map((unit) => (
                  <div key={unit.unit_id} className="border rounded-lg overflow-hidden">
                    <div className="aspect-video bg-gray-100">
                      {unit.thumbnail_url && (
                        <img src={unit.thumbnail_url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold">{unit.unit_label}</h3>
                      <p className="text-sm text-gray-600">{unit.property_name}</p>
                      <div className="mt-2">
                        <div className="font-semibold">KES {unit.monthly_rent_kes?.toLocaleString() || '-'}</div>
                        {unit.deposit_kes && (
                          <div className="text-sm text-gray-600">Deposit: KES {unit.deposit_kes.toLocaleString()}</div>
                        )}
                      </div>
                      <div className="mt-4 space-y-2">
                        <a href={`/rent/${unit.unit_id}`} className="btn btn-primary w-full text-center">
                          View Details
                        </a>
                        <button
                          onClick={() => removeFromCompare(unit.unit_id)}
                          className="btn btn-secondary w-full"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 flex justify-center">
                <button onClick={clearAll} className="btn btn-secondary">
                  Clear All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Favorites Feature
export function FavoritesManager() {
  const [favorites, setFavorites] = useState<string[]>([])

  useEffect(() => {
    const saved = localStorage.getItem('favoriteUnits')
    if (saved) {
      setFavorites(JSON.parse(saved))
    }
  }, [])

  const toggleFavorite = (unitId: string) => {
    const newFavorites = favorites.includes(unitId)
      ? favorites.filter(id => id !== unitId)
      : [...favorites, unitId]
    
    setFavorites(newFavorites)
    localStorage.setItem('favoriteUnits', JSON.stringify(newFavorites))
  }

  const isFavorite = (unitId: string) => favorites.includes(unitId)

  return { favorites, toggleFavorite, isFavorite }
}

// Favorite Button Component
export function FavoriteButton({ unitId }: { unitId: string }) {
  const { toggleFavorite, isFavorite } = FavoritesManager()
  const favorite = isFavorite(unitId)

  return (
    <button
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        toggleFavorite(unitId)
      }}
      className={`p-2 rounded-full transition-colors ${
        favorite 
          ? 'bg-red-100 text-red-600 hover:bg-red-200' 
          : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-red-500'
      }`}
      title={favorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <svg className="w-5 h-5" fill={favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    </button>
  )
}

// Share Feature
export function ShareButton({ unit }: { unit: { unit_id: string; unit_label: string; property_name: string } }) {
  const [isOpen, setIsOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareUrl = `${window.location.origin}/rent/${unit.unit_id}`
  const shareText = `Check out this rental unit: ${unit.property_name} - ${unit.unit_label}`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const shareVia = (platform: string) => {
    const encodedUrl = encodeURIComponent(shareUrl)
    const encodedText = encodeURIComponent(shareText)
    
    const urls = {
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      email: `mailto:?subject=${encodedText}&body=${encodedUrl}`,
      sms: `sms:?body=${encodedText}%20${encodedUrl}`
    }
    
    window.open(urls[platform as keyof typeof urls], '_blank')
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
        title="Share this unit"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-64 z-10">
          <h3 className="font-medium mb-3">Share this unit</h3>
          
          <div className="space-y-2">
            <button
              onClick={copyToClipboard}
              className="w-full flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
            
            <button
              onClick={() => shareVia('whatsapp')}
              className="w-full flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
            >
              <div className="w-5 h-5 bg-green-500 rounded"></div>
              <span>WhatsApp</span>
            </button>
            
            <button
              onClick={() => shareVia('telegram')}
              className="w-full flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
            >
              <div className="w-5 h-5 bg-blue-500 rounded"></div>
              <span>Telegram</span>
            </button>
            
            <button
              onClick={() => shareVia('email')}
              className="w-full flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Email</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Availability Notifications
export function AvailabilityNotifier({ unitId }: { unitId: string }) {
  const [email, setEmail] = useState('')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const subscribe = async () => {
    if (!email) return
    
    setIsLoading(true)
    try {
      // In a real app, this would call an API
      await new Promise(resolve => setTimeout(resolve, 1000))
      setIsSubscribed(true)
      setEmail('')
    } catch (error) {
      console.error('Failed to subscribe:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isSubscribed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center">
          <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-800 font-medium">You'll be notified when this unit becomes available!</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="font-medium text-blue-900 mb-2">Get notified when available</h3>
      <p className="text-sm text-blue-700 mb-3">
        This unit is currently occupied. Enter your email to be notified when it becomes available.
      </p>
      <div className="flex space-x-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your.email@example.com"
          className="flex-1 form-input text-sm"
        />
        <button
          onClick={subscribe}
          disabled={!email || isLoading}
          className="btn btn-primary text-sm disabled:opacity-50"
        >
          {isLoading ? 'Subscribing...' : 'Notify Me'}
        </button>
      </div>
    </div>
  )
}
