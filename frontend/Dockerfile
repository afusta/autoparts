# =============================================================================
# NextJS Frontend Dockerfile
# =============================================================================
# Image de développement pour le frontend NextJS
# =============================================================================

FROM node:20-alpine AS base

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package*.json ./

# =============================================================================
# Stage: Dependencies
# =============================================================================
FROM base AS deps

RUN npm install

# =============================================================================
# Stage: Development
# =============================================================================
FROM base AS development

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
