/**
 * Unit of Work Interface
 * Defines the contract for transaction management
 */

export interface UnitOfWork {
  begin(): Promise<void>
  commit(): Promise<void>
  rollback(): Promise<void>
  isActive(): boolean
}

export interface UnitOfWorkFactory {
  create(): UnitOfWork
}
