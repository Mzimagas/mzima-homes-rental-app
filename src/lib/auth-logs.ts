/**
 * Auth logging utilities to reduce console spam
 * Debounces duplicate auth state changes in development
 */

let lastState: string | null = null;
let lastLogTime = 0;
const DEBOUNCE_MS = 1000; // Prevent duplicate logs within 1 second

/**
 * Log auth state changes only once per unique state
 * Prevents React Strict Mode double-logging in development
 */
export function logAuthState(next: string, context?: string) {
  const now = Date.now();
  const stateKey = `${next}:${context || ''}`;
  
  // Skip if same state logged recently (handles React Strict Mode)
  if (process.env.NODE_ENV !== 'production' && 
      stateKey === lastState && 
      (now - lastLogTime) < DEBOUNCE_MS) {
    return;
  }
  
  lastState = stateKey;
  lastLogTime = now;
  
  // Only log in development
  if (process.env.NODE_ENV !== 'production') {
    const prefix = context ? `[${context}]` : '';
    console.info(`${prefix} Auth state: ${next}`);
  }
}

/**
 * Log data fetching with summary instead of per-item logs
 */
export function logDataFetch(source: string, count: number, errors?: number) {
  if (process.env.NODE_ENV !== 'production') {
    const errorText = errors ? ` (${errors} errors)` : '';
    console.info(`📊 ${source}: ${count} items fetched${errorText}`);
  }
}

/**
 * Log performance metrics in development
 */
export function logPerformance(operation: string, duration: number, details?: any) {
  if (process.env.NODE_ENV !== 'production') {
    const detailsText = details ? ` - ${JSON.stringify(details)}` : '';
    console.info(`⚡ ${operation}: ${duration.toFixed(2)}ms${detailsText}`);
  }
}

/**
 * Quiet logger that no-ops in production
 */
export const devLogger = {
  info: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.info(message, ...args);
    }
  },
  warn: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(message, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    // Always log errors, even in production
    console.error(message, ...args);
  }
};

/**
 * Reset logging state (useful for testing)
 */
export function resetAuthLogState() {
  lastState = null;
  lastLogTime = 0;
}
