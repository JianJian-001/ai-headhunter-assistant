import { NextResponse } from 'next/server'
import JSZip from 'jszip'
import { createClient } from '@/lib/supabase/server'

function sanitizeFileName(fileName: string): string {
  const lastSegment = fileName.split(/[\\/]/).pop() ?? 'skill-package'
  return lastSegment.replace(/[^a-zA-Z0-9._-]/g, '_')
}

/**
 * Extract system_prompt from uploaded skill file:
 * - .md: use file content directly as system_prompt
 * - .zip / .skill: find SKILL.md inside the archive and use its content
 */
async function extractSystemPrompt(file: File, ext: string): Promise<string | null> {
  if (ext === 'md') {
    return await file.text()
  }

  if (ext === 'zip' || ext === 'skill') {
    try {
      const arrayBuffer = await file.arrayBuffer()
      const zip = await JSZip.loadAsync(arrayBuffer)

      // Find SKILL.md (case-insensitive, at any depth)
      const skillMdFile = Object.keys(zip.files).find((name) =>
        name.match(/(?:^|\/)SKILL\.md$/i),
      )

      if (skillMdFile) {
        return await zip.files[skillMdFile].async('text')
      }
    } catch {
      // Could not parse zip; continue without system_prompt
    }
  }

  return null
}

// POST /api/skills/upload - Upload a skill package
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const sanitizedFileName = sanitizeFileName(file.name)
  const ext = sanitizedFileName.split('.').pop()?.toLowerCase() ?? ''
  if (!['md', 'zip', 'skill'].includes(ext)) {
    return NextResponse.json(
      { error: 'Invalid file type. Use .md, .zip or .skill' },
      { status: 400 },
    )
  }

  // Extract system_prompt from file content before uploading
  const systemPrompt = await extractSystemPrompt(file, ext)

  // Upload to Supabase Storage
  const filePath = `skills/${user.id}/${Date.now()}_${sanitizedFileName}`
  const { error: uploadError } = await supabase.storage
    .from('skill-packages')
    .upload(filePath, file)

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Create skill record with parsed system_prompt
  const skillName = sanitizedFileName.replace(/\.(md|zip|skill)$/i, '')
  const { data: skill, error: skillError } = await supabase
    .from('skills')
    .insert({
      slug: `user-${user.id.slice(0, 8)}-${Date.now()}`,
      name: skillName,
      description: `用户上传的技能包: ${sanitizedFileName}`,
      skill_type: 'user_created',
      category: '自定义',
      creator_id: user.id,
      manifest: {
        version: '1.0',
        role: '自定义',
        storage_path: filePath,
        ...(systemPrompt ? { system_prompt: systemPrompt } : {}),
      },
    })
    .select()
    .single()

  if (skillError) {
    return NextResponse.json({ error: skillError.message }, { status: 500 })
  }

  // Add to user_skills
  await supabase.from('user_skills').insert({
    user_id: user.id,
    skill_id: skill.id,
    source: 'created',
    enabled: true,
  })

  return NextResponse.json(skill)
}
