'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { Search, Plus, MoreVertical } from 'lucide-react'
import type { Skill, UserSkill } from '@/lib/types'
import { useSkillStore } from '@/lib/skill-store'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

export default function MySkillsAddedPage() {
  return (
    <Suspense>
      <MySkillsAddedPageInner />
    </Suspense>
  )
}

function MySkillsAddedPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [allSkills, setAllSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const initialTab = searchParams.get('tab') === 'created' ? 'created' : 'added'
  const [subTab, setSubTab] = useState<'added' | 'created'>(initialTab)

  // Sync subTab when URL search params change (e.g. router.push from create-skill page)
  useEffect(() => {
    const tab = searchParams.get('tab') === 'created' ? 'created' : 'added'
    setSubTab(tab)
  }, [searchParams])

  const [createdSkills, setCreatedSkills] = useState<UserSkill[]>([])
  const [createdLoading, setCreatedLoading] = useState(false)

  // Track which card has its "..." menu open
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const { addedSkills, toggleSkill, removeSkill, setSkillEnabled } = useSkillStore()

  useEffect(() => {
    async function fetchAll() {
      setLoading(true)
      try {
        const res = await fetch('/api/skills/marketplace')
        const data = await res.json()
        setAllSkills(Array.isArray(data) ? data : [])
      } catch {
        setAllSkills([])
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const fetchCreatedSkills = useCallback(async () => {
    setCreatedLoading(true)
    try {
      const res = await fetch('/api/skills?type=created')
      const data = await res.json()
      const skills: UserSkill[] = Array.isArray(data) ? data : []
      setCreatedSkills(skills)
      skills.forEach((item) => {
        if (item.skill) {
          setSkillEnabled(item.skill, item.enabled)
        }
      })
    } catch {
      setCreatedSkills([])
    } finally {
      setCreatedLoading(false)
    }
  }, [setSkillEnabled])

  useEffect(() => {
    if (subTab === 'created') {
      fetchCreatedSkills()
    }
  }, [subTab, fetchCreatedSkills])

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null)
      }
    }
    if (menuOpenId) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpenId])

  async function handleToggleCreated(skill: Skill, currentEnabled: boolean) {
    await fetch(`/api/skills/${skill.id}/toggle`, { method: 'PATCH' })
    setSkillEnabled(skill, !currentEnabled)
    fetchCreatedSkills()
  }

  async function handleDeleteCreated(skillId: string) {
    setMenuOpenId(null)
    await fetch(`/api/skills/${skillId}`, { method: 'DELETE' })
    removeSkill(skillId)
    fetchCreatedSkills()
  }

  async function handlePublish(skillId: string) {
    setMenuOpenId(null)
    await fetch(`/api/skills/${skillId}/publish`, { method: 'POST' })
    fetchCreatedSkills()
  }

  // Map addedSkills to full Skill objects
  const mySkills = addedSkills
    .map((as) => {
      const skill = allSkills.find((s) => s.id === as.skillId)
      return skill ? { ...as, skill } : null
    })
    .filter(Boolean) as { skillId: string; slug: string; enabled: boolean; skill: Skill }[]

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-0">
        <div className="flex items-end justify-between mb-5">
          <h1 className="text-[42px] font-bold text-[#20194A] leading-tight">技能</h1>
          <div className="flex items-center gap-3 pb-1">
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A91B9]" />
              <input
                type="text"
                placeholder="搜索技能"
                className="w-[220px] h-10 pl-10 pr-4 rounded-full bg-white border border-[#E7E1FF] text-[14px] text-[#27214D] placeholder:text-[#9A91B9] focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            {/* 开通商户 */}
            <Link
              href="/merchant"
              className="h-10 px-4 rounded-full bg-white border border-[#E7E1FF] text-[14px] font-semibold text-[#3A3360] flex items-center gap-2 hover:bg-[#F6F3FF] transition-colors"
            >
              开通商户
            </Link>
            {/* 购买记录 */}
            <Link
              href="/purchases"
              className="h-10 px-4 rounded-full bg-white border border-[#E7E1FF] text-[14px] font-semibold text-[#3A3360] flex items-center gap-2 hover:bg-[#F6F3FF] transition-colors"
            >
              购买记录
            </Link>
            {/* 创建技能 */}
            <Link
              href="/?create=1"
              className="h-10 px-[18px] rounded-full bg-[#6E61FF] text-white text-[14px] font-bold flex items-center gap-2 hover:bg-[#5B4EE6] transition-colors"
            >
              <Plus size={16} />
              创建技能
            </Link>
          </div>
        </div>

        {/* Main tabs */}
        <div className="flex items-center gap-[10px] mb-5">
          <Link
            href="/marketplace"
            className="h-10 px-4 rounded-full text-[14px] font-semibold bg-white border border-[#E7E1FF] text-[#615A82] hover:bg-[#F6F3FF] transition-colors flex items-center"
          >
            技能商城
          </Link>
          <button className="h-10 px-4 rounded-full text-[14px] font-bold bg-[#F0EDFF] text-[#4B3BDB] transition-colors">
            我的技能
          </button>
        </div>

        {/* Sub tabs */}
        <div className="flex items-center gap-[10px] mb-5">
          <button
            onClick={() => setSubTab('added')}
            className={`h-9 px-4 rounded-full text-[13px] font-semibold transition-colors ${
              subTab === 'added'
                ? 'bg-[#1F1A42] text-white font-bold'
                : 'bg-white border border-[#E7E1FF] text-[#615A82] hover:bg-[#F6F3FF]'
            }`}
          >
            我添加的
          </button>
          <button
            onClick={() => setSubTab('created')}
            className={`h-9 px-4 rounded-full text-[13px] font-semibold transition-colors ${
              subTab === 'created'
                ? 'bg-[#1F1A42] text-white font-bold'
                : 'bg-white border border-[#E7E1FF] text-[#615A82] hover:bg-[#F6F3FF]'
            }`}
          >
            我创建的
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {subTab === 'created' ? (
          createdLoading ? (
            <div className="grid grid-cols-3 gap-[14px]">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-3xl border border-[#EAE5FF] animate-pulse h-[180px]" />
              ))}
            </div>
          ) : createdSkills.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-[#8E86AF] text-[15px] mb-4">还没有创建任何技能</p>
              <Link
                href="/?create=1"
                className="inline-flex h-10 px-5 rounded-full bg-[#6E61FF] text-white text-[14px] font-bold items-center gap-2 hover:bg-[#5B4EE6] transition-colors"
              >
                创建第一个技能
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-[14px]" ref={menuRef}>
              {createdSkills.map((item) => {
                const skill = item.skill
                if (!skill) return null
                const isMenuOpen = menuOpenId === item.id
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-3xl p-5 border border-[#EAE5FF] hover:shadow-[0_12px_28px_rgba(110,97,217,0.1)] transition-all flex flex-col relative"
                  >
                    <div className="flex-1 mb-4 flex flex-col gap-[10px]">
                      <h3 className="text-[16px] font-bold text-[#27214D] leading-snug">
                        {skill.name}
                      </h3>
                      <p className="text-[13px] text-[#8B84A7] leading-relaxed line-clamp-2">
                        {skill.description}
                      </p>
                      {skill.invocation_method && (
                        <code className="text-[12px] bg-[#F6F3FF] px-2.5 py-1 rounded-full text-primary font-mono self-start">
                          {skill.invocation_method}
                        </code>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => router.push(`/?skill=${skill.slug}`)}
                        className="flex-1 h-12 rounded-2xl bg-[#6E61FF] text-white text-[14px] font-bold hover:bg-[#5B4EE6] transition-colors"
                      >
                        立即使用
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpenId(isMenuOpen ? null : item.id)}
                          className="w-12 h-12 rounded-2xl bg-white border border-[#D9D2F4] flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.08)] hover:bg-[#F6F3FF] transition-colors"
                        >
                          <MoreVertical size={18} className="text-[#1F173A]" />
                        </button>

                        {isMenuOpen && (
                          <div className="absolute right-0 bottom-[calc(100%+8px)] z-50 bg-white rounded-[18px] border border-[#EAE5FF] shadow-[0_14px_28px_rgba(0,0,0,0.1)] p-[18px] w-[210px] flex flex-col gap-[18px]">
                            <div className="flex items-center justify-between">
                              <span className="text-[16px] font-medium text-[#1F173A]">
                                {item.enabled ? '禁用' : '启用'}
                              </span>
                              <button
                                onClick={() => handleToggleCreated(skill, item.enabled)}
                                className={`w-[46px] h-7 rounded-full p-1 flex items-center transition-colors ${
                                  item.enabled ? 'bg-[#1F1A42] justify-end' : 'bg-[#E0DAFF] justify-start'
                                }`}
                              >
                                <span className="w-5 h-5 rounded-full bg-white block" />
                              </button>
                            </div>
                            <button
                              onClick={() => { setMenuOpenId(null); router.push(`/create-skill?edit=${skill.id}`) }}
                              className="text-[16px] font-medium text-[#1F173A] text-left hover:text-primary transition-colors"
                            >
                              技能改造
                            </button>
                            <button
                              onClick={() => handlePublish(skill.id)}
                              className="text-[16px] font-medium text-[#1F173A] text-left hover:text-primary transition-colors"
                            >
                              上架到商店
                            </button>
                            <button
                              onClick={() => handleDeleteCreated(skill.id)}
                              className="text-[16px] font-medium text-[#FF4D4F] text-left hover:text-red-600 transition-colors"
                            >
                              删除
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        ) : loading ? (
          <div className="grid grid-cols-3 gap-[14px]">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-3xl border border-[#EAE5FF] animate-pulse h-[180px]" />
            ))}
          </div>
        ) : mySkills.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[#8E86AF] text-[15px] mb-4">还没有添加任何技能</p>
            <Link
              href="/marketplace"
              className="inline-flex h-10 px-5 rounded-full bg-[#6E61FF] text-white text-[14px] font-bold items-center gap-2 hover:bg-[#5B4EE6] transition-colors"
            >
              前往技能商城
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-[14px]" ref={menuRef}>
            {mySkills.map((item) => {
              const isMenuOpen = menuOpenId === item.skillId
              return (
                <div
                  key={item.skillId}
                  className="bg-white rounded-3xl p-5 border border-[#EAE5FF] hover:shadow-[0_12px_28px_rgba(110,97,217,0.1)] transition-all flex flex-col relative"
                >
                  <div className="flex-1 mb-4 flex flex-col gap-[10px]">
                    <h3 className="text-[16px] font-bold text-[#27214D] leading-snug">
                      {item.skill.name}
                    </h3>
                    <p className="text-[13px] text-[#8B84A7] leading-relaxed line-clamp-2">
                      {item.skill.description}
                    </p>
                    {item.skill.invocation_method && (
                      <code className="text-[12px] bg-[#F6F3FF] px-2.5 py-1 rounded-full text-primary font-mono self-start">
                        {item.skill.invocation_method}
                      </code>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => router.push(`/?skill=${item.skill.slug}`)}
                      className="flex-1 h-12 rounded-2xl bg-[#6E61FF] text-white text-[14px] font-bold hover:bg-[#5B4EE6] transition-colors"
                    >
                      立即使用
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpenId(isMenuOpen ? null : item.skillId)}
                        className="w-12 h-12 rounded-2xl bg-white border border-[#D9D2F4] flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.08)] hover:bg-[#F6F3FF] transition-colors"
                      >
                        <MoreVertical size={18} className="text-[#1F173A]" />
                      </button>

                      {isMenuOpen && (
                        <div className="absolute right-0 bottom-[calc(100%+8px)] z-50 bg-white rounded-[18px] border border-[#EAE5FF] shadow-[0_14px_28px_rgba(0,0,0,0.1)] p-[18px] w-[184px] flex flex-col gap-[18px]">
                          <div className="flex items-center justify-between">
                            <span className="text-[16px] font-medium text-[#1F173A]">
                              {item.enabled ? '禁用' : '启用'}
                            </span>
                              <button
                                onClick={() => toggleSkill(item.skillId)}
                                className={`w-[46px] h-7 rounded-full p-1 flex items-center transition-colors ${
                                item.enabled ? 'bg-[#1F1A42] justify-end' : 'bg-[#E0DAFF] justify-start'
                              }`}
                            >
                              <span className="w-5 h-5 rounded-full bg-white block" />
                            </button>
                          </div>
                          <button
                            onClick={() => { removeSkill(item.skillId); setMenuOpenId(null) }}
                            className="text-[16px] font-medium text-[#FF4D4F] text-left hover:text-red-600 transition-colors"
                          >
                            删除
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
