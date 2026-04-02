# WebHunter 启动与部署说明

这份文档只讲最实用的内容：本地怎么跑、服务器怎么起、如果改了代码怎么重启、常见报错怎么排查。

## 1. 项目结构

- `apps/web`：Next.js 前端
- `apps/api`：Express 后端
- `packages/shared`：前后端共享类型与契约

## 2. 本地开发启动

### 2.1 首次安装

在项目根目录执行：

```bash
npm ci
```

### 2.2 启动前端

```bash
npm run dev:web
```

默认地址：

```text
http://localhost:3000
```

### 2.3 启动后端

```bash
npm run dev:api
```

默认地址：

```text
http://localhost:3001
```

### 2.4 本地联调检查

```bash
npm run verify
```

会依次执行：

- 前端 lint
- 前端 typecheck
- 前端 build
- 后端 typecheck
- 后端 build

## 3. 服务器部署方式

当前推荐的线上结构是：

- 前端部署到 Vercel
- 后端部署到 Railway 或阿里云 ECS
- 域名通过 Nginx 反代到本机 3000 / 3001
- 共享代码 `packages/shared` 不单独部署，会在构建时一起编译进去

### 3.1 前端部署到 Vercel

Vercel 里建议这样配：

- Root Directory：`apps/web`
- Framework Preset：`Next.js`
- 环境变量：

```bash
NEXT_PUBLIC_API_BASE_URL=https://api.ysport.top
```

如果前端不是 Vercel，而是也跑在服务器上，就把前端启动在 3000 端口即可，见后面的“服务器本地启动”。

### 3.2 后端部署到阿里云 ECS

后端继续部署在阿里云服务器上，使用本仓库中的 `apps/api`。

后端关键环境变量通常放在项目根目录 `.env`：

```bash
PORT=3001
NODE_ENV=production
FRONTEND_ORIGIN=https://web-hunter-web.vercel.app
COOKIE_DOMAIN=.ysport.top
LLM_BASE_URL=http://47.99.56.7:3010/v1
LLM_MODEL=claude-sonnet-4-20250514
```

如果你的前端最终也会挂到 `ysport.top`，那就把 `FRONTEND_ORIGIN` 改成你的正式前端域名。

### 3.3 后端部署到 Railway

当前仓库根目录已经提供了 `nixpacks.toml`，用于让 Railway 在构建时自动：

- 执行 `npm ci`
- 安装 Playwright 的 Chromium 浏览器
- 构建 API
- 以 `@webhunter/api` 启动后端

Railway 部署建议：

- Root Directory：仓库根目录
- 不要把 Root Directory 设成 `apps/api`
- 环境变量至少配置：

```bash
NODE_ENV=production
FRONTEND_ORIGIN=https://web-hunter-web.vercel.app
NEXT_PUBLIC_API_BASE_URL=https://你的-api-域名
LLM_BASE_URL=http://47.99.56.7:3010/v1
LLM_MODEL=claude-sonnet-4-5-20250929
```

如果你的模型接口需要鉴权，再补：

```bash
LLM_API_KEY=你的密钥
```

部署完成后，先检查：

```text
https://你的-api-域名/health
```

如果分析时报 `browserType.launch` 或提示缺少浏览器，通常说明当前 Railway 服务还没有重新按新的构建配置部署，需要触发一次 Redeploy。

## 4. 服务器启动命令

以下命令都在服务器项目根目录执行：

```bash
cd /opt/HLproject/webHunter
```

### 4.1 首次拉代码后准备

```bash
npm ci
npm run build:api
```

如果前端也要在服务器上运行，再执行：

```bash
npm run build:web
```

### 4.2 启动后端

如果 3001 没被占用：

```bash
nohup bash -lc 'cd /opt/HLproject/webHunter && PORT=3001 npm run start --workspace @webhunter/api' > /tmp/webhunter-api.log 2>&1 &
```

查看日志：

```bash
tail -n 20 /tmp/webhunter-api.log
```

健康检查：

```bash
curl -I http://api.ysport.top/health
```

### 4.3 启动前端

如果前端也跑在服务器上：

```bash
nohup bash -lc 'cd /opt/HLproject/webHunter && npm run start --workspace @webhunter/web' > /tmp/webhunter-web.log 2>&1 &
```

查看日志：

```bash
tail -n 20 /tmp/webhunter-web.log
```

如果前端已经部署到 Vercel，就不需要在服务器再启动前端。

## 5. Nginx 反向代理

Nginx 作用：

- `ysport.top` -> 前端 3000
- `api.ysport.top` -> 后端 3001
- 同时负责 HTTP/HTTPS 转发

常见配置文件：

```bash
/etc/nginx/conf.d/webhunter.conf
```

检查配置：

```bash
nginx -t
```

重载配置：

```bash
systemctl restart nginx
```

## 6. 数据存储位置

后端现在使用 SQLite 文件做持久化，默认数据文件会优先落在：

```text
apps/api/data/webhunter.sqlite
```

如果旧数据还在，会自动从：

```text
apps/api/data/store.json
```

迁移进去。

上线时要保住这个数据库文件，不要每次部署都删掉。

## 7. 常见重启方式

### 7.1 改了后端代码

```bash
cd /opt/HLproject/webHunter
git pull
npm run build:api
fuser -k 3001/tcp
nohup bash -lc 'cd /opt/HLproject/webHunter && PORT=3001 npm run start --workspace @webhunter/api' > /tmp/webhunter-api.log 2>&1 &
```

### 7.2 只改了后端环境变量

重启后端即可：

```bash
fuser -k 3001/tcp
nohup bash -lc 'cd /opt/HLproject/webHunter && PORT=3001 npm run start --workspace @webhunter/api' > /tmp/webhunter-api.log 2>&1 &
```

### 7.3 改了前端代码

如果前端也部署在服务器上：

```bash
cd /opt/HLproject/webHunter
git pull
npm run build:web
fuser -k 3000/tcp
nohup bash -lc 'cd /opt/HLproject/webHunter && npm run start --workspace @webhunter/web' > /tmp/webhunter-web.log 2>&1 &
```

## 8. 常见问题

### 8.1 `EADDRINUSE`

意思是端口被占用了，通常是你已经启动过一次服务。

查看占用：

```bash
ss -ltnp | grep :3001
ss -ltnp | grep :3000
```

杀掉占用进程：

```bash
fuser -k 3001/tcp
fuser -k 3000/tcp
```

### 8.2 `Failed to fetch`

通常是前端和后端之间的地址、协议或跨域配置不对。

重点检查：

- 前端 `NEXT_PUBLIC_API_BASE_URL`
- 后端 `FRONTEND_ORIGIN`
- 是否 HTTP / HTTPS 混用

### 8.3 访问被阿里云备案页拦截

说明域名在中国大陆服务器上的备案或接入备案还没完成，或者备案信息没同步到阿里云。

这时代码和 Nginx 可能都正常，但域名仍然不能对外访问。

## 9. 当前推荐启动顺序

如果你只是想把服务器先跑起来，最稳的顺序是：

1. 确认 `.env` 和前端环境变量已写好
2. `npm ci`
3. `npm run build:api`
4. 启动后端
5. 启动 Nginx
6. 如果前端不在 Vercel，再启动前端
7. 用 `curl -I` 检查 `ysport.top` 和 `api.ysport.top/health`

## 10. 备注

- 前端和后端现在是一个仓库，两套部署
- `packages/shared` 只负责共享类型和契约，不单独部署
- 如果你后面切到正式生产环境，建议把后台启动交给 `pm2` 或 `systemd` 托管，避免终端断开后进程丢失
