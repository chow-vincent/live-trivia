FROM node:22-slim AS base
RUN npm install -g pnpm

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy package.json files for all packages
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/

# Install dependencies for all packages
RUN pnpm install --frozen-lockfile --filter @live-trivia/shared --filter @live-trivia/server --filter @live-trivia/client

# Copy source code
COPY packages/shared/ packages/shared/
COPY packages/server/ packages/server/
COPY packages/client/ packages/client/

# Build shared → client → server
RUN pnpm --filter @live-trivia/shared build
ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
RUN pnpm --filter @live-trivia/client build
RUN pnpm --filter @live-trivia/server build

EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "packages/server/dist/index.js"]
