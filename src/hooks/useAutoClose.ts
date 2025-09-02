import { useEffect, useRef, useCallback } from 'react'

interface UseAutoCloseOptions {
  /**
   * Auto-close delay in milliseconds
   * @default 10000 (10 seconds)
   */
  delay?: number
  
  /**
   * Whether auto-close is enabled
   * @default true
   */
  enabled?: boolean
  
  /**
   * Callback function to execute when auto-closing
   */
  onAutoClose?: () => void
  
  /**
   * Whether to pause auto-close on hover
   * @default true
   */
  pauseOnHover?: boolean
  
  /**
   * Whether to reset timer on user interaction
   * @default true
   */
  resetOnInteraction?: boolean
}

interface UseAutoCloseReturn {
  /**
   * Ref to attach to the container element
   */
  containerRef: React.RefObject<HTMLDivElement>
  
  /**
   * Manually reset the auto-close timer
   */
  resetTimer: () => void
  
  /**
   * Manually trigger auto-close
   */
  triggerAutoClose: () => void
  
  /**
   * Pause the auto-close timer
   */
  pauseTimer: () => void
  
  /**
   * Resume the auto-close timer
   */
  resumeTimer: () => void
  
  /**
   * Current remaining time in milliseconds
   */
  remainingTime: number
  
  /**
   * Whether the timer is currently paused
   */
  isPaused: boolean
}

/**
 * Custom hook for auto-closing expandable content
 * 
 * Features:
 * - Configurable auto-close delay
 * - Pause on hover functionality
 * - Reset timer on user interaction
 * - Manual control methods
 * - Remaining time tracking
 * 
 * @param isOpen - Whether the content is currently open
 * @param onClose - Function to call when closing
 * @param options - Configuration options
 */
export function useAutoClose(
  isOpen: boolean,
  onClose: () => void,
  options: UseAutoCloseOptions = {}
): UseAutoCloseReturn {
  const {
    delay = 10000, // 10 seconds default
    enabled = true,
    onAutoClose,
    pauseOnHover = true,
    resetOnInteraction = true,
  } = options

  const containerRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number>(0)
  const remainingTimeRef = useRef<number>(delay)
  const isPausedRef = useRef<boolean>(false)

  // Clear timer utility
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Start timer utility
  const startTimer = useCallback((duration: number = delay) => {
    clearTimer()
    startTimeRef.current = Date.now()
    remainingTimeRef.current = duration
    isPausedRef.current = false

    timerRef.current = setTimeout(() => {
      if (enabled && isOpen) {
        onAutoClose?.()
        onClose()
      }
    }, duration)
  }, [delay, enabled, isOpen, onClose, onAutoClose, clearTimer])

  // Reset timer
  const resetTimer = useCallback(() => {
    if (enabled && isOpen) {
      startTimer(delay)
    }
  }, [enabled, isOpen, startTimer, delay])

  // Trigger auto-close immediately
  const triggerAutoClose = useCallback(() => {
    clearTimer()
    if (enabled && isOpen) {
      onAutoClose?.()
      onClose()
    }
  }, [enabled, isOpen, onClose, onAutoClose, clearTimer])

  // Pause timer
  const pauseTimer = useCallback(() => {
    if (timerRef.current && !isPausedRef.current) {
      clearTimer()
      const elapsed = Date.now() - startTimeRef.current
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed)
      isPausedRef.current = true
    }
  }, [clearTimer])

  // Resume timer
  const resumeTimer = useCallback(() => {
    if (isPausedRef.current && enabled && isOpen) {
      startTimer(remainingTimeRef.current)
    }
  }, [enabled, isOpen, startTimer])

  // Start timer when content opens
  useEffect(() => {
    if (isOpen && enabled) {
      startTimer()
    } else {
      clearTimer()
    }

    return clearTimer
  }, [isOpen, enabled, startTimer, clearTimer])

  // Set up hover listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container || !pauseOnHover || !enabled) return

    const handleMouseEnter = () => {
      pauseTimer()
    }

    const handleMouseLeave = () => {
      resumeTimer()
    }

    container.addEventListener('mouseenter', handleMouseEnter)
    container.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      container.removeEventListener('mouseenter', handleMouseEnter)
      container.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [pauseOnHover, enabled, pauseTimer, resumeTimer])

  // Set up interaction listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container || !resetOnInteraction || !enabled) return

    const handleInteraction = () => {
      resetTimer()
    }

    // Listen for various interaction events
    const events = ['click', 'keydown', 'scroll', 'touchstart']
    
    events.forEach(event => {
      container.addEventListener(event, handleInteraction)
    })

    return () => {
      events.forEach(event => {
        container.removeEventListener(event, handleInteraction)
      })
    }
  }, [resetOnInteraction, enabled, resetTimer])

  // Calculate current remaining time
  const getCurrentRemainingTime = (): number => {
    if (!isOpen || !enabled) return 0
    if (isPausedRef.current) return remainingTimeRef.current
    
    const elapsed = Date.now() - startTimeRef.current
    return Math.max(0, remainingTimeRef.current - elapsed)
  }

  return {
    containerRef,
    resetTimer,
    triggerAutoClose,
    pauseTimer,
    resumeTimer,
    remainingTime: getCurrentRemainingTime(),
    isPaused: isPausedRef.current,
  }
}

/**
 * Hook for auto-close with visual countdown
 */
export function useAutoCloseWithCountdown(
  isOpen: boolean,
  onClose: () => void,
  options: UseAutoCloseOptions & { showCountdown?: boolean } = {}
) {
  const { showCountdown = false, ...autoCloseOptions } = options
  
  const autoClose = useAutoClose(isOpen, onClose, autoCloseOptions)
  
  // Format remaining time for display
  const formatRemainingTime = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000)
    return `${seconds}s`
  }

  return {
    ...autoClose,
    formattedRemainingTime: formatRemainingTime(autoClose.remainingTime),
    showCountdown: showCountdown && isOpen && autoClose.remainingTime > 0,
  }
}
