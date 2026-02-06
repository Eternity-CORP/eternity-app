# =============================================================================
# E-Y API Dockerfile - Multi-stage build for NestJS from monorepo root
# Build context: monorepo root (.)
# Usage: docker build -f apps/api/Dockerfile .
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Base - Install pnpm and set up the monorepo
# ---------------------------------------------------------------------------
FROM node:22-slim AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

WORKDIR /app

# ---------------------------------------------------------------------------
# Stage 2: Dependencies - Install all dependencies (for building)
# ---------------------------------------------------------------------------
FROM base AS deps

# Copy workspace configuration files
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY turbo.json ./

# Copy package.json files for workspace packages we need
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# ---------------------------------------------------------------------------
# Stage 3: Build - Build shared packages and the API
# ---------------------------------------------------------------------------
FROM deps AS build

# Copy shared package source and build it
COPY packages/shared/src ./packages/shared/src
COPY packages/shared/tsconfig.json ./packages/shared/tsconfig.json
RUN pnpm --filter @e-y/shared build

# Copy API source files (not node_modules or dist)
COPY apps/api/src ./apps/api/src
COPY apps/api/tsconfig.json ./apps/api/tsconfig.json
COPY apps/api/tsconfig.build.json ./apps/api/tsconfig.build.json
COPY apps/api/nest-cli.json ./apps/api/nest-cli.json
RUN pnpm --filter @e-y/api build

# Prune dev dependencies after build, keeping only production deps
RUN pnpm prune --prod

# ---------------------------------------------------------------------------
# Stage 4: Runner - Minimal production image
# ---------------------------------------------------------------------------
FROM node:22-slim AS runner

WORKDIR /app

# Copy production node_modules from pruned build stage
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules

# Copy built shared package (no node_modules needed - it has zero prod deps)
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json

# Copy built API
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Run the API
WORKDIR /app/apps/api
CMD ["node", "dist/main"]
