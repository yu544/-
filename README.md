# 策算学堂（StratAlgo Academy）微课教学平台

基于你们的《策算学堂_网站需求文档》实现的“微课视频 + 虚拟仿真实验 + 教学设计 + 课件资料 + 练习测试 + 反思反馈”教学站点原型。

## 技术栈

- 前端：Vue 3 + Vite
- 路由：Vue Router
- 可视化：ECharts（含词云、雷达图）
- 代码高亮：Prism.js
- 代码编辑器：Monaco Editor
- 拖拽：SortableJS
- 判题代理：`/api/judge0/run`（后端：Express 代理 Judge0）
- AI 提示代理：`/api/ai/hints`（可选接入 OpenAI；未配置则离线返回分级提示）

## 开发运行

### 1. 启动前端

在本目录执行：

```bash
npm run dev
```

开发时仅 `npm run dev` 即可浏览全站；微课视频放在 `public/videos/`，由 Vite 直接提供（如 `courses.json` 中的 `/videos/xxx.mp4`）。

需要「在线判题 / AI 提示接口」时，再把请求转发到后端：

- `Vite dev server`：`/api` -> `http://localhost:3001`

### 2. 启动后端（Judge0 / AI 代理）

后端入口在 `server/index.js`，启动方式：

```bash
node server/index.js
```

建议在启动前设置环境变量（可直接写到 shell 或使用 `.env`）：

- `JUDGE0_BASE_URL`：Judge0 服务地址（必须用于“运行测试”）
  - 例如：`http://localhost:2358` 或 `https://ce.judge0.com`
- `OPENAI_API_KEY`：可选，首页 AI / 练习分级提示（未配置则走离线文案）
- `OPENAI_BASE_URL`：可选，**默认 `https://api.deepseek.com`（DeepSeek，OpenAI 兼容）**；若用官方 OpenAI 请设为 `https://api.openai.com/v1`
- `OPENAI_MODEL`：可选，默认 **`deepseek-chat`**；OpenAI 可改为 `gpt-4o-mini` 等
- `PORT`：可选，后端端口默认 `3001`

## 关键页面

- `/`：首页
- `/courses`：微课列表（支持搜索/筛选）
- `/course/:id`：微课详情（`Tab 1 ~ Tab 6`）

## 部署到 Vercel / GitHub Pages

### Vercel（推荐）

1. 部署前端（SPA）：直接用本仓库前端构建产物即可。
2. 后端需要额外部署：
   - 本原型使用 `server/index.js`（Express）作为代理层，因此部署时建议把它部署到：
     - 另一个 Node 服务（Render/Fly.io 等）
     - 或把 `/api/*` 改造成 Vercel Serverless Functions（需要你们再做一次轻量改造）
3. 保持前端对后端的 `/api` 路由可访问（生产环境里替换代理到真实域名）。

### GitHub Pages

GitHub Pages 需要处理 `base` 路径：

1. 构建时为 Vite 设置 `base`（常见做法是把 `base` 指到 `/<repo>/` 或使用 `--base ./`）。
2. 把 `dist/` 目录上传/发布到 GitHub Pages。
3. 如遇到资源 404，请检查 `base` 配置与页面部署路径是否一致。

> 如果你们希望我把 `gh-pages` 的自动部署脚本也补齐（例如增加 `deploy:gh`），告诉我你们打算用的仓库名/部署方式即可。
