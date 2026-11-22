# Express + Prisma API. Multi-stage enough to keep node_modules out of the
# final copy step, but the Prisma client is generated at build time because it
# is engine-specific.
FROM node:22-alpine

WORKDIR /app

# OpenSSL is needed by Prisma's query/schema engines on Alpine.
RUN apk add --no-cache openssl

# Install deps first so this layer is cached when only source changes.
COPY package.json package-lock.json ./
RUN npm ci

# Generate the Prisma client into node_modules before the source is copied, so
# `prisma generate` only re-runs when the schema changes.
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

COPY src ./src

# Uploads are a volume; keep the folder present so multer/express.static work.
RUN mkdir -p uploads

ENV NODE_ENV=production
EXPOSE 3445

# Waits for Postgres, applies migrations, then starts the API.
# `migrate deploy` is the production-safe command (never resets data).
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
