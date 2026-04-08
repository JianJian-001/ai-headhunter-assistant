import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/skills - List user's skills or all builtin skills
export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const url = new URL(request.url)
  const type = url.searchParams.get('type') // 'builtin' | 'user' | 'all' | 'created'

  if (type === 'builtin' || !user) {
    // Public: list builtin skills
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .eq('skill_type', 'builtin')
      .order('created_at')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  if (type === 'created') {
    // Authenticated: list skills created by the user
    const { data, error } = await supabase
      .from('user_skills')
      .select('*, skill:skills(*)')
      .eq('user_id', user.id)
      .eq('source', 'created')
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // Authenticated: list user's skills with skill details
  const { data, error } = await supabase
    .from('user_skills')
    .select('*, skill:skills(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/skills - Create a new user skill via chat/form
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { name, description, category = '自定义', invocation_method, system_prompt } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: '技能名称不能为空' }, { status: 400 })
  }

  const slug = `user-${user.id.slice(0, 8)}-${Date.now()}`

  const { data: skill, error: skillError } = await supabase
    .from('skills')
    .insert({
      slug,
      name: name.trim(),
      description: description?.trim() || '',
      skill_type: 'user_created',
      category: category || '自定义',
      creator_id: user.id,
      invocation_method: invocation_method?.trim() || null,
      manifest: {
        version: '1.0',
        role: '自定义',
        system_prompt: system_prompt?.trim() || '',
      },
    })
    .select()
    .single()

  if (skillError) {
    return NextResponse.json({ error: skillError.message }, { status: 500 })
  }

  const { error: userSkillError } = await supabase.from('user_skills').insert({
    user_id: user.id,
    skill_id: skill.id,
    source: 'created',
    enabled: true,
  })

  if (userSkillError) {
    return NextResponse.json({ error: userSkillError.message }, { status: 500 })
  }

  return NextResponse.json(skill, { status: 201 })
}
