import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/skills/:id/toggle - Toggle skill enabled/disabled
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: skillId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get current state
  const { data: userSkill } = await supabase
    .from('user_skills')
    .select('id, enabled')
    .eq('user_id', user.id)
    .eq('skill_id', skillId)
    .single()

  if (!userSkill) {
    return NextResponse.json({ error: 'Skill not found in your collection' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('user_skills')
    .update({ enabled: !userSkill.enabled })
    .eq('id', userSkill.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST /api/skills/:id/toggle - Add skill to user's collection (reuse path for add)
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: skillId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: skill } = await supabase
    .from('skills')
    .select('id')
    .eq('id', skillId)
    .single()

  if (!skill) {
    return NextResponse.json({ error: 'Skill not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('user_skills')
    .upsert(
      { user_id: user.id, skill_id: skillId, source: 'added', enabled: true },
      { onConflict: 'user_id,skill_id' },
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
