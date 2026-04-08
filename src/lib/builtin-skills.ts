import type { SkillManifest } from './types'

export interface BuiltinSkillDefinition {
  slug: string
  name: string
  description: string
  icon: string
  category: string
  invocationMethod: string
  manifest: SkillManifest
  keywords: string[]
  routingDescription: string
}

export const BUILTIN_SKILLS: BuiltinSkillDefinition[] = [
  {
    slug: 'headhunter-chat',
    name: '猎头AI助手',
    description: '猎头业务默认问候与通用问答入口，负责承接未命中特定流程的对话。',
    icon: '💬',
    category: '通用',
    invocationMethod: '/chat',
    manifest: { version: '1.0', role: '猎头AI助手' },
    keywords: ['猎头助手', '你会什么', '你能做什么', '你好', '帮助'],
    routingDescription: '猎头业务默认问候与通用问答入口。',
  },
  {
    slug: 'skill-creator',
    name: '技能创建助手',
    description: '用于创建、完善和包装新技能，适用于对话创建技能和基于技能文件包的二次完善。',
    icon: '🛠️',
    category: '运营专员',
    invocationMethod: '/skill-creator',
    manifest: { version: '1.0', role: '技能创建助手' },
    keywords: ['创建技能', '新建技能', 'skill creator', '技能设计', '技能文件包'],
    routingDescription: '用于创建、完善和包装新技能的内置技能助手。',
  },
  {
    slug: 'headhunter-find-job',
    name: '招聘岗位信息获取',
    description: '通过浏览器自动化获取招聘岗位信息；适用于查岗位、看 JD、看某公司或地区职位列表。',
    icon: '🔍',
    category: 'BD专员',
    invocationMethod: '/find-job',
    manifest: {
      version: '1.0',
      role: '寻访研究员',
      scripts: [{ name: 'search_jobs', runtime: 'python', path: 'scripts/search_jobs.py' }],
      env_vars: ['PLAYWRIGHT_BROWSERS_PATH'],
    },
    keywords: ['找岗位', '查岗位', '看jd', '职位列表', '招聘信息', '岗位采集'],
    routingDescription: '通过浏览器自动化获取招聘岗位信息。',
  },
  {
    slug: 'headhunter-candidate-sourcing',
    name: '候选人寻访',
    description: '拿到岗位后执行全网与本地知识库候选人寻访、统一去重打分、输出 Top10 候选人。',
    icon: '🎯',
    category: '寻访研究员',
    invocationMethod: '/candidate-sourcing',
    manifest: {
      version: '1.0',
      role: '寻访研究员',
      scripts: [{ name: 'run_platform_sourcing_pipeline', runtime: 'python', path: 'scripts/run_platform_sourcing_pipeline.py' }],
      env_vars: ['PLAYWRIGHT_BROWSERS_PATH'],
    },
    keywords: ['找候选人', '寻访候选人', '搜人', 'top10候选人', '全网找人', '找合适候选人'],
    routingDescription: '围绕岗位执行多来源候选人寻访、排序和下游技能分流。',
  },
  {
    slug: 'headhunter-cv-jd-matching',
    name: '简历JD匹配',
    description: '根据简历文件或简历文件夹与职位要求做匹配分析、评分筛选，并给出触达策略。',
    icon: '📊',
    category: '寻访研究员',
    invocationMethod: '/cv-jd-matching',
    manifest: {
      version: '1.0',
      role: '寻访研究员',
      scripts: [{ name: 'main', runtime: 'node', path: 'scripts/main.js' }],
    },
    keywords: ['简历匹配', 'jd匹配', '匹配度', '简历分析', '候选人评估'],
    routingDescription: '分析简历与职位要求的匹配度，并生成触达策略。',
  },
  {
    slug: 'headhunter-search-report',
    name: '岗位分析报告',
    description: '生成猎头岗位分析报告并同步到飞书文档和岗位库。',
    icon: '📋',
    category: '执行顾问',
    invocationMethod: '/search-report',
    manifest: {
      version: '1.0',
      role: '寻访研究员',
      scripts: [{ name: 'feishu_api', runtime: 'python', path: 'scripts/feishu_api.py' }],
      env_vars: ['FEISHU_APP_ID', 'FEISHU_APP_SECRET'],
    },
    keywords: ['岗位分析', '岗位解析', '职位分析', '寻访报告', '人才搜寻方案'],
    routingDescription: '生成岗位分析报告并同步飞书文档与岗位库。',
  },
  {
    slug: 'headhunter-candidate-report',
    name: '候选人推荐报告',
    description: '生成招聘候选人推荐报告并写入飞书文档，适用于会议纪要和推荐总结场景。',
    icon: '📝',
    category: '执行顾问',
    invocationMethod: '/candidate-report',
    manifest: {
      version: '1.0',
      role: '执行顾问',
      scripts: [{ name: 'feishu_api', runtime: 'python', path: 'scripts/feishu_api.py' }],
      env_vars: ['FEISHU_APP_ID', 'FEISHU_APP_SECRET'],
    },
    keywords: ['候选人报告', '推荐报告', '候选人推荐', '会议纪要生成报告'],
    routingDescription: '生成候选人推荐报告并写入飞书文档。',
  },
  {
    slug: 'headhunter-outreach-message',
    name: '首次触达文案',
    description: '为猎头顾问生成候选人首次触达和首轮跟进文案，并规划外部渠道触达节奏。',
    icon: '✉️',
    category: '执行顾问',
    invocationMethod: '/outreach-message',
    manifest: { version: '1.0', role: '寻访研究员' },
    keywords: ['首次触达', '加微信', '打电话', '发短信', '首轮跟进', '触达文案'],
    routingDescription: '生成候选人首次触达文案与首轮跟进节奏。',
  },
  {
    slug: 'headhunter-greeting-skill',
    name: '候选人跟进关怀',
    description: '处理候选人建立联系之后的持续跟进、节点保温、微信问候发送和下一步动作建议。',
    icon: '👋',
    category: '执行顾问',
    invocationMethod: '/greeting',
    manifest: {
      version: '1.0',
      role: '寻访研究员',
      scripts: [{ name: 'main', runtime: 'python', path: 'scripts/main.py' }],
    },
    keywords: ['候选人跟进', '候选人保温', '节日关怀', '批量发微信', '无回复后怎么跟'],
    routingDescription: '处理已建联候选人的持续跟进、保温和微信问候。',
  },
  {
    slug: 'headhunter-client-nurture',
    name: '客户关系维护',
    description: '维护存量客户关系、识别续单与新需求信号、输出客户关怀动作和下一步建议。',
    icon: '🤝',
    category: '大客户经理',
    invocationMethod: '/client-nurture',
    manifest: {
      version: '1.0',
      role: '大客户经理',
      scripts: [{ name: 'client_tier_score', runtime: 'python', path: 'scripts/client_tier_score.py' }],
    },
    keywords: ['客户维护', '客户关怀', '续单', '扩单', '客户分层', '客户风险预警'],
    routingDescription: '维护存量客户关系并识别续单、扩单与风险信号。',
  },
  {
    slug: 'headhunter-table-manage',
    name: '飞书工作台',
    description: '猎头数字分身在飞书中的工作台；用于管理招聘项目进展、岗位库、人才库和推荐报告。',
    icon: '📁',
    category: '运营专员',
    invocationMethod: '/table-manage',
    manifest: {
      version: '1.0',
      role: '运营专员',
      scripts: [{ name: 'feishu_api', runtime: 'python', path: 'scripts/feishu_api.py' }],
      env_vars: ['FEISHU_APP_ID', 'FEISHU_APP_SECRET'],
    },
    keywords: ['猎头工作站', '岗位库', '人才库', '招聘项目进展', '飞书工作台'],
    routingDescription: '管理飞书工作台中的岗位库、人才库和招聘项目进展。',
  },
]

export const BUILTIN_SKILL_MAP: Record<string, BuiltinSkillDefinition> = Object.fromEntries(
  BUILTIN_SKILLS.map((skill) => [skill.slug, skill]),
)
