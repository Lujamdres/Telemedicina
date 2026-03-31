# Backend - Node.js
FROM node:20-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Construir frontend
RUN npx vite build

# Exponer puertos
EXPOSE 5000

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=5000

# Iniciar aplicación
CMD ["npm", "start"]
