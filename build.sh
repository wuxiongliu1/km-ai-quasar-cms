# 构建镜像
docker build --target production-spa -t cms:latest .

# 运行容器
docker run -d -p 80:80 --name cms cms:latest

# 或推送到镜像仓库
docker tag cms:latest your-registry/cms:latest
docker push your-registry/cms:latest