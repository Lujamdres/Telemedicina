# Backend - Node.js
FROM node:20-alpine

WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Construir frontend
RUN npm run build

# Exponer puertos
EXPOSE 5000

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=5000

# Iniciar aplicación
CMD ["npm", "start"]
