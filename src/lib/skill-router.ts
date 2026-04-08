import { BUILTIN_SKILL_MAP } from './builtin-skills'
import { chatCompletion, type ChatMessage } from './doubao'

interface RouteResult {
  slug: string
  context: string
  isUserCreated?: boolean
}

export interface UserCreatedSkillInfo {
  slug: string
  name: string
  description: string
  invocation_method: string | null
  system_prompt?: string
}

/**
 * Three-tier intent routing:
 * 1. Slash command: /find-job → direct match (builtin + user-created)
 * 2. LLM classification: send message + skill descriptions to LLM
 * 3. Fallback: null
 */
export async function routeIntent(
  message: string,
  enabledSlugs: string[],
  userCreatedSkills?: UserCreatedSkillInfo[],
): Promise<RouteResult | null> {
  const normalizedMessage = message.trim()

  // 1. Slash command matching (builtin first, then user-created)
  const slashMatch = normalizedMessage.match(/^\/([a-z0-9_-]+)/i)
  if (slashMatch) {
    const command = slashMatch[1].toLowerCase()

    // Check builtin skills
    for (const skill of Object.values(BUILTIN_SKILL_MAP)) {
      const slashName = skill.invocationMethod.replace(/^\//, '')
      if (command === skill.slug || command === slashName || skill.slug.endsWith(command)) {
        return {
          slug: skill.slug,
          context: `用户通过斜杠命令调用了技能: ${skill.routingDescription}。请严格按照该技能的工作流执行。用户输入: ${normalizedMessage}`,
        }
      }
    }

    // Check user-created skills
    if (userCreatedSkills) {
      for (const skill of userCreatedSkills) {
        const invCmd = (skill.invocation_method ?? '').replace(/^\//, '').toLowerCase()
        if (invCmd && (command === invCmd || command === skill.slug)) {
          return {
            slug: skill.slug,
            context: `用户通过斜杠命令调用了自定义技能: ${skill.name}。${skill.description}`,
            isUserCreated: true,
          }
        }
      }
    }
  }

  // 2. LLM intent classification (only for agent mode with enabled skills)
  if (enabledSlugs.length > 0) {
    const builtinDescriptions = enabledSlugs
      .map((slug) => BUILTIN_SKILL_MAP[slug])
      .filter(Boolean)
      .map((skill) => `- ${skill.slug}: ${skill.routingDescription}`)

    const userCreatedDescriptions = (userCreatedSkills ?? [])
      .filter((s) => enabledSlugs.includes(s.slug))
      .map((s) => `- ${s.slug}: ${s.name} — ${s.description}`)

    const allDescriptions = [...builtinDescriptions, ...userCreatedDescriptions].join('\n')

    if (allDescriptions) {
      const classifyMessages: ChatMessage[] = [
        {
          role: 'system',
          content: `你是一个意图分类器。根据用户消息，判断应该使用哪个技能。
可用技能列表：
${allDescriptions}

如果用户消息明确匹配某个技能，返回该技能的 slug（如 headhunter-find-job）。
如果不匹配任何技能，返回 "none"。
只返回 slug 或 "none"，不要返回其他内容。`,
        },
        { role: 'user', content: message },
      ]

      try {
        const result = (await chatCompletion(classifyMessages)).trim()
        const matchedBuiltin = BUILTIN_SKILL_MAP[result]
        if (result !== 'none' && matchedBuiltin) {
          return {
            slug: result,
            context: `AI 意图分类匹配到技能: ${matchedBuiltin.routingDescription}。请严格按照该技能的工作流执行。`,
          }
        }

        const matchedUserSkill = (userCreatedSkills ?? []).find((s) => s.slug === result)
        if (result !== 'none' && matchedUserSkill) {
          return {
            slug: result,
            context: `AI 意图分类匹配到自定义技能: ${matchedUserSkill.name}。${matchedUserSkill.description}`,
            isUserCreated: true,
          }
        }
      } catch {
        // Classification failed, fall through
      }
    }
  }

  // 3. Fallback
  return null
}
