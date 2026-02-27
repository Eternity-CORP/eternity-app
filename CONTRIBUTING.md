# Contributing to E-Y

Thank you for your interest in contributing to E-Y! This document explains how to contribute and the terms under which contributions are accepted.

## Contributor License Agreement (CLA)

**By submitting a pull request, you agree to the following:**

1. You grant Danylo Lohachov (the "Project Owner") a perpetual, worldwide, non-exclusive, royalty-free, irrevocable license to use, reproduce, modify, distribute, sublicense, and otherwise exploit your contribution in any form.

2. You confirm that your contribution is your original work and that you have the right to grant this license.

3. You understand that your contribution will be licensed under the same Business Source License 1.1 as the rest of the project.

4. The Project Owner retains the right to re-license the project (including your contributions) under different terms in the future.

This CLA ensures that the project can be maintained, protected, and potentially re-licensed if needed, while your contribution will always be credited in the AUTHORS file.

## How to Contribute

### Reporting Bugs

1. Check existing [issues](https://github.com/Eternity-CORP/eternity-app/issues) first
2. Use the bug report template
3. Include: steps to reproduce, expected vs actual behavior, environment details

### Suggesting Features

1. Open a [discussion](https://github.com/Eternity-CORP/eternity-app/discussions) first
2. Describe the problem your feature would solve
3. Wait for feedback before starting implementation

### Submitting Code

1. Fork the repository
2. Create a feature branch from `develop`:
   ```bash
   git checkout -b feature/your-feature develop
   ```
3. Follow our coding standards (see below)
4. Write tests for new functionality
5. Ensure all tests pass:
   ```bash
   pnpm typecheck
   pnpm lint
   pnpm test:api
   ```
6. Commit with clear messages:
   ```
   feat(module): short description

   Longer description if needed.
   ```
7. Push and open a Pull Request against `develop`

### Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Scopes: `mobile`, `web`, `api`, `shared`, `contracts`, `website`

## Coding Standards

### General

- TypeScript for all code
- Files: `kebab-case.ts`
- Components: `PascalCase.tsx`
- Functions: `camelCase()`
- Constants: `SCREAMING_SNAKE_CASE`

### Architecture Rules

- Business logic goes to `packages/shared/` first
- No code duplication between `apps/web/` and `apps/mobile/`
- `packages/shared/` must have zero runtime dependencies
- Follow the structure defined in `docs/v1.0/architecture.md`

### Security

- Never log sensitive data (private keys, seeds, mnemonics)
- Never store secrets in plain storage
- Never send private keys to the server
- Validate all external input

## Code Review

All submissions require review by the project maintainer. We aim to review PRs within 7 days.

### What We Look For

- Adherence to coding standards
- Test coverage for new functionality
- No security vulnerabilities
- Shared-first architecture compliance
- Clear, readable code

## Getting Help

- Open a [Discussion](https://github.com/Eternity-CORP/eternity-app/discussions)
- Tag your issue with `question`

## Recognition

All contributors with merged PRs will be added to the [AUTHORS](./AUTHORS) file.

---

*By contributing to E-Y, you agree to abide by our [Code of Conduct](./CODE_OF_CONDUCT.md) and the CLA terms above.*
