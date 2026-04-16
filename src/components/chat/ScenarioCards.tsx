'use client'

import { Sparkles } from 'lucide-react'

interface ScenarioCardsProps {
  onSelect: (prompt: string) => void
}

const scenarios = [
  {
    title: '搜公司 + 生成职位清单',
    body: '给我一批半导体目标公司，自动补全招聘岗位、团队背景和推荐切入点。',
    prompt: '/headhunter-find-job 深圳 半导体公司',
    gradient: 'linear-gradient(135deg, #E8F3FF 0%, #FFFFFF 100%)',
  },
  {
    title: '简历匹配 + 推荐理由',
    body: '我有一份候选人简历，帮我匹配最适合的职位，并输出推荐理由和风险提示。',
    prompt: '/cv-matching 请帮我分析这份简历与 JD 的匹配度',
    gradient: 'linear-gradient(135deg, #FFF2E9 0%, #FFFFFF 100%)',
  },
  {
    title: '岗位深挖 + 做单秘籍',
    body: '拿到 JD 后快速拆岗位、看目标公司方向、判断接单策略和建议追问。',
    prompt: '/search-report 这是一个 AI 算法负责人岗位，帮我输出做单秘籍和寻访策略',
    gradient: 'linear-gradient(135deg, #F4ECFF 0%, #FFFFFF 100%)',
  },
]

export function ScenarioCards({ onSelect }: ScenarioCardsProps) {
  return (
    <div className="w-full pt-7">
      <h3 className="text-[22px] font-bold text-[#231C4C] mb-4">高频场景</h3>
      <div className="flex gap-4">
        {scenarios.map((s) => (
          <button
            key={s.title}
            onClick={() => onSelect(s.prompt)}
            className="flex-1 rounded-3xl p-[18px] text-left transition-all hover:shadow-md"
            style={{ background: s.gradient }}
          >
            <div className="text-lg font-bold text-[#1F2A54] leading-snug mb-2.5">
              {s.title}
            </div>
            <div className="text-sm text-[#617094] leading-relaxed">
              {s.body}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
