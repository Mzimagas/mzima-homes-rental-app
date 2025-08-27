# Domain Layer

The domain layer contains the core business logic and rules of the application. It is independent of any external concerns like databases, UI frameworks, or external services.

## Structure

```
domain/
├── entities/           # Core business entities
├── value-objects/      # Value objects and primitives
├── repositories/       # Repository interfaces (contracts)
├── services/          # Domain services
├── events/            # Domain events
├── exceptions/        # Domain-specific exceptions
└── specifications/    # Business rule specifications
```

## Principles

1. **Independence**: No dependencies on external layers
2. **Business Logic**: Contains all core business rules
3. **Immutability**: Entities and value objects are immutable where possible
4. **Rich Domain Model**: Entities contain behavior, not just data
5. **Domain Events**: Use events for decoupled communication

## Guidelines

- Entities should contain business logic and behavior
- Value objects should be immutable and validate their own state
- Repository interfaces define contracts for data access
- Domain services contain business logic that doesn't belong to a single entity
- Use domain events for side effects and cross-aggregate communication
