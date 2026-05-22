FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci
COPY tsconfig.json ./
COPY src ./src/
RUN npm run build && npx prisma generate

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY prisma ./prisma/
RUN npx prisma generate
COPY --from=build /app/dist ./dist
EXPOSE 4340
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
