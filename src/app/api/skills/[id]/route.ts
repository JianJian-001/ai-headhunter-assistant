import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/skills/:id - Fetch a single skill by id
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: skillId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: skill, error } = await supabase
    .from('skills')
    .select('*')
    .eq('id', skillId)
    .single()

  if (error || !skill) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  }

  // Only creator or public skills are accessible
  if (skill.skill_type === 'user_created' && skill.creator_id !== user?.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  return NextResponse.json(skill)
}

// PATCH /api/skills/:id - Update a user-created skill
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: skillId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: existing } = await supabase
    .from('skills')
    .select('id, creator_id, skill_type')
    .eq('id', skillId)
    .single()

  if (!existing || existing.skill_type !== 'user_created' || existing.creator_id !== user.id) {
    return NextResponse.json({ error: 'Skill not found or not editable' }, { status: 404 })
  }

  const body = await request.json()
  const { name, description, category, invocation_method, system_prompt } = body

  const { data: updated, error } = await supabase
    .from('skills')
    .update({
      name: name?.trim() || undefined,
      description: description?.trim() ?? undefined,
      category: category?.trim() || undefined,
      invocation_method: invocation_method?.trim() || null,
      manifest: {
        version: '1.0',
        role: '自定义',
        system_prompt: system_prompt?.trim() || '',
      },
    })
    .eq('id', skillId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(updated)
}

// DELETE /api/skills/:id - Remove a skill from user's collection
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: skillId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Remove from user_skills
  const { error } = await supabase
    .from('user_skills')
    .delete()
    .eq('user_id', user.id)
    .eq('skill_id', skillId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If skill is user_created and belongs to this user, also delete the skill record
  const { data: skill } = await supabase
    .from('skills')
    .select('id, creator_id, skill_type')
    .eq('id', skillId)
    .single()

  if (skill && skill.skill_type === 'user_created' && skill.creator_id === user.id) {
    await supabase.from('skills').delete().eq('id', skillId)
  }

  return NextResponse.json({ success: true })
}
