# Security Policy

## Reporting a Vulnerability

E-Y handles cryptocurrency and user funds. We take security extremely seriously.

**DO NOT open a public GitHub issue for security vulnerabilities.**

### How to Report

Send an email to: **eternaki@proton.me**

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### What to Expect

- **Acknowledgement**: Within 48 hours
- **Initial assessment**: Within 7 days
- **Fix timeline**: Depends on severity (critical: ASAP, high: 14 days, medium: 30 days)

### Scope

The following are in scope:
- Smart contracts (`contracts/`)
- API server (`apps/api/`)
- Mobile app (`apps/mobile/`)
- Web app (`apps/web/`)
- Shared packages (`packages/`)

The following are out of scope:
- Third-party dependencies (report to their maintainers)
- Social engineering attacks
- Denial of service attacks

### Recognition

We will credit security researchers in our CHANGELOG (with permission) and are open to discussing bounties for critical vulnerabilities on a case-by-case basis.

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest on `main` | Yes |
| Development (`develop`) | Best effort |
| Older releases | No |

## Security Best Practices for Contributors

- Never commit `.env` files, private keys, or secrets
- Use `expo-secure-store` for sensitive data on mobile
- Validate and sanitize all user input
- Follow the principle of least privilege
- Use parameterized queries for database access
