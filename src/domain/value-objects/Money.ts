/**
 * Money Value Object
 * Represents monetary values with currency and precision handling
 */

export type Currency = 'KES' | 'USD' | 'EUR' | 'GBP'

export class Money {
  private readonly _amount: number
  private readonly _currency: Currency

  constructor(amount: number, currency: Currency = 'KES') {
    if (amount < 0) {
      throw new Error('Money amount cannot be negative')
    }
    
    if (!Number.isFinite(amount)) {
      throw new Error('Money amount must be a finite number')
    }

    // Round to 2 decimal places to avoid floating point issues
    this._amount = Math.round(amount * 100) / 100
    this._currency = currency
  }

  get amount(): number {
    return this._amount
  }

  get currency(): Currency {
    return this._currency
  }

  // Arithmetic operations
  add(other: Money): Money {
    this.ensureSameCurrency(other)
    return new Money(this._amount + other._amount, this._currency)
  }

  subtract(other: Money): Money {
    this.ensureSameCurrency(other)
    const result = this._amount - other._amount
    if (result < 0) {
      throw new Error('Cannot subtract to negative amount')
    }
    return new Money(result, this._currency)
  }

  multiply(factor: number): Money {
    if (factor < 0) {
      throw new Error('Cannot multiply money by negative factor')
    }
    return new Money(this._amount * factor, this._currency)
  }

  divide(divisor: number): Money {
    if (divisor <= 0) {
      throw new Error('Cannot divide money by zero or negative number')
    }
    return new Money(this._amount / divisor, this._currency)
  }

  // Comparison operations
  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency
  }

  isGreaterThan(other: Money): boolean {
    this.ensureSameCurrency(other)
    return this._amount > other._amount
  }

  isLessThan(other: Money): boolean {
    this.ensureSameCurrency(other)
    return this._amount < other._amount
  }

  isGreaterThanOrEqual(other: Money): boolean {
    this.ensureSameCurrency(other)
    return this._amount >= other._amount
  }

  isLessThanOrEqual(other: Money): boolean {
    this.ensureSameCurrency(other)
    return this._amount <= other._amount
  }

  isZero(): boolean {
    return this._amount === 0
  }

  // Utility methods
  toString(): string {
    return `${this._currency} ${this._amount.toFixed(2)}`
  }

  toJSON(): { amount: number; currency: Currency } {
    return {
      amount: this._amount,
      currency: this._currency
    }
  }

  // Static factory methods
  static zero(currency: Currency = 'KES'): Money {
    return new Money(0, currency)
  }

  static fromCents(cents: number, currency: Currency = 'KES'): Money {
    return new Money(cents / 100, currency)
  }

  static fromString(value: string, currency: Currency = 'KES'): Money {
    const amount = parseFloat(value)
    if (isNaN(amount)) {
      throw new Error('Invalid money string format')
    }
    return new Money(amount, currency)
  }

  private ensureSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(`Cannot operate on different currencies: ${this._currency} and ${other._currency}`)
    }
  }
}
