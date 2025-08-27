import { useEffect, useRef, useState } from 'react'

interface SwipeGestureOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
  preventScroll?: boolean
}

interface TouchPosition {
  x: number
  y: number
}

/**
 * Custom hook for handling swipe gestures on mobile devices
 */
export function useSwipeGesture(options: SwipeGestureOptions) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    preventScroll = false,
  } = options

  const touchStart = useRef<TouchPosition | null>(null)
  const touchEnd = useRef<TouchPosition | null>(null)
  const [isSwiping, setIsSwiping] = useState(false)

  const handleTouchStart = (e: TouchEvent) => {
    touchEnd.current = null
    touchStart.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    }
    setIsSwiping(true)
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (!touchStart.current) return

    touchEnd.current = {
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    }

    // Prevent scroll if needed
    if (preventScroll) {
      const deltaX = Math.abs(touchEnd.current.x - touchStart.current.x)
      const deltaY = Math.abs(touchEnd.current.y - touchStart.current.y)

      // If horizontal swipe is more significant than vertical, prevent scroll
      if (deltaX > deltaY && deltaX > 10) {
        e.preventDefault()
      }
    }
  }

  const handleTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) {
      setIsSwiping(false)
      return
    }

    const deltaX = touchStart.current.x - touchEnd.current.x
    const deltaY = touchStart.current.y - touchEnd.current.y
    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)

    // Determine if it's a horizontal or vertical swipe
    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (absDeltaX > threshold) {
        if (deltaX > 0) {
          onSwipeLeft?.()
        } else {
          onSwipeRight?.()
        }
      }
    } else {
      // Vertical swipe
      if (absDeltaY > threshold) {
        if (deltaY > 0) {
          onSwipeUp?.()
        } else {
          onSwipeDown?.()
        }
      }
    }

    setIsSwiping(false)
    touchStart.current = null
    touchEnd.current = null
  }

  const swipeHandlers: React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLDivElement>,
    HTMLDivElement
  > = {
    onTouchStart: handleTouchStart as any,
    onTouchMove: handleTouchMove as any,
    onTouchEnd: handleTouchEnd as any,
  }

  return {
    swipeHandlers,
    isSwiping,
  }
}

/**
 * Hook for sidebar swipe gestures
 */
export function useSidebarSwipe(isOpen: boolean, onOpen: () => void, onClose: () => void) {
  const { swipeHandlers } = useSwipeGesture({
    onSwipeRight: () => {
      if (!isOpen) {
        onOpen()
      }
    },
    onSwipeLeft: () => {
      if (isOpen) {
        onClose()
      }
    },
    threshold: 50,
    preventScroll: true,
  })

  useEffect(() => {
    // Add edge swipe detection for opening sidebar
    const handleEdgeSwipe = (e: TouchEvent) => {
      if (isOpen) return

      const touch = e.touches[0]
      const edgeThreshold = 20 // pixels from edge

      if (touch.clientX <= edgeThreshold) {
        // Start tracking for potential swipe from left edge
        const startX = touch.clientX

        const handleMove = (moveEvent: TouchEvent) => {
          const currentTouch = moveEvent.touches[0]
          const deltaX = currentTouch.clientX - startX

          if (deltaX > 50) {
            onOpen()
            document.removeEventListener('touchmove', handleMove)
            document.removeEventListener('touchend', handleEnd)
          }
        }

        const handleEnd = () => {
          document.removeEventListener('touchmove', handleMove)
          document.removeEventListener('touchend', handleEnd)
        }

        document.addEventListener('touchmove', handleMove)
        document.addEventListener('touchend', handleEnd)
      }
    }

    document.addEventListener('touchstart', handleEdgeSwipe)

    return () => {
      document.removeEventListener('touchstart', handleEdgeSwipe)
    }
  }, [isOpen, onOpen])

  return swipeHandlers
}
