# ToLink Web 交接文档

> 日期：2026-05-10  
> 模块：`toLink-Web`  
> 目标：让下一轮对话快速接上当前前端联通与欢迎页/博客页改造进度。

## 1. 当前已完成

### 1.1 登录模块字段联通校准

后端真实契约来自 `toLink-Service`：

- 登录：`POST /api/v1/auth/login`
- 请求体：`{ account, password }`
- 注册：`POST /api/v1/auth/register`
- 请求体：`{ username, password, email }`
- 认证请求头：`satoken: {accessToken}`
- 登录/注册成功后需要调用 `GET /api/v1/user/profile` 回填用户上下文。

前端已完成：

- `src/types/api.ts`
  - `LoginRequest.username` 改为 `account`
  - `RegisterRequest.email` 改为必填
  - 移除注册请求中的 `nickname`
- `src/pages/welcome/index.tsx`
  - 登录提交改为 `{ account, password }`
  - 注册提交改为 `{ username, password, email }`
  - 注册邮箱改为必填
  - 增加确认密码校验
- `src/components/Sidebar.tsx`
  - 修复退出登录重复请求问题，统一走 `AuthContext.logout()`

### 1.2 欢迎页头部与流程区调整

已根据页面批注做过多轮 UI 调整：

- 顶部中间导航从多按钮收敛为 3 个：
  - `功能`
  - `登录`
  - `博客`
- 登录区左侧说明文字下方那组多余的“登录 / 注册”按钮已删除。
- 原来的 01/02/03 三个纵向长画轴已合并成一个 `#knowledge` 流程区。
- 现在流程区是 4 页轮播：
  - 01 上传文件，拖入后自动切成 chunk
  - 02 索引入库，向量索引与 ES 双路写入
  - 03 多路召回，从多个检索通道找候选片段
  - 04 检索回答，结合上下文生成有来源的答案
- 只保留底部 4 个圆点切换。
- 右上角左右箭头已删除。
- 外层大边框容器已删除，避免“框内硬切”的感觉。
- 切换动画已调轻：
  - 时长约 `0.22s`
  - 淡入淡出
  - 轻微上下位移
  - 去掉明显横向大位移和缩放

主要文件：

- `src/pages/welcome/index.tsx`
- `src/index.css`

### 1.3 RAG 四步动画演示

当前欢迎页流程区的右侧演示已经从静态说明改成 4 个可视化动画：

- 第一步：文件拖拽分片
  - 用户可手动拖动文件图标到上传框。
  - 拖入后显示解析/分片过程，最后出现机器学习主题 chunk 文本。
  - 右下角有“重新演示”按钮，用于重置整个分片流程。
- 第二步：向量索引 + ES 入库
  - 左侧 chunk 通过虚线流向右侧两类存储。
  - 向量索引用点阵关系展示，ES 入库用 JSON 风格文本展示。
  - 连线使用 `index-dashed-path` / `index-moving-path` 动效。
- 第三步：多路召回
  - query：`为什么需要 / 注意力机制？`
  - 中间检索核心连接三路：`向量召回`、`全文检索`、`图谱召回`。
  - 右侧 `Top-K 片段` 展示与注意力机制相关的候选 chunk。
  - 召回过程到 Top-K 片段已有合流连接线。
  - 连线使用第三步专用粗线：`recall-dashed-path` / `recall-moving-path`。
- 第四步：检索回答
  - 左侧 `Top-K 片段`。
  - 中间核心文案为 `LLM 智能回答`。
  - 右侧 `AI 回答`，包含系统/上下文/问题提示块、流式回答和引用来源。
  - 参考了 `/Users/fang/Downloads/rag_landing_animations_demo (1).jsx` 的布局，但视觉保持当前浅金色纸感风格。

视觉细节当前状态：

- 第三步和第四步都使用当前项目的白底、浅金色、细边框、纸感网格风格。
- 第四步内部演示已缩放并居中，左右留白已按用户反馈调过。
- 第四步左右两个大框高度已拉长，避免内部 chunk 和 AI 回答被外框遮挡。
- 第四步 `AI 回答` 框已向左收，右侧留出缝隙，并与左侧 `Top-K 片段` 顶部对齐。

### 1.4 字体与主视觉标准

当前欢迎页主视觉标题以 `serif-heading` 为标准：

- `serif-heading` 定义在 `src/index.css`：
  - `font-serif`
  - `italic`
  - `tracking-tighter`
- `font-serif` 的字体栈：
  - 英文优先使用 `Playfair Display`
  - 中文主要使用 `Noto Serif SC`
  - fallback 为系统 `serif`
- 当前首页大标题为：
  - `欢迎来到`
  - `LinkRag`
- 其中 `LinkRag` 的英文效果应继续保持 `Playfair Display` 的斜体衬线风格，后续不要随意改成无衬线或其它品牌字体，除非用户明确要求整体改品牌字体。

### 1.5 博客页面

新增博客页面：

- 路由：`/blogs`
- 文件：`src/pages/blogs/index.tsx`
- 内容结构：
  - 左侧分类
  - 左侧归档
  - 搜索框
  - 文章列表
  - 文章缩略图
- 当前文章数据是静态 mock，尚未接后端。

相关接入：

- `src/routes.ts`
  - 新增 `Blogs: '/blogs'`
- `src/App.tsx`
  - 新增公开博客路由
  - 博客页不依赖登录态，避免后端未启动时被 `AuthProvider` loading 卡住
- `src/pages/welcome/index.tsx`
  - 顶部导航新增“博客”
- `src/components/Sidebar.tsx`
  - 工作台侧边栏新增“博客”

### 1.6 路由过渡动画

在 `src/App.tsx` 增加全局路由过渡：

- 使用 `motion/react`
- 页面切换时做淡入、轻微位移和模糊过渡
- 支持系统减少动态效果偏好

注意：

- 公开博客页放在认证 loading 逻辑之外。
- 根路径欢迎页使用 `index` 路由，避免 `/blogs` 被 `/` 路由吞掉。

### 1.7 已执行验证

以下命令已多次通过：

```bash
npm run lint
npm run build
```

`build` 会提示 chunk 超过 500KB，这是 Vite/Rollup 的体积警告，不是当前改动引入的编译错误。

## 2. 当前还没有做

### 2.1 登录真实联调未完成

原因：

- 本轮操作时 `localhost:8080` 后端没有启动。
- 因此没有完成真实账号的注册、登录、刷新恢复、退出登录闭环验证。

下一步要做：

1. 启动 `toLink-Service`，确认 `http://localhost:8080` 可访问。
2. 打开 `http://localhost:3000/`。
3. 清理浏览器旧 token，或直接在控制台清理：

```js
localStorage.removeItem('accessToken')
```

4. 执行认证验收：
   - 新用户注册成功后自动进入首页
   - 刷新后仍保持登录
   - 退出后回到欢迎页
   - 使用刚注册的账号再次登录成功
   - 错误密码/不存在用户能正确展示错误提示

做到什么程度算完成：

- 上述 5 个场景全部通过。
- Network 面板中登录请求体为 `{ account, password }`。
- 登录后的业务请求都带 `satoken` header。

### 2.2 博客页还没有后端数据

当前状态：

- 博客页面是静态 mock。
- 没有文章详情页。
- 没有后端接口、分页、搜索接口联通。

如果继续做，需要先确认后端是否计划提供博客接口。

建议接口形态：

- `GET /api/v1/blogs?page=1&pageSize=20&category=&keyword=`
- `GET /api/v1/blogs/{id}`

前端建议新增：

- `src/services/blog.ts`
- `BlogDTO`、`BlogCategoryDTO` 类型
- `src/pages/blogs/blog/index.tsx` 或 `src/pages/blogs/detail/index.tsx`

做到什么程度算完成：

- 博客列表来自真实接口。
- 搜索/分类切换能请求或过滤真实数据。
- 点击文章能进入详情页。
- 空状态、加载态、错误态都有处理。

### 2.3 欢迎页流程动画还需视觉验收

当前状态：

- 代码和构建已通过。
- 流程区已经变成 4 步 RAG 可视化演示。
- 第三步、第四步已经做过多轮位置、文案、连线和外框调整。
- 但还需要继续按浏览器批注做主观视觉验收。

下一步可调方向：

- 第一步如继续调：重点看上传框、文件图标和 chunk 文本是否仍有重叠。
- 第二步如继续调：重点看连接线在不同宽度下是否对齐。
- 第三步如继续调：重点看三路召回卡片、Top-K 片段和合流线是否拥挤。
- 第四步如继续调：重点看左右大框留白、内部内容是否溢出、整体是否居中。

做到什么程度算完成：

- 点击底部圆点时不出现布局跳动。
- 切换耗时主观感觉小于半秒。
- 页面不再呈现“长画轴”。
- `#knowledge` 区块只占一个主屏附近的高度。
- 四个动画在 1117px 宽度下不出现文字/元素重叠或溢出。

### 2.4 浏览器预览状态有过异常

过程中 Edge 有一次把 `localhost:3000/blogs` 标签页显示为睡眠状态，导致页面未正常唤醒渲染。后来用构建、SSR smoke check 和 Vite 模块返回确认过代码可用。

下一轮如果继续视觉验收，建议：

- 直接刷新 `http://localhost:3000/`
- 必要时开新标签访问 `http://localhost:3000/blogs`
- 如果仍卡住，重启 Vite：

```bash
npm run dev
```

## 3. 建议下一轮工作顺序

1. 先做欢迎页视觉验收
   - 看顶部 3 个按钮是否符合预期
   - 看 4 步流程轮播切换是否自然
   - 看第三步多路召回和第四步检索回答的布局是否还需要微调
   - 看 `#knowledge` 区块是否足够短、是否没有长画轴感

2. 再做后端登录真实联调
   - 启动 service
   - 清本地 token
   - 注册/登录/刷新/退出完整跑一遍

3. 最后决定博客页是否继续接后端
   - 如果只是展示页，当前 mock 可先保留
   - 如果要业务化，补接口和详情页

## 4. 当前关键文件索引

- `src/pages/welcome/index.tsx`
  - 欢迎页、登录表单、流程轮播、顶部导航
- `src/pages/blogs/index.tsx`
  - 博客列表页
- `src/App.tsx`
  - 路由、公开博客页、全局路由过渡
- `src/routes.ts`
  - 路由常量
- `src/types/api.ts`
  - 登录/注册请求类型
- `src/services/auth.ts`
  - 登录/注册/退出请求
- `src/lib/api-client.ts`
  - `satoken` 注入、统一响应处理
- `src/components/Sidebar.tsx`
  - 工作台侧边栏与退出登录

## 5. 交接提醒

- 当前工作区已有一些文档改动和新文档，不要随手回滚。
- 如果只改欢迎页视觉，优先限制在 `src/pages/welcome/index.tsx` 和 `src/index.css`。
- 第三步/第四步的动画尺寸大量使用固定坐标 + 缩放，改动时要同时检查外层占位宽高、内部画布尺寸和 SVG 线条端点。
- 如果做真实联调，优先检查后端是否启动以及 Redis/Sa-Token 是否正常。
- `npm run lint` 是 `tsc --noEmit`，每次提交前至少跑它。
