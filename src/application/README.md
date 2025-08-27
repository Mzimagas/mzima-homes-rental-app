# Application Layer

The application layer orchestrates the domain layer and coordinates application workflows. It contains use cases, application services, and DTOs.

## Structure

```
application/
├── use-cases/         # Application use cases (commands/queries)
│   ├── commands/      # Write operations (CQRS commands)
│   └── queries/       # Read operations (CQRS queries)
├── services/          # Application services
├── dto/              # Data Transfer Objects
├── mappers/          # Domain <-> DTO mappers
├── validators/       # Input validation
├── interfaces/       # Application service interfaces
└── events/           # Application event handlers
```

## Principles

1. **Orchestration**: Coordinates domain objects and services
2. **Use Cases**: Each use case represents a single business operation
3. **Transaction Management**: Handles transaction boundaries
4. **Validation**: Input validation and business rule enforcement
5. **Event Handling**: Handles domain events and triggers side effects
6. **CQRS**: Separates command (write) and query (read) operations

## Guidelines

- Use cases should be focused on a single business operation
- Commands handle write operations and business logic
- Queries handle read operations and data projection
- Application services coordinate multiple domain services
- DTOs should be simple data containers
- Mappers handle conversion between domain and DTO objects
- Validators ensure input data meets business requirements
