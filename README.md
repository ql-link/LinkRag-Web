<div align="center">
<img width="1200" height="475" alt="ToLink Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# ToLink · LinkRag Web

**AI 知识图谱 + 检索增强问答的 Web 前端**

将文档解析、可视化关系图谱与 AI 分析结合，把你的知识库变成可对话、可探索的智能图谱。

</div>

---

## ✨ 功能特性

- **知识图谱可视化** —— 基于 D3 渲染文档间的关系网络，支持交互式探索。
- **知识库问答（RAG）** —— 围绕数据集进行检索增强对话，回答可追溯到来源文件。
- **数据集与知识文件管理** —— 上传、归档、关联文件到指定数据集。
- **多会话对话** —— 持久化的对话列表，首页展示最近对话。
- **LLM 配置中心** —— 在设置中管理多家模型供应商、API Key 与能力开关。
- **用量统计** —— 查看每日 / 汇总的调用用量。
- **响应式与暗色模式** —— 适配桌面与移动端，内置主题切换。

## 🛠 技术栈

| 类别   | 选型                                    |
| ------ | --------------------------------------- |
| 框架   | React 19 + TypeScript                   |
| 构建   | Vite 6                                  |
| 样式   | Tailwind CSS 4                          |
| 路由   | React Router 7                          |
| 可视化 | D3                                      |
| 动画   | Motion                                  |
| 图标   | lucide-react                            |
| 测试   | Vitest + Testing Library                |
| 质量   | ESLint + Prettier + Husky + lint-staged |

## 🚀 本地开发

**前置条件：** Node.js 20+

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器（默认 http://localhost:3000）
npm run dev
```

开发服务器会将 `/api` 请求代理到后端 `http://localhost:8080`（见 [vite.config.ts](vite.config.ts)）。
请确保 ToLink Service 后端已在本地 `8080` 端口运行，或按需修改代理目标。

## 📜 常用脚本

| 命令                | 说明                         |
| ------------------- | ---------------------------- |
| `npm run dev`       | 启动开发服务器               |
| `npm run build`     | 生产构建，产物输出到 `dist/` |
| `npm run preview`   | 本地预览构建产物             |
| `npm run lint`      | ESLint 检查（零警告）        |
| `npm run lint:fix`  | ESLint 自动修复              |
| `npm run typecheck` | TypeScript 类型检查          |
| `npm run format`    | Prettier 格式化              |
| `npm run test`      | 运行单元测试                 |

## 🌿 分支与发布管理

本仓库与 LinkRag Python 端保持一致的分支模型：

- `dev`：日常集成分支，feature/refactor/chore 等日常开发分支通过 PR 合入这里。
- `master`：稳定发布分支，只接受发布 PR 或 hotfix PR，不接受日常 feature/refactor/chore 直接合入。
- `feature/<topic>` / `refactor/<topic>` / `chore/<topic>`：日常开发分支，从 `dev` 拉出并 PR 到 `dev`。
- `release/<version>`：每周发布准备分支，从 `dev` 拉出，最终通过 release PR 合入 `master`。
- `hotfix/<topic>`：紧急修复分支，从 `master` 拉出，修复后 PR 到 `master`，发布后必须 merge 或 cherry-pick 回 `dev`。

发布合并规则：

- `dev` -> `master` 必须使用普通 merge commit，禁止 squash merge，确保发布分支保留完整 PR 父子关系。
- 每周发布必须通过 `release/<version>` PR 进入 `master`。
- release PR 合入 `master` 后，在 `master` 顶部的 merge commit 上打版本 tag。
- release PR 描述必须列出：包含的业务 PR、数据库/配置/契约变更、测试结果、已知风险。
- hotfix 合入 `master` 并发布后，必须回合 `dev`，避免修复只存在于发布线。
- CI 或 workflow 的分支过滤如需显式配置，应使用 `dev, master`。

## ⚙️ 环境变量

构建期可注入的 `VITE_` 前缀变量（会被打进静态产物）：

| 变量              | 说明                   |
| ----------------- | ---------------------- |
| `VITE_GITHUB_URL` | 页面中 GitHub 链接地址 |

## 📂 目录结构

```
src/
├── components/   # 通用组件（知识图谱、问答、侧边栏等）
├── contexts/     # 全局状态（Auth / Theme / Toast）
├── layouts/      # 布局（受保护布局、移动导航、右侧面板）
├── pages/        # 页面（home / chats / datasets / settings ...）
├── services/     # API 调用封装（auth / chat / dataset / llm / oss / user）
├── lib/          # 工具与 API 客户端
├── types/        # 类型定义
└── routes.ts     # 路由表
```

## 🔌 后端联调

- 服务根地址：`http://{host}:8080`
- 业务接口前缀：`/api/v1`
- 认证请求头：`satoken: {accessToken}`（注意：不要使用 `Authorization: Bearer`）

更多接口约定见 [docs/ToLink-前端API文档.md](docs/ToLink-前端API文档.md)。

## 🐳 部署

项目通过多阶段 Docker 构建，Nginx 托管 SPA 静态产物：

```bash
# 构建镜像
docker build -t linkrag-web:latest .

# 启动（需提前创建外部网络 tolink-app-net）
TAG=latest docker compose -f deploy/docker-compose.yml up -d
```

CI 流程见 [Jenkinsfile](Jenkinsfile)。

## 📄 文档

`docs/` 目录包含前端 API 文档、联调计划、交接文档等，可作为开发与对接参考。
