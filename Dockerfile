# =========================================================
# Stage 1: Instalación de dependencias
# =========================================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copiar manifiestos de paquetes
COPY package.json package-lock.json ./
RUN npm ci

# =========================================================
# Stage 2: Compilación del proyecto Next.js
# =========================================================
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Deshabilitar telemetría de Next.js durante el build
ENV NEXT_TELEMETRY_DISABLED=1

# Compilación de la aplicación (Genera .next/standalone gracias a next.config.mjs)
RUN npm run build

# =========================================================
# Stage 3: Imagen de producción minimalista (Runner)
# =========================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Seguridad: Creación de usuario y grupo no-root (nextjs:nodejs UID/GID 1001)
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copia de artefactos necesarios para el servidor standalone
COPY --from=builder /app/public ./public

# Asignar permisos correctos a la carpeta .next creada para standalone
RUN mkdir .next \
    && chown nextjs:nodejs .next

# Copiar artefactos minificados desde la compilación standalone
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
