# ToLink Web 缺失后端接口清单

> 文档版本：1.4
> 更新日期：2026-05-12
> 扫描范围：`toLink-Web/src`、`toLink-Service/link-api/src/main/java`
> 结论口径：以当前代码真实存在的 Controller 与前端实际调用为准

---

## 一、结论摘要

当前 `toLink-Web` 和 `toLink-Service` 之间仍待后端补充的接口，只记录在本文件中。

本文件只记录“前端已有调用意图，但后端 Controller 尚未提供”的接口。

已实现接口的维护口径：

1. 后端实现后，先核对 Controller 路径、请求字段和响应字段。
2. 前端完成接入并通过基础验证后，必须从本清单删除对应条目。
3. 后端已提供但前端尚未适配的问题，不写入本清单，改写到交接文档或联通计划待办中。

---

## 二、真正缺失的后端接口

当前扫描结果：`toLink-Web` 代码中已无“前端已有调用意图但后端 Controller 未提供”的接口。

> 说明：2026-05-12 已完成以下接口并完成前端接入，因此从缺失清单移除：
>
> 1. `POST /api/v1/chat/conversations/{id}/messages`
> 2. `PATCH /api/v1/chat/conversations/{id}`

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

## 四、建议实现顺序

1. 当前优先关注“文件关联多个知识库”能力是否需要立项。
2. 若确认需要，先统一数据模型，再补充后端接口与前端交互。
