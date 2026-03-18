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

# --- build UI + server ---
FROM deps AS build
COPY ui/ ./ui/
RUN cd ui && npm run build

COPY src/ ./src/
COPY schemas/ ./schemas/
COPY tsconfig.json ./
RUN npx tsc

# --- production image ---
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/public ./public
COPY --from=build /app/dist ./dist
COPY schemas/ ./schemas/

VOLUME /app/data

ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/src/server/index.js"]
