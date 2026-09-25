FROM node:20-alpine AS builder

WORKDIR /app/apps/api

# Copy only api package manifests and prisma
COPY apps/api/package*.json ./
COPY apps/api/prisma ./prisma/

# Install dependencies directly for api using legacy peer deps to bypass npm v10 edgesOut bug
RUN npm install --legacy-peer-deps

# Copy root tsconfig and api source files
COPY tsconfig.json /app/tsconfig.json
COPY apps/api ./

# Generate Prisma client and compile TypeScript
RUN npx prisma generate
RUN npm run build

# Production Runner Stage
FROM node:20-alpine AS runner

WORKDIR /app/apps/api

ENV NODE_ENV=production
ENV PORT=3000

COPY apps/api/package*.json ./
COPY apps/api/prisma ./prisma/
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
