import { useEffect, useRef, useCallback } from 'react'

interface UseClickOutsideOptions {
  /**
   * Whether click-outside is enabled
   * @default true
   */
  enabled?: boolean

  /**
   * Callback function to execute when clicking outside
   */
  onClickOutside?: () => void

  /**
   * Array of refs to exclude from click-outside detection
   * Useful for trigger buttons that should not close the content
   */
  excludeRefs?: React.RefObject<HTMLElement>[]

  /**
   * Whether to capture events during the capture phase
   * @default true
   */
  capture?: boolean
}

interface UseClickOutsideReturn {
  /**
   * Ref to attach to the container element
   */
  containerRef: React.RefObject<HTMLDivElement>

  /**
   * Manually trigger click-outside behavior
   */
  triggerClickOutside: () => void
}

/**
 * Custom hook for click-outside auto-closing expandable content
 *
 * Features:
 * - Click outside to close
 * - Exclude specific elements from triggering close
 * - Configurable event capture phase
 * - Manual trigger method
 *
 * @param isOpen - Whether the content is currently open
 * @param onClose - Function to call when closing
 * @param options - Configuration options
 */
export function useClickOutside(
  isOpen: boolean,
  onClose: () => void,
  options: UseClickOutsideOptions = {}
): UseClickOutsideReturn {
  const {
    enabled = true,
    onClickOutside,
    excludeRefs = [],
    capture = true,
  } = options

  const containerRef = useRef<HTMLDivElement>(null)

  // Handle click outside
  const handleClickOutside = useCallback((event: MouseEvent | TouchEvent) => {
    if (!enabled || !isOpen) return

    const target = event.target as Node
    const container = containerRef.current

    // Check if click is inside the container
    if (container && container.contains(target)) {
      return
    }

    // Check if click is inside any excluded elements
    const isInsideExcluded = excludeRefs.some(ref =>
      ref.current && ref.current.contains(target)
    )

    if (isInsideExcluded) {
      return
    }

    // Click is outside - trigger close
    onClickOutside?.()
    onClose()
  }, [enabled, isOpen, onClose, onClickOutside, excludeRefs])

  // Trigger click-outside manually
  const triggerClickOutside = useCallback(() => {
    if (enabled && isOpen) {
      onClickOutside?.()
      onClose()
    }
  }, [enabled, isOpen, onClose, onClickOutside])

  // Set up click-outside listeners
  useEffect(() => {
    if (!enabled || !isOpen) return

    // Add event listeners for click and touch events
    const events = ['mousedown', 'touchstart'] as const

    events.forEach(eventType => {
      document.addEventListener(eventType, handleClickOutside, capture)
    })

    return () => {
      events.forEach(eventType => {
        document.removeEventListener(eventType, handleClickOutside, capture)
      })
    }
  }, [enabled, isOpen, handleClickOutside, capture])

  return {
    containerRef,
    triggerClickOutside,
  }
}

/**
 * Simplified hook that just returns the container ref for click-outside behavior
 * Useful when you don't need the manual trigger function
 */
export function useClickOutsideRef(
  isOpen: boolean,
  onClose: () => void,
  options: UseClickOutsideOptions = {}
) {
  const { containerRef } = useClickOutside(isOpen, onClose, options)
  return containerRef
}

// Export the main hook with a more intuitive name for backward compatibility
export const useAutoClose = useClickOutside
export const useAutoCloseWithCountdown = useClickOutside
