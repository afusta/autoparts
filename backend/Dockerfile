# =============================================================================
# NestJS Backend Dockerfile
# =============================================================================
# Multi-stage build pour optimiser la taille de l'image
# Stage 1: Installation des dépendances
# Stage 2: Image de développement
# =============================================================================

FROM node:20-alpine AS base

# Installer les dépendances système nécessaires pour compiler les modules natifs (bcrypt)
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# =============================================================================
# Stage: Dependencies
# =============================================================================
FROM base AS deps

# Installer toutes les dépendances (dev + prod)
# --build-from-source force la recompilation des modules natifs
RUN npm install --build-from-source

# =============================================================================
# Stage: Development
# =============================================================================
FROM base AS development

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Exposer le port de l'API
EXPOSE 3000

# La commande sera override par docker-compose
CMD ["npm", "run", "start:dev"]
