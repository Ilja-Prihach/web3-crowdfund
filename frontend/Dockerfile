FROM node:24-bookworm-slim AS build
ARG NEXT_PUBLIC_OPENFUND_DEMO=0
ENV NEXT_PUBLIC_OPENFUND_DEMO=$NEXT_PUBLIC_OPENFUND_DEMO
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 OPENFUND_STANDALONE=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
USER node
CMD ["node", "server.js"]
