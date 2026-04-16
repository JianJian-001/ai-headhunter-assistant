/**
 * Skill Runtime Engine
 * Executes skills by reading their SKILL.md manifest and orchestrating via LLM.
 */

import { chatCompletion, type ChatMessage } from './doubao'
import { BUILTIN_SKILL_MAP } from './builtin-skills'
import * as fs from 'fs/promises'
import * as path from 'path'

const MAX_CONTEXT_FILES = 6
const MAX_SKILL_MD_LENGTH = 6000
const MAX_SUPPORTING_FILE_LENGTH = 1800

interface SkillExecutionResult {
  content: string
  metadata?: Record<string, unknown>
}

async function readSupportingDirectory(skillDir: string, directoryName: string): Promise<string> {
  try {
    const directoryPath = path.join(skillDir, directoryName)
    const fileNames = (await fs.readdir(directoryPath)).sort().slice(0, MAX_CONTEXT_FILES)
    const chunks = await Promise.all(
      fileNames.map(async (fileName) => {
        const filePath = path.join(directoryPath, fileName)
        const content = await fs.readFile(filePath, 'utf-8')
        return `\n--- ${directoryName}/${fileName} ---\n${content.slice(0, MAX_SUPPORTING_FILE_LENGTH)}\n`
      }),
    )
    return chunks.join('')
  } catch {
    return ''
  }
}

function resolveSkillDir(slug: string): string {
  const builtinDefinition = BUILTIN_SKILL_MAP[slug]
  if (builtinDefinition?.sourceDir) {
    return path.join(process.cwd(), builtinDefinition.sourceDir)
  }
  return path.join(process.cwd(), 'skills', 'builtin', slug)
}

export async function loadSkillPromptContext(slug: string): Promise<string | null> {
  const skillDir = resolveSkillDir(slug)

  try {
    const skillMd = await fs.readFile(path.join(skillDir, 'SKILL.md'), 'utf-8')
    const references = await readSupportingDirectory(skillDir, 'references')
    const assets = await readSupportingDirectory(skillDir, 'assets')

    return `技能文档:\n${skillMd.slice(0, MAX_SKILL_MD_LENGTH)}${references ? `\n参考资料:\n${references}` : ''}${assets ? `\n模板资料:\n${assets}` : ''}`
  } catch {
    return null
  }
}

/**
 * Execute a skill by slug.
 * For LLM-driven skills: reads SKILL.md + references, sends to LLM.
 * For script-based skills: returns instructions for local execution.
 */
export async function executeSkill(
  slug: string,
  userInput: string,
  context?: Record<string, unknown>,
): Promise<SkillExecutionResult> {
  const skillPromptContext = await loadSkillPromptContext(slug)
  if (!skillPromptContext) {
    return { content: `技能 ${slug} 的配置文件未找到。` }
  }

  // Check if skill has scripts that need local execution
  const needsLocalExec = [
    'headhunter-find-job',
    'headhunter-cv-matching',
    'headhunter-resume-risk-pro',
  ].includes(slug)

  if (needsLocalExec) {
    // For skills requiring local execution, provide guidance
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的 AI 助手。当前用户调用了技能: ${slug}。
这个技能需要在本地环境执行脚本。请根据技能文档，告诉用户如何执行。

${skillPromptContext}`,
      },
      { role: 'user', content: userInput },
    ]

    const content = await chatCompletion(messages)
    return { content, metadata: { requires_local_exec: true, slug } }
  }

  // LLM-driven execution
  const messages: ChatMessage[] = [
    {
      role: 'system',
        content: `你是一个专业的 AI 助手。当前正在执行技能: ${slug}。
请严格按照技能文档中的工作流程来处理用户请求。

${skillPromptContext}

请根据工作流程，逐步完成用户的请求。输出专业、结构化的结果。${context ? `\n可用上下文: ${JSON.stringify(context)}` : ''}`,
    },
    { role: 'user', content: userInput },
  ]

  const content = await chatCompletion(messages)
  return { content, metadata: { slug } }
}
