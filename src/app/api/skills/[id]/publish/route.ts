import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/skills/:id/publish - Publish skill to marketplace
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

  // Verify ownership
  const { data: skill } = await supabase
    .from('skills')
    .select('id, creator_id')
    .eq('id', skillId)
    .single()

  if (!skill || skill.creator_id !== user.id) {
    return NextResponse.json({ error: 'Not found or not authorized' }, { status: 403 })
  }

  // Check merchant status
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_merchant')
    .eq('id', user.id)
    .single()

  if (!profile?.is_merchant) {
    return NextResponse.json({ error: '请先开通商户' }, { status: 400 })
  }

  const { error } = await supabase
    .from('skills')
    .update({ is_published: true, skill_type: 'marketplace' })
    .eq('id', skillId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
