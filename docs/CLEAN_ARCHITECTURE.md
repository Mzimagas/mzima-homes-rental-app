# Clean Architecture Implementation

This document describes the clean architecture implementation in the Mzima Homes rental management application.

## Architecture Overview

The application follows clean architecture principles with clear separation of concerns across four main layers:

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                       │
│  React Components, Pages, Hooks, State Management          │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                         │
│     Use Cases, Commands, Queries, DTOs, Mappers            │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                     Domain Layer                            │
│   Entities, Value Objects, Domain Services, Events         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                 Infrastructure Layer                        │
│  Repositories, External APIs, Database, Event Publishers   │
└─────────────────────────────────────────────────────────────┘
```

## Layer Responsibilities

### Domain Layer (`src/domain/`)

**Purpose**: Contains the core business logic and rules

**Components**:
- **Entities**: Core business objects with identity and behavior
- **Value Objects**: Immutable objects that describe aspects of the domain
- **Domain Services**: Business logic that doesn't belong to a single entity
- **Repository Interfaces**: Contracts for data access
- **Domain Events**: Events that represent business occurrences

**Key Principles**:
- No dependencies on external layers
- Rich domain model with behavior
- Immutable value objects
- Domain events for decoupled communication

### Application Layer (`src/application/`)

**Purpose**: Orchestrates domain objects and coordinates workflows

**Components**:
- **Use Cases**: Single business operations (Commands and Queries)
- **Application Services**: Coordinate multiple domain services
- **DTOs**: Data transfer objects for external communication
- **Mappers**: Convert between domain objects and DTOs
- **Interfaces**: Contracts for external dependencies

**Key Principles**:
- CQRS pattern (Commands for writes, Queries for reads)
- Transaction boundary management
- Input validation and business rule enforcement
- Event handling and side effects

### Infrastructure Layer (`src/infrastructure/`)

**Purpose**: Implements external concerns and adapters

**Components**:
- **Repository Implementations**: Data access implementations
- **External Service Adapters**: Third-party API integrations
- **Event Publishers**: Event handling implementations
- **Configuration**: Environment and dependency setup
- **Dependency Injection**: Container and service registration

**Key Principles**:
- Adapter pattern for external services
- Configuration management
- Dependency injection
- Error handling and logging

### Presentation Layer (`src/presentation/`)

**Purpose**: User interface and interaction handling

**Components**:
- **React Components**: UI components and layouts
- **Pages**: Next.js pages and routing
- **Hooks**: Custom React hooks for UI logic
- **State Management**: Zustand stores for UI state
- **Providers**: React context providers

**Key Principles**:
- Separation of UI and business logic
- Component composition
- Centralized state management
- Accessibility and performance

## Key Patterns

### Domain-Driven Design (DDD)

- **Entities**: `Property`, `Tenant` with rich behavior
- **Value Objects**: `Money`, `Address`, `DateRange`
- **Aggregates**: Property aggregate with units and leases
- **Domain Events**: `PropertyCreated`, `TenantMoved`

### CQRS (Command Query Responsibility Segregation)

- **Commands**: Write operations (`CreatePropertyCommand`)
- **Queries**: Read operations (`GetPropertiesQuery`)
- **Separate models**: Optimized for reads vs writes

### Repository Pattern

- **Interfaces**: Defined in domain layer
- **Implementations**: In infrastructure layer
- **Abstraction**: Domain doesn't know about data storage

### Dependency Injection

- **Container**: Manages all dependencies
- **Interfaces**: Define contracts
- **Implementations**: Injected at runtime

## Example Usage

### Creating a Property

```typescript
// 1. Get dependencies from container
const container = getContainer()
const createPropertyCommand = container.getCreatePropertyCommand()

// 2. Execute use case
const result = await createPropertyCommand.execute({
  name: "Sunset Apartments",
  address: {
    street: "123 Main St",
    city: "Nairobi",
    country: "Kenya"
  },
  propertyType: "APARTMENT",
  ownerId: "user123"
})

// 3. Handle result
if (result.success) {
  console.log(`Property created with ID: ${result.propertyId}`)
} else {
  console.error('Errors:', result.errors)
}
```

### Querying Properties

```typescript
// 1. Get query handler
const getPropertiesQuery = container.getGetPropertiesQuery()

// 2. Execute query
const result = await getPropertiesQuery.execute({
  ownerId: "user123",
  status: "AVAILABLE",
  page: 1,
  limit: 20
})

// 3. Use results
if (result.success) {
  const { properties, pagination } = result.data!
  console.log(`Found ${properties.length} properties`)
}
```

## Benefits

### Maintainability
- Clear separation of concerns
- Easy to understand and modify
- Testable components

### Flexibility
- Easy to swap implementations
- Framework-independent business logic
- Scalable architecture

### Testability
- Domain logic isolated from external dependencies
- Easy to mock dependencies
- Unit tests for business logic

### Performance
- CQRS allows optimization for reads and writes
- Lazy loading and caching strategies
- Event-driven architecture

## Migration Strategy

The clean architecture is being implemented incrementally:

1. **Phase 1**: Core domain entities and value objects
2. **Phase 2**: Repository interfaces and basic use cases
3. **Phase 3**: Infrastructure implementations
4. **Phase 4**: Presentation layer refactoring
5. **Phase 5**: Advanced patterns (Event Sourcing, CQRS optimization)

## Testing Strategy

### Unit Tests
- Domain entities and value objects
- Domain services business logic
- Use case orchestration

### Integration Tests
- Repository implementations
- External service adapters
- End-to-end workflows

### Architecture Tests
- Dependency direction validation
- Layer isolation verification
- Interface compliance checking

## Best Practices

1. **Keep domain pure**: No external dependencies in domain layer
2. **Use value objects**: For concepts without identity
3. **Rich domain model**: Entities contain behavior, not just data
4. **Event-driven**: Use domain events for decoupled communication
5. **CQRS**: Separate read and write models
6. **Dependency injection**: Use container for all dependencies
7. **Interface segregation**: Small, focused interfaces
8. **Single responsibility**: Each class has one reason to change
