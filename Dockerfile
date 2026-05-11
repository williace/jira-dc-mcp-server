FROM node:26-alpine@sha256:e71ac5e964b9201072425d59d2e876359efa25dc96bb1768cb73295728d6e4ea AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/

ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

FROM node:26-alpine@sha256:e71ac5e964b9201072425d59d2e876359efa25dc96bb1768cb73295728d6e4ea

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist/ ./dist/

ENV TRANSPORT=http
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/index.js"]
