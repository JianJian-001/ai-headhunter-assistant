import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Skill } from './types'

interface AddedSkill {
  skillId: string
  slug: string
  enabled: boolean
}

interface SkillState {
  /** Skills the user has added (persisted in localStorage) */
  addedSkills: AddedSkill[]
  /** Derived: slugs of enabled skills for chat */
  enabledSlugs: string[]

  addSkill: (skill: Skill) => void
  removeSkill: (skillId: string) => void
  toggleSkill: (skillId: string) => void
  isAdded: (skillId: string) => boolean
  /** Upsert a skill's enabled state; adds to store if not present and enabled=true */
  setSkillEnabled: (skill: Skill, enabled: boolean) => void
}

function deriveEnabledSlugs(added: AddedSkill[]): string[] {
  return added.filter((s) => s.enabled).map((s) => s.slug)
}

export const useSkillStore = create<SkillState>()(
  persist(
    (set, get) => ({
      addedSkills: [],
      enabledSlugs: [],

      addSkill: (skill: Skill) => {
        const current = get().addedSkills
        if (current.some((s) => s.skillId === skill.id)) return
        const next = [...current, { skillId: skill.id, slug: skill.slug, enabled: true }]
        set({ addedSkills: next, enabledSlugs: deriveEnabledSlugs(next) })
      },

      removeSkill: (skillId: string) => {
        const next = get().addedSkills.filter((s) => s.skillId !== skillId)
        set({ addedSkills: next, enabledSlugs: deriveEnabledSlugs(next) })
      },

      toggleSkill: (skillId: string) => {
        const next = get().addedSkills.map((s) =>
          s.skillId === skillId ? { ...s, enabled: !s.enabled } : s,
        )
        set({ addedSkills: next, enabledSlugs: deriveEnabledSlugs(next) })
      },

      isAdded: (skillId: string) => {
        return get().addedSkills.some((s) => s.skillId === skillId)
      },

      setSkillEnabled: (skill: Skill, enabled: boolean) => {
        const current = get().addedSkills
        const exists = current.some((s) => s.skillId === skill.id)
        let next: AddedSkill[]
        if (!exists) {
          if (!enabled) return
          next = [...current, { skillId: skill.id, slug: skill.slug, enabled: true }]
        } else {
          next = current.map((s) =>
            s.skillId === skill.id ? { ...s, enabled } : s,
          )
        }
        set({ addedSkills: next, enabledSlugs: deriveEnabledSlugs(next) })
      },
    }),
    { name: 'domi-skills' },
  ),
)
