# NMS backend — build + runtime (air-gapped friendly: single-stage deps cache)
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && cp -r src/db/migrations dist/db/migrations

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache iputils   # ping binary for ICMP probes
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 4000
CMD ["node", "dist/index.js"]
