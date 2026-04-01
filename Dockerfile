# --- Dependencias y build del frontend (Vite) ---
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# --- Imagen de ejecución: API + estáticos ---
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY core ./core
COPY modulos ./modulos
COPY assets ./assets
COPY index.html ./
COPY public ./public

RUN mkdir -p uploads

EXPOSE 5000

CMD ["node", "core/index.js"]
