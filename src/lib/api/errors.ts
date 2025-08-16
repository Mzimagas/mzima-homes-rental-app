import { NextResponse } from 'next/server'

export type ApiErrorCode = 'UNAUTHORIZED' | 'FORBIDDEN' | 'CSRF' | 'RATE_LIMIT' | 'VALIDATION' | 'BAD_REQUEST' | 'INTERNAL'

export function errorJson(code: ApiErrorCode, message: string, status: number, details?: unknown) {
  return NextResponse.json({ ok: false, code, message, details }, { status })
}

export const errors = {
  unauthorized: (msg = 'Not authenticated') => errorJson('UNAUTHORIZED', msg, 401),
  forbidden: (msg = 'Not allowed') => errorJson('FORBIDDEN', msg, 403),
  csrf: () => errorJson('CSRF', 'CSRF verification failed', 403),
  rate: () => errorJson('RATE_LIMIT', 'Too many requests', 429),
  badRequest: (msg = 'Bad request', details?: unknown) => errorJson('BAD_REQUEST', msg, 400, details),
  validation: (details?: unknown) => errorJson('VALIDATION', 'Invalid payload', 400, details),
  internal: (msg = 'Internal server error') => errorJson('INTERNAL', msg, 500),
}

