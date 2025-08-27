/**
 * UI State Store
 * Centralized state management for UI-specific state using Zustand
 */

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

// Navigation and routing state
export interface NavigationState {
  currentTab: string
  previousTab: string | null
  breadcrumbs: Array<{
    label: string
    path: string
    timestamp: Date
  }>
  navigationHistory: Array<{
    path: string
    timestamp: Date
    context?: any
  }>
}

// Modal and dialog state
export interface ModalState {
  activeModals: Array<{
    id: string
    type: string
    props?: any
    zIndex: number
  }>
  modalStack: string[]
}

// Sidebar and layout state
export interface LayoutState {
  sidebarCollapsed: boolean
  sidebarWidth: number
  headerHeight: number
  footerHeight: number
  contentPadding: number
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
}

// Theme and appearance state
export interface ThemeState {
  theme: 'light' | 'dark' | 'system'
  primaryColor: string
  fontSize: 'small' | 'medium' | 'large'
  density: 'compact' | 'comfortable' | 'spacious'
  animations: boolean
  reducedMotion: boolean
}

// Notification state
export interface NotificationState {
  notifications: Array<{
    id: string
    type: 'success' | 'error' | 'warning' | 'info'
    title: string
    message: string
    timestamp: Date
    duration?: number
    actions?: Array<{
      label: string
      action: () => void
    }>
    persistent?: boolean
    read?: boolean
  }>
  unreadCount: number
}

// Quick actions state
export interface QuickActionsState {
  visible: boolean
  recentActions: Array<{
    id: string
    type: string
    label: string
    icon: string
    timestamp: Date
    data?: any
  }>
  contextualActions: Array<{
    id: string
    type: string
    label: string
    icon: string
    condition: () => boolean
    action: () => void
  }>
  pinnedActions: string[]
}

// Search and command palette state
export interface CommandPaletteState {
  isOpen: boolean
  query: string
  results: Array<{
    id: string
    title: string
    subtitle?: string
    icon?: string
    category: string
    action: () => void
    keywords: string[]
  }>
  recentCommands: string[]
  categories: Array<{
    id: string
    label: string
    icon: string
    priority: number
  }>
}

// Performance and loading state
export interface PerformanceState {
  globalLoading: boolean
  loadingStates: Record<string, boolean>
  progressBars: Record<string, {
    value: number
    max: number
    label?: string
  }>
  backgroundTasks: Array<{
    id: string
    label: string
    progress: number
    status: 'running' | 'completed' | 'failed'
  }>
}

// UI Store State
export interface UIStoreState {
  navigation: NavigationState
  modals: ModalState
  layout: LayoutState
  theme: ThemeState
  notifications: NotificationState
  quickActions: QuickActionsState
  commandPalette: CommandPaletteState
  performance: PerformanceState
  lastUpdated: Date
}

// UI Store Actions
export interface UIStoreActions {
  // Navigation actions
  setCurrentTab: (tab: string) => void
  addBreadcrumb: (label: string, path: string) => void
  clearBreadcrumbs: () => void
  addToHistory: (path: string, context?: any) => void
  goBack: () => string | null
  
  // Modal actions
  openModal: (id: string, type: string, props?: any) => void
  closeModal: (id: string) => void
  closeAllModals: () => void
  getActiveModal: () => any | null
  
  // Layout actions
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSidebarWidth: (width: number) => void
  updateViewport: (width: number, height: number) => void
  
  // Theme actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setPrimaryColor: (color: string) => void
  setFontSize: (size: 'small' | 'medium' | 'large') => void
  setDensity: (density: 'compact' | 'comfortable' | 'spacious') => void
  toggleAnimations: () => void
  
  // Notification actions
  addNotification: (notification: Omit<NotificationState['notifications'][0], 'id' | 'timestamp'>) => string
  removeNotification: (id: string) => void
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: () => void
  clearNotifications: () => void
  
  // Quick actions
  toggleQuickActions: () => void
  addRecentAction: (action: Omit<QuickActionsState['recentActions'][0], 'timestamp'>) => void
  pinAction: (actionId: string) => void
  unpinAction: (actionId: string) => void
  
  // Command palette actions
  openCommandPalette: () => void
  closeCommandPalette: () => void
  setCommandQuery: (query: string) => void
  addRecentCommand: (commandId: string) => void
  
  // Performance actions
  setGlobalLoading: (loading: boolean) => void
  setLoadingState: (key: string, loading: boolean) => void
  setProgress: (key: string, value: number, max?: number, label?: string) => void
  removeProgress: (key: string) => void
  addBackgroundTask: (task: Omit<PerformanceState['backgroundTasks'][0], 'id'>) => string
  updateBackgroundTask: (id: string, updates: Partial<PerformanceState['backgroundTasks'][0]>) => void
  removeBackgroundTask: (id: string) => void
}

// Initial state
const initialState: UIStoreState = {
  navigation: {
    currentTab: 'dashboard',
    previousTab: null,
    breadcrumbs: [],
    navigationHistory: []
  },
  modals: {
    activeModals: [],
    modalStack: []
  },
  layout: {
    sidebarCollapsed: false,
    sidebarWidth: 280,
    headerHeight: 64,
    footerHeight: 48,
    contentPadding: 24,
    isMobile: false,
    isTablet: false,
    isDesktop: true
  },
  theme: {
    theme: 'light',
    primaryColor: '#3b82f6',
    fontSize: 'medium',
    density: 'comfortable',
    animations: true,
    reducedMotion: false
  },
  notifications: {
    notifications: [],
    unreadCount: 0
  },
  quickActions: {
    visible: true,
    recentActions: [],
    contextualActions: [],
    pinnedActions: []
  },
  commandPalette: {
    isOpen: false,
    query: '',
    results: [],
    recentCommands: [],
    categories: [
      { id: 'navigation', label: 'Navigation', icon: '🧭', priority: 1 },
      { id: 'properties', label: 'Properties', icon: '🏠', priority: 2 },
      { id: 'tenants', label: 'Tenants', icon: '👥', priority: 3 },
      { id: 'payments', label: 'Payments', icon: '💰', priority: 4 },
      { id: 'settings', label: 'Settings', icon: '⚙️', priority: 5 }
    ]
  },
  performance: {
    globalLoading: false,
    loadingStates: {},
    progressBars: {},
    backgroundTasks: []
  },
  lastUpdated: new Date()
}

// Utility functions
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function updateViewportState(width: number): Partial<LayoutState> {
  return {
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024
  }
}

// Create the store
export const useUIStore = create<UIStoreState & UIStoreActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        
        // Navigation actions
        setCurrentTab: (tab) => set((draft) => {
          draft.navigation.previousTab = draft.navigation.currentTab
          draft.navigation.currentTab = tab
          draft.lastUpdated = new Date()
        }),
        
        addBreadcrumb: (label, path) => set((draft) => {
          draft.navigation.breadcrumbs.push({
            label,
            path,
            timestamp: new Date()
          })
          // Keep only last 10 breadcrumbs
          if (draft.navigation.breadcrumbs.length > 10) {
            draft.navigation.breadcrumbs = draft.navigation.breadcrumbs.slice(-10)
          }
          draft.lastUpdated = new Date()
        }),
        
        clearBreadcrumbs: () => set((draft) => {
          draft.navigation.breadcrumbs = []
          draft.lastUpdated = new Date()
        }),
        
        addToHistory: (path, context) => set((draft) => {
          draft.navigation.navigationHistory.push({
            path,
            timestamp: new Date(),
            context
          })
          // Keep only last 50 history items
          if (draft.navigation.navigationHistory.length > 50) {
            draft.navigation.navigationHistory = draft.navigation.navigationHistory.slice(-50)
          }
          draft.lastUpdated = new Date()
        }),
        
        goBack: () => {
          const state = get()
          const history = state.navigation.navigationHistory
          if (history.length > 1) {
            const previous = history[history.length - 2]
            return previous.path
          }
          return null
        },
        
        // Modal actions
        openModal: (id, type, props) => set((draft) => {
          const zIndex = 1000 + draft.modals.activeModals.length
          draft.modals.activeModals.push({ id, type, props, zIndex })
          draft.modals.modalStack.push(id)
          draft.lastUpdated = new Date()
        }),
        
        closeModal: (id) => set((draft) => {
          draft.modals.activeModals = draft.modals.activeModals.filter(modal => modal.id !== id)
          draft.modals.modalStack = draft.modals.modalStack.filter(modalId => modalId !== id)
          draft.lastUpdated = new Date()
        }),
        
        closeAllModals: () => set((draft) => {
          draft.modals.activeModals = []
          draft.modals.modalStack = []
          draft.lastUpdated = new Date()
        }),
        
        getActiveModal: () => {
          const state = get()
          return state.modals.activeModals[state.modals.activeModals.length - 1] || null
        },
        
        // Layout actions
        toggleSidebar: () => set((draft) => {
          draft.layout.sidebarCollapsed = !draft.layout.sidebarCollapsed
          draft.lastUpdated = new Date()
        }),
        
        setSidebarCollapsed: (collapsed) => set((draft) => {
          draft.layout.sidebarCollapsed = collapsed
          draft.lastUpdated = new Date()
        }),
        
        setSidebarWidth: (width) => set((draft) => {
          draft.layout.sidebarWidth = Math.max(200, Math.min(400, width))
          draft.lastUpdated = new Date()
        }),
        
        updateViewport: (width, height) => set((draft) => {
          Object.assign(draft.layout, updateViewportState(width))
          draft.lastUpdated = new Date()
        }),
        
        // Theme actions
        setTheme: (theme) => set((draft) => {
          draft.theme.theme = theme
          draft.lastUpdated = new Date()
        }),
        
        setPrimaryColor: (color) => set((draft) => {
          draft.theme.primaryColor = color
          draft.lastUpdated = new Date()
        }),
        
        setFontSize: (size) => set((draft) => {
          draft.theme.fontSize = size
          draft.lastUpdated = new Date()
        }),
        
        setDensity: (density) => set((draft) => {
          draft.theme.density = density
          draft.lastUpdated = new Date()
        }),
        
        toggleAnimations: () => set((draft) => {
          draft.theme.animations = !draft.theme.animations
          draft.lastUpdated = new Date()
        }),
        
        // Notification actions
        addNotification: (notification) => {
          const id = generateId()
          set((draft) => {
            draft.notifications.notifications.push({
              ...notification,
              id,
              timestamp: new Date(),
              read: false
            })
            draft.notifications.unreadCount += 1
            draft.lastUpdated = new Date()
          })
          
          // Auto-remove non-persistent notifications
          if (!notification.persistent) {
            const duration = notification.duration || 5000
            setTimeout(() => {
              set((draft) => {
                const index = draft.notifications.notifications.findIndex(n => n.id === id)
                if (index > -1) {
                  if (!draft.notifications.notifications[index].read) {
                    draft.notifications.unreadCount -= 1
                  }
                  draft.notifications.notifications.splice(index, 1)
                  draft.lastUpdated = new Date()
                }
              })
            }, duration)
          }
          
          return id
        },
        
        removeNotification: (id) => set((draft) => {
          const index = draft.notifications.notifications.findIndex(n => n.id === id)
          if (index > -1) {
            if (!draft.notifications.notifications[index].read) {
              draft.notifications.unreadCount -= 1
            }
            draft.notifications.notifications.splice(index, 1)
            draft.lastUpdated = new Date()
          }
        }),
        
        markNotificationRead: (id) => set((draft) => {
          const notification = draft.notifications.notifications.find(n => n.id === id)
          if (notification && !notification.read) {
            notification.read = true
            draft.notifications.unreadCount -= 1
            draft.lastUpdated = new Date()
          }
        }),
        
        markAllNotificationsRead: () => set((draft) => {
          draft.notifications.notifications.forEach(n => n.read = true)
          draft.notifications.unreadCount = 0
          draft.lastUpdated = new Date()
        }),
        
        clearNotifications: () => set((draft) => {
          draft.notifications.notifications = []
          draft.notifications.unreadCount = 0
          draft.lastUpdated = new Date()
        }),
        
        // Quick actions
        toggleQuickActions: () => set((draft) => {
          draft.quickActions.visible = !draft.quickActions.visible
          draft.lastUpdated = new Date()
        }),
        
        addRecentAction: (action) => set((draft) => {
          draft.quickActions.recentActions.unshift({
            ...action,
            timestamp: new Date()
          })
          // Keep only last 20 recent actions
          if (draft.quickActions.recentActions.length > 20) {
            draft.quickActions.recentActions = draft.quickActions.recentActions.slice(0, 20)
          }
          draft.lastUpdated = new Date()
        }),
        
        pinAction: (actionId) => set((draft) => {
          if (!draft.quickActions.pinnedActions.includes(actionId)) {
            draft.quickActions.pinnedActions.push(actionId)
            draft.lastUpdated = new Date()
          }
        }),
        
        unpinAction: (actionId) => set((draft) => {
          draft.quickActions.pinnedActions = draft.quickActions.pinnedActions.filter(id => id !== actionId)
          draft.lastUpdated = new Date()
        }),
        
        // Command palette actions
        openCommandPalette: () => set((draft) => {
          draft.commandPalette.isOpen = true
          draft.commandPalette.query = ''
          draft.lastUpdated = new Date()
        }),
        
        closeCommandPalette: () => set((draft) => {
          draft.commandPalette.isOpen = false
          draft.commandPalette.query = ''
          draft.commandPalette.results = []
          draft.lastUpdated = new Date()
        }),
        
        setCommandQuery: (query) => set((draft) => {
          draft.commandPalette.query = query
          // TODO: Implement search logic
          draft.lastUpdated = new Date()
        }),
        
        addRecentCommand: (commandId) => set((draft) => {
          draft.commandPalette.recentCommands.unshift(commandId)
          // Keep only last 10 recent commands
          if (draft.commandPalette.recentCommands.length > 10) {
            draft.commandPalette.recentCommands = draft.commandPalette.recentCommands.slice(0, 10)
          }
          draft.lastUpdated = new Date()
        }),
        
        // Performance actions
        setGlobalLoading: (loading) => set((draft) => {
          draft.performance.globalLoading = loading
          draft.lastUpdated = new Date()
        }),
        
        setLoadingState: (key, loading) => set((draft) => {
          if (loading) {
            draft.performance.loadingStates[key] = true
          } else {
            delete draft.performance.loadingStates[key]
          }
          draft.lastUpdated = new Date()
        }),
        
        setProgress: (key, value, max = 100, label) => set((draft) => {
          draft.performance.progressBars[key] = { value, max, label }
          draft.lastUpdated = new Date()
        }),
        
        removeProgress: (key) => set((draft) => {
          delete draft.performance.progressBars[key]
          draft.lastUpdated = new Date()
        }),
        
        addBackgroundTask: (task) => {
          const id = generateId()
          set((draft) => {
            draft.performance.backgroundTasks.push({ ...task, id })
            draft.lastUpdated = new Date()
          })
          return id
        },
        
        updateBackgroundTask: (id, updates) => set((draft) => {
          const task = draft.performance.backgroundTasks.find(t => t.id === id)
          if (task) {
            Object.assign(task, updates)
            draft.lastUpdated = new Date()
          }
        }),
        
        removeBackgroundTask: (id) => set((draft) => {
          draft.performance.backgroundTasks = draft.performance.backgroundTasks.filter(t => t.id !== id)
          draft.lastUpdated = new Date()
        })
      })),
      {
        name: 'ui-store',
        partialize: (state) => ({
          navigation: {
            currentTab: state.navigation.currentTab,
            breadcrumbs: state.navigation.breadcrumbs.slice(-5) // Keep only last 5
          },
          layout: {
            sidebarCollapsed: state.layout.sidebarCollapsed,
            sidebarWidth: state.layout.sidebarWidth
          },
          theme: state.theme,
          quickActions: {
            visible: state.quickActions.visible,
            pinnedActions: state.quickActions.pinnedActions
          },
          commandPalette: {
            recentCommands: state.commandPalette.recentCommands
          }
        })
      }
    ),
    { name: 'UIStore' }
  )
)
