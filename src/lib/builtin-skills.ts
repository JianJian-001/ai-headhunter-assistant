import type { SkillManifest } from './types'

export interface BuiltinSkillDefinition {
  slug: string
  name: string
  description: string
  icon: string
  category: string
  invocationMethod: string
  sourceDir?: string
  manifest: SkillManifest
  keywords: string[]
  routingDescription: string
}

export const BUILTIN_SKILLS: BuiltinSkillDefinition[] = [
  {
    slug: 'headhunter-chat',
    name: '猎头AI助手',
    description: '一期猎头业务默认问候与通用问答入口，负责承接未命中特定流程的对话并在一期技能之间做自动路由。',
    icon: '💬',
    category: '通用',
    invocationMethod: '/chat',
    sourceDir: 'skills/builtin/headhunter-chat',
    manifest: { version: '1.0', role: '猎头AI助手' },
    keywords: ['猎头助手', '你会什么', '你能做什么', '你好', '帮助', '一期技能'],
    routingDescription: '一期猎头业务默认问候、能力介绍与技能路由入口。',
  },
  {
    slug: 'skill-creator',
    name: '技能创建助手',
    description: '用于创建、完善和包装新技能，适用于对话创建技能和基于技能文件包的二次完善。',
    icon: '🛠️',
    category: '运营专员',
    invocationMethod: '/skill-creator',
    sourceDir: 'skills/builtin/skill-creator',
    manifest: { version: '1.0', role: '技能创建助手' },
    keywords: ['创建技能', '新建技能', 'skill creator', '技能设计', '技能文件包'],
    routingDescription: '用于创建、完善和包装新技能的内置技能助手。',
  },
  {
    slug: 'headhunter-find-job',
    name: '招聘岗位信息获取',
    description: '基于用户提供的 JD 和岗位材料整理招聘情报；适用于梳理岗位要求、模糊点和追问项。',
    icon: '🔍',
    category: 'BD专员',
    invocationMethod: '/find-job',
    sourceDir: 'skills/builtin/headhunter-find-job',
    manifest: {
      version: '1.0',
      role: '寻访研究员',
      scripts: [{ name: 'material_digest', runtime: 'python', path: 'scripts/material_digest.py' }],
    },
    keywords: ['找岗位', '查岗位', '看jd', '职位情报', '岗位材料', '岗位整理'],
    routingDescription: '整理用户提供的岗位材料并输出结构化招聘情报。',
  },
  {
    slug: 'headhunter-search-report',
    name: '做单秘籍',
    description: '输出岗位理解、寻访策略和接单建议；适用于职位理解失焦、客户意图不清或寻访方向发散。',
    icon: '📋',
    category: '寻访研究员',
    invocationMethod: '/search-report',
    sourceDir: 'skills/builtin/headhunter-search-report',
    manifest: { version: '1.0', role: '寻访研究员' },
    keywords: ['做单秘籍', '岗位分析', '岗位解析', '寻访策略', '接单建议', '职位分析'],
    routingDescription: '输出岗位理解、寻访策略、目标公司方向和接单建议。',
  },
  {
    slug: 'headhunter-cv-matching',
    name: '简历匹配分析',
    description: '基于本地简历文本和 JD 做匹配分析、评分筛选和批量排序，并输出匹配理由与 gap。',
    icon: '📊',
    category: '寻访研究员',
    invocationMethod: '/cv-matching',
    sourceDir: 'skills/builtin/headhunter-cv-matching',
    manifest: {
      version: '1.0',
      role: '寻访研究员',
      scripts: [{ name: 'match_resume', runtime: 'python', path: 'scripts/match_resume.py' }],
    },
    keywords: ['简历匹配', 'jd匹配', '匹配度', '简历分析', '候选人评估', '筛简历'],
    routingDescription: '分析简历与职位要求的匹配度，并输出评分、理由和排序。',
  },
  {
    slug: 'headhunter-resume-risk-pro',
    name: '简历风险分析',
    description: '扫描时间线、学历与履历一致性风险，输出证据片段、核验清单和顾问话术。',
    icon: '🛡️',
    category: '执行顾问',
    invocationMethod: '/resume-risk',
    sourceDir: 'skills/builtin/headhunter-resume-risk-pro',
    manifest: {
      version: '1.0',
      role: '寻访研究员',
      scripts: [{ name: 'scan_resume_risk', runtime: 'python', path: 'scripts/scan_resume_risk.py' }],
    },
    keywords: ['简历风险', '风险分析', '可疑点', '核验问题', '学历风险', '时间线风险'],
    routingDescription: '扫描简历风险并输出证据、追问和风险等级。',
  },
  {
    slug: 'headhunter-interview-coach',
    name: '面试智练',
    description: '围绕 JD、简历和风险点生成面试题库、多轮文本 mock 与复盘摘要。',
    icon: '🎤',
    category: '执行顾问',
    invocationMethod: '/interview-coach',
    sourceDir: 'skills/builtin/headhunter-interview-coach',
    manifest: { version: '1.0', role: '寻访研究员' },
    keywords: ['面试智练', '面试题', 'mock', '模拟面试', '追问题', '复盘'],
    routingDescription: '生成面试题库、多轮 mock 和复盘摘要。',
  },
  {
    slug: 'headhunter-candidate-report',
    name: '推荐报告生成',
    description: '结合简历、JD 和沟通纪要输出结构化候选人推荐报告，可按需导出本地 Markdown。',
    icon: '📝',
    category: '执行顾问',
    invocationMethod: '/candidate-report',
    sourceDir: 'skills/builtin/headhunter-candidate-report',
    manifest: { version: '1.0', role: '执行顾问' },
    keywords: ['候选人报告', '推荐报告', '候选人推荐', '纪要生成报告', '推荐理由'],
    routingDescription: '生成结构化候选人推荐报告。',
  },
  {
    slug: 'headhunter-floating-cv',
    name: '高端候选人简历脱敏',
    description: '基于用户提供的简历正文和脱敏约定，对高端候选人简历做脱敏处理，并在对话中输出脱敏后的内容。',
    icon: '🕶️',
    category: '执行顾问',
    invocationMethod: '/floating-cv',
    sourceDir: 'skills/builtin/headhunter-floating-cv',
    manifest: { version: '1.0', role: '执行顾问' },
    keywords: ['简历脱敏', '脱敏简历', '高端候选人脱敏', '匿名简历', 'floating cv', 'floating-cv'],
    routingDescription: '基于脱敏约定输出高端候选人简历的脱敏版本。',
  },
  {
    slug: 'headhunter-greeting-skill',
    name: '候选人跟进话术',
    description: '处理候选人建立联系之后的持续跟进、节点保温和下一步动作建议，只生成文案不执行发送。',
    icon: '👋',
    category: '执行顾问',
    invocationMethod: '/greeting',
    sourceDir: 'skills/builtin/headhunter-greeting-skill',
    manifest: { version: '1.0', role: '寻访研究员' },
    keywords: ['候选人跟进', '候选人保温', '节日关怀', '无回复后怎么跟', '跟进话术'],
    routingDescription: '为已建联候选人生成跟进策略、热度判断和跟进话术。',
  },
  {
    slug: 'headhunter-company-intel',
    name: '公司情报',
    description: '基于用户提供材料归纳公司基本情况、业务特点、高管、融资、招聘职位和客户开发策略。',
    icon: '🏢',
    category: 'BD专员',
    invocationMethod: '/company-intel',
    sourceDir: 'skills/builtin/headhunter-company-intel',
    manifest: { version: '1.0', role: 'BD顾问' },
    keywords: ['公司情报', '客户画像', '高管情况', '融资情况', '客户开发策略', '公司分析'],
    routingDescription: '归纳用户提供的公司材料并输出结构化公司情报。',
  },
]

export const BUILTIN_SKILL_MAP: Record<string, BuiltinSkillDefinition> = Object.fromEntries(
  BUILTIN_SKILLS.map((skill) => [skill.slug, skill]),
)
