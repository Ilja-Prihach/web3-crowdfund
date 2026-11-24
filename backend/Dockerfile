FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./

FROM dependencies AS migrate
RUN npm ci
COPY drizzle.config.ts ./
COPY drizzle ./drizzle
COPY src/db/schema.ts ./src/db/schema.ts
USER node
CMD ["node", "node_modules/drizzle-kit/bin.cjs", "migrate"]

FROM dependencies AS runtime
ENV NODE_ENV=production
RUN npm ci --omit=dev && mkdir -p /app/storage/media && chown -R node:node /app/storage
COPY src ./src
USER node
CMD ["node", "src/server.ts"]
