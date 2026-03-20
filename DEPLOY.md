# Docker 部署指南

本文档说明如何使用 Docker 部署 CMS 项目。

## 1. 前置要求

- Docker >= 20.10
- Docker Compose >= 1.29
- 已配置好 Supabase 环境变量（参考 SUPABASE_SETUP.md）

## 2. 快速开始

### 2.1 配置环境变量

复制环境变量模板并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 Supabase 配置：

```env
# Supabase 配置
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# OSS 配置（如使用图片上传功能）
VITE_OSS_REGION=oss-cn-hangzhou
VITE_OSS_BUCKET=your-bucket
VITE_OSS_ACCESS_KEY_ID=your-key
VITE_OSS_ACCESS_KEY_SECRET=your-secret
VITE_OSS_CUSTOM_DOMAIN=your-domain
```

### 2.2 构建并运行

#### 方式一：SPA 模式（推荐）

```bash
# 构建并运行 SPA 模式
docker-compose up -d cms-spa

# 访问 http://localhost
```

#### 方式二：SSR 模式

```bash
# 构建并运行 SSR 模式
docker-compose up -d cms-ssr

# 访问 http://localhost:3000
```

#### 方式三：SSR + Nginx 反向代理

```bash
# 构建并运行 SSR 模式 + Nginx 反向代理
docker-compose --profile proxy up -d

# 访问 http://localhost:8080
```

### 2.3 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f cms-spa
docker-compose logs -f cms-ssr
```

### 2.4 停止服务

```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v
```

## 3. 构建镜像

### 3.1 构建 SPA 镜像

```bash
# 构建 SPA 生产镜像
docker build --target production-spa -t cms:spa .

# 运行容器
docker run -d -p 80:80 --name cms-spa cms:spa
```

### 3.2 构建 SSR 镜像

```bash
# 构建 SSR 生产镜像
docker build --target production-ssr -t cms:ssr .

# 运行容器
docker run -d -p 3000:3000 --name cms-ssr cms:ssr
```

### 3.3 多平台构建（用于生产发布）

```bash
# 创建 buildx 构建器
docker buildx create --use

# 构建多平台镜像并推送到仓库
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --target production-spa \
  -t your-registry/cms:spa-latest \
  --push .
```

## 4. 生产部署

### 4.1 使用 Docker Hub 部署

```bash
# 登录 Docker Hub
docker login

# 给镜像打标签
docker tag cms:spa your-username/cms:latest

# 推送镜像
docker push your-username/cms:latest

# 在服务器上拉取并运行
docker pull your-username/cms:latest
docker run -d -p 80:80 --name cms your-username/cms:latest
```

### 4.2 使用阿里云容器服务部署

```bash
# 登录阿里云容器镜像服务
docker login --username=your-username registry.cn-hangzhou.aliyuncs.com

# 给镜像打标签
docker tag cms:spa registry.cn-hangzhou.aliyuncs.com/your-namespace/cms:latest

# 推送镜像
docker push registry.cn-hangzhou.aliyuncs.com/your-namespace/cms:latest
```

### 4.3 Kubernetes 部署

创建 `k8s-deployment.yaml`：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cms-deployment
  labels:
    app: cms
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cms
  template:
    metadata:
      labels:
        app: cms
    spec:
      containers:
      - name: cms
        image: your-registry/cms:spa-latest
        ports:
        - containerPort: 80
        resources:
          requests:
            memory: "64Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: cms-service
spec:
  selector:
    app: cms
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: LoadBalancer
```

部署到 Kubernetes：

```bash
kubectl apply -f k8s-deployment.yaml
```

## 5. 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `VITE_SUPABASE_URL` | Supabase 项目 URL | 必填 |
| `VITE_SUPABASE_ANON_KEY` | Supabase 匿名密钥 | 必填 |
| `VITE_OSS_REGION` | 阿里云 OSS 区域 | 可选 |
| `VITE_OSS_BUCKET` | OSS Bucket 名称 | 可选 |
| `VITE_OSS_ACCESS_KEY_ID` | OSS Access Key | 可选 |
| `VITE_OSS_ACCESS_KEY_SECRET` | OSS Secret | 可选 |
| `VITE_OSS_CUSTOM_DOMAIN` | OSS 自定义域名 | 可选 |

## 6. 故障排除

### 6.1 容器无法启动

```bash
# 查看容器日志
docker logs cms-spa

# 检查容器状态
docker ps -a
```

### 6.2 环境变量未生效

确保 `.env` 文件中的变量以 `VITE_` 开头，以便 Vite 能正确读取。

### 6.3 端口被占用

```bash
# 查找占用端口的进程
lsof -i :80
lsof -i :3000

# 更换端口运行
docker run -d -p 8080:80 --name cms-spa cms:spa
```

### 6.4 镜像构建失败

```bash
# 清理 Docker 缓存
docker system prune -a

# 重新构建（不使用缓存）
docker build --no-cache -t cms:spa .
```

## 7. 性能优化

### 7.1 启用 Gzip 压缩

Nginx 配置已默认启用 Gzip 压缩。

### 7.2 静态资源缓存

Nginx 配置中对静态资源设置了 1 年缓存。

### 7.3 使用 CDN

生产环境建议将静态资源托管到 CDN：

1. 构建项目：`npm run build`
2. 上传 `dist/spa` 目录到 CDN
3. 配置 Nginx 反向代理到 CDN

## 8. 安全建议

1. **使用 HTTPS**：生产环境务必配置 SSL 证书
2. **环境变量保护**：不要将敏感信息提交到 Git
3. **镜像安全**：定期更新基础镜像
4. **访问控制**：配置防火墙规则，只开放必要端口

## 9. 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建镜像
docker-compose build --no-cache

# 重启服务
docker-compose up -d

# 清理旧镜像
docker image prune -f
```
