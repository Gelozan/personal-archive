# ── Стадия 1: сборка ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /frontend

# Установить pnpm глобально
RUN npm install -g pnpm

# Сначала зависимости (кеш-слой)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Копируем весь исходный код и собираем
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm build

# ── Стадия 2: раздача статики ─────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Удаляем дефолтный конфиг nginx
RUN rm /etc/nginx/conf.d/default.conf

# Копируем собранный dist из стадии builder
COPY --from=builder /frontend/dist /usr/share/nginx/html

# Конфиг nginx для SPA (все маршруты → index.html)
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
