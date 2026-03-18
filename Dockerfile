FROM node:22-alpine AS base
WORKDIR /app

# Install build deps for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

# --- deps ---
FROM base AS deps
COPY package*.json ./
RUN npm ci

COPY ui/package*.json ./ui/
RUN cd ui && npm ci

# --- build UI ---
FROM deps AS ui-build
COPY ui/ ./ui/
RUN cd ui && npm run build

# --- production image ---
FROM base AS runner
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=ui-build /app/public ./public
COPY src/ ./src/
COPY schemas/ ./schemas/
COPY tsconfig.json ./

VOLUME /app/data

ENV PORT=3000
EXPOSE 3000

CMD ["node", "--import", "tsx/esm", "src/server/index.ts"]
