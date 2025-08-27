# Presentation Layer

The presentation layer contains all UI-related code including React components, pages, hooks, and state management.

## Structure

```
presentation/
├── components/        # React components
│   ├── ui/           # Basic UI components
│   ├── forms/        # Form components
│   ├── layouts/      # Layout components
│   └── features/     # Feature-specific components
├── pages/            # Next.js pages
├── hooks/            # Custom React hooks
├── stores/           # State management (Zustand)
├── providers/        # React context providers
├── utils/            # UI utility functions
└── styles/           # Styling and themes
```

## Principles

1. **Separation of Concerns**: UI logic separated from business logic
2. **Component Composition**: Build complex UIs from simple components
3. **State Management**: Centralized state with proper normalization
4. **Accessibility**: All components follow accessibility guidelines
5. **Performance**: Optimized rendering and bundle size

## Guidelines

- Components should be focused on presentation and user interaction
- Business logic should be delegated to application layer
- State should be managed centrally with Zustand stores
- Components should be reusable and composable
- Follow React best practices and patterns
