'use client'

import type { Skill } from '@/lib/types'
import { X, Plus, Check, Sparkles, PlayCircle } from 'lucide-react'

interface SkillDetailProps {
  skill: Skill
  isAdded?: boolean
  onAdd?: (skill: Skill) => void
  onClose: () => void
}

function buildSkillUsage(skill: Skill): string {
  if (skill.invocation_method) {
    return `添加后在对话中输入 ${skill.invocation_method}，再补充你的具体需求。`
  }

  return '添加后直接在对话里描述需求，系统会自动匹配并调用这个技能。'
}

export function SkillDetail({ skill, isAdded, onAdd, onClose }: SkillDetailProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-[480px] mx-4 max-h-[80vh] overflow-y-auto shadow-[0_24px_48px_rgba(110,97,217,0.15)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div>
            <h2 className="text-xl font-bold text-[#27214D] mb-1">{skill.name}</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#F0EDFF] text-primary">
                {skill.category}
              </span>
              <span className="text-[13px] text-[#8E86AF]">
                {skill.price > 0 ? `¥${skill.price}/月` : '免费'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#F6F3FF] text-[#8E86AF] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-4 space-y-4">
          <div className="rounded-[24px] border border-[#EEE9FF] bg-[#FCFBFF] p-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#8E86AF] mb-2">
              <Sparkles size={14} className="text-primary" />
              功能
            </div>
            <p className="text-[14px] text-[#4A4365] leading-relaxed">{skill.description}</p>
          </div>

          <div className="rounded-[24px] border border-[#EEE9FF] bg-[#FCFBFF] p-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-[#8E86AF] mb-2">
              <PlayCircle size={14} className="text-primary" />
              使用方式
            </div>
            <p className="text-[14px] text-[#4A4365] leading-relaxed">{buildSkillUsage(skill)}</p>
            {skill.invocation_method && (
              <code className="mt-3 text-[13px] bg-[#F6F3FF] px-3 py-1.5 rounded-xl text-primary font-mono inline-block">
                {skill.invocation_method}
              </code>
            )}
          </div>

          {skill.manifest?.role && (
            <div className="text-[13px] text-[#8E86AF]">
              适用角色：{skill.manifest.role}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-4">
          <button
            onClick={() => onAdd?.(skill)}
            disabled={isAdded}
            className={`w-full py-3 rounded-2xl text-[15px] font-semibold transition-colors ${
              isAdded
                ? 'bg-[#F1EEFF] text-primary'
                : 'bg-primary text-white hover:bg-[#5B4EE6]'
            }`}
          >
            {isAdded ? (
              <span className="flex items-center justify-center gap-2">
                <Check size={16} /> 已添加到我的技能
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Plus size={16} /> 添加到我的技能
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
