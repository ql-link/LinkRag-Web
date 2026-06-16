# ToLink Web 交接文档

> 日期：2026-05-12  
> 模块：`toLink-Web`  
> 目标：让下一轮对话快速接上当前前端联通与欢迎页/博客页改造进度。

## 1. 当前已完成

### 1.12 2026-05-12 对话详情页（/chats/:id）联通与布局收口

本轮围绕对话详情页做了完整联通与多轮样式收口，当前状态如下：

- 布局与导航：
  - 对话详情页进入后隐藏全局左侧导航和右侧信息栏，仅保留聊天工作区。
  - 顶部头部与下方文件/对话主体左右边界对齐，主对话区域宽度已扩大。
  - 头部标题格式已统一为：`#知识库名称-对话名称`。
- 左侧文件栏：
  - 仅展示当前对话关联知识库下的文件（按 `conversation.datasetId` 加载）。
  - 支持拖拽上传与点击虚线框上传。
  - 上传区文案为两行展示：
    - 拖拽文件到此处上传
    - 或点击此区域上传
  - “上传后立即解析”为开关样式，已做单行防换行处理。
  - 文件排序支持点击切换：按创建时间 / 按更新时间。
- 对话区：
  - 无消息时显示居中欢迎文案。
  - 输入框内部右侧集成模型选择（ChatGPT 风格简化版），发送消息时携带选中 `configId`。
  - 模型下拉数据来源于已启用的 CHAT 配置：`getLLMConfigs({ capability: 'CHAT', isActive: true })`。
- 全局字体与数字显示：
  - 全局 `font-sans` 已切换为中文优先字体栈（`Noto Serif SC` + 系统中文字体）。
  - `body` 增加 `font-variant-numeric: lining-nums tabular-nums`，修复数字视觉偏小与不齐的问题。

涉及文件：

- `src/App.tsx`
- `src/pages/chats/chat/index.tsx`
- `src/index.css`

### 1.0 2026-05-11 工作台 UI 与导航更新

本轮重点从欢迎页/博客页转向登录后工作台体验，已完成以下调整：

- 主侧边栏导航顺序调整为：
  - 首页
  - 知识库
  - 对话
  - 文件
  - LLM 配置
  - 用量
- `LLM 配置` 已从个人中心下拉菜单移到主菜单。
- 主菜单中的 `博客` 已移除，替换为 `用量`。
- 新增用量页：
  - 路由：`/usage`
  - 文件：`src/pages/usage/index.tsx`
  - 接口：复用 `src/services/llm.ts` 中的 `getUsageSummary`、`getDailyUsage`、`getUsageLogs`
  - 页面内容：总调用、总 Token、提示词 Token、平均延迟、近 14 天趋势、每日明细、最近调用记录。
- 首页更新：
  - 问候语使用当前用户昵称/用户名，不再写死 `Alex Chen`。
  - 问候左侧装饰图标已删除。
  - 新增 `快速会话` 入口，点击后跳转到对话页并自动打开新建对话弹窗。
  - 顶部 `header` 加圆角，和左右侧栏视觉统一。
- 侧边栏视觉更新：
  - 侧边栏 logo 改为欢迎页同款 `LinkRagMark`。
  - 新增共享组件：`src/components/LinkRagMark.tsx`。
  - 收起态下 logo、菜单项、底部按钮统一中轴线。
  - 左侧收起/展开按钮固定在底部。
- 右侧栏更新：
  - 改成类似左侧栏的固定宽度折叠，而不是 resizable panel 百分比折叠。
  - 展开宽度约 `240px`，收起宽度约 `72px`。
  - 展开和收起按钮都固定在右侧栏底部，位置不再跳动。
- 主题与颜色：
  - 夜间模式强调色从紫色统一改为蓝色。
  - 已去掉圆形主题切换特效，回到更稳定的普通平滑切换。
- 路由切换动画：
  - 动画只作用在中间内容区域。
  - 左右侧栏不再跟随页面切换消失。

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

2026-05-11 更新：

- 博客页文件仍保留在 `src/pages/blogs/index.tsx`，但已经不再从主工作台菜单暴露。
- 当前主菜单中的博客入口已被 `用量` 替代。
- 欢迎页顶部也已将原博客入口替换为 `用量`。

### 1.6 路由过渡动画

在 `src/App.tsx` 增加全局路由过渡：

- 使用 `motion/react`
- 页面切换时做淡入、轻微位移和模糊过渡
- 支持系统减少动态效果偏好

注意：

- 公开博客页放在认证 loading 逻辑之外。
- 根路径欢迎页使用 `index` 路由，避免 `/blogs` 被 `/` 路由吞掉。

2026-05-11 更新：

- 工作台内部路由动画已经下沉到中间 `Panel` 内容区。
- 左侧主侧边栏和右侧信息栏不参与路由切换动画，切换页面时不会消失。

### 1.7 已执行验证

以下命令已多次通过：

```bash
npm run lint
npm run build
```

`build` 会提示 chunk 超过 500KB，这是 Vite/Rollup 的体积警告，不是当前改动引入的编译错误。

### 1.8 2026-05-11 数据集基础联通

本轮开始推进数据集方向的基础联通，后端真实契约确认如下：

- 列表：`GET /api/v1/datasets`
- 详情：`GET /api/v1/datasets/{datasetId}`
- 创建：`POST /api/v1/datasets`
- 更新：`PATCH /api/v1/datasets/{datasetId}`
- 删除：`DELETE /api/v1/datasets/{datasetId}`

前端已完成：

- `src/pages/datasets/index.tsx`
  - 知识库列表接入真实分页接口。
  - 新建知识库接入真实创建接口。
  - 列表卡片整体点击直接进入知识库详情，不再保留右上角箭头按钮。
  - 列表卡片右下角放置编辑、删除入口；删除调用 `DELETE /api/v1/datasets/{datasetId}`。
  - 编辑入口已接入真实编辑弹窗，保存时调用 `PATCH /api/v1/datasets/{datasetId}` 更新名称与描述。
  - 增加列表加载态、失败态、空态、搜索空态。
  - 创建按钮增加提交态和必填禁用。
  - 创建成功后弹出成功提示并更新列表。
- `src/pages/datasets/dataset/index.tsx`
  - 数据集详情、文件列表继续接入真实接口。
  - 对话列表加载失败不再阻断数据集详情展示。
  - 增加详情加载失败提示。
  - 删除知识库、上传文件、删除文件、提交解析任务增加操作态和成功提示。
  - 上传失败或未上传成功的文件禁用解析按钮，避免直接触发后端失败。

验证结果：

```bash
npm run lint
npm run build
```

均已通过。`build` 仍有 chunk 超过 500KB 的既有提醒。

文档规则已补充：

- 联通过程中发现后端未实现的接口，写入 `docs/ToLink-缺失接口清单.md`。
- 后端实现并完成前端适配后，从缺失接口清单中删除，不保留已解决项。

2026-05-11 联调修复：

- 删除数据集时后端报 `Unknown column 'parse_notice_status' in 'field list'`。
- 根因：`KnowledgeOriginalFile` 实体仍映射旧解析字段，但当前 `document_original_file` 表职责已收敛为原文件上传事实。
- 修复：移除 `KnowledgeOriginalFile` 上旧解析字段映射，避免 MyBatis-Plus 默认查询不存在的列。
- 删除数据集继续报 `Unknown column 'is_deleted' in 'field list'`。
- 根因：`ChatConversation` 实体和 H2 测试 schema 仍按旧软删除字段建模，但当前 `chat_conversation` 主 schema 没有 `is_deleted`。
- 修复：移除 `ChatConversation.isDeleted` 与 `@TableLogic`，会话删除改为先删消息再物理删除会话；同步调整测试 schema 和断言。
- 验证：`mvn -pl link-service -am -DskipTests compile`、`mvn -pl link-api -am -Dtest=DatasetControllerTest -DfailIfNoTests=false test` 通过。

### 1.9 2026-05-11 文件方向基础联通

本轮继续推进文件方向基础联通，后端真实契约确认如下：

- 文件列表：`GET /api/v1/datasets/{datasetId}/files`
- 文件上传：`POST /api/v1/datasets/{datasetId}/files`
- 文件详情：`GET /api/v1/files/{fileId}`
- 文件删除：`DELETE /api/v1/files/{fileId}`
- 提交解析：`POST /api/v1/files/{fileId}/parse`
- 解析结果：`GET /api/v1/datasets/{datasetId}/files/parse-results`
- 解析事件：`GET /api/v1/datasets/{datasetId}/files/parse-events`

前端已完成：

- `src/services/dataset.ts`
  - 新增 `enrichKnowledgeFilesWithParseResults()`，列表加载后按文件 ID 合并解析状态、解析文件名和解析失败原因。
- `src/pages/files/index.tsx`
  - 文件总览页加载所有知识库下文件，并合并解析结果。
  - 上传支持选择目标知识库和“上传后解析”。
  - 上传入口限制为当前前端支持格式，并展示 `md / markdown / pdf / docx` 提示。
  - 删除、解析按钮增加操作态和成功提示。
  - 增加文件列表加载态、失败态、空态。
- `src/pages/datasets/dataset/index.tsx`
  - 知识库详情页文件列表合并解析结果。
  - 上传支持“上传后解析”。
  - 上传入口限制为当前前端支持格式，并展示 `md / markdown / pdf / docx` 提示。
  - 文件状态文案收敛为上传失败、待解析、解析中、解析完成、解析失败。

当前未做：

- SSE 实时解析事件尚未接入，当前通过刷新/重新加载查询 `parse-results` 兜底展示状态。

### 1.10 2026-05-11 接口状态全量扫描与前端清理

本轮对后端全部 12 个 Controller（45 个端点）做了源码级扫描，确认前后端接口对齐状态。

**确认结果：**

| 模块 | 后端接口数 | 前端已接通 | 缺失 |
|------|-----------|-----------|------|
| Auth | 3 | 3 | 0 |
| User | 2 | 2 | 0 |
| LLM Config | 6 | 6 | 0 |
| LLM Providers | 1 | 1 | 0 |
| Usage | 3 | 3 | 0 |
| Dataset | 5 | 5 | 0 |
| Knowledge Files | 7 | 7 | 0 |
| Chat | 4 | 4（列表/创建/历史/删除） | **2（发送消息、更新会话）** |
| OSS | 2 | 1（头像上传） | 1（公共预览是内部接口） |
| Admin | 10 | 0（前端无页面） | 0（接口已有，前端未实现） |
| Internal | 2 | 0（服务间接口） | 0 |

**前端已完成的清理：**

- `src/pages/chats/index.tsx`
  - 移除硬编码 "89 条消息"，改为动态显示对话数量。
- `src/pages/chats/chat/index.tsx`
  - 移除 `handleSend()` 和 `handlePin()` 中的 `alert()` 占位，改为 TODO 注释。
  - 移除黄色提示 banner。
  - 发送按钮、置顶按钮、输入框全部设为 `disabled`，带 `title` 提示后端接口待补齐。
  - 输入框 placeholder 改为 "输入消息..."。
  - 视觉上发送区域变为灰色不可用状态，hover 时显示 tooltip。

### 1.11 2026-05-12 对话与文件联通收尾

本轮继续完成对话、知识库和文件页面的基础联通与样式收口：

- 对话模块：
  - `src/pages/chats/index.tsx` 的对话记录卡片改成中性灰系图标与标题，卡片内展示数据集名称和更新时间，点击卡片直接进入详情。
  - 新建对话弹窗已接入真实 `DatasetSelector` 单选样式，选中后显示数据集标题文字，而不是小标签。
  - `src/pages/chats/chat/index.tsx` 已接通发送消息、置顶更新和删除接口。
  - `src/services/chat.ts` 的 `updateConversation()` 已改为返回更新后的会话对象，方便前端即时回显。
- 知识库与文件模块：
  - `src/pages/datasets/index.tsx` 已完成卡片大小收口，编辑/删除入口保留在卡片右下角。
  - `src/pages/datasets/dataset/index.tsx` 已把“上传后立即解析”改为开关，上传入口改成点击虚线框触发。
  - `src/pages/files/index.tsx` 已把文件页卡片调整得更接近文件夹中的文件列表效果，并移除了“暂无文件”的大卡片。
  - `src/components/DatasetSelector.tsx` 已支持对话创建场景的单选展示。
- 文档同步：
  - `docs/ToLink-前后端联通计划表.md` 已更新对话模块状态。
  - `docs/ToLink-缺失接口清单.md` 已删除已实现的对话接口缺口。
  - `toLink-Service/project_info.md` 已补充对话接口能力现状。

**后端启动问题记录：**

- `mvn spring-boot:run` 启动失败，报 `NoClassDefFoundError: com/qingluo/link/model/dto/request/UpdateDatasetRequest`。
- 根因：`spring-boot:run` 插件使用旧的 link-model jar，而非 target/classes。
- `mvn clean compile` 和 `mvn install` 均成功，但 `install` 因 `.m2/repository` 权限问题无法写入。
- 本地环境问题，不影响代码正确性。前端 lint + build 均通过。

**当前缺失接口清单（2 个 P0，后端源码确认不存在）：**

1. `POST /api/v1/chat/conversations/{id}/messages` — 发送消息
2. `PATCH /api/v1/chat/conversations/{id}` — 更新会话（置顶/重命名）

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
- `src/pages/home/index.tsx`
  - 工作台首页、问候语、快速会话入口
- `src/pages/usage/index.tsx`
  - 用量统计页
- `src/pages/blogs/index.tsx`
  - 博客列表页，当前不在主菜单暴露
- `src/App.tsx`
  - 路由、工作台中间内容过渡、右侧栏折叠
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
- `src/components/LinkRagMark.tsx`
  - 欢迎页和侧边栏共用 logo 图形

## 5. 交接提醒

- 当前工作区已有一些文档改动和新文档，不要随手回滚。
- 如果只改欢迎页视觉，优先限制在 `src/pages/welcome/index.tsx` 和 `src/index.css`。
- 第三步/第四步的动画尺寸大量使用固定坐标 + 缩放，改动时要同时检查外层占位宽高、内部画布尺寸和 SVG 线条端点。
- 如果做真实联调，优先检查后端是否启动以及 Redis/Sa-Token 是否正常。
- `npm run lint` 是 `tsc --noEmit`，每次提交前至少跑它。
