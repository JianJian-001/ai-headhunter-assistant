# AI猎头助手

> 技能驱动的智能招聘平台，让每位猎头都拥有专属 AI 团队

---

## 目录

- [项目概述](#项目概述)
- [核心功能](#核心功能)
- [技术栈](#技术栈)
- [系统架构](#系统架构)
- [快速开始](#快速开始)
- [环境变量](#环境变量)
- [数据库迁移](#数据库迁移)
- [项目结构](#项目结构)
- [技能系统](#技能系统)
- [API 文档](#api-文档)
- [开发指南](#开发指南)

---

## 项目概述

AI猎头助手是面向猎头行业的 AI 助手平台。平台以「技能」为核心抽象，将猎头业务流程（岗位情报整理、简历匹配分析、候选人跟进、公司情报归纳、推荐报告生成等）封装为可插拔的 AI 技能，通过统一的对话界面调度执行。

用户可以：
- 在聊天中通过 `/技能名` 命令一键调用专业技能
- 在技能市场浏览、购买和启用他人发布的技能
- 创建并发布自己的专属技能，支持商业化

---

## 核心功能

### 智能对话
- **三种对话模式**：问答模式（精准回答）、联网搜索模式（实时信息）、Agent 模式（技能调度）
- **流式输出**：基于 SSE 的实时流式响应，打字机效果
- **附件支持**：上传图片、文档等附件参与对话，支持内容提取与解析
- **对话历史**：多会话管理，历史记录持久化至云端

### 技能系统
- **内置猎头技能**：岗位信息获取、做单秘籍、简历匹配分析、简历风险分析、面试智练、推荐报告生成等开箱即用
- **飞书集成技能**：通过 Lark CLI 实现飞书消息发送、多维表格管理等自动化操作
- **用户自建技能**：通过 Markdown 定义技能提示词，支持上传 ZIP 包（含 SKILL.md 及参考资料）
- **技能市场**：技能可发布至市场供他人购买和使用

### 商业化体系
- **商家入驻**：用户可申请成为商家，发布和销售自建技能
- **购买记录**：完整的技能购买与订阅记录管理

---

## 技术栈

| 层级 | 技术选型 |
|------|---------|
| **前端框架** | [Next.js 15](https://nextjs.org/) (App Router) + React 19 |
| **语言** | TypeScript（strict 模式） |
| **样式** | Tailwind CSS v4（`@theme` 设计 Token） |
| **状态管理** | [Zustand](https://zustand-demo.pmnd.rs/) |
| **认证与数据库** | [Supabase](https://supabase.com/)（Auth + PostgreSQL + Storage） |
| **AI 推理** | 豆包大模型（字节跳动）via OpenAI 兼容接口 |
| **扩展集成** | [Coze API](https://www.coze.com/)、[MCP SDK](https://modelcontextprotocol.io/) |
| **Markdown 渲染** | react-markdown + remark-gfm |
| **图标** | [Lucide React](https://lucide.dev/) |
| **包管理** | npm |

---

## 系统架构

```
┌─────────────────────────────────────────────────────┐
│                    浏览器客户端                        │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐ │
│  │ ChatArea │  │ Composer │  │  ScenarioCards     │ │
│  └──────────┘  └──────────┘  └────────────────────┘ │
│  ┌──────────────────────────────────────────────────┐│
│  │          Zustand Stores（chat / skill / layout） ││
│  └──────────────────────────────────────────────────┘│
└─────────────────────────┬───────────────────────────┘
                          │ HTTP / SSE
┌─────────────────────────▼───────────────────────────┐
│                  Next.js API Routes                  │
│  ┌─────────────┐  ┌──────────┐  ┌────────────────┐  │
│  │  /api/chat  │  │/api/skill│  │  /api/merchant │  │
│  └──────┬──────┘  └────┬─────┘  └───────┬────────┘  │
│         │              │                │            │
│  ┌──────▼──────────────▼────────────────▼─────────┐  │
│  │              业务逻辑层（src/lib）               │  │
│  │  skill-runtime · skill-router · doubao · ...   │  │
│  └──────┬──────────────────────────────────────────┘  │
└─────────┼────────────────────────────────────────────┘
          │
┌─────────▼──────────────┐   ┌────────────────────────┐
│  Supabase              │   │  豆包 / Coze / MCP      │
│  Auth · DB · Storage   │   │  大模型推理接口          │
└────────────────────────┘   └────────────────────────┘
```

---

## 快速开始

### 前置要求

- Node.js ≥ 18
- npm ≥ 9
- Supabase 项目（或本地 Supabase CLI）
- 豆包 API 访问凭据

### 安装

```bash
# 克隆仓库
git clone <repository-url>
cd <项目根目录>

# 安装依赖
npm install
```

### 配置环境变量

```bash
cp .env.local.example .env.local
# 编辑 .env.local，填写各项配置（见下方环境变量说明）
```

### 初始化数据库

在 Supabase 控制台或通过 Supabase CLI 依次执行 `supabase/migrations/` 目录下的迁移文件：

```bash
# 使用 Supabase CLI
supabase db push
```

### 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

### 构建生产版本

```bash
npm run build
npm run start
```

---

## 环境变量

参考 `.env.local.example`，以下为必填项：

| 变量名 | 说明 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名公钥 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务角色密钥（仅服务端） |
| `DOUBAO_API_KEY` | 豆包 API 密钥 |
| `DOUBAO_BASE_URL` | 豆包 API 基础 URL |
| `DOUBAO_MODEL` | 使用的豆包模型 ID |
| `ATTACHMENT_HMAC_SECRET` | 附件上传签名密钥 |

以下为可选集成：

| 变量名 | 说明 |
|--------|------|
| `COZE_API_KEY` | Coze Bot API 密钥 |
| `LARK_APP_ID` | 飞书应用 ID |
| `LARK_APP_SECRET` | 飞书应用 Secret |

---

## 数据库迁移

迁移文件位于 `supabase/migrations/`，按序执行：

| 文件 | 内容 |
|------|------|
| `001_initial_schema.sql` | 基础表结构：`profiles`、`conversations`、`messages`、`skills` 等，含 RLS 策略 |
| `002_profile_storage_hardening.sql` | 用户头像存储桶安全加固 |
| `003_sync_builtin_headhunter_skills.sql` | 同步内置猎头技能至数据库 |
| `004_add_chat_attachments_storage.sql` | 聊天附件存储桶配置 |
| `005_add_ephemeral_chat_attachments_storage.sql` | 临时附件存储桶（无需登录） |

---

## 项目结构

```
项目根目录/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── page.tsx                # 首页（主聊天界面）
│   │   ├── layout.tsx              # 根布局
│   │   ├── marketplace/            # 技能市场
│   │   ├── my-skills/
│   │   │   ├── added/              # 已添加的技能
│   │   │   └── created/            # 已创建的技能
│   │   ├── create-skill/           # 创建技能
│   │   ├── purchases/              # 购买记录
│   │   ├── merchant/               # 商家中心
│   │   └── api/                    # API 路由
│   │       ├── chat/               # 对话（含附件）
│   │       ├── skills/             # 技能 CRUD 与市场
│   │       ├── conversations/      # 对话历史
│   │       ├── profile/            # 用户信息
│   │       ├── purchases/          # 购买记录
│   │       └── merchant/           # 商家管理
│   ├── components/
│   │   ├── layout/Sidebar.tsx      # 侧边导航
│   │   ├── chat/
│   │   │   ├── ChatArea.tsx        # 消息列表
│   │   │   ├── Composer.tsx        # 输入框
│   │   │   └── ScenarioCards.tsx   # 场景引导卡片
│   │   ├── skills/
│   │   │   ├── SkillCard.tsx       # 技能卡片
│   │   │   └── SkillDetail.tsx     # 技能详情弹窗
│   │   └── shared/AppIcons.tsx     # 图标组件
│   ├── lib/
│   │   ├── types.ts                # 全局类型定义
│   │   ├── chat-store.ts           # 对话状态（Zustand）
│   │   ├── skill-store.ts          # 技能状态（Zustand）
│   │   ├── layout-store.ts         # 布局状态（Zustand）
│   │   ├── skill-runtime.ts        # 技能加载与执行引擎
│   │   ├── skill-router.ts         # 技能意图路由
│   │   ├── builtin-skills.ts       # 内置技能注册表
│   │   ├── doubao.ts               # 豆包 API 封装
│   │   ├── supabase.ts             # Supabase 客户端
│   │   ├── attachment-extractor.ts # 附件内容提取
│   │   └── chat-attachment-parser.ts
│   ├── middleware.ts               # Supabase 会话刷新
│   └── styles/globals.css          # Tailwind v4 主题配置
├── skills/builtin/                 # 内置技能目录
│   ├── headhunter-chat/
│   ├── headhunter-find-job/
│   ├── headhunter-search-report/
│   ├── headhunter-cv-matching/
│   ├── headhunter-resume-risk-pro/
│   ├── headhunter-interview-coach/
│   ├── headhunter-candidate-report/
│   ├── headhunter-floating-cv/
│   ├── headhunter-greeting-skill/
│   ├── headhunter-company-intel/
│   ├── skill-creator/
├── supabase/migrations/            # 数据库迁移
├── next.config.ts
├── tsconfig.json
└── package.json
```

---

## 技能系统

### 技能定义规范

每个技能由一个 `SKILL.md` 文件描述，可附带 `references/` 和 `assets/` 目录作为知识库。

```
my-skill/
├── SKILL.md          # 技能核心提示词与使用说明（必填）
├── references/       # 参考资料（会被自动注入上下文，可选）
└── assets/           # 静态资源（可选）
```

`SKILL.md` 推荐结构：

```markdown
# 技能名称

## 触发条件
描述何时应激活此技能...

## 执行流程
1. 步骤一
2. 步骤二

## 输出格式
描述期望的输出格式...
```

### 创建自定义技能

1. 在平台「创建技能」页面填写技能元信息
2. 上传包含 `SKILL.md` 的 ZIP 压缩包
3. 在「我的技能 · 已创建」中预览效果
4. 确认无误后发布至技能市场

### 调用技能

在对话输入框中输入 `/技能名称 ` 即可激活对应技能，Agent 模式下会自动路由至最匹配的技能。

---

## API 文档

### `POST /api/chat`

发起流式对话请求，返回 `text/event-stream`。

**请求体**

```json
{
  "messages": [{ "role": "user", "content": "帮我搜索 Java 高级工程师候选人" }],
  "mode": "agent",
  "conversation_id": "uuid（可选，续接已有对话）",
  "enabled_skills": ["headhunter-find-job"],
  "attachments": [
    {
      "type": "file",
      "url": "https://...",
      "server_token": "hmac-签名",
      "filename": "resume.pdf"
    }
  ]
}
```

**mode 取值**

| 值 | 说明 |
|----|------|
| `qa` | 问答模式，直接由大模型回答 |
| `search` | 联网搜索模式 |
| `agent` | Agent 模式，自动路由并调用技能 |

**SSE 事件格式**

```
data: {"type":"text","content":"..."}
data: {"type":"conversation_id","id":"uuid"}
data: [DONE]
```

### `GET/POST /api/skills`

获取用户技能列表 / 创建新技能。

### `POST /api/skills/upload`

上传技能 ZIP 包，解析 `SKILL.md` 并存储相关文件。

### `GET /api/skills/marketplace`

获取市场中已发布的技能列表，支持分页与关键词搜索。

### `PATCH /api/skills/[id]/toggle`

启用或禁用某个技能。

### `POST /api/skills/[id]/publish`

将用户自建技能发布至市场。

---

## 开发指南

### 添加新的内置技能

1. 在 `skills/builtin/` 下创建新目录，命名规范为 `headhunter-<功能名>`
2. 编写 `SKILL.md`，可在 `references/` 放置参考文档
3. 在 `src/lib/builtin-skills.ts` 中注册技能元信息
4. 如需本地执行逻辑（非纯提示词），在 `src/lib/skill-runtime.ts` 的 `executeSkill` 中添加对应分支
5. 执行迁移文件，将新技能同步至数据库

### 代码规范

- 使用 TypeScript strict 模式，所有类型定义集中于 `src/lib/types.ts`
- 组件采用 React 函数式组件 + Hooks
- 路径别名统一使用 `@/` 前缀（映射至 `src/`）
- API 路由均需验证 Supabase 用户会话后再处理业务逻辑

### 运行 Lint

```bash
npm run lint
```

---

## License

Private — All rights reserved.
