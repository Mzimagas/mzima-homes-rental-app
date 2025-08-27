# Development Guide

## Getting Started

This project uses advanced development tooling to ensure code quality, consistency, and maintainability.

## Prerequisites

- Node.js 18+ and npm
- Git
- VS Code (recommended)

## Setup

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd mzima-homes-rental-app
   npm install
   ```

2. **Install recommended VS Code extensions:**
   - Open VS Code
   - Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
   - Type "Extensions: Show Recommended Extensions"
   - Install all recommended extensions

## Development Workflow

### Code Quality Tools

#### ESLint
- **Configuration**: `.eslintrc.json`
- **Run manually**: `npm run lint`
- **Fix automatically**: `npm run lint:fix`
- **Strict mode**: `npm run lint:strict`

#### Prettier
- **Configuration**: `.prettierrc.json`
- **Format all files**: `npm run format`
- **Check formatting**: `npm run format:check`

#### TypeScript
- **Type checking**: `npm run typecheck`
- **Watch mode**: `npm run typecheck:watch`

### Git Hooks

#### Pre-commit Hook
Automatically runs before each commit:
- Lints and fixes staged files
- Runs type checking
- Runs tests on staged files

#### Commit Message Hook
Validates commit messages using conventional commit format:
- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `style: format code`
- `refactor: restructure code`
- `test: add tests`
- `chore: update dependencies`

### Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Examples:**
```bash
feat(auth): add multi-factor authentication
fix(payments): resolve M-PESA integration issue
docs: update API documentation
style: format payment components
refactor(properties): extract property validation logic
test(auth): add login flow tests
chore: update dependencies
```

### Available Scripts

#### Development
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

#### Code Quality
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues
- `npm run lint:strict` - Run strict ESLint rules
- `npm run format` - Format all files with Prettier
- `npm run format:check` - Check if files are formatted
- `npm run typecheck` - Run TypeScript type checking
- `npm run typecheck:watch` - Run TypeScript in watch mode

#### Testing
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run test:staged` - Run tests on staged files
- `npm run e2e` - Run end-to-end tests
- `npm run e2e:ui` - Run E2E tests with UI
- `npm run e2e:headed` - Run E2E tests in headed mode

#### Utilities
- `npm run validate` - Run all quality checks
- `npm run clean` - Clean build artifacts
- `npm run clean:all` - Clean everything including node_modules
- `npm run reinstall` - Clean and reinstall dependencies
- `npm run check-updates` - Check for dependency updates
- `npm run update-deps` - Update all dependencies

### Code Style Guidelines

#### File Organization
```
src/
├── app/                 # Next.js app directory
├── components/          # Reusable components
│   ├── ui/             # Basic UI components
│   ├── forms/          # Form components
│   └── layout/         # Layout components
├── lib/                # Utility libraries
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── styles/             # Global styles
```

#### Import Order
Imports are automatically organized by ESLint:
1. Built-in modules
2. External libraries
3. Internal modules
4. Parent directory imports
5. Sibling imports
6. Index imports

#### Naming Conventions
- **Files**: kebab-case (`user-management.tsx`)
- **Components**: PascalCase (`UserManagement`)
- **Functions**: camelCase (`getUserData`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Types/Interfaces**: PascalCase (`UserData`, `ApiResponse`)

#### Component Structure
```typescript
// 1. Imports
import React from 'react'
import { Button } from '@/components/ui/Button'

// 2. Types
interface Props {
  title: string
  onSubmit: () => void
}

// 3. Component
export function MyComponent({ title, onSubmit }: Props) {
  // 4. Hooks
  const [loading, setLoading] = useState(false)

  // 5. Event handlers
  const handleSubmit = () => {
    setLoading(true)
    onSubmit()
  }

  // 6. Render
  return (
    <div>
      <h1>{title}</h1>
      <Button onClick={handleSubmit} disabled={loading}>
        Submit
      </Button>
    </div>
  )
}
```

### Error Handling

#### Error Boundaries
Use the enhanced ErrorBoundary component:
```typescript
<ErrorBoundary
  enableRetry={true}
  retryAttempts={3}
  category="ui"
  onError={(error, errorInfo) => {
    // Custom error handling
  }}
>
  <MyComponent />
</ErrorBoundary>
```

#### Error Messages
Use the ErrorMessage component for user-friendly errors:
```typescript
<ErrorMessage
  error={error}
  showRetry={true}
  onRetry={handleRetry}
  onDismiss={clearError}
/>
```

### Performance Guidelines

1. **Use React.memo for expensive components**
2. **Implement proper loading states**
3. **Use the retry service for API calls**
4. **Optimize images with next/image**
5. **Implement proper error boundaries**

### Testing Guidelines

#### Unit Tests
- Test component behavior, not implementation
- Use meaningful test descriptions
- Mock external dependencies
- Test error states and edge cases

#### Integration Tests
- Test user workflows
- Test API integrations
- Test error handling

#### E2E Tests
- Test critical user journeys
- Test across different browsers
- Test mobile responsiveness

### Troubleshooting

#### Common Issues

**ESLint errors:**
```bash
npm run lint:fix
```

**TypeScript errors:**
```bash
npm run typecheck
```

**Formatting issues:**
```bash
npm run format
```

**Pre-commit hook failing:**
```bash
# Fix the issues manually, then:
git add .
git commit -m "fix: resolve pre-commit issues"
```

**Dependency issues:**
```bash
npm run reinstall
```

### VS Code Configuration

The project includes VS Code settings for:
- Automatic formatting on save
- ESLint integration
- TypeScript support
- Tailwind CSS IntelliSense
- Recommended extensions

### Contributing

1. Create a feature branch from `main`
2. Make your changes following the style guidelines
3. Ensure all tests pass: `npm run validate`
4. Commit using conventional commit format
5. Push and create a pull request

### Quality Gates

The project includes automated quality gates that enforce code standards:

#### Running Quality Gates
```bash
# Run all quality gates
npm run quality-gate

# Run quality gates in CI mode
npm run quality-gate:ci

# Generate quality dashboard
npm run quality-dashboard

# Security audit
npm run security-audit

# Fix security issues
npm run security-fix
```

#### Quality Gate Thresholds

**Coverage Requirements:**
- Global: 80% lines, functions, branches, statements
- Components: 85% coverage
- Utilities: 90% coverage

**Complexity Limits:**
- Cognitive complexity: ≤ 15
- Function length: ≤ 300 lines
- Function parameters: ≤ 4
- Nesting depth: ≤ 4

**Security Standards:**
- Zero high/critical vulnerabilities
- Dependency license compliance
- No security hotspots

#### Quality Gate Workflow

1. **Pre-commit**: Runs lint-staged and basic checks
2. **Pre-push**: Runs full quality gate analysis
3. **CI/CD**: Comprehensive quality gates with reporting
4. **Dashboard**: Visual quality metrics and trends

#### Quality Gate Configuration

Quality gates are configured in `.qualitygate.json`:
- Coverage thresholds
- Complexity limits
- Security requirements
- Exclusion patterns

### Resources

- [Conventional Commits](https://www.conventionalcommits.org/)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Configuration](https://prettier.io/docs/en/configuration.html)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
- [SonarJS Rules](https://github.com/SonarSource/eslint-plugin-sonarjs)
- [Vitest Coverage](https://vitest.dev/guide/coverage.html)
