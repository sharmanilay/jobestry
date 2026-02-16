# Contributing to Jobestry

Thank you for your interest in contributing to Jobestry! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)
- [Feature Requests](#feature-requests)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for all contributors.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/your-username/jobestry.git
   cd jobestry
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/original-owner/jobestry.git
   ```

## Development Setup

### Prerequisites

- Node.js >= 22.15.1 (use [nvm](https://github.com/nvm-sh/nvm) if needed)
- pnpm >= 10.11.0 (`npm install -g pnpm`)
- Brave, Chrome or Firefox browser

### Initial Setup

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Build the extension**:
   ```bash
   pnpm dev
   ```

3. **Load in browser**:
   - Chrome: `chrome://extensions` → Enable Developer mode → Load unpacked → Select `dist` folder
   - Firefox: `about:debugging#/runtime/this-firefox` → Load Temporary Add-on → Select `dist/manifest.json`

### Development Workflow

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes** following the code style guidelines

3. **Test your changes**:
   ```bash
   pnpm lint        # Check for linting errors
   pnpm type-check  # Check TypeScript types
   pnpm build       # Ensure build succeeds
   ```

4. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

   Use conventional commit messages:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation
   - `style:` for formatting
   - `refactor:` for code refactoring
   - `test:` for tests
   - `chore:` for maintenance

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request** on GitHub

## Code Style

### TypeScript

- Use TypeScript for all new code
- Avoid `any` types - use proper types or `unknown`
- Use interfaces for object shapes
- Use type aliases for unions and complex types

### React

- Use functional components with hooks
- Prefer named exports over default exports
- Use `useCallback` and `useMemo` appropriately
- Keep components small and focused

### Formatting

- Use Prettier for code formatting (configured in `.prettierrc`)
- Run `pnpm format` before committing
- Use 2 spaces for indentation
- Use single quotes for strings
- Add trailing commas in multi-line structures

### Naming Conventions

- **Components**: PascalCase (`UserProfile.tsx`)
- **Files**: Match component/export name
- **Functions**: camelCase (`handleSubmit`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **Types/Interfaces**: PascalCase (`UserProfile`, `ApiResponse`)

### File Organization

```
component-name/
├── ComponentName.tsx    # Main component
├── ComponentName.css   # Styles (if needed)
├── ComponentName.test.tsx  # Tests (if needed)
└── index.ts            # Exports
```

## Making Changes

### Before You Start

1. **Check existing issues** to see if your feature/bug is already being worked on
2. **Create an issue** for significant changes to discuss the approach
3. **Keep changes focused** - one feature or bug fix per PR

### Code Quality

- **Write clear, self-documenting code**
- **Add comments** for complex logic
- **Remove unused code** and imports
- **Handle errors** appropriately
- **Add error boundaries** for React components

### Testing

- Test your changes manually in the browser
- Ensure all existing tests pass: `pnpm test` (if available)
- Test edge cases and error scenarios
- Verify the extension works in both Chrome and Firefox

### Performance

- Avoid unnecessary re-renders
- Use `useMemo` and `useCallback` for expensive operations
- Keep bundle size in mind
- Optimize API calls (use caching where appropriate)

## Pull Request Process

### Before Submitting

1. **Update documentation** if needed
2. **Add/update tests** if applicable
3. **Run linting and type checking**: `pnpm lint && pnpm type-check`
4. **Ensure build succeeds**: `pnpm build`
5. **Test in browser** - verify your changes work as expected

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
How to test these changes

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Tests added/updated (if applicable)
```

### Review Process

1. **Automated checks** must pass (linting, type checking, build)
2. **Code review** by maintainers
3. **Address feedback** and update PR as needed
4. **Squash commits** if requested before merge

## Reporting Issues

### Bug Reports

Use the bug report template and include:

- **Description**: Clear description of the bug
- **Steps to Reproduce**: Detailed steps to reproduce
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Screenshots**: If applicable
- **Environment**: Browser, OS, extension version
- **Console Errors**: Any errors from browser console

### Security Issues

**Do not** open a public issue for security vulnerabilities. Instead:
- Email security concerns privately
- Include steps to reproduce
- We'll respond promptly and work on a fix

## Feature Requests

When requesting a feature:

1. **Check existing issues** to avoid duplicates
2. **Describe the use case** - why is this feature needed?
3. **Propose a solution** - how should it work?
4. **Consider alternatives** - are there simpler solutions?

## Project Structure

Understanding the project structure helps with contributions:

- `chrome-extension/` - Extension manifest and background scripts
- `pages/` - Extension pages (popup, options, content scripts)
- `packages/` - Shared packages and utilities
- `docs/` - Documentation files

See [ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detailed architecture information.

## Getting Help

- **Questions?** Open a discussion on GitHub
- **Stuck?** Check existing issues and discussions
- **Need clarification?** Ask in your PR or issue

## Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- GitHub contributors page

Thank you for contributing to Jobestry! 🎉
