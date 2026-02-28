FROM node:22-slim AS base
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy package.json files for all packages
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @live-trivia/shared --filter @live-trivia/server

# Copy source code
COPY packages/shared/ packages/shared/
COPY packages/server/ packages/server/

# Build shared first, then server
RUN pnpm --filter @live-trivia/shared build
RUN pnpm --filter @live-trivia/server build

# Copy client build output (built externally and passed in, or built here)
# For the "serve static from Express" approach:
COPY packages/client/dist/ packages/client/dist/

EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "packages/server/dist/index.js"]
