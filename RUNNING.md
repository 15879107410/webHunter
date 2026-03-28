# 本地运行说明

## 当前工程结构

- `apps/web`：Next.js 前端应用
- `apps/api`：Express API 骨架
- `packages/shared`：共享类型与接口契约

## 前端启动

```bash
npm run dev:web
```

默认会启动 Next.js 本地服务。

## API 启动

```bash
npm run dev:api
```

默认监听：

```text
http://localhost:3001
```

## 统一校验

```bash
npm run verify
```

当前会执行：

- 前端类型检查
- 前端构建
- API 类型检查
- API 构建

## 当前已接通的接口

- `GET /health`
- `GET /api/analysis`
- `GET /api/analysis/recent`
- `GET /api/analysis/:id`
- `GET /api/analysis/:id/export.md`
- `GET /api/analysis/:id/input`
- `GET /api/bookmarks`
- `POST /api/bookmarks`
- `PATCH /api/bookmarks/:id`
- `DELETE /api/bookmarks/:id`
- `POST /api/analyze`

## 当前分析链路状态

- 已支持真实提交 URL 到 `/api/analyze`
- 已支持同网址命中已有分析结果时直接复用
- 已支持强制重新分析：
  - `POST /api/analyze` body 里传 `force: true`
- 已支持抓取公开首页
- 已支持自动发现部分关键页面：
  - pricing
  - about
  - features
  - faq
- 已支持 `robots.txt -> sitemap` 发现链
- 已支持基础规则分析：
  - 网站摘要
  - 目标用户推断
  - 收费模式粗识别
  - 市场机会模板判断
  - 证据分层输出
- 已接通平台内置 LLM 深度分析
  - 当前通过服务端内置模型调用
  - LLM 不会暴露到前端
  - 当 LLM 不可用或返回不可解析结果时，会自动回退到规则分析
  - 当前已增加服务端超时控制与输出清洗，避免长时间卡住分析流程
- 已支持更完整的结果展示
  - 结果页可展示真实 LLM / 规则分析来源
  - 价格区默认只展示前两个价格点
  - 点击后可弹出完整价格构成
  - 相似产品会优先显示历史分析中的真实推荐

## 当前存储状态

- API 已从纯内存存储升级为项目内持久化存储
- 数据文件位置：

```text
apps/api/data/store.json
```

- 当前重启 API 后，分析结果、最近分析和收藏数据不会丢失

## 当前页面路由

- `/`
- `/results`
- `/result/[id]`
- `/result/[id]/input`
- `/inspiration`
- `/pricing`

## 当前状态说明

前端已优先完成页面落地，并以真实 API 为主、mock 为兜底接入接口。
API 当前已经具备真实抓取 + 规则分析 + 平台内置 LLM 增强 + 项目内持久化存储的基础闭环。
平台内置 LLM 已接入并已用于部分真实网站分析，前端只展示结果，不接触模型配置。
结果历史页、全部分析历史、结果导出、原始抓取输入查看、灵感库备注编辑和删除收藏能力已经接通第一版。
当前默认会优先复用已有分析结果，结果页也提供了“重新分析”入口。
下一阶段重点转向：正式数据库、抓取兜底增强、LLM 提示与输出质量继续优化、价格/相似产品等结构化结果继续增强。
