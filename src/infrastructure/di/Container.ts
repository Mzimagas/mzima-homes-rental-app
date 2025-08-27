/**
 * Dependency Injection Container
 * Manages application dependencies and their lifecycles
 */

import { SupabaseClient } from '@supabase/supabase-js'

// Domain
import { PropertyRepository } from '../../domain/repositories/PropertyRepository'
import { TenantRepository } from '../../domain/repositories/TenantRepository'
import { PropertyDomainService } from '../../domain/services/PropertyDomainService'

// Application
import { CreatePropertyCommand } from '../../application/use-cases/commands/CreatePropertyCommand'
import { GetPropertiesQuery } from '../../application/use-cases/queries/GetPropertiesQuery'
import { DomainEventPublisher } from '../../application/interfaces/DomainEventPublisher'

// Infrastructure
import { SupabasePropertyRepository } from '../repositories/SupabasePropertyRepository'
import { InMemoryEventPublisher } from '../events/InMemoryEventPublisher'

export interface ContainerDependencies {
  supabaseClient: SupabaseClient
}

export class Container {
  private dependencies: Map<string, any> = new Map()
  private singletons: Map<string, any> = new Map()

  constructor(deps: ContainerDependencies) {
    this.dependencies.set('supabaseClient', deps.supabaseClient)
    this.setupDependencies()
  }

  private setupDependencies(): void {
    // Repositories
    this.register('propertyRepository', () => 
      new SupabasePropertyRepository(this.get('supabaseClient'))
    )

    // Domain Services
    this.register('propertyDomainService', () => 
      new PropertyDomainService(this.get('propertyRepository'))
    )

    // Infrastructure Services
    this.register('eventPublisher', () => 
      new InMemoryEventPublisher()
    )

    // Application Use Cases - Commands
    this.register('createPropertyCommand', () => 
      new CreatePropertyCommand(
        this.get('propertyRepository'),
        this.get('propertyDomainService'),
        this.get('eventPublisher')
      )
    )

    // Application Use Cases - Queries
    this.register('getPropertiesQuery', () => 
      new GetPropertiesQuery(this.get('propertyRepository'))
    )
  }

  register<T>(name: string, factory: () => T, singleton: boolean = true): void {
    this.dependencies.set(name, { factory, singleton })
  }

  get<T>(name: string): T {
    const dependency = this.dependencies.get(name)
    
    if (!dependency) {
      throw new Error(`Dependency '${name}' not found`)
    }

    // Handle direct values (like supabaseClient)
    if (typeof dependency !== 'object' || !dependency.factory) {
      return dependency
    }

    // Handle singleton pattern
    if (dependency.singleton) {
      if (!this.singletons.has(name)) {
        this.singletons.set(name, dependency.factory())
      }
      return this.singletons.get(name)
    }

    // Create new instance
    return dependency.factory()
  }

  // Convenience methods for common dependencies
  getPropertyRepository(): PropertyRepository {
    return this.get<PropertyRepository>('propertyRepository')
  }

  getTenantRepository(): TenantRepository {
    return this.get<TenantRepository>('tenantRepository')
  }

  getPropertyDomainService(): PropertyDomainService {
    return this.get<PropertyDomainService>('propertyDomainService')
  }

  getEventPublisher(): DomainEventPublisher {
    return this.get<DomainEventPublisher>('eventPublisher')
  }

  getCreatePropertyCommand(): CreatePropertyCommand {
    return this.get<CreatePropertyCommand>('createPropertyCommand')
  }

  getGetPropertiesQuery(): GetPropertiesQuery {
    return this.get<GetPropertiesQuery>('getPropertiesQuery')
  }

  // Lifecycle management
  dispose(): void {
    this.singletons.clear()
    this.dependencies.clear()
  }

  // Health check
  validateDependencies(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []
    const requiredDependencies = [
      'supabaseClient',
      'propertyRepository',
      'propertyDomainService',
      'eventPublisher',
      'createPropertyCommand',
      'getPropertiesQuery'
    ]

    for (const dep of requiredDependencies) {
      try {
        this.get(dep)
      } catch (error) {
        errors.push(`Missing dependency: ${dep}`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

// Global container instance
let globalContainer: Container | null = null

export function initializeContainer(deps: ContainerDependencies): Container {
  globalContainer = new Container(deps)
  return globalContainer
}

export function getContainer(): Container {
  if (!globalContainer) {
    throw new Error('Container not initialized. Call initializeContainer first.')
  }
  return globalContainer
}

export function disposeContainer(): void {
  if (globalContainer) {
    globalContainer.dispose()
    globalContainer = null
  }
}
