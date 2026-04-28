# ToLink Web 缺失后端接口清单

> 文档版本：1.1
> 更新日期：2026-04-28
> 扫描范围：`toLink-Web/src`、`toLink-Service/link-api/src/main/java`
> 结论口径：以当前代码真实存在的 Controller 与前端实际调用为准

---

## 一、结论摘要

当前 `toLink-Web` 和 `toLink-Service` 之间的问题分成两类：

1. **真正缺失的后端接口**
   前端已有调用意图，后端 Controller 尚未提供对应能力。
2. **后端已提供，但前端调用路径或交互模型不匹配**
   这类问题不应归因于后端缺接口，需要优先改前端适配。

本文件只把第 1 类列为“缺失接口”，并在末尾补充第 2 类，避免联调判断失真。

---

## 二、真正缺失的后端接口

### 2.1 发送会话消息

**优先级：P0**

前端位置：
- `toLink-Web/src/services/chat.ts`
- `toLink-Web/src/pages/chats/chat/index.tsx`

前端期望：

```http
POST /api/v1/chat/conversations/{conversationId}/messages
```

建议请求体：

```json
{
  "content": "用户问题",
  "configId": 1
}
```

建议返回：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1001,
    "conversationId": 100,
    "role": "assistant",
    "content": "AI 回复内容",
    "configId": 1,
    "modelName": "gpt-4o",
    "tokenCount": 123,
    "createdAt": "2026-04-28T10:00:00"
  }
}
```

当前后端现状：
- `ChatController` 只提供创建会话、查询会话列表、查询消息列表、删除会话
- 未提供“发送消息并生成回复”的入口

影响：
- 聊天详情页无法真正完成问答闭环
- 当前 `handleSend()` 仍是 `TODO`

---

### 2.2 更新会话信息

**优先级：P0**

前端位置：
- `toLink-Web/src/services/chat.ts`
- `toLink-Web/src/pages/chats/chat/index.tsx`

前端期望：

```http
PATCH /api/v1/chat/conversations/{conversationId}
```

建议支持字段：

```json
{
  "title": "新标题",
  "isPinned": true
}
```

当前后端现状：
- `ChatController` 不存在 `@PatchMapping("/{id}")`

影响：
- 对话页“置顶/取消置顶”按钮无法真正生效
- 后续如果要支持改标题，也没有后端承接点

---

### 2.3 更新数据集信息

**优先级：P1**

前端位置：
- `toLink-Web/src/services/dataset.ts`

前端期望：

```http
PATCH /api/v1/datasets/{datasetId}
```

建议支持字段：

```json
{
  "name": "新的知识库名称",
  "description": "新的描述"
}
```

当前后端现状：
- `DatasetController` 只有创建、列表、详情、删除
- 不存在数据集更新接口

影响：
- 前端已预留 `updateDataset()` 服务，但当前没有实际后端可调用

---

## 三、暂不建议作为缺失接口立项，但属于产品能力缺口

### 3.1 文件重新关联多个知识库

前端位置：
- `toLink-Web/src/pages/files/index.tsx`
- `toLink-Web/src/components/LinkToDatasetDialog.tsx`

现状：
- 当前后端文件模型是“文件属于单个数据集”
- 前端页面存在“链接到数据集”的交互设想，但代码里已明确注释 `Backend doesn't support updating file-dataset relationships yet`

说明：
- 这不是简单少一个 CRUD 接口，而是数据模型是否允许“一个文件挂多个知识库”的设计问题
- 如果确认需要该能力，建议先统一领域模型，再设计接口

---

## 四、后端已提供，但前端必须改造适配的接口

以下不是后端缺失，而是 `toLink-Web` 当前调用路径与后端真实路径不一致：

| 前端当前调用 | 后端真实接口 | 说明 |
|---|---|---|
| `GET /api/v1/datasets/{id}/knowledge-files` | `GET /api/v1/datasets/{id}/files` | 文件列表路径不一致 |
| `POST /api/v1/datasets/{id}/knowledge-files` | `POST /api/v1/datasets/{id}/files` | 文件上传路径不一致 |
| `GET /api/v1/knowledge-files/{fileId}` | `GET /api/v1/files/{fileId}` | 文件详情路径不一致 |
| `DELETE /api/v1/knowledge-files/{fileId}` | `DELETE /api/v1/files/{fileId}` | 文件删除路径不一致 |
| `POST /api/v1/knowledge-files/{fileId}/parse-tasks` | `POST /api/v1/files/{fileId}/parse` | 手动解析触发路径不一致 |

额外说明：
- 后端已提供 `GET /api/v1/datasets/{datasetId}/files/parse-events`
- 后端已提供 `GET /api/v1/datasets/{datasetId}/files/parse-results`
- 这意味着文件上传与解析链路可以先按现有接口接通，不需要等待新接口

---

## 五、建议实现顺序

1. 后端补 `POST /api/v1/chat/conversations/{id}/messages`
2. 后端补 `PATCH /api/v1/chat/conversations/{id}`
3. 前端把知识文件相关路径统一改成 `/files`
4. 前端接入文件上传、删除、手动解析、解析结果轮询或 SSE
5. 后端补 `PATCH /api/v1/datasets/{id}`
6. 如产品确认需要，再单独设计“文件关联多个知识库”能力

