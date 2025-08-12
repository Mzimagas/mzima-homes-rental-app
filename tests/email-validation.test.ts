import { describe, it, expect } from 'vitest'
import { validateEmailSimple } from '../src/lib/email-validation'

describe('validateEmailSimple', () => {
  it('rejects empty and invalid emails', () => {
    expect(validateEmailSimple('')).toBeTruthy()
    expect(validateEmailSimple('foo')).toBeTruthy()
    expect(validateEmailSimple('a@b')).toBeTruthy()
  })
  it('rejects example/test domains', () => {
    expect(validateEmailSimple('user@example.com')).toBeTruthy()
    expect(validateEmailSimple('user@test.com')).toBeTruthy()
  })
  it('accepts normal emails', () => {
    expect(validateEmailSimple('user@gmail.com')).toBeNull()
  })
})

