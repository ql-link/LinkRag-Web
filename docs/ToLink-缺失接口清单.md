# 后端缺失接口清单

> 文档版本：1.0
> 创建日期：2026-04-27
> 前置条件：已完成 toLink-Service 前端 API 文档（v2.0）对齐

---

## 一、背景说明

根据 `ToLink-Service/docs/ToLink-前端API文档.md` 中的 **第十八节**（接口缺口），以下接口是前端完成完整功能闭环所必需的，但当前后端代码中尚未提供。

---

## 二、缺失接口清单

### 2.1 聊天发送消息接口（P0 - 核心功能）

#### 2.1.1 发送消息并获取 AI 回复

**接口**

```http
POST /api/v1/chat/conversations/{conversationId}/messages
```

**请求头**

```http
satoken: {accessToken}
Content-Type: application/json
```

**请求体**

```json
{
  "content": "用户输入的问题",
  "configId": 1
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| content | string | 是 | 用户消息内容，不能为空 |
| configId | number | 否 | 指定使用的 LLM 配置 ID，不传则使用上次配置或默认配置 |

**响应示例**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1001,
    "conversationId": 100,
    "role": "assistant",
    "content": "AI 回复内容...",
    "configId": 1,
    "modelName": "gpt-4",
    "tokenCount": 150,
    "createdAt": "2026-04-27T10:30:00"
  }
}
```

**说明**
- 后端应调用 LLM API 生成回复
- 回复消息 role 为 `assistant`
- 如果配置了流式响应（streamEnabled=true），应支持 SSE 模式

---

#### 2.1.2 流式对话接口

**接口**

```http
POST /api/v1/chat/chat
Content-Type: application/json
```

**请求体**

```json
{
  "datasetId": 10001,
  "message": "用户问题",
  "configId": 1,
  "stream": true
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| datasetId | number | 是 | 数据集 ID，用于知识检索 |
| message | string | 是 | 用户消息 |
| configId | number | 否 | LLM 配置 ID |
| stream | boolean | 否 | 是否返回流式响应，默认 false |

**响应（非流式）**

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "answer": "完整回复内容",
    "conversationId": 100,
    "messageId": 1001
  }
}
```

**响应（流式）**

```http
Content-Type: text/event-stream
```

```
data: {"content": "部分", "done": false}
data: {"content": "回复", "done": false}
data: {"content": "内容", "done": true}
```

**说明**
- 流式响应应通过 SSE（Server-Sent Events）实现
- 每次发送一个 chunk，包含部分 content
- 最后一条 done=true 表示完成

---

### 2.2 对话编辑能力接口（P1）

#### 2.2.1 修改对话标题

**接口**

```http
PATCH /api/v1/chat/conversations/{conversationId}
```

**请求体**

```json
{
  "title": "新对话标题"
}
```

**响应**

```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

---

#### 2.2.2 设置对话置顶/取消置顶

**接口**

```http
PATCH /api/v1/chat/conversations/{conversationId}
```

**请求体**

```json
{
  "isPinned": true
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| isPinned | boolean | 是 | true=置顶，false=取消置顶 |

---

#### 2.2.3 批量删除对话消息

**接口**

```http
DELETE /api/v1/chat/conversations/{conversationId}/messages
```

**说明**
- 清空指定对话的所有消息
- 为物理删除，删除后不可恢复
- 对话本身保留，只清空消息

---

### 2.3 数据集编辑能力接口（P2）

#### 2.3.1 修改数据集

**接口**

```http
PATCH /api/v1/datasets/{datasetId}
```

**请求体**

```json
{
  "name": "新数据集名称",
  "description": "新的数据集描述"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 否 | 新名称，最大 128 字符 |
| description | string | 否 | 新描述，最大 512 字符 |

**说明**
- 所有字段可选，只传要修改的字段
- 不允许重名

---

## 三、接口优先级总结

| 优先级 | 接口 | 路径 | 说明 |
|--------|------|------|------|
| P0 | 发送消息 | `POST /api/v1/chat/conversations/{id}/messages` | 核心聊天功能 |
| P0 | 流式对话 | `POST /api/v1/chat/chat` | 实时对话体验 |
| P1 | 修改对话标题 | `PATCH /api/v1/chat/conversations/{id}` | 对话管理 |
| P1 | 置顶对话 | `PATCH /api/v1/chat/conversations/{id}` | 对话管理 |
| P1 | 清空消息 | `DELETE /api/v1/chat/conversations/{id}/messages` | 对话管理 |
| P2 | 修改数据集 | `PATCH /api/v1/datasets/{datasetId}` | 数据集管理 |

---

## 四、建议实现顺序

1. **第一阶段**：`POST /api/v1/chat/conversations/{id}/messages` - 基础聊天功能
2. **第二阶段**：`POST /api/v1/chat/chat`（流式）- 优化聊天体验
3. **第三阶段**：对话编辑接口（标题、置顶、清空消息）
4. **第四阶段**：数据集编辑接口

---

## 五、注意事项

### 5.1 Token 头

所有接口都要求请求头携带 `satoken: {accessToken}`，不是 `Authorization: Bearer`。

### 5.2 错误处理

后端应返回标准错误格式：

```json
{
  "code": 400,
  "message": "用户输入不能为空",
  "data": null
}
```

### 5.3 消息保存

每次 AI 回复后，后端应自动保存：
- 用户消息（role: user）
- AI 回复（role: assistant）

不应让前端手动调用两次发送接口。