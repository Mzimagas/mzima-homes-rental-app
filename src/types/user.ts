export interface User {
  id: string
  email: string
  name?: string
  memberNumber?: string
  phoneNumber?: string
  role: string
  isActive: boolean
  status?: string
  createdAt?: string
  lastLogin?: string | null
  profileComplete?: boolean
  deletedAt?: string | null
  isDeleted?: boolean
}

export interface UserFilters {
  search: string
  status: 'all' | 'active' | 'inactive'
  role: 'all' | 'admin' | 'supervisor' | 'staff' | 'member' | 'viewer'
  sortBy: 'name' | 'email' | 'created_at' | 'last_login'
  sortOrder: 'asc' | 'desc'
  profileComplete?: 'all' | 'complete' | 'incomplete'
  dateFrom?: string
  dateTo?: string
}

export interface NewUser {
  email: string
  fullName: string
  memberNumber: string
  phoneNumber: string
  idPassportNumber: string
  initialRole: string
}

export interface UserPermission {
  id: string
  userId: string
  permission: string
  resource?: string
  granted: boolean
  grantedBy: string
  grantedAt: string
  expiresAt?: string
}

export interface UserRole {
  id: string
  name: string
  description: string
  permissions: string[]
  isActive: boolean
}

export interface UserActivity {
  id: string
  userId: string
  action: string
  description: string
  timestamp: string
  ipAddress?: string
  userAgent?: string
  metadata?: Record<string, any>
}

export interface UserProfile {
  id: string
  userId: string
  dateOfBirth?: string
  gender?: string
  nationality?: string
  address?: string
  city?: string
  postalCode?: string
  country?: string
  department?: string
  position?: string
  hireDate?: string
  employeeId?: string
  preferredLanguage?: string
  timezone?: string
  createdAt: string
  updatedAt: string
}

export interface UserNextOfKin {
  id: string
  userId: string
  fullName: string
  relationship: string
  phoneNumber: string
  email?: string
  address?: string
  priorityOrder: number
  isEmergencyContact: boolean
  createdAt: string
  updatedAt: string
}

export interface UserStats {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  newUsersThisMonth: number
  usersByRole: Record<string, number>
  recentLogins: number
}
