# ==========================================
# 阶段 1: 构建阶段
# ==========================================
FROM node:20-alpine AS builder

# 设置工作目录
WORKDIR /app

# 安装必要的系统依赖
RUN apk add --no-cache python3 make g++

# 复制 package 文件
COPY package*.json ./
COPY quasar.config.js ./

# 安装依赖
RUN npm ci --only=production && npm cache clean --force

# 复制源代码
COPY . .

# 构建生产版本
RUN npm run build

# ==========================================
# 阶段 2: 生产运行阶段 (SPA 模式)
# ==========================================
FROM nginx:alpine AS production-spa

# 复制构建产物到 nginx 目录
COPY --from=builder /app/dist/spa /usr/share/nginx/html

# 复制 nginx 配置文件
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]

# ==========================================
# 阶段 3: 生产运行阶段 (SSR 模式)
# ==========================================
FROM node:20-alpine AS production-ssr

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package*.json ./

# 安装生产依赖
RUN npm ci --only=production && npm cache clean --force

# 复制构建产物
COPY --from=builder /app/dist/ssr ./dist/ssr

# 暴露端口
EXPOSE 3000

# 启动 SSR 服务
CMD ["node", "dist/ssr/index.js"]
