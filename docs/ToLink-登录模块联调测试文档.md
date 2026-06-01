# ToLink 登录模块联调测试文档

> 文档版本：1.0  
> 创建日期：2026-05-10  
> 适用范围：`toLink-Web` 登录、注册、登录态恢复、退出登录联调验收  
> 关联模块：`toLink-Web`、`toLink-Service`

---

## 1. 测试目标

本轮联调目标是确认 Web 登录入口与 Java 后端认证接口真实可用，并形成可重复执行的验收清单。

核心目标：

1. 登录、注册、退出登录能使用真实后端接口完成闭环。
2. 前端请求字段、token 存储、认证请求头与后端真实契约一致。
3. 成功、失败、超时等场景都有明确前端反馈。
4. 欢迎页不因登录态恢复接口慢而阻塞首屏展示。
5. 登录后刷新页面能恢复用户上下文，受保护页面访问规则正确。

---

## 2. 环境准备

### 2.1 前端

项目目录：

```bash
cd /Users/fang/Developer/Projects/toLink/toLink-Web
```

启动命令：

```bash
npm run dev
```

访问地址：

```text
http://localhost:3000/
```

前端代理配置：

- `/api` 代理到 `http://localhost:8080`
- 关键配置文件：`vite.config.ts`

### 2.2 后端

项目目录：

```bash
cd /Users/fang/Developer/Projects/toLink/toLink-Service
```

启动命令：

```bash
mvn spring-boot:run -pl link-api
```

后端地址：

```text
http://localhost:8080
```

注意：

- Spring Boot 启动入口在 `link-api`，不要直接启动 `link-service`。
- 当前本地 profile 默认连接远端 MySQL / Redis / Kafka。
- 如果 Redis 抖动，登录后获取用户资料可能出现慢请求；后端已对用户资料缓存做降级，前端也已加请求超时。

---

## 3. 接口契约

### 3.1 登录

接口：

```http
POST /api/v1/auth/login
```

请求体：

```json
{
  "account": "yuan",
  "password": "******"
}
```

成功响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "accessToken": "token",
    "tokenType": "Bearer",
    "expiresIn": 604800,
    "userId": 10007
  }
}
```

前端处理：

- 将 `data.accessToken` 写入 `localStorage.accessToken`
- 调用 `GET /api/v1/user/profile` 回填 `AuthContext.user`
- 成功后跳转首页
- 弹出绿色提示：`登录成功`

### 3.2 注册

接口：

```http
POST /api/v1/auth/register
```

请求体：

```json
{
  "username": "test_user",
  "password": "Test123456",
  "email": "test_user@example.com"
}
```

前端处理：

- 注册成功后同登录流程自动写入 token
- 调用 `GET /api/v1/user/profile`
- 成功后进入首页
- 弹出绿色提示：`注册成功`

### 3.3 获取当前用户

接口：

```http
GET /api/v1/user/profile
```

请求头：

```http
satoken: {accessToken}
```

注意：

- 当前后端真实校验的是 `satoken` 请求头。
- 不要使用 `Authorization: Bearer xxx` 替代。

### 3.4 退出登录

接口：

```http
POST /api/v1/auth/logout
```

请求头：

```http
satoken: {accessToken}
```

前端处理：

- 调用 `AuthContext.logout()`
- 清除 `localStorage.accessToken`
- 清空 `AuthContext.user`
- 回到欢迎页

---

## 4. 前端关键文件

| 文件 | 说明 |
|------|------|
| `src/pages/welcome/index.tsx` | 登录/注册表单、成功跳转、成功 Toast |
| `src/services/auth.ts` | 登录、注册、退出登录 service |
| `src/services/user.ts` | 用户资料接口 |
| `src/lib/api-client.ts` | `satoken` 注入、统一错误处理、请求超时 |
| `src/contexts/AuthContext.tsx` | 登录态恢复、用户上下文、退出登录 |
| `src/contexts/ToastContext.tsx` | 成功/失败提示弹窗 |
| `src/App.tsx` | 公开欢迎页与受保护路由逻辑 |

---

## 5. 测试前清理

建议每轮联调前先清理浏览器旧 token：

```js
localStorage.removeItem('accessToken')
```

也可以在 DevTools 的 Application 面板删除 `Local Storage -> http://localhost:3000 -> accessToken`。

---

## 6. 测试用例

### 6.1 欢迎页首屏

| 编号 | 操作 | 预期结果 |
|------|------|----------|
| AUTH-001 | 打开 `http://localhost:3000/` | 欢迎页立即展示，不长时间停留在 loading |
| AUTH-002 | 浏览器存在旧 token 时刷新 `/` | 欢迎页仍能先展示，不被 `/user/profile` 阻塞 |
| AUTH-003 | 点击顶部“登录” | 页面滚动到登录区域 |

### 6.2 登录成功

| 编号 | 操作 | 预期结果 |
|------|------|----------|
| AUTH-010 | 输入正确账号密码并提交 | 请求 `POST /api/v1/auth/login` |
| AUTH-011 | 查看 Network 请求体 | 请求体为 `{ account, password }` |
| AUTH-012 | 登录成功 | `localStorage.accessToken` 有值 |
| AUTH-013 | 登录成功后 | 自动请求 `GET /api/v1/user/profile` |
| AUTH-014 | 查看 profile 请求头 | 携带 `satoken: {accessToken}` |
| AUTH-015 | 页面反馈 | 顶部居中弹出绿色 `登录成功` |
| AUTH-016 | 路由跳转 | 进入工作台首页 |

### 6.3 登录失败

| 编号 | 操作 | 预期结果 |
|------|------|----------|
| AUTH-020 | 输入不存在账号 | 弹出错误提示，展示后端 message |
| AUTH-021 | 输入错误密码 | 弹出红色错误提示，例如 `密码错误` |
| AUTH-022 | 不输入用户名 | 表单内提示 `请输入用户名` |
| AUTH-023 | 后端不可用或请求超时 | 弹出 `请求超时，请稍后重试` 或网络异常提示 |

### 6.4 注册成功

| 编号 | 操作 | 预期结果 |
|------|------|----------|
| AUTH-030 | 切换到注册模式 | 展示邮箱与确认密码字段 |
| AUTH-031 | 输入新用户名、邮箱、密码 | 请求 `POST /api/v1/auth/register` |
| AUTH-032 | 查看请求体 | 请求体为 `{ username, password, email }` |
| AUTH-033 | 注册成功 | 写入 `localStorage.accessToken` |
| AUTH-034 | 注册成功后 | 调用 `GET /api/v1/user/profile` |
| AUTH-035 | 页面反馈 | 顶部居中弹出绿色 `注册成功` |
| AUTH-036 | 路由跳转 | 进入工作台首页 |

### 6.5 注册失败

| 编号 | 操作 | 预期结果 |
|------|------|----------|
| AUTH-040 | 用户名少于 3 位 | 表单内提示用户名长度错误 |
| AUTH-041 | 邮箱为空 | 表单内提示 `请输入邮箱` |
| AUTH-042 | 邮箱格式错误 | 表单内提示邮箱格式错误 |
| AUTH-043 | 两次密码不一致 | 表单内提示 `两次输入的密码不一致` |
| AUTH-044 | 用户名已存在 | 弹出后端返回的重复提示 |
| AUTH-045 | 邮箱已被使用 | 弹出后端返回的重复提示 |

### 6.6 登录态恢复

| 编号 | 操作 | 预期结果 |
|------|------|----------|
| AUTH-050 | 登录成功后刷新 `/home` | 保持登录并展示工作台 |
| AUTH-051 | 登录成功后直接访问受保护路由 | 能恢复用户上下文 |
| AUTH-052 | token 失效后访问受保护路由 | 清理 token 并回到欢迎页 |

### 6.7 退出登录

| 编号 | 操作 | 预期结果 |
|------|------|----------|
| AUTH-060 | 在侧边栏点击退出登录 | 调用 `POST /api/v1/auth/logout` |
| AUTH-061 | 退出后检查 localStorage | `accessToken` 被清除 |
| AUTH-062 | 退出后页面 | 回到欢迎页 |
| AUTH-063 | 退出后访问受保护路由 | 被重定向到欢迎页 |

---

## 7. curl 辅助验证

### 7.1 登录

```bash
curl -sS -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  --data '{"account":"yuan","password":"你的密码"}'
```

### 7.2 获取 profile

```bash
curl -sS http://localhost:3000/api/v1/user/profile \
  -H "satoken: ${TOKEN}"
```

### 7.3 退出登录

```bash
curl -sS -X POST http://localhost:3000/api/v1/auth/logout \
  -H "satoken: ${TOKEN}"
```

---

## 8. 性能与稳定性观察点

### 8.1 欢迎页首屏

观察目标：

- `/` 首屏不应被 `GET /api/v1/user/profile` 阻塞。
- 如果浏览器中有旧 token，认证恢复可以后台执行，但欢迎页应先展示。

### 8.2 登录接口

观察目标：

- `POST /api/v1/auth/login` 不应长时间卡住。
- 如果慢，优先检查后端日志中的 MySQL / Redis / Kafka 连接情况。

### 8.3 用户资料接口

观察目标：

- `GET /api/v1/user/profile` 是登录成功后的关键请求。
- 当前已针对 Redis 缓存异常做后端降级，Redis 抖动不应再长期阻塞登录闭环。

常见后端风险日志：

```text
Redis command timed out
Operation timed out
discard long time none received connection
```

---

## 9. 当前已知风险

| 风险 | 影响 | 当前处理 |
|------|------|----------|
| 远端 Redis 抖动 | profile 请求变慢、登录后跳转变慢 | 后端用户资料缓存已降级，前端请求有超时 |
| 远端 MySQL 连接空闲过久被丢弃 | 首次查询可能重建连接 | 观察 Druid 日志，必要时调连接池校验 |
| Kafka 历史坏消息刷日志 | 干扰后端日志阅读 | 不影响认证，但会影响联调排查体验 |
| API 文档旧字段残留 | 容易误用 `username` 登录字段 | 登录真实字段以本测试文档和后端代码为准：`account` |

---

## 10. 测试记录模板

| 时间 | 测试人 | 环境 | 用例范围 | 结果 | 问题记录 |
|------|--------|------|----------|------|----------|
| 2026-05-10 | 待填写 | localhost:3000 + localhost:8080 | AUTH-001 ~ AUTH-063 | 待填写 | 待填写 |

---

## 11. 阶段完成标准

满足以下条件可认为登录模块联调通过：

1. 注册成功后自动进入首页。
2. 登录成功后自动进入首页，并展示绿色成功提示。
3. 登录失败能展示后端真实错误信息。
4. 刷新受保护页面后能恢复登录态。
5. 退出登录后清除 token，并回到欢迎页。
6. 欢迎页首屏不再被认证恢复接口阻塞。
7. Network 中所有登录后的业务请求都携带 `satoken` header。
