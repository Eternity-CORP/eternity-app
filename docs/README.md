# Documentation Structure

This directory contains all project documentation organized by category.

## Directory Layout

```
docs/
├── README.md                 # This file
├── brief.md                  # Project brief/overview
├── testnet-addresses.md      # Testnet configuration reference
│
├── prd/                      # Product Requirements Documents
│   ├── prd.md               # Main PRD document
│   ├── epic-00-*.md         # Epic 0: MVP Foundation
│   ├── epic-01-*.md         # Epic 1: Cross-Chain Stabilization
│   ├── epic-02-*.md         # Epic 2: Mobile Security
│   └── epic-03-to-07-*.md   # Epics 3-7: Summary
│
├── stories/                  # User Stories (per-epic)
│   └── [story files]        # Story-XXX-description.md
│
├── architecture/             # Technical Architecture
│   ├── architecture.md      # Main architecture document
│   ├── coding-standards.md  # Coding guidelines
│   ├── tech-stack.md        # Technology stack details
│   └── source-tree.md       # Project structure reference
│
├── decisions/                # Architecture Decision Records (ADRs)
│   └── ADR-XXX-*.md         # Technical decisions
│
├── api/                      # API Documentation
│   └── API_DOCUMENTATION.md # REST API reference
│
└── qa/                       # Quality Assurance
    └── [test plans]         # Test cases and QA docs
```

## Document Types

### PRD (Product Requirements)
- **Location:** `docs/prd/`
- **Main file:** `prd.md` - Complete product requirements
- **Epics:** `epic-XX-*.md` - Feature epics with user stories

### Stories
- **Location:** `docs/stories/`
- **Format:** `story-XXX-description.md`
- **Content:** Detailed user stories from epics

### Architecture
- **Location:** `docs/architecture/`
- **Main file:** `architecture.md` - System design
- **Supporting:** Tech stack, coding standards, source tree

### Decisions (ADRs)
- **Location:** `docs/decisions/`
- **Format:** `ADR-XXX-title.md`
- **Purpose:** Record significant technical decisions with rationale

### API
- **Location:** `docs/api/`
- **Content:** REST API documentation, endpoints, schemas

## Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Epic | `epic-XX-name.md` | `epic-01-crosschain-stabilization.md` |
| Story | `story-XXX-name.md` | `story-001-lifi-execution.md` |
| ADR | `ADR-XXX-title.md` | `ADR-001-crosschain-aggregator-selection.md` |

## 🔗 Documentation ↔ Code Consistency

Проект использует систему трассировки для поддержания консистентности между документацией и кодом.

### Ключевые файлы
- **[TRACEABILITY.md](TRACEABILITY.md)** — единый источник истины для связей doc↔code
- **[CHANGE-LOG.md](CHANGE-LOG.md)** — журнал изменений

### Команды
```bash
npm run docs:check   # Проверить консистентность
npm run docs:sync    # Инструкции по синхронизации
```

### Workflow
При изменении кода или документации:
1. Запусти `npm run docs:check`
2. Обнови `TRACEABILITY.md` если нужно
3. Добавь запись в `CHANGE-LOG.md`

Подробнее: `.windsurf/workflows/doc-sync.md`

---

## Quick Links

- [Main PRD](prd/prd.md)
- [Architecture](architecture/architecture.md)
- [API Docs](api/API_DOCUMENTATION.md)
- [Testnet Setup](testnet-addresses.md)
- [Traceability Matrix](TRACEABILITY.md)
- [Change Log](CHANGE-LOG.md)

---

**Last Updated:** December 2025
