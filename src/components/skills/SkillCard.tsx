'use client'

import type { Skill } from '@/lib/types'
import { Plus, Check } from 'lucide-react'

interface SkillCardProps {
  skill: Skill
  isAdded?: boolean
  onDetail?: (skill: Skill) => void
}

const tagColors: Record<string, { bg: string; text: string }> = {
  BD专员: { bg: '#E8F3FF', text: '#3B82F6' },
  寻访研究员: { bg: '#FFF2E9', text: '#F97316' },
  执行顾问: { bg: '#F4ECFF', text: '#8B5CF6' },
  大客户经理: { bg: '#E8FFF3', text: '#10B981' },
  运营专员: { bg: '#FFF5F5', text: '#EF4444' },
  通用: { bg: '#F0EDFF', text: '#6E61FF' },
}

export function SkillCard({ skill, isAdded, onDetail }: SkillCardProps) {
  const tag = tagColors[skill.category] || tagColors['通用']

  return (
    <div
      className="bg-white rounded-3xl p-5 border border-[#EAE5FF] hover:shadow-[0_12px_28px_rgba(110,97,217,0.1)] transition-all cursor-pointer flex flex-col"
      onClick={() => onDetail?.(skill)}
    >
      {/* Info section */}
      <div className="flex-1 mb-4">
        <h3 className="text-[15px] font-bold text-[#27214D] mb-2 leading-snug">
          {skill.name}
        </h3>
        <p className="text-[13px] text-[#6A6389] leading-relaxed line-clamp-2 mb-3">
          {skill.description}
        </p>
        <span
          className="inline-block text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ backgroundColor: tag.bg, color: tag.text }}
        >
          {skill.category}
        </span>
      </div>

      {/* Bottom row: price + add button */}
      <div className="flex items-center justify-between pt-3 border-t border-[#F3F0FF]">
        <span className="text-[13px] text-[#8E86AF]">
          {skill.price > 0 ? `¥${skill.price}/月` : '免费'}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDetail?.(skill)
          }}
          disabled={isAdded}
          className={`flex items-center justify-center rounded-full transition-colors ${
            isAdded
              ? 'w-14 h-9 bg-[#F1EEFF] text-primary text-[13px] font-medium'
              : 'w-9 h-9 bg-[#F3F0FF] text-[#6E61FF] hover:bg-[#E8E3FF]'
          }`}
        >
          {isAdded ? '已添加' : <Plus size={18} />}
        </button>
      </div>
    </div>
  )
}
