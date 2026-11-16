# ==========================================
# GOSchool — Gateway Dockerfile
# ==========================================

FROM node:20-alpine AS base

# Instalar dependências do sistema
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependências de produção
RUN npm ci --only=production && npm cache clean --force

# Copiar código fonte
COPY src/ ./src/
COPY public/ ./public/

# Criar usuário não-root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expor porta
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Usar dumb-init para manejar sinais
ENTRYPOINT ["dumb-init", "--"]

# Comando de inicialização
CMD ["node", "src/app.js"]