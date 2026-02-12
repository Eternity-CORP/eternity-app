---
description: Build, type-check, commit, push, and deploy to Vercel and Railway
---

# Deploy Workflow

Follow these steps in order:

1. **Type check** — Run `npx tsc --noEmit` from the monorepo root and fix any type errors found
2. **Build** — Run the build command (`pnpm --filter <app> build`) and verify success
3. **Commit & Push** — Git add changed files, commit with a descriptive message, and push to remote
4. **Deploy frontend** — Run `vercel --prod` from the correct directory:
   - **Web App** (`apps/web/`): deploy from **monorepo root** → https://e-y-app.vercel.app
   - **Website** (`apps/website/`): deploy from `apps/website/` → https://eternity-wallet.vercel.app
5. **Deploy backend** (if API changes): Run `railway up -d` from monorepo root → e-y-api service
6. **Confirm** — Report deployment URLs and verify they are live

Ask the user which app(s) to deploy if not obvious from context.
