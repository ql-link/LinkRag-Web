# syntax=docker/dockerfile:1

# ---- 构建阶段：Node 编译出静态产物 ----
FROM node:20-alpine AS build
WORKDIR /app

# 先装依赖，利用层缓存
COPY package.json package-lock.json ./
RUN npm ci

# 构建期可注入的 VITE_ 前缀变量（会被打进静态文件）
ARG VITE_GITHUB_URL
ENV VITE_GITHUB_URL=${VITE_GITHUB_URL}

COPY . .
RUN npm run build

# ---- 运行阶段：Nginx 托管 SPA ----
FROM nginx:1.27-alpine AS runtime
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
