'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, ShoppingBag, Plus, AlertTriangle, Database, RefreshCw } from 'lucide-react'
import type { Skill } from '@/lib/types'
import { useSkillStore } from '@/lib/skill-store'
import { SkillCard } from '@/components/skills/SkillCard'
import { SkillDetail } from '@/components/skills/SkillDetail'
import Link from 'next/link'

const categories = ['全部', 'BD专员', '寻访研究员', '执行顾问', '大客户经理', '运营专员', '通用']

type FetchError = {
  type: 'database_unreachable' | 'database_config_missing' | 'need_seed' | 'network' | 'unknown'
  message: string
}

export default function MarketplacePage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('全部')
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<FetchError | null>(null)
  const [seeding, setSeeding] = useState(false)

  const { addSkill, isAdded } = useSkillStore()

  const fetchSkills = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    const params = new URLSearchParams()
    if (category !== '全部') params.set('category', category)
    if (search) params.set('search', search)

    try {
      const res = await fetch(`/api/skills/marketplace?${params}`)
      const data = await res.json()

      if (Array.isArray(data)) {
        setSkills(data)
        return
      }

      if (data.error === 'database_unreachable') {
        setFetchError({ type: 'database_unreachable', message: data.message })
      } else if (data.error === 'database_config_missing') {
        setFetchError({ type: 'database_config_missing', message: data.message })
      } else if (data.needSeed) {
        setFetchError({ type: 'need_seed', message: data.message })
        setSkills(data.data ?? [])
      } else if (data.error) {
        setFetchError({ type: 'unknown', message: data.message || data.error })
      } else {
        setSkills([])
      }
    } catch {
      setFetchError({ type: 'network', message: '网络请求失败，请检查网络连接' })
      setSkills([])
    } finally {
      setLoading(false)
    }
  }, [category, search])

  useEffect(() => {
    fetchSkills()
  }, [fetchSkills])

  async function handleSeed() {
    setSeeding(true)
    try {
      const res = await fetch('/api/seed', { method: 'POST' })
      const data = await res.json()
      if (data.error) {
        setFetchError({ type: 'unknown', message: `初始化失败: ${data.error}` })
      } else {
        setFetchError(null)
        await fetchSkills()
      }
    } catch {
      setFetchError({ type: 'network', message: '初始化请求失败，请检查网络连接' })
    } finally {
      setSeeding(false)
    }
  }

  function handleAdd(skill: Skill) {
    addSkill(skill)
    setSelectedSkill(skill)
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-0">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-[42px] font-bold text-[#27214D] leading-tight">技能</h1>
            <p className="text-[15px] text-[#8E86AF] mt-1">
              浏览和添加 AI 猎头技能，提升你的工作效率
            </p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8E86AF]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索技能..."
                className="w-[220px] h-10 pl-10 pr-4 rounded-full bg-white border border-[#EAE5FF] text-[14px] text-[#27214D] placeholder:text-[#B8B0D4] focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            {/* Purchase history */}
            <Link
              href="/purchases"
              className="h-10 px-4 rounded-2xl bg-white border border-[#EAE5FF] text-[14px] font-medium text-[#27214D] flex items-center gap-2 hover:bg-[#F6F3FF] transition-colors"
            >
              <ShoppingBag size={16} />
              购买记录
            </Link>
            {/* Create skill */}
            <Link
              href="/?create=1"
              className="h-10 px-4 rounded-2xl bg-primary text-white text-[14px] font-medium flex items-center gap-2 hover:bg-[#5B4EE6] transition-colors"
            >
              <Plus size={16} />
              创建技能
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-3 mb-6">
          <button
            className="h-10 px-5 rounded-2xl text-[14px] font-semibold bg-[#F0EDFF] text-primary transition-colors"
          >
            技能商城
          </button>
          <Link
            href="/my-skills/added"
            className="h-10 px-5 rounded-2xl text-[14px] font-semibold bg-white border border-[#EAE5FF] text-[#8E86AF] hover:bg-[#F6F3FF] transition-colors flex items-center"
          >
            我的技能
          </Link>
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`h-8 px-3.5 rounded-full text-[13px] font-medium transition-colors ${
                category === cat
                  ? 'bg-[#F0EDFF] text-primary'
                  : 'bg-white border border-[#EAE5FF] text-[#8E86AF] hover:bg-[#F6F3FF]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {loading ? (
          <div className="grid grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-3xl border border-[#EAE5FF] animate-pulse h-[200px]" />
            ))}
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            {fetchError.type === 'database_unreachable' ? (
              <>
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertTriangle size={28} className="text-red-400" />
                </div>
                <h3 className="text-[17px] font-semibold text-[#27214D]">数据库连接失败</h3>
                <p className="text-[14px] text-[#8E86AF] text-center max-w-md">
                  Supabase 项目可能已暂停（免费版 7 天不活跃会自动暂停）。<br />
                  请前往{' '}
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline hover:text-[#5B4EE6]"
                  >
                    Supabase Dashboard
                  </a>{' '}
                  恢复项目，然后点击下方按钮重新连接。
                </p>
                <button
                  onClick={() => fetchSkills()}
                  className="mt-2 h-10 px-5 rounded-2xl bg-primary text-white text-[14px] font-medium flex items-center gap-2 hover:bg-[#5B4EE6] transition-colors"
                >
                  <RefreshCw size={16} />
                  重新连接
                </button>
              </>
            ) : fetchError.type === 'need_seed' ? (
              <>
                <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
                  <Database size={28} className="text-amber-400" />
                </div>
                <h3 className="text-[17px] font-semibold text-[#27214D]">技能数据未初始化</h3>
                <p className="text-[14px] text-[#8E86AF] text-center max-w-md">
                  数据库已连接，但技能表为空。点击下方按钮初始化内置技能。
                </p>
                <button
                  onClick={handleSeed}
                  disabled={seeding}
                  className="mt-2 h-10 px-5 rounded-2xl bg-primary text-white text-[14px] font-medium flex items-center gap-2 hover:bg-[#5B4EE6] transition-colors disabled:opacity-50"
                >
                  {seeding ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      正在初始化...
                    </>
                  ) : (
                    <>
                      <Database size={16} />
                      初始化内置技能
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center">
                  <AlertTriangle size={28} className="text-gray-400" />
                </div>
                <h3 className="text-[17px] font-semibold text-[#27214D]">加载失败</h3>
                <p className="text-[14px] text-[#8E86AF] text-center max-w-md">{fetchError.message}</p>
                <button
                  onClick={() => fetchSkills()}
                  className="mt-2 h-10 px-5 rounded-2xl bg-primary text-white text-[14px] font-medium flex items-center gap-2 hover:bg-[#5B4EE6] transition-colors"
                >
                  <RefreshCw size={16} />
                  重试
                </button>
              </>
            )}
          </div>
        ) : skills.length === 0 ? (
          <div className="text-center py-20 text-[#8E86AF] text-[15px]">
            暂无匹配的技能
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {skills.map((skill) => (
              <SkillCard
                key={skill.id}
                skill={skill}
                isAdded={isAdded(skill.id)}
                onDetail={setSelectedSkill}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selectedSkill && (
        <SkillDetail
          skill={selectedSkill}
          isAdded={isAdded(selectedSkill.id)}
          onAdd={handleAdd}
          onClose={() => setSelectedSkill(null)}
        />
      )}
    </div>
  )
}
